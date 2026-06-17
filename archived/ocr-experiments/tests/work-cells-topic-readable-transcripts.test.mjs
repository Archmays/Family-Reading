import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { runWorkCellsTopicReadableTranscripts } from '../scripts/work-cells-topic-readable-transcripts.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testPrivateDir = path.join(rootDir, 'data-private', 'test-work-cells-topic-readable-transcripts');

function readableFixture() {
  return {
    schemaVersion: 1,
    stage: '6D-3',
    seriesId: 'cells-at-work',
    inputPaths: {
      pageReadingOrderPath: 'fixture/page-reading-order.json',
    },
    outputPolicy: {
      privateOutputPath: 'data-private/test/page-readable-text.json',
      publicOutputWritten: false,
      fullNormalizedTextPubliclyAccessible: false,
    },
    topics: [
      {
        topicId: 'pneumococcus',
        displayTitle: '肺炎链球菌',
        source: 'fixture',
        pageRange: 'fixture-pages-001..002',
        averageConfidence: 0.64,
        contextHints: {
          frequentKeywords: [{ keyword: '白血球/白细胞', count: 2, pages: [1, 2] }],
          termsNeedingScientificReview: [{ term: '肺炎链球菌', reason: 'fixture' }],
        },
        pages: [
          {
            topicId: 'pneumococcus',
            displayTitle: '肺炎链球菌',
            pageNumber: 1,
            imagePath: 'public/assets/cells-at-work/fixture/page-001.webp',
            normalizedText: '红血球正在运送氧气。\n肺炎链球菌出现，白血球开始追击。',
            confidence: 0.7,
            readingOrderConfidence: 'high',
            glossaryHits: [{ termId: 'pneumococcus', label: '肺炎链球菌', normalizedTo: '肺炎链球菌' }],
            uncertainTerms: [],
            correctionNotes: [],
            cleaningDiagnostics: { droppedLineCount: 0, suspiciousLineCount: 0 },
          },
          {
            topicId: 'pneumococcus',
            displayTitle: '肺炎链球菌',
            pageNumber: 2,
            imagePath: 'public/assets/cells-at-work/fixture/page-002.webp',
            normalizedText: '白血球确认入侵者。\n身体防御反应继续展开。',
            confidence: 0.58,
            readingOrderConfidence: 'medium',
            glossaryHits: [{ termId: 'white-blood-cell', label: '白血球/白细胞', normalizedTo: '白血球' }],
            uncertainTerms: [{ term: '肺炎链球菌', reason: 'fixture review' }],
            correctionNotes: ['fixture note'],
            cleaningDiagnostics: { droppedLineCount: 1, suspiciousLineCount: 0 },
          },
        ],
      },
      {
        topicId: 'acquired-immunity',
        displayTitle: '获得性免疫',
        source: 'fixture',
        pageRange: 'fixture-page-003',
        averageConfidence: 0.36,
        contextHints: {
          frequentKeywords: [{ keyword: '抗原', count: 1, pages: [3] }],
          termsNeedingScientificReview: [{ term: '获得性免疫', reason: 'fixture' }],
        },
        pages: [
          {
            topicId: 'acquired-immunity',
            displayTitle: '获得性免疫',
            pageNumber: 3,
            imagePath: 'public/assets/cells-at-work/fixture/page-003.webp',
            normalizedText: '抗原与抗体相关说明需要核对。',
            confidence: 0.36,
            readingOrderConfidence: 'low',
            glossaryHits: [],
            uncertainTerms: [],
            correctionNotes: ['阅读顺序置信度低'],
            cleaningDiagnostics: { droppedLineCount: 12, suspiciousLineCount: 1 },
          },
        ],
      },
    ],
    summary: {
      pageCount: 3,
      processedPageCount: 3,
      publicLeakCheck: {
        completeNormalizedTextInPublicDirectory: false,
      },
    },
  };
}

function hintsFixture() {
  return {
    schemaVersion: 1,
    topics: [
      {
        topicId: 'pneumococcus',
        displayTitle: '肺炎链球菌',
        possibleCells: [{ term: '白血球/白细胞', count: 2, pages: [1, 2] }],
        possiblePathogensOrStructures: [{ term: '肺炎链球菌/肺炎球菌', count: 1, pages: [1] }],
        frequentKeywords: [{ keyword: '白血球/白细胞', count: 2, pages: [1, 2] }],
        termsNeedingScientificReview: [{ term: '肺炎链球菌', reason: 'fixture' }],
      },
      {
        topicId: 'acquired-immunity',
        displayTitle: '获得性免疫',
        possibleCells: [{ term: '白血球/白细胞', count: 1, pages: [3] }],
        possiblePathogensOrStructures: [{ term: '抗原', count: 1, pages: [3] }],
        frequentKeywords: [{ keyword: '抗原', count: 1, pages: [3] }],
        termsNeedingScientificReview: [{ term: '获得性免疫/适应性免疫', reason: 'fixture' }],
      },
    ],
  };
}

function terminologyFixture() {
  return {
    schemaVersion: 1,
    entries: [
      { id: 'pneumococcus', preferred: '肺炎链球菌', label: '肺炎链球菌 / 肺炎球菌', topics: ['pneumococcus'] },
      { id: 'acquired-immunity', preferred: '获得性免疫', label: '获得性免疫 / 适应性免疫', topics: ['acquired-immunity'] },
    ],
  };
}

async function writeFixture(fileName, data) {
  const targetPath = path.join(testPrivateDir, fileName);
  await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return targetPath;
}

test('runWorkCellsTopicReadableTranscripts writes private topic transcripts and dialogue-free outline hints', async () => {
  try {
    await mkdir(testPrivateDir, { recursive: true });
    const inputPath = await writeFixture('page-readable-text.json', readableFixture());
    const hintsPath = await writeFixture('topic-content-hints.json', hintsFixture());
    const terminologyPath = await writeFixture('terminology.zh-Hans.json', terminologyFixture());
    const transcriptsPath = path.join(testPrivateDir, 'topic-readable-transcripts.json');
    const outlinePath = path.join(testPrivateDir, 'topic-story-outline-hints.json');

    const result = await runWorkCellsTopicReadableTranscripts({
      inputPath,
      hintsPath,
      terminologyPath,
      transcriptsPath,
      outlinePath,
    });

    assert.equal(result.transcripts.stage, '6D-4');
    assert.equal(result.transcripts.outputPolicy.publicOutputWritten, false);
    assert.equal(result.transcripts.outputPolicy.containsFullNormalizedText, true);
    assert.match(result.transcripts.outputPolicy.privateOutputPath, /^data-private\/test-work-cells-topic-readable-transcripts\/topic-readable-transcripts\.json$/);
    assert.equal(result.transcripts.topics.length, 2);
    assert.equal(result.transcripts.topics[0].transcriptText.includes('肺炎链球菌出现'), true);
    assert.equal(result.transcripts.topics[0].pageTranscripts.length, 2);
    assert.equal(result.transcripts.summary.qualityByTopic[0].qualityGrade, 'A-可优先使用');

    assert.equal(result.outline.stage, '6D-4-outline-hints');
    assert.equal(result.outline.outputPolicy.containsFullNormalizedText, false);
    assert.equal(result.outline.outputPolicy.bodyScienceStationGenerated, false);
    assert.equal(result.outline.topics[0].whatMayHaveHappened.includes('肺炎链球菌'), true);
    assert.equal(result.outline.topics[0].mainCells.some((item) => item.term === '白血球/白细胞'), true);
    assert.equal(result.outline.topics[0].glossaryCheckTerms.some((item) => item.term.includes('肺炎链球菌')), true);
    assert.equal(JSON.stringify(result.outline).includes('肺炎链球菌出现，白血球开始追击'), false);
    assert.equal(result.outline.summary.completeNormalizedTextInPublicDirectory, false);
    assert.equal(result.outline.summary.recommendedBodyScienceStationTopics[0].topicId, 'pneumococcus');
    assert.equal(result.outline.summary.manualReviewTopics.some((item) => item.topicId === 'acquired-immunity'), true);

    const writtenTranscripts = JSON.parse(await readFile(transcriptsPath, 'utf8'));
    const writtenOutline = JSON.parse(await readFile(outlinePath, 'utf8'));
    assert.equal(writtenTranscripts.topics[0].pageTranscripts[1].normalizedText.includes('身体防御反应'), true);
    assert.equal(JSON.stringify(writtenOutline).includes('normalizedText'), false);
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});

test('runWorkCellsTopicReadableTranscripts refuses public output roots', async () => {
  try {
    await mkdir(testPrivateDir, { recursive: true });
    const inputPath = await writeFixture('page-readable-text.json', readableFixture());
    const hintsPath = await writeFixture('topic-content-hints.json', hintsFixture());
    const terminologyPath = await writeFixture('terminology.zh-Hans.json', terminologyFixture());

    await assert.rejects(
      runWorkCellsTopicReadableTranscripts({
        inputPath,
        hintsPath,
        terminologyPath,
        transcriptsPath: 'public/ocr-layout/topic-readable-transcripts.json',
        outlinePath: path.join(testPrivateDir, 'topic-story-outline-hints.json'),
      }),
      /public\/deployable directory/,
    );
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});
