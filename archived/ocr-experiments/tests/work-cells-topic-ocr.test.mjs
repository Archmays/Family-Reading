import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { runWorkCellsTopicOcr } from '../scripts/work-cells-topic-ocr.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testPrivateDir = path.join(rootDir, 'data-private', 'test-work-cells-topic-ocr');

test('runWorkCellsTopicOcr writes private topic-shaped failure data when OCR is unavailable', async () => {
  const outputPath = path.join(testPrivateDir, 'topic-ocr-index.json');
  try {
    const result = await runWorkCellsTopicOcr({
      outputPath,
      ocrCommand: 'definitely-missing-tesseract-command',
    });

    assert.equal(result.ocrRunStatus, 'blocked_missing_dependency');
    assert.equal(result.outputPolicy.fullOcrTextPubliclyAccessible, false);
    assert.match(result.outputPolicy.privateOutputPath, /^data-private\/test-work-cells-topic-ocr\/topic-ocr-index\.json$/);
    assert.equal(result.topics.length, 27);
    assert.equal(result.successfulTopicCount, 0);
    assert.equal(result.failedPages.length, 991);

    const firstTopic = result.topics[0];
    const firstPage = firstTopic.pages[0];
    assert.equal(firstTopic.topicId, 'pneumococcus');
    assert.equal(firstTopic.displayTitle, '肺炎链球菌');
    assert.equal(firstTopic.pageRange, 'v01_page-006..v01_page-061');
    assert.equal(firstPage.topicId, firstTopic.topicId);
    assert.equal(firstPage.displayTitle, firstTopic.displayTitle);
    assert.equal(firstPage.source, firstTopic.source);
    assert.equal(firstPage.pageRange, firstTopic.pageRange);
    assert.equal(firstPage.pageNumber, 6);
    assert.equal(firstPage.ocrText, '');
    assert.equal(firstPage.confidence, null);
    assert.equal(firstPage.ocrStatus, 'failed');

    const written = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(written.failedPages.length, 991);
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});

test('runWorkCellsTopicOcr refuses to write OCR text into public output roots', async () => {
  await assert.rejects(
    runWorkCellsTopicOcr({
      outputPath: 'public/ocr/topic-ocr-index.json',
      ocrCommand: 'definitely-missing-tesseract-command',
    }),
    /public\/deployable directory/,
  );
});
