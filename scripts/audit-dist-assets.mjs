import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const warningLimitBytes = Number(process.env.BUILD_SIZE_WARNING_MB ?? 900) * 1024 * 1024;
const topLimit = Number(process.env.BUILD_SIZE_TOP_N ?? 30);
const forbiddenVideoExtensions = ['.mp4', '.mov', '.m4v', '.webm'];
const forbiddenSubtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa'];
const forbiddenVideoPattern = new RegExp(`(${forbiddenVideoExtensions.map((extension) => extension.replace('.', '\\.')).join('|')})$`, 'i');
const forbiddenSubtitlePattern = new RegExp(`(${forbiddenSubtitleExtensions.map((extension) => extension.replace('.', '\\.')).join('|')})$`, 'i');
const forbiddenReleasePatterns = [
  { pattern: forbiddenVideoPattern, message: 'Remove video files from dist; animation MP4 assets must stay outside the GitHub Pages package.' },
  { pattern: forbiddenSubtitlePattern, message: 'Remove subtitle files from dist; full subtitle files must stay private.' },
  { pattern: /(^|\/)screenshot-candidates(\/|$)/i, message: 'Remove screenshot-candidates from dist; only selected published WebP stills may ship.' },
  { pattern: /(^|\/)review-contact-sheets(\/|$)/i, message: 'Remove review-contact-sheets from dist; contact sheets are review-only artifacts.' },
  { pattern: /(^|\/)scene-notes(\/|$)/i, message: 'Remove scene-notes from dist; publish only explicitly reduced JSON if needed.' },
  { pattern: /(^|\/)pages-by-volume(\/|$)/i, message: 'Remove pages-by-volume from dist; publish page-thumbnails instead.' },
  { pattern: /(^|\/)visual-annotation-bundles(\/|$)/i, message: 'Remove visual-annotation-bundles from dist; keep review bundles outside public publishing paths.' },
  { pattern: /(^|\/)png-originals(\/|$)/i, message: 'Remove PNG originals from dist; source station PNG files must stay outside the release package.' },
  { pattern: /science-station\/.+\.png$/i, message: 'Remove science-station PNG images from dist; only WebP station assets may ship.' },
];

function formatSize(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

async function collectFiles(currentDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }
    if (entry.isFile()) {
      const entryStat = await stat(entryPath);
      files.push({ path: entryPath, size: entryStat.size });
    }
  }

  return files;
}

function largestDirectories(files) {
  const sizes = new Map();
  for (const file of files) {
    let current = path.dirname(file.path);
    while (current.startsWith(distDir)) {
      sizes.set(current, (sizes.get(current) ?? 0) + file.size);
      if (current === distDir) break;
      current = path.dirname(current);
    }
  }

  return [...sizes.entries()]
    .map(([dirPath, size]) => ({ path: relativePath(dirPath), size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, topLimit);
}

function cleanupSuggestions(files) {
  const allPaths = files.map((file) => relativePath(file.path));
  const suggestions = [];

  if (allPaths.some((filePath) => filePath.includes('/pages-by-volume/'))) {
    suggestions.push('Remove public/assets/cells-at-work/pages-by-volume from dist; publish page-thumbnails instead.');
  }
  if (allPaths.some((filePath) => filePath.includes('/visual-annotation-bundles/'))) {
    suggestions.push('Remove visual-annotation-bundles from dist; keep review bundles outside public publishing paths.');
  }
  if (allPaths.some((filePath) => /\.(zip|7z|tar|gz)$/i.test(filePath))) {
    suggestions.push('Remove archives from dist; release artifacts should not include temporary bundles.');
  }
  if (allPaths.some((filePath) => /science-station\/.+\.png$/i.test(filePath))) {
    suggestions.push('Convert science-station PNG images to WebP and keep PNG sources outside dist.');
  }

  return suggestions.length > 0
    ? suggestions
    : ['No obvious Work Cells cleanup item detected in dist.'];
}

function forbiddenReleaseItems(files) {
  const allPaths = files.map((file) => relativePath(file.path));
  const items = [];

  for (const { pattern, message } of forbiddenReleasePatterns) {
    const matches = allPaths.filter((filePath) => pattern.test(filePath));
    if (matches.length > 0) {
      items.push({ message, matches });
    }
  }

  return items;
}

if (!existsSync(distDir)) {
  console.error('dist does not exist. Run node scripts/build.mjs first.');
  process.exit(1);
}

const files = await collectFiles(distDir);
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const largestFiles = [...files]
  .sort((a, b) => b.size - a.size)
  .slice(0, topLimit)
  .map((file) => ({ path: relativePath(file.path), size: file.size }));
const forbiddenItems = forbiddenReleaseItems(files);

console.log(`dist total size: ${formatSize(totalBytes)} (${totalBytes} bytes)`);
console.log(`warning limit: ${formatSize(warningLimitBytes)} (${warningLimitBytes} bytes)`);
console.log(`status: ${totalBytes > warningLimitBytes ? 'OVER_LIMIT' : 'OK'}`);

console.log('\nlargest directories:');
for (const item of largestDirectories(files)) {
  console.log(`${formatSize(item.size).padStart(10)}  ${item.path}`);
}

console.log('\nlargest files:');
for (const item of largestFiles) {
  console.log(`${formatSize(item.size).padStart(10)}  ${item.path}`);
}

console.log('\nsuggested cleanup items:');
for (const suggestion of cleanupSuggestions(files)) {
  console.log(`- ${suggestion}`);
}

if (forbiddenItems.length > 0) {
  console.log('\nforbidden release items:');
  for (const item of forbiddenItems) {
    console.log(`- ${item.message}`);
    for (const match of item.matches.slice(0, topLimit)) {
      console.log(`  - ${match}`);
    }
    if (item.matches.length > topLimit) {
      console.log(`  - ...and ${item.matches.length - topLimit} more`);
    }
  }
}

if (totalBytes > warningLimitBytes || forbiddenItems.length > 0) {
  process.exitCode = 1;
}
