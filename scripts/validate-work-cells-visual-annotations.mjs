import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const expectedTopics = [
  ['pneumococcus', '\u80ba\u708e\u94fe\u7403\u83cc', '\u7b2c1\u5377 \u7b2c1\u8bdd'],
  ['cedar-pollen-allergy', '\u6749\u6811\u82b1\u7c89\u8fc7\u654f', '\u7b2c1\u5377 \u7b2c2\u8bdd'],
  ['influenza', '\u6d41\u884c\u6027\u611f\u5192', '\u7b2c1\u5377 \u7b2c3\u8bdd'],
  ['abrasion', '\u64e6\u4f24', '\u7b2c1\u5377 \u7b2c4\u8bdd'],
  ['food-poisoning', '\u98df\u7269\u4e2d\u6bd2', '\u7b2c2\u5377 \u7b2c5\u8bdd'],
  ['heatstroke', '\u4e2d\u6691', '\u7b2c2\u5377 \u7b2c6\u8bdd'],
  ['erythroblast-and-bone-marrow-cell', '\u7ea2\u8840\u7403\u6bcd\u7ec6\u80de\u4e0e\u9aa8\u9ad3\u7ec6\u80de', '\u7b2c2\u5377 \u7b2c7\u8bdd'],
  ['cancer-cell', '\u764c\u7ec6\u80de', '\u7b2c2\u5377 \u7b2c8-9\u8bdd'],
  ['blood-circulation', '\u8840\u6db2\u5faa\u73af', '\u7b2c3\u5377 \u7b2c10\u8bdd'],
  ['common-cold-syndrome', '\u611f\u5192\u75c7\u5019\u7fa4', '\u7b2c3\u5377 \u7b2c11\u8bdd'],
  ['thymocyte', '\u80f8\u817a\u7ec6\u80de', '\u7b2c3\u5377 \u7b2c12\u8bdd'],
  ['acquired-immunity', '\u83b7\u5f97\u6027\u514d\u75ab', '\u7b2c3\u5377 \u7b2c13\u8bdd'],
  ['acne', '\u75e4\u75ae', '\u7b2c3\u5377 \u7b2c14\u8bdd'],
  ['staphylococcus-aureus', '\u91d1\u9ec4\u8272\u8461\u8404\u7403\u83cc', '\u7b2c4\u5377 \u7b2c15\u8bdd'],
  ['dengue-fever', '\u767b\u9769\u70ed', '\u7b2c4\u5377 \u7b2c16\u8bdd'],
  ['hemorrhagic-shock', '\u51fa\u8840\u6027\u4f11\u514b', '\u7b2c4\u5377 \u7b2c17-18\u8bdd'],
  ['peyers-patches', '\u6d3e\u5c14\u6591', '\u7b2c4\u5377 \u7b2c19\u8bdd'],
  ['helicobacter-pylori', '\u5e7d\u95e8\u87ba\u6746\u83cc', '\u7b2c5\u5377 \u7b2c20\u8bdd'],
  ['antigenic-variation', '\u6297\u539f\u53d8\u5f02', '\u7b2c5\u5377 \u7b2c21\u8bdd'],
  ['cytokines', '\u7ec6\u80de\u56e0\u5b50', '\u7b2c5\u5377 \u7b2c22\u8bdd'],
  ['gut-microbiota', '\u80a0\u9053\u83cc\u7fa4', '\u7b2c5\u5377 \u7b2c23\u8bdd'],
  ['cancer-cell-ii', '\u764c\u7ec6\u80de\u2161', '\u7b2c5\u5377 \u7b2c24-25\u8bdd'],
  ['bump-on-head', '\u649e\u51fa\u80bf\u5305', '\u7b2c6\u5377 \u7b2c26\u8bdd'],
  ['left-shift', '\u767d\u7ec6\u80de\u5de6\u79fb', '\u7b2c6\u5377 \u7b2c27\u8bdd'],
  ['ips-cells', 'iPS\u7ec6\u80de', '\u7b2c6\u5377 \u7b2c28\u8bdd'],
  ['psoriasis', '\u94f6\u5c51\u75c5', '\u7b2c6\u5377 \u7279\u522b\u7bc7'],
  ['covid-19', '\u65b0\u578b\u51a0\u72b6\u75c5\u6bd2', '\u7b2c6\u5377 \u7b2c29\u8bdd'],
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

const blockedFullTextKeys = new Set([
  'fullText',
  'fullDialogue',
  'dialogue',
  'dialogueText',
  'ocrText',
  'ocrTranscript',
  'transcript',
  'completeText',
]);

function toProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

function isBlank(value) {
  return value === null
    || value === undefined
    || value === ''
    || (Array.isArray(value) && value.length === 0);
}

function pathExists(projectPath) {
  return Boolean(projectPath) && existsSync(path.join(rootDir, ...String(projectPath).split('/')));
}

function findWorkCellsManifest() {
  const booksDir = path.join(rootDir, 'public', 'books');
  for (const entry of readdirSync(booksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(booksDir, entry.name, 'draft-manifest.json');
    if (!existsSync(manifestPath)) continue;

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.seriesSlug === 'work-cells') {
      return { manifestPath, manifest };
    }
  }

  throw new Error('Could not find Work Cells draft manifest.');
}

function collectBlockedKeys(value, trail = []) {
  if (!value || typeof value !== 'object') return [];
  const findings = [];

  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (blockedFullTextKeys.has(key)) {
      findings.push(nextTrail.join('.'));
    }
    if (child && typeof child === 'object') {
      findings.push(...collectBlockedKeys(child, nextTrail));
    }
  }

  return findings;
}

function validate() {
  const { manifestPath, manifest } = findWorkCellsManifest();
  const errors = [];
  const warnings = [];
  const byId = new Map((manifest.topics ?? []).map((topic) => [topic.topicId, topic]));

  if (manifest.type !== 'science-manga-companion') errors.push('Manifest type must be science-manga-companion.');
  if (manifest.displayMode !== 'science-topic') errors.push('Manifest displayMode must be science-topic.');
  if (manifest.navigationMode !== 'science-topic') errors.push('Manifest navigationMode must be science-topic.');
  if (Object.hasOwn(manifest, 'volumes')) errors.push('Manifest must not expose volume-based navigation.');
  if ((manifest.topics ?? []).length !== expectedTopics.length) {
    errors.push(`Expected ${expectedTopics.length} topics, found ${manifest.topics?.length ?? 0}.`);
  }

  expectedTopics.forEach(([topicId, title, sourceLabel], index) => {
    const topic = manifest.topics?.[index];
    const byIdTopic = byId.get(topicId);
    if (!byIdTopic) {
      errors.push(`Missing topicId ${topicId}.`);
      return;
    }
    if (topic?.topicId !== topicId) errors.push(`Topic order ${index + 1} should be ${topicId}.`);
    if (byIdTopic.title !== title) errors.push(`${topicId} title mismatch.`);
    if (byIdTopic.source?.sourceLabel !== sourceLabel) errors.push(`${topicId} source label mismatch.`);
  });

  const cancer = byId.get('cancer-cell');
  const cancerIi = byId.get('cancer-cell-ii');
  if (!cancer || !cancerIi || cancer.slug === cancerIi.slug || cancer.title === cancerIi.title) {
    errors.push('cancer-cell and cancer-cell-ii must remain separate topics.');
  }
  if (byId.get('hemorrhagic-shock')?.source?.sourceLabel !== '\u7b2c4\u5377 \u7b2c17-18\u8bdd') {
    errors.push('hemorrhagic-shock must stay merged as volume 4 chapters 17-18.');
  }
  if (byId.get('covid-19')?.source?.sourceLabel !== '\u7b2c6\u5377 \u7b2c29\u8bdd') {
    errors.push('covid-19 must be volume 6 chapter 29.');
  }

  let pageCount = 0;
  let missingImageCount = 0;
  for (const topic of manifest.topics ?? []) {
    for (const field of requiredTopicFields) {
      if (isBlank(topic[field])) errors.push(`${topic.topicId} missing topic field ${field}.`);
    }
    if (!Array.isArray(topic.pageAnnotations) || topic.pageAnnotations.length === 0) {
      errors.push(`${topic.topicId} must include pageAnnotations.`);
      continue;
    }
    if (topic.pageAnnotations.length !== topic.imageCount) {
      errors.push(`${topic.topicId} pageAnnotations count must match imageCount.`);
    }
    if (Array.isArray(topic.pageImagePaths) && topic.pageAnnotations.length !== topic.pageImagePaths.length) {
      errors.push(`${topic.topicId} pageAnnotations count must match pageImagePaths.`);
    }
    if (!pathExists(topic.thumbnailPath)) {
      errors.push(`${topic.topicId} thumbnailPath does not exist.`);
      missingImageCount += 1;
    }
    for (const imagePath of topic.pageImagePaths ?? []) {
      if (!pathExists(imagePath)) {
        errors.push(`${topic.topicId} page image does not exist: ${imagePath}`);
        missingImageCount += 1;
      }
    }

    const imageSet = new Set(topic.pageImagePaths ?? []);
    for (const page of topic.pageAnnotations) {
      pageCount += 1;
      for (const field of requiredPageFields) {
        if (!Object.hasOwn(page, field)) errors.push(`${topic.topicId}/${page.pageId ?? 'unknown'} missing page field ${field}.`);
      }
      if (isBlank(page.bodyScienceStationUse)) {
        errors.push(`${topic.topicId}/${page.pageId ?? 'unknown'} missing bodyScienceStationUse value.`);
      }
      if (!pathExists(page.sourcePath)) {
        errors.push(`${topic.topicId}/${page.pageId ?? 'unknown'} sourcePath does not exist.`);
        missingImageCount += 1;
      } else if (imageSet.size > 0 && !imageSet.has(page.sourcePath)) {
        warnings.push(`${topic.topicId}/${page.pageId} sourcePath is not listed in topic.pageImagePaths.`);
      }
    }
  }

  const blockedKeys = collectBlockedKeys(manifest);
  if (blockedKeys.length > 0) {
    errors.push(`Blocked full-text/OCR-like fields found: ${blockedKeys.slice(0, 10).join(', ')}`);
  }

  return {
    ok: errors.length === 0,
    manifestPath: toProjectPath(manifestPath),
    topicCount: manifest.topics?.length ?? 0,
    pageAnnotationCount: pageCount,
    missingImageCount,
    warningCount: warnings.length,
    errors,
    warnings,
  };
}

const result = validate();
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
