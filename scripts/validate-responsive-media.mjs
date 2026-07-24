import { createHash } from 'node:crypto';
import {
  readFile,
  readdir,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  MEDIA_DERIVATIVE_ROOT,
  MEDIA_MANIFEST_PATH,
  MEDIA_POLICY_PATH,
  MEDIA_REFERENCE_REPORT_PATH,
  normalizeImagePath,
  projectPath,
  stableCompare,
} from './media-path-policy.mjs';
import {
  canonicalPolicyHash,
  declaredDerivativePaths,
  validateMediaManifest,
  validateMediaQualityPolicy,
} from './media-manifest-policy.mjs';
import { validateMediaShardSet } from './generate-media-shards.mjs';
import { inspectImagesWithPillow } from './inventory-runtime-media.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(repositoryPath) {
  return JSON.parse(await readFile(projectPath(rootDir, repositoryPath), 'utf8'));
}

async function hashFile(repositoryPath) {
  const bytes = await readFile(projectPath(rootDir, repositoryPath));
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

async function walkFiles(repositoryRoot) {
  const root = projectPath(rootDir, repositoryRoot);
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => stableCompare(left.name, right.name));
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) files.push(path.relative(rootDir, target).split(path.sep).join('/'));
    }
  }
  try {
    await walk(root);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return files.sort(stableCompare);
}

function addFinding(findings, code, message, item = '') {
  findings.push({ code, message, item });
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeFormat(value) {
  const format = String(value ?? '').toLowerCase();
  return format === 'jpg' ? 'jpeg' : format;
}

function compareMetadata(findings, {
  actual,
  expected,
  fields,
  item,
  code,
  label,
}) {
  for (const field of fields) {
    if (actual?.[field] !== expected?.[field]) {
      addFinding(
        findings,
        code,
        `${label} ${field} differs: expected ${JSON.stringify(expected?.[field])}, got ${JSON.stringify(actual?.[field])}.`,
        item,
      );
    }
  }
}

function expectedAlphaPreserved(sourceHasAlpha, profile) {
  return Boolean(
    sourceHasAlpha
    && profile.preserveAlpha
    && ['avif', 'png', 'webp'].includes(profile.format),
  );
}

export async function validateResponsiveMedia() {
  const findings = [];
  let inventory;
  let rawPolicy;
  let policy;
  let manifest;
  try {
    inventory = await readJson(MEDIA_REFERENCE_REPORT_PATH);
    if (inventory.schemaVersion !== 2) {
      addFinding(findings, 'MEDIA_INVENTORY_SCHEMA', `Expected media inventory schemaVersion 2, got ${inventory.schemaVersion}.`);
    }
  } catch (error) {
    addFinding(findings, 'MEDIA_INVENTORY_MISSING', error.message);
  }
  try {
    rawPolicy = await readJson(MEDIA_POLICY_PATH);
    policy = validateMediaQualityPolicy(rawPolicy);
  } catch (error) {
    addFinding(findings, 'MEDIA_POLICY_INVALID', error.message);
  }
  try {
    manifest = validateMediaManifest(await readJson(MEDIA_MANIFEST_PATH));
  } catch (error) {
    addFinding(findings, 'MEDIA_MANIFEST_INVALID', error.message);
  }
  if (!inventory || !policy || !manifest) return { findings, summary: null };

  if ((inventory.counts?.missingReferencedImages ?? -1) !== 0) {
    addFinding(findings, 'MEDIA_INVENTORY_MISSING_IMAGES', 'Inventory missingReferencedImages must be zero.');
  }
  if ((inventory.counts?.corruptImages ?? -1) !== 0) {
    addFinding(findings, 'MEDIA_INVENTORY_CORRUPT_IMAGES', 'Inventory corruptImages must be zero.');
  }
  if ((inventory.pendingLocalEnrichment?.length ?? -1) !== 0) {
    addFinding(findings, 'MEDIA_INVENTORY_ENRICHMENT_PENDING', 'Inventory still has pending local enrichment fields.');
  }

  const inventoryByPath = new Map();
  for (const record of inventory.media ?? []) {
    let mediaPath;
    try {
      mediaPath = normalizeImagePath(record.path);
    } catch (error) {
      addFinding(findings, 'MEDIA_INVENTORY_PATH_INVALID', error.message, String(record.path ?? ''));
      continue;
    }
    if (inventoryByPath.has(mediaPath)) {
      addFinding(findings, 'MEDIA_INVENTORY_DUPLICATE_SOURCE', 'Inventory source path is duplicated.', mediaPath);
    }
    inventoryByPath.set(mediaPath, record);
  }
  const manifestByPath = new Map(manifest.media.map((entry) => [entry.sourcePath, entry]));
  const inventoryPaths = [...inventoryByPath.keys()].sort(stableCompare);
  const manifestPaths = [...manifestByPath.keys()].sort(stableCompare);
  const profileById = new Map(policy.profiles.map((profile) => [profile.id, profile]));
  const fileStates = new Map();
  const inspectablePaths = [];

  const allDeclaredPaths = [
    ...inventoryPaths,
    ...manifest.media.map((entry) => entry.derivationSourcePath),
    ...manifest.media.flatMap((entry) => entry.variants.map((variant) => variant.path)),
  ].filter((value, index, values) => values.indexOf(value) === index).sort(stableCompare);
  for (const mediaPath of allDeclaredPaths) {
    const state = await hashFile(mediaPath).catch((error) => ({ error }));
    fileStates.set(mediaPath, state);
    if (!state.error) inspectablePaths.push(mediaPath);
  }

  let pillowInspection = null;
  try {
    pillowInspection = await inspectImagesWithPillow(inspectablePaths);
  } catch (error) {
    addFinding(findings, 'MEDIA_IMAGE_INSPECTION_FAILED', error.message);
  }
  const inspectedByPath = new Map((pillowInspection?.media ?? []).map((item) => [item.path, item]));

  for (const sourcePath of inventoryPaths) {
    const record = inventoryByPath.get(sourcePath);
    const entry = manifestByPath.get(sourcePath);
    if (!entry) {
      addFinding(findings, 'MEDIA_SOURCE_UNDECLARED', 'Referenced source is missing from the media manifest.', sourcePath);
      continue;
    }
    const sourceState = fileStates.get(sourcePath);
    if (sourceState?.error) {
      addFinding(findings, 'MEDIA_SOURCE_MISSING', sourceState.error.message, sourcePath);
      continue;
    }
    if (
      sourceState.bytes !== record.bytes
      || sourceState.sha256 !== record.sha256
      || sourceState.bytes !== entry.referenceBytes
      || sourceState.sha256 !== entry.referenceHash
    ) {
      addFinding(findings, 'MEDIA_REFERENCE_STALE', 'Logical reference bytes/hash differ from inventory or manifest.', sourcePath);
    }
    const sortedRecordRoles = [...new Set(record.roles ?? [])].sort(stableCompare);
    if (!sameJson(sortedRecordRoles, entry.roles)) {
      addFinding(findings, 'MEDIA_SOURCE_ROLE_MISMATCH', 'Manifest source roles differ from the runtime inventory.', sourcePath);
    }
    const sourceInspection = inspectedByPath.get(sourcePath);
    compareMetadata(findings, {
      actual: sourceInspection,
      expected: record.metadata,
      fields: [
        'storedWidth',
        'storedHeight',
        'width',
        'height',
        'decodedFormat',
        'mode',
        'hasAlpha',
        'exifOrientation',
        'orientationNormalized',
        'frameCount',
        'animated',
        'pixelHash',
        'decodeStatus',
      ],
      item: sourcePath,
      code: 'MEDIA_SOURCE_INVENTORY_METADATA_STALE',
      label: 'Inventory metadata',
    });
    compareMetadata(findings, {
      actual: sourceInspection,
      expected: {
        storedWidth: entry.referenceStoredWidth,
        storedHeight: entry.referenceStoredHeight,
        width: entry.referenceWidth,
        height: entry.referenceHeight,
        decodedFormat: entry.referenceFormat,
        mode: entry.referenceMode,
        hasAlpha: entry.referenceHasAlpha,
        exifOrientation: entry.referenceExifOrientation,
        orientationNormalized: entry.referenceOrientationNormalized,
        frameCount: entry.referenceFrames,
        animated: entry.referenceAnimated,
      },
      fields: [
        'storedWidth',
        'storedHeight',
        'width',
        'height',
        'decodedFormat',
        'mode',
        'hasAlpha',
        'exifOrientation',
        'orientationNormalized',
        'frameCount',
        'animated',
      ],
      item: sourcePath,
      code: 'MEDIA_REFERENCE_MANIFEST_METADATA_STALE',
      label: 'Manifest logical reference metadata',
    });

    const derivationRecord = record.derivationSource;
    if (!derivationRecord || typeof derivationRecord !== 'object') {
      addFinding(findings, 'MEDIA_DERIVATION_LINEAGE_MISSING', 'Inventory derivationSource is required.', sourcePath);
      continue;
    }
    if (
      derivationRecord.kind !== entry.lineageKind
      || derivationRecord.path !== entry.derivationSourcePath
    ) {
      addFinding(findings, 'MEDIA_DERIVATION_LINEAGE_MISMATCH', 'Manifest derivation lineage differs from inventory.', sourcePath);
    }
    const derivationState = fileStates.get(entry.derivationSourcePath);
    if (derivationState?.error) {
      addFinding(findings, 'MEDIA_DERIVATION_SOURCE_MISSING', derivationState.error.message, entry.derivationSourcePath);
      continue;
    }
    if (
      derivationState.bytes !== derivationRecord.bytes
      || derivationState.sha256 !== derivationRecord.sha256
      || derivationState.bytes !== entry.sourceBytes
      || derivationState.sha256 !== entry.sourceHash
    ) {
      addFinding(findings, 'MEDIA_DERIVATION_SOURCE_STALE', 'Derivation source bytes/hash differ from inventory or manifest.', entry.derivationSourcePath);
    }
    const derivationInspection = inspectedByPath.get(entry.derivationSourcePath);
    compareMetadata(findings, {
      actual: derivationInspection,
      expected: derivationRecord.metadata,
      fields: [
        'storedWidth',
        'storedHeight',
        'width',
        'height',
        'decodedFormat',
        'mode',
        'hasAlpha',
        'exifOrientation',
        'orientationNormalized',
        'frameCount',
        'animated',
        'pixelHash',
        'decodeStatus',
      ],
      item: entry.derivationSourcePath,
      code: 'MEDIA_DERIVATION_INVENTORY_METADATA_STALE',
      label: 'Inventory derivation metadata',
    });
    compareMetadata(findings, {
      actual: derivationInspection,
      expected: {
        storedWidth: entry.sourceStoredWidth,
        storedHeight: entry.sourceStoredHeight,
        width: entry.sourceWidth,
        height: entry.sourceHeight,
        decodedFormat: entry.sourceFormat,
        mode: entry.sourceMode,
        hasAlpha: entry.hasAlpha,
        exifOrientation: entry.exifOrientation,
        orientationNormalized: entry.orientationNormalized,
        frameCount: entry.sourceFrames,
        animated: entry.animated,
      },
      fields: [
        'storedWidth',
        'storedHeight',
        'width',
        'height',
        'decodedFormat',
        'mode',
        'hasAlpha',
        'exifOrientation',
        'orientationNormalized',
        'frameCount',
        'animated',
      ],
      item: entry.derivationSourcePath,
      code: 'MEDIA_DERIVATION_MANIFEST_METADATA_STALE',
      label: 'Manifest derivation source metadata',
    });
    if (
      entry.lineageKind === 'work-cells-high-resolution-counterpart'
      && (
        entry.sourceWidth <= entry.referenceWidth
        || entry.sourceHeight <= entry.referenceHeight
      )
    ) {
      addFinding(findings, 'MEDIA_DERIVATION_SOURCE_NOT_LARGER', 'Work Cells high-resolution basis must be strictly larger in both dimensions.', sourcePath);
    }

    const expectedProfiles = policy.profiles.filter((profile) => (
      profile.roles.some((role) => entry.roles.includes(role))
    ));
    const expectedProfileIds = expectedProfiles.map((profile) => profile.id).sort(stableCompare);
    const actualProfileIds = entry.variants.map((variant) => variant.profileId).sort(stableCompare);
    if (!sameJson(expectedProfileIds, actualProfileIds)) {
      addFinding(
        findings,
        'MEDIA_PROFILE_COVERAGE_MISMATCH',
        `Expected profiles ${expectedProfileIds.join(', ')}, got ${actualProfileIds.join(', ')}.`,
        sourcePath,
      );
    }

    for (const variant of entry.variants) {
      const profile = profileById.get(variant.profileId);
      if (!profile) {
        addFinding(findings, 'MEDIA_PROFILE_UNKNOWN', `Unknown profile ${variant.profileId}.`, variant.path);
        continue;
      }
      const expectedRoles = profile.roles.filter((role) => entry.roles.includes(role)).sort(stableCompare);
      if (!sameJson(expectedRoles, variant.roles)) {
        addFinding(findings, 'MEDIA_VARIANT_ROLE_MISMATCH', 'Variant roles differ from policy/source intersection.', variant.path);
      }
      if (
        variant.format !== profile.format
        || variant.width !== Math.min(profile.width, entry.sourceWidth)
        || !sameJson(variant.encoderOptions, profile.encoderOptions)
      ) {
        addFinding(findings, 'MEDIA_VARIANT_POLICY_MISMATCH', 'Variant format, width or encoderOptions differ from its frozen policy profile.', variant.path);
      }
      if (variant.alphaPreserved !== expectedAlphaPreserved(entry.hasAlpha, profile)) {
        addFinding(findings, 'MEDIA_VARIANT_ALPHA_POLICY', 'Variant alphaPreserved differs from the frozen alpha policy.', variant.path);
      }
      const state = fileStates.get(variant.path);
      if (state?.error) {
        addFinding(findings, 'MEDIA_DERIVATIVE_MISSING', state.error.message, variant.path);
        continue;
      }
      if (state.bytes !== variant.bytes || state.sha256 !== variant.sha256) {
        addFinding(findings, 'MEDIA_DERIVATIVE_STALE', 'Derivative bytes/hash differ from the manifest.', variant.path);
      }
      const actualMetadata = inspectedByPath.get(variant.path);
      compareMetadata(findings, {
        actual: actualMetadata,
        expected: {
          width: variant.width,
          height: variant.height,
          decodedFormat: variant.format,
          mode: variant.mode,
          hasAlpha: variant.hasAlpha,
          decodeStatus: 'ok',
        },
        fields: ['width', 'height', 'decodedFormat', 'mode', 'hasAlpha', 'decodeStatus'],
        item: variant.path,
        code: 'MEDIA_DERIVATIVE_METADATA_STALE',
        label: 'Derivative metadata',
      });
      const extension = path.posix.extname(variant.path).slice(1).toLowerCase();
      if (normalizeFormat(extension) !== variant.format) {
        addFinding(findings, 'MEDIA_DERIVATIVE_EXTENSION', `Extension does not match format ${variant.format}.`, variant.path);
      }
    }
  }
  for (const sourcePath of manifestPaths.filter((item) => !inventoryByPath.has(item))) {
    addFinding(findings, 'MEDIA_MANIFEST_ORPHAN_SOURCE', 'Manifest source is no longer referenced by the runtime inventory.', sourcePath);
  }

  const declared = declaredDerivativePaths(manifest);
  const actual = new Set(await walkFiles(MEDIA_DERIVATIVE_ROOT));
  for (const mediaPath of [...actual].filter((item) => !declared.has(item)).sort(stableCompare)) {
    addFinding(findings, 'MEDIA_DERIVATIVE_ORPHAN', 'Derivative file is not declared by the manifest.', mediaPath);
  }
  for (const mediaPath of [...declared].filter((item) => !actual.has(item)).sort(stableCompare)) {
    if (!findings.some((finding) => finding.code === 'MEDIA_DERIVATIVE_MISSING' && finding.item === mediaPath)) {
      addFinding(findings, 'MEDIA_DERIVATIVE_MISSING', 'Manifest derivative does not exist.', mediaPath);
    }
  }

  const expectedPolicyHash = canonicalPolicyHash(rawPolicy);
  if (manifest.policyHash !== expectedPolicyHash) {
    addFinding(
      findings,
      'MEDIA_POLICY_HASH_MISMATCH',
      `Manifest policyHash ${manifest.policyHash} does not equal canonical policy hash ${expectedPolicyHash}.`,
    );
  }
  if (
    manifest.toolVersions.pillow !== policy.encoder.version
    || manifest.toolVersions.python !== policy.encoder.pythonVersion
    || manifest.toolVersions.libwebp !== policy.encoder.libwebpVersion
  ) {
    addFinding(findings, 'MEDIA_TOOL_VERSION_MISMATCH', 'Manifest toolVersions differ from the accepted policy encoder versions.');
  }
  if (inventory.toolVersions?.pillow !== policy.encoder.version) {
    addFinding(findings, 'MEDIA_INVENTORY_TOOL_VERSION_MISMATCH', 'Inventory Pillow version differs from the accepted policy.');
  }
  if (pillowInspection && pillowInspection.pillowVersion !== policy.encoder.version) {
    addFinding(findings, 'MEDIA_VALIDATOR_TOOL_VERSION_MISMATCH', 'Active Pillow inspector version differs from the accepted policy.');
  }
  const sampleIds = new Set((inventory.media ?? []).flatMap((record) => [record.mediaId, record.path]));
  for (const sampleId of policy.visualAcceptance.sampleMediaIds) {
    if (!sampleIds.has(sampleId)) {
      addFinding(findings, 'MEDIA_VISUAL_SAMPLE_UNKNOWN', 'Visual acceptance sample is not present in the runtime inventory.', sampleId);
    }
  }

  const shardValidation = await validateMediaShardSet({ projectRoot: rootDir });
  findings.push(...shardValidation.findings);

  const summary = {
    inventorySources: inventoryPaths.length,
    manifestSources: manifestPaths.length,
    variants: manifest.totals.variants,
    referenceBytes: manifest.totals.referenceBytes,
    sourceBytes: manifest.totals.sourceBytes,
    derivativeBytes: manifest.totals.derivativeBytes,
    orphanDerivatives: findings.filter((finding) => finding.code === 'MEDIA_DERIVATIVE_ORPHAN').length,
    staleDerivatives: findings.filter((finding) => finding.code === 'MEDIA_DERIVATIVE_STALE').length,
    missingDerivatives: findings.filter((finding) => finding.code === 'MEDIA_DERIVATIVE_MISSING').length,
    corruptImages: findings.filter((finding) => finding.code === 'MEDIA_IMAGE_INSPECTION_FAILED').length,
    policyHash: manifest.policyHash,
    canonicalPolicyHash: expectedPolicyHash,
    toolVersions: manifest.toolVersions,
    mediaShards: shardValidation.summary,
  };
  return { findings, summary };
}

async function run() {
  const result = await validateResponsiveMedia();
  if (result.summary) console.log(JSON.stringify(result.summary, null, 2));
  if (result.findings.length > 0) {
    for (const finding of result.findings) {
      console.error(`${finding.code}: ${finding.message}${finding.item ? ` (${finding.item})` : ''}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('Responsive media manifest, derivatives, roles, policy, decodes and hashes are current.');
}

const directExecutionPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const scriptPath = fileURLToPath(import.meta.url);
const sameScript = process.platform === 'win32'
  ? directExecutionPath.toLowerCase() === scriptPath.toLowerCase()
  : directExecutionPath === scriptPath;

if (sameScript) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
