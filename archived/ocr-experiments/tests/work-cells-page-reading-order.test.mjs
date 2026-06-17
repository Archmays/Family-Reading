import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { runWorkCellsPageReadingOrder } from '../scripts/work-cells-page-reading-order.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testPrivateDir = path.join(rootDir, 'data-private', 'test-work-cells-page-reading-order');

function word(text, left, top, width, height, confidence = 90, wordNumber = 1) {
  return { wordNumber, text, bbox: { left, top, width, height }, confidence };
}

function block(blockNumber, text, bbox, words, confidence = 90) {
  return {
    blockNumber,
    text,
    bbox,
    confidence,
    lines: [
      {
        paragraphNumber: 1,
        lineNumber: 1,
        text,
        bbox,
        confidence,
        words,
      },
    ],
  };
}

function sampleInput() {
  return {
    schemaVersion: 1,
    seriesId: 'cells-at-work',
    topics: [
      {
        topicId: 'sample-topic',
        displayTitle: 'Sample Topic',
        source: 'fixture',
        pageRange: 'fixture-page-001',
        pages: [
          {
            topicId: 'sample-topic',
            displayTitle: 'Sample Topic',
            source: 'fixture',
            pageRange: 'fixture-page-001',
            pageNumber: 1,
            imagePath: 'public/assets/cells-at-work/fixture/page-001.webp',
            imageSize: { left: 0, top: 0, width: 1000, height: 1400 },
            confidence: 80,
            layoutStatus: 'ok',
            failureReason: null,
            blockCount: 6,
            lineCount: 6,
            wordCount: 8,
            blocks: [
              block(1, 'A B', { left: 820, top: 100, width: 32, height: 120 }, [
                word('A', 820, 100, 30, 40, 91, 1),
                word('B', 821, 166, 30, 40, 90, 2),
              ], 90.5),
              block(2, 'C D', { left: 760, top: 108, width: 32, height: 120 }, [
                word('C', 760, 108, 30, 40, 89, 1),
                word('D', 761, 174, 30, 40, 88, 2),
              ], 88.5),
              block(3, 'LEFT LINE', { left: 220, top: 112, width: 180, height: 30 }, [
                word('LEFT', 220, 112, 72, 30, 93, 1),
                word('LINE', 310, 112, 80, 30, 92, 2),
              ], 92.5),
              block(4, '12', { left: 486, top: 1340, width: 26, height: 20 }, [
                word('12', 486, 1340, 26, 20, 96, 1),
              ], 96),
              block(5, '?', { left: 40, top: 32, width: 20, height: 20 }, [
                word('?', 40, 32, 20, 20, 10, 1),
              ], 10),
              block(6, 'MID', { left: 500, top: 500, width: 60, height: 58 }, [
                word('MID', 500, 500, 60, 58, 80, 1),
              ], 80),
            ],
          },
        ],
      },
    ],
  };
}

test('runWorkCellsPageReadingOrder writes private page reading order and separates uncertain and noise blocks', async () => {
  const inputPath = path.join(testPrivateDir, 'topic-page-blocks.json');
  const outputPath = path.join(testPrivateDir, 'page-reading-order.json');
  try {
    await mkdir(testPrivateDir, { recursive: true });
    await writeFile(inputPath, `${JSON.stringify(sampleInput(), null, 2)}\n`, 'utf8');

    const result = await runWorkCellsPageReadingOrder({ inputPath, outputPath });
    const page = result.topics[0].pages[0];

    assert.equal(result.stage, '6D-2');
    assert.equal(result.outputPolicy.publicOutputWritten, false);
    assert.equal(result.outputPolicy.sourceOcrModified, false);
    assert.match(result.outputPolicy.privateOutputPath, /^data-private\/test-work-cells-page-reading-order\/page-reading-order\.json$/);
    assert.deepEqual(page.blocks.map((item) => item.sourceBlockNumber), [1, 2, 3, 6]);
    assert.deepEqual(page.blocks.slice(0, 2).map((item) => item.direction), ['vertical', 'vertical']);
    assert.equal(page.blocks[2].direction, 'horizontal');
    assert.equal(page.reconstructedText.includes('A B C D'), true);
    assert.equal(page.reconstructedText.includes('LEFT LINE'), true);
    assert.deepEqual(page.noiseBlocks.map((item) => item.reason).sort(), ['non_readable_noise', 'page_number']);
    assert.deepEqual(page.uncertainBlocks.map((item) => item.sourceBlockNumber), [6]);
    assert.equal(result.summary.pageCount, 1);
    assert.equal(result.summary.reconstructedPageCount, 1);

    const written = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(written.topics[0].pages[0].noiseBlocks.length, 2);
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});

test('runWorkCellsPageReadingOrder refuses to write reconstructed text into public output roots', async () => {
  const inputPath = path.join(testPrivateDir, 'topic-page-blocks.json');
  try {
    await mkdir(testPrivateDir, { recursive: true });
    await writeFile(inputPath, `${JSON.stringify(sampleInput(), null, 2)}\n`, 'utf8');
    await assert.rejects(
      runWorkCellsPageReadingOrder({
        inputPath,
        outputPath: 'public/ocr-layout/page-reading-order.json',
      }),
      /public\/deployable directory/,
    );
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});
