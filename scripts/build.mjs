import { spawnSync } from 'node:child_process';
import { access, mkdir, readdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'dist');
const outputDirName = 'dist';
const publishedBookCount = 12;
const excludedDirectoryNames = new Set([
  'ocr',
  'source',
  'visual-annotation-bundles',
  'screenshot-candidates',
  'review-contact-sheets',
  'scene-notes',
  'audio-extracts',
  'extracted-audio',
  'audio-fallback',
  'transcript',
  'transcripts',
]);
const excludedRelativeDirectories = new Set([
  'public/assets/cells-at-work/pages-by-volume',
  'public/assets/cells-at-work/pages-by-topic',
]);
const excludedExtensions = new Set([
  '.pdf',
  '.epub',
  '.zip',
  '.7z',
  '.tar',
  '.gz',
  '.log',
  '.tmp',
  '.mp4',
  '.mov',
  '.m4v',
  '.webm',
  '.srt',
  '.vtt',
  '.ass',
  '.ssa',
]);
const excludedFileNames = new Set(['volume-page-index.json', 'review-index.md', 'review-topics.json']);
const seriesIndexPath = path.join(rootDir, 'public', 'books', '不一样的卡梅拉', 'series.json');
const publicBooksIndexPath = path.join(rootDir, 'public', 'books', 'index.json');
const contentTypesPath = path.join(rootDir, 'public', 'books', 'content-types.json');
const workCellsDraftDir = path.join(rootDir, 'public', 'books', '工作细胞');
const workCellsPageMapPath = path.join(rootDir, 'data', 'cells-at-work', 'page-map.json');

function assertInsideRoot(targetPath) {
  const relative = path.relative(rootDir, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project root: ${targetPath}`);
  }
}

function assertSafeOutputDirectory() {
  assertInsideRoot(outputDir);
  if (path.basename(outputDir) !== outputDirName) {
    throw new Error(`Unexpected output directory: ${outputDir}`);
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function projectRelativePath(targetPath) {
  return path.relative(rootDir, targetPath).split(path.sep).join('/');
}

function isExcludedRelativeDirectory(sourcePath) {
  const relativePath = projectRelativePath(sourcePath);
  return [...excludedRelativeDirectories].some((excludedPath) => (
    relativePath === excludedPath || relativePath.startsWith(`${excludedPath}/`)
  ));
}

async function copyTree(sourceDir, targetDir) {
  if (isExcludedRelativeDirectory(sourceDir)) {
    return;
  }

  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (isExcludedRelativeDirectory(sourcePath)) {
        continue;
      }
      await copyTree(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile() && excludedExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    if (entry.isFile() && excludedFileNames.has(entry.name)) {
      continue;
    }

    if (entry.isFile()) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath, constants.COPYFILE_FICLONE);
    }
  }
}

async function copyPublishablePublic() {
  await copyTree(path.join(rootDir, 'public', 'audio'), path.join(outputDir, 'public', 'audio'));
  const workCellsAssetDirs = [
    'public/assets/cells-at-work/page-thumbnails',
    'public/assets/cells-at-work/science-station',
  ];
  for (const assetDir of workCellsAssetDirs) {
    const sourceDir = path.join(rootDir, ...assetDir.split('/'));
    if (await pathExists(sourceDir)) {
      await copyTree(sourceDir, path.join(outputDir, ...assetDir.split('/')));
    }
  }
  await mkdir(path.join(outputDir, 'public', 'books'), { recursive: true });
  await copyFile(publicBooksIndexPath, path.join(outputDir, 'public', 'books', 'index.json'));
  await copyFile(contentTypesPath, path.join(outputDir, 'public', 'books', 'content-types.json'));
  await mkdir(path.join(outputDir, 'public', 'books', '不一样的卡梅拉'), { recursive: true });
  await copyFile(
    seriesIndexPath,
    path.join(outputDir, 'public', 'books', '不一样的卡梅拉', 'series.json'),
  );

  const series = JSON.parse(await readFile(seriesIndexPath, 'utf8'));
  for (const book of series.books.slice(0, publishedBookCount)) {
    await copyTree(
      path.join(rootDir, ...book.folder.split('/')),
      path.join(outputDir, ...book.folder.split('/')),
    );
  }

  await copyTree(workCellsDraftDir, path.join(outputDir, 'public', 'books', '工作细胞'));
}

async function copyPublishableData() {
  const targetPath = path.join(outputDir, 'data', 'cells-at-work', 'page-map.json');
  await mkdir(path.dirname(targetPath), { recursive: true });
  await copyFile(workCellsPageMapPath, targetPath);
}

function runTests() {
  const result = spawnSync(process.execPath, ['--test', 'tests/mvp.test.mjs'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

assertSafeOutputDirectory();
runTests();

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await copyFile(path.join(rootDir, 'index.html'), path.join(outputDir, 'index.html'));
await copyTree(path.join(rootDir, 'assets'), path.join(outputDir, 'assets'));
await copyPublishablePublic();
await copyPublishableData();
await writeFile(path.join(outputDir, '.nojekyll'), '', 'utf8');

console.log('Static GitHub Pages build written to dist.');
