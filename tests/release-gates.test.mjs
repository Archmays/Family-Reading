import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { findForbiddenReleaseItems } from '../scripts/audit-dist-assets.mjs';
import { resolveCarmelaBookPaths } from '../scripts/release-path-policy.mjs';

const rootDir = path.resolve('repository-root');
const outputDir = path.join(rootDir, 'dist');

function findingCodes(paths) {
  return new Set(findForbiddenReleaseItems(paths).map((item) => item.code));
}

test('Carmela build folder resolution stays inside the repository and dist', () => {
  const resolved = resolveCarmelaBookPaths({
    folder: 'public/books/不一样的卡梅拉/我想去看海',
    rootDir,
    outputDir,
  });

  assert.equal(
    resolved.repositoryPath,
    'public/books/不一样的卡梅拉/我想去看海',
  );
  assert.equal(path.relative(rootDir, resolved.sourcePath).startsWith('..'), false);
  assert.equal(path.relative(outputDir, resolved.targetPath).startsWith('..'), false);
});

test('Carmela build folder resolution rejects traversal and absolute paths', () => {
  const invalidFolders = [
    '../source',
    'public/books/不一样的卡梅拉/../source',
    'public/books/不一样的卡梅拉/book/extra',
    ['D:', 'private', 'book'].join('\\'),
    ['', 'home', 'reader', 'book'].join('/'),
    ['', '', 'server', 'share', 'book'].join('\\'),
  ];

  for (const folder of invalidFolders) {
    assert.throws(
      () => resolveCarmelaBookPaths({ folder, rootDir, outputDir }),
      /Invalid Carmela book folder/,
      folder,
    );
  }
});

test('dist audit rejects every required private, processing, and scratch class', () => {
  const codes = findingCodes([
    'dist/Public/DATA-PRIVATE/internal.json',
    'dist/public/book/OCR/full-text.txt',
    'dist/source/raw.pdf',
    'dist/public/book/book.epub',
    'dist/public/book/video.mp4',
    'dist/public/book/subtitles.srt',
    'dist/review/bundle.zip',
    'dist/tmp/session.HAR',
    'dist/test-results/trace.zip',
    'dist/logs/build.log',
    'dist/browser-profile/Cookies',
    'dist/task-scratch/notes.md',
  ]);

  for (const expected of [
    'PRIVATE_ROOT',
    'OCR_PROCESSING',
    'RAW_SOURCE',
    'RAW_DOCUMENT',
    'VIDEO',
    'SUBTITLE',
    'ARCHIVE',
    'HAR',
    'TRACE',
    'LOG',
    'BROWSER_PROFILE',
    'TEST_OUTPUT',
    'TASK_SCRATCH',
  ]) {
    assert.equal(codes.has(expected), true, `missing ${expected}`);
  }
});

test('dist audit allows Carmela page, audio, and full-work companion paths', () => {
  const findings = findForbiddenReleaseItems([
    'dist/public/books/不一样的卡梅拉/我想去看海/pages/001.png',
    'dist/public/audio/carmela-s1/carmela-s1-01.mp3',
    'dist/public/books/不一样的卡梅拉/full-work/companion.json',
  ]);

  assert.deepEqual(findings, []);
});
