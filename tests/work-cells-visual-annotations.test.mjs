import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  mergeWorkCellsVisualAnnotations,
  validateWorkCellsVisualAnnotations,
} from '../scripts/import-work-cells-visual-annotations.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(rootDir, 'public', 'books', '工作细胞', 'draft-manifest.json');
const requiredTopicIds = [
  'pneumococcus',
  'cedar-pollen-allergy',
  'influenza',
  'abrasion',
  'food-poisoning',
  'heatstroke',
  'erythroblast-and-bone-marrow-cell',
  'cancer-cell',
  'blood-circulation',
  'common-cold-syndrome',
  'thymocyte',
  'acquired-immunity',
  'acne',
  'staphylococcus-aureus',
  'dengue-fever',
  'hemorrhagic-shock',
  'peyers-patches',
  'helicobacter-pylori',
  'antigenic-variation',
  'cytokines',
  'gut-microbiota',
  'cancer-cell-ii',
  'bump-on-head',
  'left-shift',
  'ips-cells',
  'psoriasis',
  'covid-19',
];
const requiredTopicFields = [
  'topicSummary',
  'keyBiologyConcepts',
  'recommendedBodyScienceStationFocus',
  'recommendedParentQuestions',
  'recommendedEncyclopediaEntries',
  'sensitiveContentGuidance',
  'codexImportNotes',
];
const requiredPageFields = [
  'pageId',
  'pageRole',
  'plotBeat',
  'visibleTextNotes',
  'importantVisibleTerms',
  'biologyConcepts',
  'encyclopediaTags',
  'parentPromptIdeas',
  'bodyScienceStationUse',
  'sensitiveContentNote',
  'notesForCodex',
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function sampleAnnotationBatch() {
  return {
    topics: [
      {
        topicId: 'pneumococcus',
        displayTitle: '肺炎链球菌',
        sourceLabel: '第1卷 第1话',
        volumeId: 'v01',
        range: 'v01_page-006..v01_page-006',
        imageCount: 1,
        topicSummary: '红血球遇到肺炎链球菌。',
        keyBiologyConcepts: ['红血球', '白血球'],
        recommendedBodyScienceStationFocus: '肺泡气体交换',
        recommendedParentQuestions: ['红血球送什么？'],
        recommendedEncyclopediaEntries: ['肺炎链球菌'],
        sensitiveContentGuidance: '有轻微战斗画面。',
        codexImportNotes: '不要导入完整对白。',
        pageAnnotations: [
          {
            pageId: 'pneumococcus__v01_page-006',
            sourcePath: 'public/assets/cells-at-work/pages-by-volume/v01/pneumococcus__v01_page-006.webp',
            zipPath: 'images/pneumococcus/pneumococcus__v01_page-006.webp',
            pageRole: '主题开场',
            plotBeat: '红血球迷路。',
            visibleTextNotes: '只保留概念词。',
            importantVisibleTerms: ['肺炎链球菌'],
            biologyConcepts: ['病原入侵'],
            encyclopediaTags: ['肺炎链球菌'],
            parentPromptIdeas: ['身体在做什么防御？'],
            bodyScienceStationUse: '高：适合入口。',
            sensitiveContentNote: '轻微惊吓。',
            notesForCodex: '封面候选。',
          },
        ],
      },
    ],
  };
}

test('visual annotation merge uses topicId and preserves page annotation fields', () => {
  const manifest = {
    topics: [
      {
        order: 1,
        title: '肺炎链球菌',
        slug: 'streptococcus-pneumoniae',
        source: {},
        pageImagePaths: [
          'public/assets/cells-at-work/pages-by-volume/v01/pneumococcus__v01_page-006.webp',
        ],
      },
    ],
  };
  const pageMap = {
    topics: [
      {
        order: 1,
        topicId: 'pneumococcus',
        imageCount: 1,
        pageImagePaths: manifest.topics[0].pageImagePaths,
        thumbnailPath: manifest.topics[0].pageImagePaths[0],
      },
    ],
  };

  const { manifest: merged, report } = mergeWorkCellsVisualAnnotations({
    manifest,
    pageMap,
    annotationBatch: sampleAnnotationBatch(),
    rootDir,
  });

  const topic = merged.topics[0];
  assert.equal(topic.topicId, 'pneumococcus');
  assert.equal(topic.slug, 'streptococcus-pneumoniae');
  assert.equal(topic.topicSummary, '红血球遇到肺炎链球菌。');
  assert.deepEqual(topic.bodyScienceStationCandidatePageIds, ['pneumococcus__v01_page-006']);
  assert.equal(topic.pageAnnotations.length, 1);
  for (const field of requiredPageFields) {
    assert.equal(Object.hasOwn(topic.pageAnnotations[0], field), true, `${field} should be preserved`);
  }
  assert.equal(report.topics[0].bodyScienceStationCandidateCount, 1);
  assert.deepEqual(report.topics[0].missingImages, []);
});

test('imported Work Cells visual annotations are complete for imported batches', () => {
  const manifest = readJson(manifestPath);

  for (const topicId of requiredTopicIds) {
    const topic = manifest.topics.find((item) => item.topicId === topicId);
    assert.ok(topic, `${topicId} should be keyed by topicId`);
    for (const field of requiredTopicFields) {
      assert.equal(Boolean(topic[field]), true, `${topicId} should include ${field}`);
    }
    assert.equal(topic.pageAnnotations.length, topic.imageCount, `${topicId} annotations should match imageCount`);
    assert.equal(topic.pageAnnotations.length, topic.pageImagePaths.length, `${topicId} annotations should match images`);
    assert.equal(Array.isArray(topic.bodyScienceStationCandidatePageIds), true, `${topicId} should list science station candidates`);

    for (const page of topic.pageAnnotations) {
      for (const field of requiredPageFields) {
        assert.equal(Object.hasOwn(page, field), true, `${topicId} ${page.pageId} should include ${field}`);
      }
      assert.equal(existsSync(path.join(rootDir, ...page.sourcePath.split('/'))), true, `${page.pageId} image should exist`);
    }
  }

  const validation = validateWorkCellsVisualAnnotations({ manifest, rootDir });
  assert.deepEqual(validation.errors, []);
});

test('Work Cells topic page surfaces imported companion annotation sections', () => {
  const appText = readFileSync(path.join(rootDir, 'assets', 'app.js'), 'utf8');
  for (const phrase of [
    '身体科学小站',
    '亲子问题卡',
    '百科关联',
    '家长提醒',
    'science-encyclopedia',
    'groupSciencePagesByRole',
    'ScienceAnnotationThumbnails',
    'annotation-thumb-list',
    'pageAnnotations',
    'sensitiveContentGuidance',
  ]) {
    assert.match(appText, new RegExp(phrase), `app should include ${phrase}`);
  }

  for (const blockedPhrase of [
    'science-annotations',
    '/pages">漫画页图片',
    'function sciencePageAnnotationsSection',
    'function SciencePageThumbnails',
  ]) {
    assert.equal(appText.includes(blockedPhrase), false, `app should not expose ${blockedPhrase}`);
  }
});
