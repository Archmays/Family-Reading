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
  return { ...plan, files };
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
  return {
    missing: expected.filter((filePath) => !actualSet.has(filePath)),
    extra: actual.filter((filePath) => !expectedSet.has(filePath)),
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
  if (audit.missing.length || audit.extra.length) {
    throw new Error(`Release plan copy mismatch: missing=${audit.missing.length} extra=${audit.extra.length}`);
  }
  return audit;
}
