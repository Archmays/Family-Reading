import {
  MEDIA_ROLES,
  normalizeImagePath,
  stableCompare,
} from './media-path-policy.mjs';

export const MEDIA_MANIFEST_SCHEMA_VERSION = 1;
export const MEDIA_POLICY_SCHEMA_VERSION = 1;

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const PROFILE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const ALLOWED_FORMATS = new Set(['avif', 'jpeg', 'jpg', 'png', 'webp']);
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

function assertInteger(value, label, { minimum = 1 } = {}) {
  assert(Number.isInteger(value) && value >= minimum, `${label} must be an integer >= ${minimum}.`);
}

function sorted(values) {
  return [...values].sort(stableCompare);
}

function unique(values, label) {
  assert(new Set(values).size === values.length, `${label} contains duplicates.`);
}

function validateNoForbiddenKeys(value, currentPath = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoForbiddenKeys(item, `${currentPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!FORBIDDEN_KEYS.has(key), `Media manifest contains forbidden nondeterministic/private key ${currentPath}.${key}.`);
    validateNoForbiddenKeys(child, `${currentPath}.${key}`);
  }
}

function validateRoles(roles, label) {
  assert(Array.isArray(roles) && roles.length > 0, `${label}.roles must be a non-empty array.`);
  unique(roles, `${label}.roles`);
  assert(JSON.stringify(roles) === JSON.stringify(sorted(roles)), `${label}.roles must use stable ordinal order.`);
  roles.forEach((role) => assert(Boolean(MEDIA_ROLES[role]), `${label} contains unknown role ${role}.`));
}

function validateVariant(variant, entry, index, seenPaths) {
  const label = `${entry.sourcePath}.variants[${index}]`;
  assert(variant && typeof variant === 'object' && !Array.isArray(variant), `${label} must be an object.`);
  assert(PROFILE_PATTERN.test(String(variant.profileId ?? '')), `${label}.profileId is invalid.`);
  const normalizedPath = normalizeImagePath(variant.path, { label: `${label}.path` });
  assert(normalizedPath.startsWith('public/media/derived/'), `${label}.path must stay under public/media/derived/.`);
  assert(!seenPaths.has(normalizedPath), `Duplicate derivative path: ${normalizedPath}`);
  seenPaths.add(normalizedPath);
  const format = String(variant.format ?? '').toLowerCase();
  assert(ALLOWED_FORMATS.has(format), `${label}.format is unsupported: ${format}`);
  assertInteger(variant.width, `${label}.width`);
  assertInteger(variant.height, `${label}.height`);
  assertInteger(variant.bytes, `${label}.bytes`);
  assert(HASH_PATTERN.test(String(variant.sha256 ?? '')), `${label}.sha256 is invalid.`);
  validateRoles(variant.roles, label);
  if (variant.sourceHash !== undefined) {
    assert(variant.sourceHash === entry.sourceHash, `${label}.sourceHash must match its source entry.`);
  }
  if (variant.lossless !== undefined) assert(typeof variant.lossless === 'boolean', `${label}.lossless must be boolean.`);
  if (variant.quality !== undefined) {
    assert(Number.isFinite(variant.quality) && variant.quality >= 0 && variant.quality <= 100, `${label}.quality must be between 0 and 100.`);
  }
  return {
    ...variant,
    path: normalizedPath,
    format,
  };
}

function validateEntry(entry, index, seenSources, seenDerivativePaths) {
  const label = `media[${index}]`;
  assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${label} must be an object.`);
  const sourcePath = normalizeImagePath(entry.sourcePath, { label: `${label}.sourcePath` });
  assert(!seenSources.has(sourcePath), `Duplicate source media entry: ${sourcePath}`);
  seenSources.add(sourcePath);
  assert(HASH_PATTERN.test(String(entry.sourceHash ?? '')), `${label}.sourceHash is invalid.`);
  assertInteger(entry.sourceWidth, `${label}.sourceWidth`);
  assertInteger(entry.sourceHeight, `${label}.sourceHeight`);
  assertInteger(entry.sourceBytes, `${label}.sourceBytes`);
  const sourceFormat = String(entry.sourceFormat ?? '').toLowerCase();
  assert(ALLOWED_FORMATS.has(sourceFormat), `${label}.sourceFormat is unsupported: ${sourceFormat}`);
  assert(typeof entry.hasAlpha === 'boolean', `${label}.hasAlpha must be boolean.`);
  validateRoles(entry.roles, label);
  assert(Array.isArray(entry.variants) && entry.variants.length > 0, `${label}.variants must be non-empty.`);
  const variants = entry.variants.map((variant, variantIndex) => (
    validateVariant(variant, { ...entry, sourcePath }, variantIndex, seenDerivativePaths)
  ));
  const variantOrder = variants.map((variant) => [
    variant.roles.join(','),
    String(variant.width).padStart(6, '0'),
    variant.format,
    variant.profileId,
    variant.path,
  ].join('|'));
  assert(JSON.stringify(variantOrder) === JSON.stringify(sorted(variantOrder)), `${label}.variants must use stable order.`);
  const fallbackPath = entry.fallbackPath
    ? normalizeImagePath(entry.fallbackPath, { label: `${label}.fallbackPath` })
    : sourcePath;
  assert(
    fallbackPath === sourcePath || variants.some((variant) => variant.path === fallbackPath),
    `${label}.fallbackPath must be the source or a declared derivative.`,
  );
  return {
    ...entry,
    sourcePath,
    sourceFormat,
    fallbackPath,
    variants,
  };
}

export function validateMediaManifest(manifest) {
  assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'Media manifest must be an object.');
  validateNoForbiddenKeys(manifest);
  assert(manifest.schemaVersion === MEDIA_MANIFEST_SCHEMA_VERSION, `Unsupported media manifest schemaVersion: ${manifest.schemaVersion}`);
  assert(typeof manifest.generatorVersion === 'string' && manifest.generatorVersion.trim(), 'generatorVersion is required.');
  assert(typeof manifest.policyHash === 'string' && HASH_PATTERN.test(manifest.policyHash), 'policyHash must be SHA-256.');
  assert(Array.isArray(manifest.media), 'media must be an array.');
  const seenSources = new Set();
  const seenDerivativePaths = new Set();
  const media = manifest.media.map((entry, index) => validateEntry(entry, index, seenSources, seenDerivativePaths));
  const sourceOrder = media.map((entry) => entry.sourcePath);
  assert(JSON.stringify(sourceOrder) === JSON.stringify(sorted(sourceOrder)), 'media entries must use stable sourcePath order.');
  const totals = {
    sources: media.length,
    sourceBytes: media.reduce((sum, entry) => sum + entry.sourceBytes, 0),
    variants: media.reduce((sum, entry) => sum + entry.variants.length, 0),
    derivativeBytes: media.reduce((sum, entry) => sum + entry.variants.reduce((variantSum, variant) => variantSum + variant.bytes, 0), 0),
  };
  if (manifest.totals) {
    for (const [key, expected] of Object.entries(totals)) {
      assert(manifest.totals[key] === expected, `manifest.totals.${key} must equal ${expected}.`);
    }
  }
  return {
    ...manifest,
    media,
    totals,
  };
}

function validateProfile(profile, index) {
  const label = `profiles[${index}]`;
  assert(profile && typeof profile === 'object' && !Array.isArray(profile), `${label} must be an object.`);
  assert(PROFILE_PATTERN.test(String(profile.id ?? '')), `${label}.id is invalid.`);
  assert(ALLOWED_FORMATS.has(String(profile.format ?? '').toLowerCase()), `${label}.format is unsupported.`);
  assertInteger(profile.width, `${label}.width`);
  validateRoles(profile.roles, label);
  if (profile.quality !== undefined) {
    assert(Number.isFinite(profile.quality) && profile.quality >= 0 && profile.quality <= 100, `${label}.quality must be between 0 and 100.`);
  }
  if (profile.lossless !== undefined) assert(typeof profile.lossless === 'boolean', `${label}.lossless must be boolean.`);
  if (profile.preserveAlpha !== undefined) assert(typeof profile.preserveAlpha === 'boolean', `${label}.preserveAlpha must be boolean.`);
  return {
    ...profile,
    format: String(profile.format).toLowerCase(),
  };
}

export function validateMediaQualityPolicy(policy) {
  assert(policy && typeof policy === 'object' && !Array.isArray(policy), 'Media quality policy must be an object.');
  validateNoForbiddenKeys(policy);
  assert(policy.schemaVersion === MEDIA_POLICY_SCHEMA_VERSION, `Unsupported media policy schemaVersion: ${policy.schemaVersion}`);
  assert(typeof policy.encoder === 'object' && !Array.isArray(policy.encoder), 'policy.encoder is required.');
  assert(typeof policy.encoder.name === 'string' && policy.encoder.name.trim(), 'policy.encoder.name is required.');
  assert(typeof policy.encoder.version === 'string' && policy.encoder.version.trim(), 'policy.encoder.version is required.');
  assert(Array.isArray(policy.profiles) && policy.profiles.length > 0, 'policy.profiles must be non-empty.');
  const profiles = policy.profiles.map(validateProfile);
  unique(profiles.map((profile) => profile.id), 'policy profile ids');
  const profileOrder = profiles.map((profile) => profile.id);
  assert(JSON.stringify(profileOrder) === JSON.stringify(sorted(profileOrder)), 'policy profiles must use stable id order.');
  const roleCoverage = new Set(profiles.flatMap((profile) => profile.roles));
  for (const role of Object.keys(MEDIA_ROLES)) {
    assert(roleCoverage.has(role), `Media quality policy does not cover role ${role}.`);
  }
  assert(typeof policy.visualAcceptance === 'object', 'policy.visualAcceptance is required.');
  assert(Array.isArray(policy.visualAcceptance.sampleMediaIds), 'visualAcceptance.sampleMediaIds must be an array.');
  assert(policy.visualAcceptance.sampleMediaIds.length > 0, 'visualAcceptance.sampleMediaIds must be non-empty.');
  return { ...policy, profiles };
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
  return new Set(validated.media.map((entry) => entry.fallbackPath));
}
