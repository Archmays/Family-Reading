import { createHash } from 'node:crypto';
import {
  readFile,
  readdir,
  stat,
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
  declaredDerivativePaths,
  validateMediaManifest,
  validateMediaQualityPolicy,
} from './media-manifest-policy.mjs';

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

export async function validateResponsiveMedia() {
  const findings = [];
  let inventory;
  let policy;
  let manifest;
  try {
    inventory = await readJson(MEDIA_REFERENCE_REPORT_PATH);
  } catch (error) {
    addFinding(findings, 'MEDIA_INVENTORY_MISSING', error.message);
  }
  try {
    policy = validateMediaQualityPolicy(await readJson(MEDIA_POLICY_PATH));
  } catch (error) {
    addFinding(findings, 'MEDIA_POLICY_INVALID', error.message);
  }
  try {
    manifest = validateMediaManifest(await readJson(MEDIA_MANIFEST_PATH));
  } catch (error) {
    addFinding(findings, 'MEDIA_MANIFEST_INVALID', error.message);
  }
  if (!inventory || !policy || !manifest) return { findings, summary: null };

  const inventoryByPath = new Map((inventory.media ?? []).map((record) => [normalizeImagePath(record.path), record]));
  const manifestByPath = new Map(manifest.media.map((entry) => [entry.sourcePath, entry]));
  const inventoryPaths = [...inventoryByPath.keys()].sort(stableCompare);
  const manifestPaths = [...manifestByPath.keys()].sort(stableCompare);
  for (const sourcePath of inventoryPaths) {
    const record = inventoryByPath.get(sourcePath);
    const entry = manifestByPath.get(sourcePath);
    if (!entry) {
      addFinding(findings, 'MEDIA_SOURCE_UNDECLARED', 'Referenced source is missing from the media manifest.', sourcePath);
      continue;
    }
    const sourceState = await hashFile(sourcePath).catch((error) => ({ error }));
    if (sourceState.error) {
      addFinding(findings, 'MEDIA_SOURCE_MISSING', sourceState.error.message, sourcePath);
      continue;
    }
    if (sourceState.bytes !== entry.sourceBytes || sourceState.sha256 !== entry.sourceHash) {
      addFinding(findings, 'MEDIA_SOURCE_STALE', 'Source bytes/hash differ from the media manifest.', sourcePath);
    }
    const entryRoleCoverage = new Set(entry.variants.flatMap((variant) => variant.roles));
    for (const role of record.roles ?? []) {
      if (!entryRoleCoverage.has(role)) {
        addFinding(findings, 'MEDIA_ROLE_UNCOVERED', `No derivative profile covers role ${role}.`, sourcePath);
      }
    }
    for (const variant of entry.variants) {
      const state = await hashFile(variant.path).catch((error) => ({ error }));
      if (state.error) {
        addFinding(findings, 'MEDIA_DERIVATIVE_MISSING', state.error.message, variant.path);
      } else if (state.bytes !== variant.bytes || state.sha256 !== variant.sha256) {
        addFinding(findings, 'MEDIA_DERIVATIVE_STALE', 'Derivative bytes/hash differ from the manifest.', variant.path);
      }
      const extension = path.posix.extname(variant.path).slice(1).toLowerCase();
      const normalizedFormat = extension === 'jpg' ? 'jpeg' : extension;
      if (normalizedFormat !== variant.format) {
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
    addFinding(findings, 'MEDIA_DERIVATIVE_MISSING', 'Manifest derivative does not exist.', mediaPath);
  }

  const manifestPolicyHash = manifest.policyHash;
  const compactPolicy = JSON.stringify(policy, Object.keys(policy).sort());
  const shallowPolicyHash = createHash('sha256').update(compactPolicy).digest('hex');
  if (!/^[a-f0-9]{64}$/.test(manifestPolicyHash)) {
    addFinding(findings, 'MEDIA_POLICY_HASH_INVALID', 'Manifest policyHash is invalid.');
  }
  if (!policy.encoder?.name || !policy.encoder?.version) {
    addFinding(findings, 'MEDIA_ENCODER_IDENTITY_MISSING', 'Policy must record encoder name and version.');
  }

  const summary = {
    inventorySources: inventoryPaths.length,
    manifestSources: manifestPaths.length,
    variants: manifest.totals.variants,
    sourceBytes: manifest.totals.sourceBytes,
    derivativeBytes: manifest.totals.derivativeBytes,
    orphanDerivatives: findings.filter((finding) => finding.code === 'MEDIA_DERIVATIVE_ORPHAN').length,
    staleDerivatives: findings.filter((finding) => finding.code === 'MEDIA_DERIVATIVE_STALE').length,
    missingDerivatives: findings.filter((finding) => finding.code === 'MEDIA_DERIVATIVE_MISSING').length,
    policyHash: manifestPolicyHash,
    validatorPolicyShapeHash: shallowPolicyHash,
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
  console.log('Responsive media manifest, derivatives, roles and hashes are current.');
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
