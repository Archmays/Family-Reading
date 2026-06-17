import { spawnSync } from 'node:child_process';
import { access, mkdir, readdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'dist');
const outputDirName = 'dist';
const publishedBookCount = 12;
const excludedDirectoryNames = new Set(['ocr', 'source']);
const excludedExtensions = new Set(['.pdf', '.epub']);
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

async function copyTree(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyTree(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile() && excludedExtensions.has(path.extname(entry.name).toLowerCase())) {
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
  const publicAssetsDir = path.join(rootDir, 'public', 'assets');
  if (await pathExists(publicAssetsDir)) {
    await copyTree(publicAssetsDir, path.join(outputDir, 'public', 'assets'));
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
