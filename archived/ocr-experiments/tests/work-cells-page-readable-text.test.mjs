import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { runWorkCellsPageReadableText } from '../scripts/work-cells-page-readable-text.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testPrivateDir = path.join(rootDir, 'data-private', 'test-work-cells-page-readable-text');

function readingOrderFixture() {
  return {
    schemaVersion: 1,
    stage: '6D-2',
    seriesId: 'cells-at-work',
    topics: [
      {
        topicId: 'pneumococcus',
        displayTitle: '肺炎链球菌',
        source: 'fixture',
        pageRange: 'fixture-page-001',
        pages: [
          {
            topicId: 'pneumococcus',
            displayTitle: '肺炎链球菌',
            pageNumber: 1,
            imagePath: 'public/assets/cells-at-work/fixture/page-001.webp',
            reconstructedText: '肺 炎 鏈 球 菌 来了\n| | |\n白 血 球 发现了它',
            blocks: [{ text: '肺 炎 鏈 球 菌' }, { text: '白 血 球' }],
            uncertainBlocks: [],
            noiseBlocks: [{ text: '| | |', reason: 'non_readable_noise' }],
            readingOrderConfidence: 'high',
          },
        ],
      },
      {
        topicId: 'cytokines',
        displayTitle: '细胞因子',
        source: 'fixture',
        pageRange: 'fixture-page-002',
        pages: [
          {
            topicId: 'cytokines',
            displayTitle: '细胞因子',
            pageNumber: 2,
            imagePath: 'public/assets/cells-at-work/fixture/page-002.webp',
            reconstructedText: '細 胞 激 素 这个词可能来自原书\n細 胞 因 子 也出现了',
            blocks: [{ text: '細 胞 激 素' }, { text: '細 胞 因 子' }],
            uncertainBlocks: [{ text: '細 胞 激 素' }],
            noiseBlocks: [],
            readingOrderConfidence: 'medium',
          },
        ],
      },
    ],
  };
}

function rawOcrFixture() {
  return {
    schemaVersion: 1,
    topics: [
      {
        topicId: 'pneumococcus',
        displayTitle: '肺炎链球菌',
        pages: [{ pageNumber: 1, text: '肺 炎 鏈 球 菌\n白 血 球' }],
      },
      {
        topicId: 'cytokines',
        displayTitle: '细胞因子',
        pages: [{ pageNumber: 2, text: '細 胞 激 素\n細 胞 因 子' }],
      },
    ],
  };
}

function terminologyFixture() {
  return {
    schemaVersion: 1,
    language: 'zh-Hans',
    entries: [
      {
        id: 'pneumococcus',
        label: '肺炎链球菌 / 肺炎球菌',
        preferred: '肺炎链球菌',
        topics: ['pneumococcus'],
        forms: [
          { text: '肺炎鏈球菌', normalized: '肺炎链球菌', kind: 'traditional-term' },
          { text: '肺炎球菌', normalized: '肺炎球菌', kind: 'accepted' },
        ],
      },
      {
        id: 'cytokines',
        label: '细胞因子',
        preferred: '细胞因子',
        topics: ['cytokines'],
        forms: [
          { text: '細胞因子', normalized: '细胞因子', kind: 'traditional-term' },
          {
            text: '細胞激素',
            normalized: '细胞激素',
            kind: 'source-term',
            uncertain: true,
            note: '保留“细胞激素”作为原书可能用词',
          },
        ],
      },
      {
        id: 'white-blood-cell',
        label: '白血球 / 白细胞',
        preferred: '白血球',
        topics: ['all'],
        forms: [{ text: '白血球', normalized: '白血球', kind: 'accepted' }],
      },
    ],
  };
}

function hintsFixture() {
  return {
    schemaVersion: 1,
    topics: [
      {
        topicId: 'pneumococcus',
        displayTitle: '肺炎链球菌',
        frequentKeywords: [{ keyword: '肺炎链球菌 / 肺炎球菌', count: 1 }],
        termsNeedingScientificReview: [],
      },
      {
        topicId: 'cytokines',
        displayTitle: '细胞因子',
        frequentKeywords: [{ keyword: '细胞因子', count: 1 }],
        termsNeedingScientificReview: [{ term: '细胞因子', reason: 'fixture' }],
      },
    ],
  };
}

function topicDataFixture() {
  return {
    schemaVersion: 1,
    topics: [
      { topicId: 'pneumococcus', displayTitle: '肺炎链球菌', sourceLabel: 'fixture', range: 'fixture-page-001' },
      { topicId: 'cytokines', displayTitle: '细胞因子', sourceLabel: 'fixture', range: 'fixture-page-002' },
    ],
  };
}

function manifestFixture() {
  return {
    schemaVersion: 1,
    seriesSlug: 'cells-at-work',
    topics: [
      { title: '肺炎链球菌', displayTitle: '肺炎链球菌' },
      { title: '细胞因子', displayTitle: '细胞因子' },
    ],
  };
}

async function writeFixture(fileName, data) {
  const targetPath = path.join(testPrivateDir, fileName);
  await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return targetPath;
}

test('runWorkCellsPageReadableText writes private light-cleaned page text with raw OCR retained', async () => {
  try {
    await mkdir(testPrivateDir, { recursive: true });
    const readingOrderPath = await writeFixture('page-reading-order.json', readingOrderFixture());
    const rawOcrPath = await writeFixture('topic-page-blocks.json', rawOcrFixture());
    const terminologyPath = await writeFixture('terminology.zh-Hans.json', terminologyFixture());
    const hintsPath = await writeFixture('topic-content-hints.json', hintsFixture());
    const topicDataPath = await writeFixture('manual-topic-ranges.json', topicDataFixture());
    const manifestPath = await writeFixture('draft-manifest.json', manifestFixture());
    const outputPath = path.join(testPrivateDir, 'page-readable-text.json');

    const result = await runWorkCellsPageReadableText({
      readingOrderPath,
      rawOcrPath,
      terminologyPath,
      hintsPath,
      topicDataPath,
      manifestPath,
      outputPath,
    });

    assert.equal(result.stage, '6D-3');
    assert.equal(result.outputPolicy.publicOutputWritten, false);
    assert.equal(result.outputPolicy.fullNormalizedTextPubliclyAccessible, false);
    assert.match(result.outputPolicy.privateOutputPath, /^data-private\/test-work-cells-page-readable-text\/page-readable-text\.json$/);
    assert.equal(result.summary.processedPageCount, 2);
    assert.equal(result.summary.pageCount, 2);

    const pneumoPage = result.topics[0].pages[0];
    assert.equal(pneumoPage.rawOcrText, '肺 炎 鏈 球 菌\n白 血 球');
    assert.equal(pneumoPage.reconstructedText.includes('肺 炎 鏈 球 菌'), true);
    assert.equal(pneumoPage.normalizedText.includes('肺炎链球菌'), true);
    assert.equal(pneumoPage.normalizedText.includes('| | |'), false);
    assert.equal(pneumoPage.glossaryHits.some((hit) => hit.termId === 'pneumococcus'), true);

    const cytokinePage = result.topics[1].pages[0];
    assert.equal(cytokinePage.normalizedText.includes('细胞激素'), true);
    assert.equal(cytokinePage.normalizedText.includes('细胞因子'), true);
    assert.equal(cytokinePage.uncertainTerms.some((term) => term.term === '细胞激素'), true);

    const written = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(written.topics[1].pages[0].rawOcrText.includes('細 胞 激 素'), true);
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});

test('runWorkCellsPageReadableText refuses to write normalized text into public output roots', async () => {
  try {
    await mkdir(testPrivateDir, { recursive: true });
    const readingOrderPath = await writeFixture('page-reading-order.json', readingOrderFixture());
    const rawOcrPath = await writeFixture('topic-page-blocks.json', rawOcrFixture());
    const terminologyPath = await writeFixture('terminology.zh-Hans.json', terminologyFixture());
    const hintsPath = await writeFixture('topic-content-hints.json', hintsFixture());
    const topicDataPath = await writeFixture('manual-topic-ranges.json', topicDataFixture());
    const manifestPath = await writeFixture('draft-manifest.json', manifestFixture());

    await assert.rejects(
      runWorkCellsPageReadableText({
        readingOrderPath,
        rawOcrPath,
        terminologyPath,
        hintsPath,
        topicDataPath,
        manifestPath,
        outputPath: 'public/ocr-layout/page-readable-text.json',
      }),
      /public\/deployable directory/,
    );
  } finally {
    await rm(testPrivateDir, { recursive: true, force: true });
  }
});
