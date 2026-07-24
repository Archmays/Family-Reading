import {
  createHash,
} from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import {
  normalizeRepositoryPath,
  projectPath,
  stableCompare,
} from './media-path-policy.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const EMPTY_SHA256 = createHash('sha256').update('').digest('hex');

function assertInside(baseDir, targetPath, label) {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  const relative = path.relative(base, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside ${base}.`);
  }
  return target;
}

function normalizeReleasePath(value) {
  const normalized = normalizeRepositoryPath(value, {
    label: 'Release plan path',
    requirePublic: false,
  });
  const forbidden = [
    'source/',
    'source-private/',
    'private/',
    'data-private/',
    'task-scratch/',
    'test-results/',
    'playwright-report/',
    'reports/',
    'docs/',
  ];
  if (forbidden.some((prefix) => normalized.startsWith(prefix))) {
    throw new Error(`Release plan contains forbidden path: ${normalized}`);
  }
  return normalized;
}

export function validateMediaReleasePlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new Error('Media release plan must be an object.');
  }
  if (plan.schemaVersion !== 1) throw new Error(`Unsupported media release plan schemaVersion: ${plan.schemaVersion}`);
  if (plan.sourceManifest !== 'public/media/media-manifest.json') {
    throw new Error('Media release plan sourceManifest must be public/media/media-manifest.json.');
  }
  if (plan.sourceInventory !== 'reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json') {
    throw new Error('Media release plan sourceInventory must be the canonical FR-P5 inventory.');
  }
  if (
    plan.entrypoints?.application !== 'index.html'
    || plan.entrypoints?.runtime !== 'public/runtime/index.json'
    || plan.entrypoints?.runtimeManifest !== 'public/runtime/runtime-manifest.json'
  ) {
    throw new Error('Media release plan entrypoints must match the static application/runtime contract.');
  }
  if (!Array.isArray(plan.files) || plan.files.length === 0) throw new Error('Media release plan files must be non-empty.');
  const files = plan.files.map(normalizeReleasePath);
  if (new Set(files).size !== files.length) throw new Error('Media release plan contains duplicate files.');
  const sorted = [...files].sort(stableCompare);
  if (JSON.stringify(files) !== JSON.stringify(sorted)) {
    throw new Error('Media release plan files must use stable ordinal order.');
  }
  for (const required of ['index.html', '.nojekyll', 'public/media/media-manifest.json']) {
    if (!files.includes(required)) throw new Error(`Media release plan is missing required file: ${required}`);
  }
  const categoryNames = ['applicationFiles', 'runtimeJsonFiles', 'audioFiles', 'mediaFiles'];
  const categories = {};
  for (const categoryName of categoryNames) {
    if (!Array.isArray(plan[categoryName])) {
      throw new Error(`Media release plan ${categoryName} must be an array.`);
    }
    if (categoryName !== 'audioFiles' && plan[categoryName].length === 0) {
      throw new Error(`Media release plan ${categoryName} must be non-empty.`);
    }
    const categoryFiles = plan[categoryName].map(normalizeReleasePath);
    if (new Set(categoryFiles).size !== categoryFiles.length) {
      throw new Error(`Media release plan ${categoryName} contains duplicate files.`);
    }
    if (JSON.stringify(categoryFiles) !== JSON.stringify([...categoryFiles].sort(stableCompare))) {
      throw new Error(`Media release plan ${categoryName} must use stable ordinal order.`);
    }
    categories[categoryName] = categoryFiles;
  }
  if (
    categories.applicationFiles.some((filePath) => filePath !== 'index.html' && !filePath.startsWith('assets/'))
  ) {
    throw new Error('Media release plan applicationFiles must stay in index.html or assets/.');
  }
  if (!categories.applicationFiles.includes('index.html')) {
    throw new Error('Media release plan applicationFiles must include index.html.');
  }
  if (categories.runtimeJsonFiles.some((filePath) => !filePath.startsWith('public/') || !filePath.endsWith('.json'))) {
    throw new Error('Media release plan runtimeJsonFiles must be public JSON files.');
  }
  for (const requiredRuntime of ['public/runtime/index.json', 'public/runtime/runtime-manifest.json']) {
    if (!categories.runtimeJsonFiles.includes(requiredRuntime)) {
      throw new Error(`Media release plan runtimeJsonFiles is missing ${requiredRuntime}.`);
    }
  }
  if (categories.audioFiles.some((filePath) => !/\.(?:aac|flac|m4a|mp3|ogg|wav)$/i.test(filePath))) {
    throw new Error('Media release plan audioFiles contains a non-audio path.');
  }
  if (!categories.mediaFiles.includes('public/media/media-manifest.json')) {
    throw new Error('Media release plan mediaFiles is missing the media manifest.');
  }
  if (categories.mediaFiles.some((filePath) => (
    filePath !== 'public/media/media-manifest.json'
    && !filePath.startsWith('public/media/derived/')
  ))) {
    throw new Error('Media release plan mediaFiles may contain only the manifest and deterministic derivatives.');
  }
  const categoryUnion = [
    ...categories.applicationFiles,
    ...categories.runtimeJsonFiles,
    ...categories.audioFiles,
    ...categories.mediaFiles,
  ];
  if (new Set(categoryUnion).size !== categoryUnion.length) {
    throw new Error('Media release plan categories overlap.');
  }
  const expectedFiles = ['.nojekyll', ...categoryUnion].sort(stableCompare);
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error('Media release plan files must exactly equal the canonical category union.');
  }

  if (!Array.isArray(plan.integrity) || plan.integrity.length !== files.length) {
    throw new Error('Media release plan integrity must cover every release file.');
  }
  const integrity = plan.integrity.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Media release plan integrity[${index}] must be an object.`);
    }
    const filePath = normalizeReleasePath(item.path);
    if (!Number.isInteger(item.bytes) || item.bytes < 0) {
      throw new Error(`Media release plan integrity bytes are invalid: ${filePath}`);
    }
    if (!HASH_PATTERN.test(String(item.sha256 ?? ''))) {
      throw new Error(`Media release plan integrity SHA-256 is invalid: ${filePath}`);
    }
    return { path: filePath, bytes: item.bytes, sha256: item.sha256 };
  });
  if (JSON.stringify(integrity.map((item) => item.path)) !== JSON.stringify(files)) {
    throw new Error('Media release plan integrity must follow the exact release file order.');
  }
  const integrityByPath = new Map(integrity.map((item) => [item.path, item]));
  const nojekyll = integrity.find((item) => item.path === '.nojekyll');
  if (nojekyll.bytes !== 0 || nojekyll.sha256 !== EMPTY_SHA256) {
    throw new Error('Media release plan .nojekyll integrity must describe an empty file.');
  }

  const accountingGroupNames = [
    'mediaShardFiles',
    'derivativeFiles',
    'fallbackFiles',
    'fallbackOriginals',
  ];
  const accountingGroups = {};
  for (const groupName of accountingGroupNames) {
    if (!Array.isArray(plan[groupName])) {
      throw new Error(`Media release plan ${groupName} must be an array.`);
    }
    const groupFiles = plan[groupName].map(normalizeReleasePath);
    if (new Set(groupFiles).size !== groupFiles.length) {
      throw new Error(`Media release plan ${groupName} contains duplicate files.`);
    }
    if (JSON.stringify(groupFiles) !== JSON.stringify([...groupFiles].sort(stableCompare))) {
      throw new Error(`Media release plan ${groupName} must use stable ordinal order.`);
    }
    if (groupFiles.some((filePath) => !integrityByPath.has(filePath))) {
      throw new Error(`Media release plan ${groupName} must stay inside the exact release file set.`);
    }
    accountingGroups[groupName] = groupFiles;
  }
  if (accountingGroups.mediaShardFiles.some((filePath) => !categories.runtimeJsonFiles.includes(filePath))) {
    throw new Error('Media release plan mediaShardFiles must be a subset of runtimeJsonFiles.');
  }
  for (const groupName of ['derivativeFiles', 'fallbackFiles']) {
    if (accountingGroups[groupName].some((filePath) => !categories.mediaFiles.includes(filePath))) {
      throw new Error(`Media release plan ${groupName} must be a subset of mediaFiles.`);
    }
  }
  if (accountingGroups.fallbackOriginals.some((filePath) => !accountingGroups.fallbackFiles.includes(filePath))) {
    throw new Error('Media release plan fallbackOriginals must be a subset of fallbackFiles.');
  }

  const bytesFor = (filePaths) => filePaths.reduce(
    (sum, filePath) => sum + integrityByPath.get(filePath).bytes,
    0,
  );
  const expectedByteTotals = {
    total: bytesFor(files),
    applicationFiles: bytesFor(categories.applicationFiles),
    runtimeJsonFiles: bytesFor(categories.runtimeJsonFiles),
    mediaShardFiles: bytesFor(accountingGroups.mediaShardFiles),
    audioFiles: bytesFor(categories.audioFiles),
    mediaFiles: bytesFor(categories.mediaFiles),
    derivativeFiles: bytesFor(accountingGroups.derivativeFiles),
    fallbackFiles: bytesFor(accountingGroups.fallbackFiles),
    fallbackOriginals: bytesFor(accountingGroups.fallbackOriginals),
  };
  if (!plan.byteTotals || typeof plan.byteTotals !== 'object' || Array.isArray(plan.byteTotals)) {
    throw new Error('Media release plan byteTotals must be an object.');
  }
  for (const [key, expectedBytes] of Object.entries(expectedByteTotals)) {
    if (!Number.isInteger(plan.byteTotals[key]) || plan.byteTotals[key] !== expectedBytes) {
      throw new Error(`Media release plan byteTotals.${key} must equal ${expectedBytes}.`);
    }
  }

  if (!plan.counts || plan.counts.total !== files.length) {
    throw new Error('Media release plan counts.total must equal files.length.');
  }
  for (const categoryName of categoryNames) {
    if (plan.counts[categoryName] !== categories[categoryName].length) {
      throw new Error(`Media release plan counts.${categoryName} must equal ${categories[categoryName].length}.`);
    }
  }
  for (const groupName of accountingGroupNames) {
    if (plan.counts[groupName] !== accountingGroups[groupName].length) {
      throw new Error(`Media release plan counts.${groupName} must equal ${accountingGroups[groupName].length}.`);
    }
  }
  return {
    ...plan,
    ...categories,
    ...accountingGroups,
    files,
    integrity,
    byteTotals: expectedByteTotals,
  };
}

export async function loadMediaReleasePlan(rootDir, planPath) {
  const plan = JSON.parse(await readFile(projectPath(rootDir, planPath), 'utf8'));
  return validateMediaReleasePlan(plan);
}

async function copyOne(rootDir, outputDir, repositoryPath) {
  const target = assertInside(outputDir, path.resolve(outputDir, ...repositoryPath.split('/')), 'Release output');
  await mkdir(path.dirname(target), { recursive: true });
  if (repositoryPath === '.nojekyll') {
    await writeFile(target, '', 'utf8');
    return;
  }
  const source = projectPath(rootDir, repositoryPath);
  await copyFile(source, target, constants.COPYFILE_FICLONE);
}

async function walkOutput(outputDir) {
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => stableCompare(left.name, right.name));
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) files.push(path.relative(outputDir, target).split(path.sep).join('/'));
    }
  }
  await walk(outputDir);
  return files.sort(stableCompare);
}

export async function auditMediaReleaseOutput(outputDir, plan) {
  const expected = plan.files;
  const actual = await walkOutput(outputDir);
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const integrityByPath = new Map(plan.integrity.map((item) => [item.path, item]));
  const mismatched = [];
  for (const filePath of actual.filter((item) => expectedSet.has(item))) {
    const bytes = await readFile(path.resolve(outputDir, ...filePath.split('/')));
    const expectedIntegrity = integrityByPath.get(filePath);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== expectedIntegrity.bytes || sha256 !== expectedIntegrity.sha256) {
      mismatched.push(filePath);
    }
  }
  return {
    missing: expected.filter((filePath) => !actualSet.has(filePath)),
    extra: actual.filter((filePath) => !expectedSet.has(filePath)),
    mismatched,
    expectedCount: expected.length,
    actualCount: actual.length,
  };
}

export async function copyMediaReleasePlan({ rootDir, outputDir, plan, clean = true }) {
  const validated = validateMediaReleasePlan(plan);
  const output = path.resolve(outputDir);
  const root = path.resolve(rootDir);
  if (output === root || !path.basename(output)) throw new Error('Refusing to use the project root as a release output.');
  const relative = path.relative(root, output);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Release output must stay inside the project root.');
  }
  if (clean) await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const repositoryPath of validated.files) {
    await copyOne(root, output, repositoryPath);
  }
  const audit = await auditMediaReleaseOutput(output, validated);
  if (audit.missing.length || audit.extra.length || audit.mismatched.length) {
    throw new Error(`Release plan copy mismatch: missing=${audit.missing.length} extra=${audit.extra.length} mismatched=${audit.mismatched.length}`);
  }
  return audit;
}
