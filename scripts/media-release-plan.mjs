import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  MEDIA_MANIFEST_PATH,
  MEDIA_REFERENCE_REPORT_PATH,
  assertAllowedOutput,
  normalizeRepositoryPath,
  projectPath,
  stableCompare,
} from './media-path-policy.mjs';
import {
  declaredDerivativePaths,
  declaredFallbackPaths,
  validateMediaManifest,
} from './media-manifest-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = 'reports/portfolio/fr-p5/fr-p5-media-release-plan.json';
const carmelaBooksIndexPath = 'public/runtime/carmela/books.json';
const runtimeRoot = 'public/runtime';
const assetsRoot = 'assets';

async function readJson(repositoryPath) {
  return JSON.parse(await readFile(projectPath(rootDir, repositoryPath), 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function walkFiles(repositoryRoot) {
  const absoluteRoot = projectPath(rootDir, repositoryRoot);
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
  await walk(absoluteRoot);
  return files.sort(stableCompare);
}

function assertPublishablePath(value, label) {
  const repositoryPath = normalizeRepositoryPath(value, { label, requirePublic: false });
  const forbidden = [
    'source/',
    'source-private/',
    'private/',
    'data-private/',
    'task-scratch/',
    'test-results/',
    'playwright-report/',
  ];
  if (forbidden.some((prefix) => repositoryPath.startsWith(prefix))) {
    throw new Error(`${label} points at a forbidden release root: ${repositoryPath}`);
  }
  return repositoryPath;
}

export async function createMediaReleasePlan() {
  const manifest = validateMediaManifest(await readJson(MEDIA_MANIFEST_PATH));
  const inventory = await readJson(MEDIA_REFERENCE_REPORT_PATH);
  const books = await readJson(carmelaBooksIndexPath);
  const allowlist = new Set(['index.html', '.nojekyll', MEDIA_MANIFEST_PATH]);
  for (const filePath of await walkFiles(assetsRoot)) allowlist.add(assertPublishablePath(filePath, 'Application asset'));
  for (const filePath of await walkFiles(runtimeRoot)) allowlist.add(assertPublishablePath(filePath, 'Runtime file'));
  for (const book of books.books) {
    allowlist.add(assertPublishablePath(book.assetPath, `Carmela ${book.slug} asset path`));
    allowlist.add(assertPublishablePath(book.companionPath, `Carmela ${book.slug} companion path`));
  }
  for (const audio of inventory.audio ?? []) {
    allowlist.add(assertPublishablePath(audio.path, `Carmela ${audio.ownerId} audio path`));
  }
  for (const derivativePath of declaredDerivativePaths(manifest)) {
    allowlist.add(assertPublishablePath(derivativePath, 'Media derivative'));
  }
  for (const fallbackPath of declaredFallbackPaths(manifest)) {
    allowlist.add(assertPublishablePath(fallbackPath, 'Media fallback'));
  }

  const files = [...allowlist].sort(stableCompare);
  const derivativeFiles = files.filter((filePath) => filePath.startsWith('public/media/derived/'));
  const fallbackOriginals = files.filter((filePath) => (
    filePath.startsWith('public/')
    && !filePath.startsWith('public/media/')
    && /\.(?:avif|gif|jpe?g|png|webp)$/i.test(filePath)
  ));
  return {
    schemaVersion: 1,
    sourceManifest: MEDIA_MANIFEST_PATH,
    sourceInventory: MEDIA_REFERENCE_REPORT_PATH,
    files,
    counts: {
      total: files.length,
      derivatives: derivativeFiles.length,
      fallbackOriginals: fallbackOriginals.length,
      runtimeFiles: files.filter((filePath) => filePath.startsWith('public/runtime/')).length,
      applicationAssets: files.filter((filePath) => filePath.startsWith('assets/')).length,
      audioFiles: files.filter((filePath) => /\.(?:aac|flac|m4a|mp3|ogg|wav)$/i.test(filePath)).length,
      carmelaContentJson: files.filter((filePath) => /public\/books\/不一样的卡梅拉\/.+\/(?:book-assets|companion)\.json$/u.test(filePath)).length,
    },
    derivativeFiles,
    fallbackOriginals,
  };
}

function parseArguments(argv) {
  const options = { mode: 'print' };
  for (const argument of argv) {
    if (argument === '--write') options.mode = 'write';
    else if (argument === '--check') options.mode = 'check';
    else throw new Error(`Unknown media release plan argument: ${argument}`);
  }
  return options;
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const plan = await createMediaReleasePlan();
  const serialized = stableJson(plan);
  const target = projectPath(rootDir, outputPath);
  if (options.mode === 'write') {
    assertAllowedOutput(rootDir, target);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, serialized, 'utf8');
    console.log(`Media release plan written: ${outputPath}`);
  } else if (options.mode === 'check') {
    const current = await readFile(target, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') throw new Error(`Media release plan is missing: ${outputPath}`);
      throw error;
    });
    if (current.replaceAll('\r\n', '\n') !== serialized) {
      throw new Error(`Media release plan is stale: ${outputPath}`);
    }
    console.log('Media release plan is current.');
  } else {
    process.stdout.write(serialized);
  }
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
