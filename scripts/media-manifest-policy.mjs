import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  MEDIA_ROLES,
  derivativeRepositoryPath,
  normalizeImagePath,
  stableCompare,
} from './media-path-policy.mjs';

export const MEDIA_MANIFEST_SCHEMA_VERSION = 2;
export const MEDIA_POLICY_SCHEMA_VERSION = 1;

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const PROFILE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const HEX_COLOR_PATTERN = /^#[a-f0-9]{6}$/i;
const ALLOWED_SOURCE_FORMATS = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']);
const ALLOWED_OUTPUT_FORMATS = new Set(['avif', 'jpeg', 'jpg', 'png', 'webp']);
const WORK_CELLS_THUMBNAIL_ROOT = 'public/assets/cells-at-work/page-thumbnails/';
const WORK_CELLS_HIGH_RESOLUTION_ROOT = 'public/assets/cells-at-work/pages-by-volume/';
const ENCODER_OPTION_KEYS = new Set([
  'compressLevel',
  'exact',
  'lossless',
  'method',
  'optimize',
  'progressive',
  'quality',
  'speed',
  'subsampling',
]);
const FORBIDDEN_KEYS = new Set([
  'generatedAt',
  'createdAt',
  'updatedAt',
  'absolutePath',
  'sourceAbsolutePath',
  'machine',
  'username',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertInteger(value, label, { minimum = 1, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  assert(
    Number.isSafeInteger(value) && value >= minimum && value <= maximum,
    `${label} must be an integer between ${minimum} and ${maximum}.`,
  );
}

function sorted(values) {
  return [...values].sort(stableCompare);
}

function unique(values, label) {
  assert(new Set(values).size === values.length, `${label} contains duplicates.`);
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export function canonicalJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    assert(Number.isFinite(value), 'Canonical JSON does not support non-finite numbers.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  assert(value && typeof value === 'object', `Canonical JSON cannot encode ${typeof value}.`);
  const keys = Object.keys(value).sort(stableCompare);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function canonicalPolicyHash(policy) {
  return createHash('sha256').update(canonicalJson(policy), 'utf8').digest('hex');
}

function validateNoForbiddenKeys(value, currentPath = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoForbiddenKeys(item, `${currentPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!FORBIDDEN_KEYS.has(key), `Media data contains forbidden nondeterministic/private key ${currentPath}.${key}.`);
    validateNoForbiddenKeys(child, `${currentPath}.${key}`);
  }
}

function validateRoles(roles, label) {
  assert(Array.isArray(roles) && roles.length > 0, `${label}.roles must be a non-empty array.`);
  unique(roles, `${label}.roles`);
  assert(sameJson(roles, sorted(roles)), `${label}.roles must use stable ordinal order.`);
  roles.forEach((role) => assert(Boolean(MEDIA_ROLES[role]), `${label} contains unknown role ${role}.`));
}

function normalizedFormat(value, allowedFormats, label) {
  const format = String(value ?? '').toLowerCase();
  assert(allowedFormats.has(format), `${label} is unsupported: ${format || '<empty>'}.`);
  return format === 'jpg' ? 'jpeg' : format;
}

function assertBoolean(value, label) {
  assert(typeof value === 'boolean', `${label} must be boolean.`);
}

function assertQuality(value, label) {
  assertInteger(value, label, { minimum: 0, maximum: 100 });
}

export function encoderOptionsForProfile(profile, label = `profile ${profile?.id ?? '<unknown>'}`) {
  const format = normalizedFormat(profile?.format, ALLOWED_OUTPUT_FORMATS, `${label}.format`);
  const allowedKeys = new Set({
    webp: ['exact', 'lossless', 'method', 'quality'],
    jpeg: ['optimize', 'progressive', 'quality', 'subsampling'],
    png: ['compressLevel', 'optimize'],
    avif: ['quality', 'speed'],
  }[format]);
  for (const key of ENCODER_OPTION_KEYS) {
    assert(
      !Object.hasOwn(profile, key) || allowedKeys.has(key),
      `${label}.${key} is not supported for ${format}.`,
    );
  }
  if (format === 'webp') {
    assertQuality(profile.quality, `${label}.quality`);
    assertBoolean(profile.lossless, `${label}.lossless`);
    assertInteger(profile.method, `${label}.method`, { minimum: 0, maximum: 6 });
    assertBoolean(profile.exact, `${label}.exact`);
    return {
      exact: profile.exact,
      lossless: profile.lossless,
      method: profile.method,
      quality: profile.quality,
    };
  }
  if (format === 'jpeg') {
    assertQuality(profile.quality, `${label}.quality`);
    assertBoolean(profile.optimize, `${label}.optimize`);
    assertBoolean(profile.progressive, `${label}.progressive`);
    assertInteger(profile.subsampling, `${label}.subsampling`, { minimum: 0, maximum: 2 });
    return {
      optimize: profile.optimize,
      progressive: profile.progressive,
      quality: profile.quality,
      subsampling: profile.subsampling,
    };
  }
  if (format === 'png') {
    assertInteger(profile.compressLevel, `${label}.compressLevel`, { minimum: 0, maximum: 9 });
    assertBoolean(profile.optimize, `${label}.optimize`);
    return {
      compressLevel: profile.compressLevel,
      optimize: profile.optimize,
    };
  }
  assertQuality(profile.quality, `${label}.quality`);
  assertInteger(profile.speed, `${label}.speed`, { minimum: 0, maximum: 10 });
  return {
    quality: profile.quality,
    speed: profile.speed,
  };
}

function validateEncoderOptions(options, format, label) {
  assert(options && typeof options === 'object' && !Array.isArray(options), `${label} must be an object.`);
  const expectedKeys = {
    webp: ['exact', 'lossless', 'method', 'quality'],
    jpeg: ['optimize', 'progressive', 'quality', 'subsampling'],
    png: ['compressLevel', 'optimize'],
    avif: ['quality', 'speed'],
  }[format];
  assert(
    sameJson(Object.keys(options).sort(stableCompare), expectedKeys),
    `${label} must contain exactly ${expectedKeys.join(', ')}.`,
  );
  return encoderOptionsForProfile({ ...options, format }, label);
}

function validateVariant(variant, entry, policyHash, index, seenPaths, seenProfiles) {
  const label = `${entry.sourcePath}.variants[${index}]`;
  assert(variant && typeof variant === 'object' && !Array.isArray(variant), `${label} must be an object.`);
  const profileId = String(variant.profileId ?? '');
  assert(PROFILE_PATTERN.test(profileId), `${label}.profileId is invalid.`);
  assert(!seenProfiles.has(profileId), `${entry.sourcePath} contains duplicate profile ${profileId}.`);
  seenProfiles.add(profileId);
  const normalizedPath = normalizeImagePath(variant.path, { label: `${label}.path` });
  assert(normalizedPath.startsWith('public/media/derived/'), `${label}.path must stay under public/media/derived/.`);
  assert(!seenPaths.has(normalizedPath), `Duplicate derivative path: ${normalizedPath}`);
  seenPaths.add(normalizedPath);
  const format = normalizedFormat(variant.format, ALLOWED_OUTPUT_FORMATS, `${label}.format`);
  const expectedPath = derivativeRepositoryPath({
    sourcePath: entry.sourcePath,
    sourceHash: entry.sourceHash,
    policyHash,
    profileId,
    extension: format,
  });
  assert(normalizedPath === expectedPath, `${label}.path is not the deterministic derivative path ${expectedPath}.`);
  const extension = path.posix.extname(normalizedPath).slice(1).toLowerCase();
  assert((extension === 'jpg' ? 'jpeg' : extension) === format, `${label}.path extension does not match ${format}.`);
  assertInteger(variant.width, `${label}.width`);
  assertInteger(variant.height, `${label}.height`);
  assert(variant.width <= entry.sourceWidth, `${label}.width must not upscale its source.`);
  assertInteger(variant.bytes, `${label}.bytes`);
  assert(HASH_PATTERN.test(String(variant.sha256 ?? '')), `${label}.sha256 is invalid.`);
  validateRoles(variant.roles, label);
  variant.roles.forEach((role) => assert(entry.roles.includes(role), `${label} declares role ${role} absent from its source.`));
  assert(variant.sourceHash === entry.sourceHash, `${label}.sourceHash must match its source entry.`);
  assert(typeof variant.mode === 'string' && variant.mode.trim(), `${label}.mode is required.`);
  assertBoolean(variant.hasAlpha, `${label}.hasAlpha`);
  assertBoolean(variant.alphaPreserved, `${label}.alphaPreserved`);
  const encoderOptions = validateEncoderOptions(variant.encoderOptions, format, `${label}.encoderOptions`);
  if (variant.lossless !== undefined) {
    assertBoolean(variant.lossless, `${label}.lossless`);
    assert(variant.lossless === encoderOptions.lossless, `${label}.lossless must match encoderOptions.`);
  }
  if (variant.quality !== undefined) {
    assertQuality(variant.quality, `${label}.quality`);
    assert(variant.quality === encoderOptions.quality, `${label}.quality must match encoderOptions.`);
  }
  return {
    ...variant,
    profileId,
    path: normalizedPath,
    format,
    encoderOptions,
  };
}

function validateEntry(entry, policyHash, index, seenSources, seenDerivativePaths) {
  const label = `media[${index}]`;
  assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${label} must be an object.`);
  const sourcePath = normalizeImagePath(entry.sourcePath, { label: `${label}.sourcePath` });
  assert(!seenSources.has(sourcePath), `Duplicate source media entry: ${sourcePath}`);
  seenSources.add(sourcePath);
  assert(HASH_PATTERN.test(String(entry.sourceHash ?? '')), `${label}.sourceHash is invalid.`);
  assertInteger(entry.sourceStoredWidth, `${label}.sourceStoredWidth`);
  assertInteger(entry.sourceStoredHeight, `${label}.sourceStoredHeight`);
  assertInteger(entry.sourceWidth, `${label}.sourceWidth`);
  assertInteger(entry.sourceHeight, `${label}.sourceHeight`);
  assertInteger(entry.sourceBytes, `${label}.sourceBytes`);
  const sourceFormat = normalizedFormat(entry.sourceFormat, ALLOWED_SOURCE_FORMATS, `${label}.sourceFormat`);
  assert(typeof entry.sourceMode === 'string' && entry.sourceMode.trim(), `${label}.sourceMode is required.`);
  assertBoolean(entry.hasAlpha, `${label}.hasAlpha`);
  assertInteger(entry.exifOrientation, `${label}.exifOrientation`, { minimum: 1, maximum: 8 });
  assertBoolean(entry.orientationNormalized, `${label}.orientationNormalized`);
  assert(entry.orientationNormalized === (entry.exifOrientation !== 1), `${label}.orientationNormalized conflicts with EXIF orientation.`);
  assertInteger(entry.sourceFrames, `${label}.sourceFrames`);
  assertBoolean(entry.animated, `${label}.animated`);
  assert(entry.animated === (entry.sourceFrames > 1), `${label}.animated conflicts with sourceFrames.`);

  for (const field of [
    'lineageKind',
    'derivationSourcePath',
    'referenceHash',
    'referenceStoredWidth',
    'referenceStoredHeight',
    'referenceWidth',
    'referenceHeight',
    'referenceBytes',
    'referenceFormat',
    'referenceMode',
    'referenceHasAlpha',
    'referenceExifOrientation',
    'referenceOrientationNormalized',
    'referenceFrames',
    'referenceAnimated',
  ]) {
    assert(Object.hasOwn(entry, field), `${label}.${field} is required for explicit derivation lineage.`);
  }
  const lineageKind = entry.lineageKind;
  assert(
    ['self', 'work-cells-high-resolution-counterpart'].includes(lineageKind),
    `${label}.lineageKind is invalid.`,
  );
  const derivationSourcePath = normalizeImagePath(entry.derivationSourcePath, { label: `${label}.derivationSourcePath` });
  const referenceHash = entry.referenceHash;
  const referenceStoredWidth = entry.referenceStoredWidth;
  const referenceStoredHeight = entry.referenceStoredHeight;
  const referenceWidth = entry.referenceWidth;
  const referenceHeight = entry.referenceHeight;
  const referenceBytes = entry.referenceBytes;
  const referenceFormat = normalizedFormat(
    entry.referenceFormat,
    ALLOWED_SOURCE_FORMATS,
    `${label}.referenceFormat`,
  );
  const referenceMode = entry.referenceMode;
  const referenceHasAlpha = entry.referenceHasAlpha;
  const referenceExifOrientation = entry.referenceExifOrientation;
  const referenceOrientationNormalized = entry.referenceOrientationNormalized;
  const referenceFrames = entry.referenceFrames;
  const referenceAnimated = entry.referenceAnimated;
  const derivationExtension = normalizeFormatExtension(derivationSourcePath);
  const referenceExtension = normalizeFormatExtension(sourcePath);
  assert(sourceFormat === derivationExtension, `${label}.sourceFormat must match derivationSourcePath extension.`);
  assert(referenceFormat === referenceExtension, `${label}.referenceFormat must match sourcePath extension.`);
  assert(HASH_PATTERN.test(String(referenceHash ?? '')), `${label}.referenceHash is invalid.`);
  assertInteger(referenceStoredWidth, `${label}.referenceStoredWidth`);
  assertInteger(referenceStoredHeight, `${label}.referenceStoredHeight`);
  assertInteger(referenceWidth, `${label}.referenceWidth`);
  assertInteger(referenceHeight, `${label}.referenceHeight`);
  assertInteger(referenceBytes, `${label}.referenceBytes`);
  assert(typeof referenceMode === 'string' && referenceMode.trim(), `${label}.referenceMode is required.`);
  assertBoolean(referenceHasAlpha, `${label}.referenceHasAlpha`);
  assertInteger(referenceExifOrientation, `${label}.referenceExifOrientation`, { minimum: 1, maximum: 8 });
  assertBoolean(referenceOrientationNormalized, `${label}.referenceOrientationNormalized`);
  assert(
    referenceOrientationNormalized === (referenceExifOrientation !== 1),
    `${label}.referenceOrientationNormalized conflicts with EXIF orientation.`,
  );
  assertInteger(referenceFrames, `${label}.referenceFrames`);
  assertBoolean(referenceAnimated, `${label}.referenceAnimated`);
  assert(referenceAnimated === (referenceFrames > 1), `${label}.referenceAnimated conflicts with referenceFrames.`);
  if (lineageKind === 'self') {
    assert(derivationSourcePath === sourcePath, `${label} self lineage must derive from sourcePath.`);
    assert(referenceHash === entry.sourceHash, `${label} self lineage hashes must match.`);
    assert(referenceWidth === entry.sourceWidth && referenceHeight === entry.sourceHeight, `${label} self lineage dimensions must match.`);
    assert(referenceBytes === entry.sourceBytes, `${label} self lineage byte counts must match.`);
    assert(referenceFormat === sourceFormat && referenceMode === entry.sourceMode, `${label} self lineage format/mode must match.`);
    assert(referenceHasAlpha === entry.hasAlpha, `${label} self lineage alpha metadata must match.`);
    assert(
      referenceExifOrientation === entry.exifOrientation
      && referenceOrientationNormalized === entry.orientationNormalized,
      `${label} self lineage orientation metadata must match.`,
    );
    assert(referenceFrames === entry.sourceFrames && referenceAnimated === entry.animated, `${label} self lineage animation metadata must match.`);
  } else {
    assert(sourcePath.startsWith(WORK_CELLS_THUMBNAIL_ROOT), `${label} high-resolution lineage requires a Work Cells thumbnail reference.`);
    assert(entry.roles.every((role) => role.startsWith('work-cells-')), `${label} high-resolution lineage is only valid for Work Cells roles.`);
    const expectedDerivationPath = `${WORK_CELLS_HIGH_RESOLUTION_ROOT}${sourcePath.slice(WORK_CELLS_THUMBNAIL_ROOT.length)}`;
    assert(derivationSourcePath === expectedDerivationPath, `${label}.derivationSourcePath must be the exact same-name pages-by-volume counterpart.`);
    assert(
      entry.sourceWidth > referenceWidth && entry.sourceHeight > referenceHeight,
      `${label} high-resolution derivation source must be strictly larger in both dimensions.`,
    );
  }
  validateRoles(entry.roles, label);
  assert(Array.isArray(entry.variants) && entry.variants.length > 0, `${label}.variants must be non-empty.`);
  const seenProfiles = new Set();
  const normalizedEntry = { ...entry, sourcePath, sourceFormat };
  const variants = entry.variants.map((variant, variantIndex) => (
    validateVariant(
      variant,
      normalizedEntry,
      policyHash,
      variantIndex,
      seenDerivativePaths,
      seenProfiles,
    )
  ));
  const variantOrder = variants.map((variant) => [
    variant.roles.join(','),
    String(variant.width).padStart(6, '0'),
    variant.format,
    variant.profileId,
    variant.path,
  ]);
  const sortedVariantOrder = [...variantOrder].sort((left, right) => {
    for (let field = 0; field < left.length; field += 1) {
      const comparison = stableCompare(left[field], right[field]);
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
  assert(
    sameJson(variantOrder, sortedVariantOrder),
    `${label}.variants must use stable tuple order.`,
  );
  const roleCoverage = new Set(variants.flatMap((variant) => variant.roles));
  entry.roles.forEach((role) => assert(roleCoverage.has(role), `${label} has no variant covering role ${role}.`));

  assert(
    entry.fallbacksByRole && typeof entry.fallbacksByRole === 'object' && !Array.isArray(entry.fallbacksByRole),
    `${label}.fallbacksByRole is required.`,
  );
  const fallbackRoles = Object.keys(entry.fallbacksByRole).sort(stableCompare);
  assert(sameJson(fallbackRoles, entry.roles), `${label}.fallbacksByRole must cover exactly the source roles.`);
  const fallbacksByRole = {};
  for (const role of entry.roles) {
    const fallbackPath = normalizeImagePath(entry.fallbacksByRole[role], {
      label: `${label}.fallbacksByRole.${role}`,
    });
    const fallbackVariant = variants.find((variant) => variant.path === fallbackPath);
    assert(fallbackVariant?.roles.includes(role), `${label} fallback for ${role} must be a derivative declared for that role.`);
    assert(fallbackVariant.format !== 'avif', `${label} fallback for ${role} must not be AVIF-only.`);
    fallbacksByRole[role] = fallbackPath;
  }
  const fallbackPath = normalizeImagePath(entry.fallbackPath, { label: `${label}.fallbackPath` });
  assert(Object.values(fallbacksByRole).includes(fallbackPath), `${label}.fallbackPath must be one of fallbacksByRole.`);
  return {
    ...entry,
    sourcePath,
    sourceFormat,
    lineageKind,
    derivationSourcePath,
    referenceHash,
    referenceStoredWidth,
    referenceStoredHeight,
    referenceWidth,
    referenceHeight,
    referenceBytes,
    referenceFormat,
    referenceMode,
    referenceHasAlpha,
    referenceExifOrientation,
    referenceOrientationNormalized,
    referenceFrames,
    referenceAnimated,
    fallbackPath,
    fallbacksByRole,
    variants,
  };
}

function normalizeFormatExtension(repositoryPath) {
  const extension = path.posix.extname(repositoryPath).slice(1).toLowerCase();
  return extension === 'jpg' ? 'jpeg' : extension;
}

function validateToolVersions(toolVersions, label) {
  assert(toolVersions && typeof toolVersions === 'object' && !Array.isArray(toolVersions), `${label} is required.`);
  assert(typeof toolVersions.python === 'string' && /^\d+\.\d+\.\d+$/.test(toolVersions.python), `${label}.python must be an exact version.`);
  assert(typeof toolVersions.pillow === 'string' && /^\d+\.\d+(?:\.\d+)?$/.test(toolVersions.pillow), `${label}.pillow must be an exact version.`);
  assert(typeof toolVersions.libwebp === 'string' && /^\d+\.\d+(?:\.\d+)?$/.test(toolVersions.libwebp), `${label}.libwebp must be an exact version.`);
  return {
    python: toolVersions.python,
    pillow: toolVersions.pillow,
    libwebp: toolVersions.libwebp,
  };
}

export function validateMediaManifest(manifest) {
  assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'Media manifest must be an object.');
  validateNoForbiddenKeys(manifest);
  assert(manifest.schemaVersion === MEDIA_MANIFEST_SCHEMA_VERSION, `Unsupported media manifest schemaVersion: ${manifest.schemaVersion}`);
  assert(typeof manifest.generatorVersion === 'string' && manifest.generatorVersion.trim(), 'generatorVersion is required.');
  assert(typeof manifest.policyHash === 'string' && HASH_PATTERN.test(manifest.policyHash), 'policyHash must be SHA-256.');
  const toolVersions = validateToolVersions(manifest.toolVersions, 'toolVersions');
  assert(Array.isArray(manifest.media), 'media must be an array.');
  const seenSources = new Set();
  const seenDerivativePaths = new Set();
  const media = manifest.media.map((entry, index) => (
    validateEntry(entry, manifest.policyHash, index, seenSources, seenDerivativePaths)
  ));
  const sourceOrder = media.map((entry) => entry.sourcePath);
  assert(sameJson(sourceOrder, sorted(sourceOrder)), 'media entries must use stable sourcePath order.');
  const totals = {
    sources: media.length,
    referenceBytes: media.reduce((sum, entry) => sum + entry.referenceBytes, 0),
    sourceBytes: media.reduce((sum, entry) => sum + entry.sourceBytes, 0),
    variants: media.reduce((sum, entry) => sum + entry.variants.length, 0),
    derivativeBytes: media.reduce((sum, entry) => sum + entry.variants.reduce((variantSum, variant) => variantSum + variant.bytes, 0), 0),
  };
  assert(manifest.totals && typeof manifest.totals === 'object', 'manifest.totals is required.');
  for (const [key, expected] of Object.entries(totals)) {
    assert(manifest.totals[key] === expected, `manifest.totals.${key} must equal ${expected}.`);
  }
  return {
    ...manifest,
    toolVersions,
    media,
    totals,
  };
}

function validateProfile(profile, index) {
  const label = `profiles[${index}]`;
  assert(profile && typeof profile === 'object' && !Array.isArray(profile), `${label} must be an object.`);
  assert(PROFILE_PATTERN.test(String(profile.id ?? '')), `${label}.id is invalid.`);
  const format = normalizedFormat(profile.format, ALLOWED_OUTPUT_FORMATS, `${label}.format`);
  assertInteger(profile.width, `${label}.width`);
  validateRoles(profile.roles, label);
  assertBoolean(profile.preserveAlpha, `${label}.preserveAlpha`);
  assert(!(format === 'jpeg' && profile.preserveAlpha), `${label} cannot preserve alpha with JPEG.`);
  const encoderOptions = encoderOptionsForProfile({ ...profile, format }, label);
  return {
    ...profile,
    format,
    encoderOptions,
  };
}

function validateBudgets(budgets) {
  assert(budgets && typeof budgets === 'object' && !Array.isArray(budgets), 'policy.budgets is required.');
  assert(budgets.status === 'frozen', 'policy.budgets.status must be frozen.');
  assertInteger(budgets.distBytes, 'policy.budgets.distBytes');
  assertInteger(budgets.pagesArtifactBytes, 'policy.budgets.pagesArtifactBytes');
  assert(
    budgets.routeTransferBytes && typeof budgets.routeTransferBytes === 'object' && !Array.isArray(budgets.routeTransferBytes),
    'policy.budgets.routeTransferBytes must be an object.',
  );
  assert(Object.keys(budgets.routeTransferBytes).length > 0, 'policy.budgets.routeTransferBytes must be non-empty.');
  for (const [route, bytes] of Object.entries(budgets.routeTransferBytes)) {
    assert(route.startsWith('#/'), `Invalid route transfer budget key: ${route}`);
    assertInteger(bytes, `policy.budgets.routeTransferBytes.${route}`);
  }
}

export function validateMediaQualityPolicy(policy) {
  assert(policy && typeof policy === 'object' && !Array.isArray(policy), 'Media quality policy must be an object.');
  validateNoForbiddenKeys(policy);
  assert(policy.schemaVersion === MEDIA_POLICY_SCHEMA_VERSION, `Unsupported media policy schemaVersion: ${policy.schemaVersion}`);
  assert(policy.status === 'accepted', 'Media quality policy status must be accepted; the template is not production policy.');
  assert(policy.encoder && typeof policy.encoder === 'object' && !Array.isArray(policy.encoder), 'policy.encoder is required.');
  assert(policy.encoder.name === 'Pillow', 'policy.encoder.name must be Pillow.');
  assert(typeof policy.encoder.version === 'string' && /^\d+\.\d+(?:\.\d+)?$/.test(policy.encoder.version), 'policy.encoder.version must be an exact Pillow version.');
  assert(typeof policy.encoder.pythonVersion === 'string' && /^\d+\.\d+\.\d+$/.test(policy.encoder.pythonVersion), 'policy.encoder.pythonVersion must be exact.');
  assert(typeof policy.encoder.libwebpVersion === 'string' && /^\d+\.\d+(?:\.\d+)?$/.test(policy.encoder.libwebpVersion), 'policy.encoder.libwebpVersion must be exact.');
  assert(Array.isArray(policy.profiles) && policy.profiles.length > 0, 'policy.profiles must be non-empty.');
  const profiles = policy.profiles.map(validateProfile);
  unique(profiles.map((profile) => profile.id), 'policy profile ids');
  const profileOrder = profiles.map((profile) => profile.id);
  assert(sameJson(profileOrder, sorted(profileOrder)), 'policy profiles must use stable id order.');
  const roleCoverage = new Set(profiles.flatMap((profile) => profile.roles));
  for (const role of Object.keys(MEDIA_ROLES)) {
    assert(roleCoverage.has(role), `Media quality policy does not cover role ${role}.`);
  }

  assert(
    policy.alphaStrategy && typeof policy.alphaStrategy === 'object' && !Array.isArray(policy.alphaStrategy),
    'policy.alphaStrategy is required.',
  );
  assert(policy.alphaStrategy.preserveWhenSupported === true, 'policy.alphaStrategy.preserveWhenSupported must be true.');
  assert(HEX_COLOR_PATTERN.test(String(policy.alphaStrategy.flattenColor ?? '')), 'policy.alphaStrategy.flattenColor must be a six-digit hex color.');

  assert(
    policy.fallbackStrategy && typeof policy.fallbackStrategy === 'object' && !Array.isArray(policy.fallbackStrategy),
    'policy.fallbackStrategy is required.',
  );
  assert(policy.fallbackStrategy.preferDerivative === true, 'policy.fallbackStrategy.preferDerivative must be true.');
  assert(policy.fallbackStrategy.allowSourcePath === false, 'policy.fallbackStrategy.allowSourcePath must be false.');
  const formatOrder = policy.fallbackStrategy.formatOrder;
  assert(Array.isArray(formatOrder) && formatOrder.length > 0, 'policy.fallbackStrategy.formatOrder must be non-empty.');
  const normalizedFormatOrder = formatOrder.map((format, index) => (
    normalizedFormat(format, ALLOWED_OUTPUT_FORMATS, `policy.fallbackStrategy.formatOrder[${index}]`)
  ));
  unique(normalizedFormatOrder, 'policy fallback format order');
  assert(normalizedFormatOrder.some((format) => format !== 'avif'), 'policy fallback format order cannot be AVIF-only.');

  assert(policy.visualAcceptance && typeof policy.visualAcceptance === 'object', 'policy.visualAcceptance is required.');
  assert(policy.visualAcceptance.status === 'pass', 'policy.visualAcceptance.status must be pass.');
  assert(Array.isArray(policy.visualAcceptance.sampleMediaIds), 'visualAcceptance.sampleMediaIds must be an array.');
  assert(policy.visualAcceptance.sampleMediaIds.length > 0, 'visualAcceptance.sampleMediaIds must be non-empty.');
  unique(policy.visualAcceptance.sampleMediaIds, 'visualAcceptance.sampleMediaIds');
  validateBudgets(policy.budgets);
  return {
    ...policy,
    profiles,
    fallbackStrategy: {
      ...policy.fallbackStrategy,
      formatOrder: normalizedFormatOrder,
    },
  };
}

export function manifestIndex(manifest) {
  const validated = validateMediaManifest(manifest);
  return new Map(validated.media.map((entry) => [entry.sourcePath, entry]));
}

export function declaredDerivativePaths(manifest) {
  const validated = validateMediaManifest(manifest);
  return new Set(validated.media.flatMap((entry) => entry.variants.map((variant) => variant.path)));
}

export function declaredFallbackPaths(manifest) {
  const validated = validateMediaManifest(manifest);
  return new Set(validated.media.flatMap((entry) => Object.values(entry.fallbacksByRole)));
}
