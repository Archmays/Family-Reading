import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import {
  checkRequiredOcrLanguages,
  parseTsvLayout,
  runWorkCellsOcrLayout,
  scoreOcrCandidate,
  selectBestOcrCandidate,
} from '../scripts/work-cells-ocr-layout.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testPrivateDir = path.join(rootDir, 'data-private', 'test-work-cells-ocr-layout');

test('parseTsvLayout preserves page, block, line, word boxes and confidence', () => {
  const tsv = [
    'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
    '1\t1\t0\t0\t0\t0\t0\t0\t100\t200\t-1\t',
    '2\t1\t1\t0\t0\t0\t10\t20\t60\t30\t-1\t',
    '4\t1\t1\t1\t1\t0\t10\t20\t60\t10\t-1\t',
    '5\t1\t1\t1\t1\t1\t10\t20\t30\t10\t90\t白血球',
    '5\t1\t1\t1\t1\t2\t45\t20\t25\t10\t80\tT',
  ].join('\n');

  const layout = parseTsvLayout(tsv);

  assert.deepEqual(layout.imageSize, { left: 0, top: 0, width: 100, height: 200 });
  assert.equal(layout.text, '白血球 T');
  assert.equal(layout.confidence, 85);
  assert.equal(layout.blockCount, 1);
  assert.equal(layout.lineCount, 1);
  assert.equal(layout.wordCount, 2);
  assert.deepEqual(layout.blocks[0].bbox, { left: 10, top: 20, width: 60, height: 30 });
  assert.equal(layout.blocks[0].lines[0].text, '白血球 T');
  assert.deepEqual(layout.blocks[0].lines[0].words[0], {
    wordNumber: 1,
    text: '白血球',
    bbox: { left: 10, top: 20, width: 30, height: 10 },
    confidence: 90,
  });
});

test('runWorkCellsOcrLayout writes private topic-shaped failure data when OCR is unavailable', async () => {
  const outputPath = path.join(testPrivateDir, 'topic-page-blocks.json');
  try {
    const result = await runWorkCellsOcrLayout({
      outputPath,
      ocrCommand: 'definitely-missing-tesseract-command',
    });

    assert.equal(result.ocrRunStatus, 'blocked_missing_dependency');
    assert.equal(result.outputPolicy.publicOutputWritten, false);
    assert.equal(result.outputPolicy.containsFullOcrText, true);
    assert.equal(result.outputPolicy.pageMapModified, false);
    assert.equal(result.outputPolicy.terminologyModified, false);
    assert.match(result.outputPolicy.privateOutputPath, /^data-private\/test-work-cells-ocr-layout\/topic-page-blocks\.json$/);
    assert.deepEqual(result.ocrTool.languageCheck.missingRequiredLanguages, [
      'chi_tra_vert',
      'chi_sim_vert',
      'chi_tra',
      'chi_sim',
      'eng',
    ]);
    assert.equal(result.sourceOcrInspection.hasCoordinateData, false);
    assert.deepEqual(result.sourceOcrInspection.layoutIndicatorsFound, []);
    assert.equal(result.topics.length, 27);
    assert.equal(result.successfulTopicCount, 0);
    assert.equal(result.failedPages.length, 991);

    const firstPage = result.topics[0].pages[0];
    assert.equal(firstPage.topicId, 'pneumococcus');
    assert.equal(firstPage.pageNumber, 6);
    assert.equal(firstPage.text, '');
    assert.equal(firstPage.confidence, null);
    assert.equal(firstPage.layoutStatus, 'failed');
    assert.equal(firstPage.needs_image_review, true);
    assert.deepEqual(firstPage.blocks, []);

    const written = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(written.failedPages.length, 991);
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});

test('checkRequiredOcrLanguages blocks missing vertical Chinese traineddata', () => {
  const check = checkRequiredOcrLanguages(['chi_tra', 'chi_sim', 'eng']);

  assert.equal(check.canRunDualChannel, false);
  assert.equal(check.verticalChineseLanguageDataInstalled, false);
  assert.deepEqual(check.missingRequiredLanguages, ['chi_tra_vert', 'chi_sim_vert']);
});

test('selectBestOcrCandidate prefers readable Chinese scoring over confidence alone', () => {
  const topic = {
    topicId: 'left-shift',
    displayTitle: '白细胞左移',
  };
  const highConfidenceNoise = {
    layout: {
      text: 'ABCD1234 !!!!',
      confidence: 96,
      layoutStatus: 'ok',
      blockCount: 1,
      lineCount: 1,
      wordCount: 2,
      candidate: { channel: 'horizontal', languages: ['chi_tra', 'chi_sim', 'eng'], psm: 7 },
    },
    score: null,
  };
  const readableVertical = {
    layout: {
      text: '骨髓芽細胞 嗜中性骨髓球 桿狀核粒細胞 白血球',
      confidence: 62,
      layoutStatus: 'ok',
      blockCount: 2,
      lineCount: 4,
      wordCount: 4,
      candidate: { channel: 'vertical', languages: ['chi_tra_vert', 'chi_sim_vert', 'eng'], psm: 5 },
    },
    score: null,
  };

  highConfidenceNoise.score = scoreOcrCandidate({
    parsed: highConfidenceNoise.layout,
    candidate: highConfidenceNoise.layout.candidate,
    topic,
    pageId: 'v06_page-042',
    terminology: null,
  });
  readableVertical.score = scoreOcrCandidate({
    parsed: readableVertical.layout,
    candidate: readableVertical.layout.candidate,
    topic,
    pageId: 'v06_page-042',
    terminology: null,
  });

  const best = selectBestOcrCandidate([highConfidenceNoise, readableVertical]);

  assert.equal(best.layout.candidate.channel, 'vertical');
  assert.equal(best.score.metrics.expectedPhraseHits, 4);
  assert.ok(best.score.score > highConfidenceNoise.score.score);
});

test('runWorkCellsOcrLayout refuses to write coordinate OCR into public output roots', async () => {
  await assert.rejects(
    runWorkCellsOcrLayout({
      outputPath: 'public/ocr/topic-page-blocks.json',
      ocrCommand: 'definitely-missing-tesseract-command',
    }),
    /public\/deployable directory/,
  );
});
