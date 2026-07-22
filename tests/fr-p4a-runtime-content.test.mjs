import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';

import {
  AUTHORING_ONLY_KEYS_FOR_TESTS,
  compareStablePaths,
  PROJECT_ROOT,
  PRODUCTION_RUNTIME_DIR,
  assertSafeOutputPath,
  compareArtifactTree,
  generateRuntimeArtifacts,
  isSafeRuntimeSourceNote,
  projectSourceNotes,
  replaceArtifactTreeAtomically,
  stableJson,
  validateRuntimeData,
  writeArtifactsToDirectory,
} from '../scripts/generate-runtime-content.mjs';

test('runtime paths use locale-independent ordinal ordering', () => {
  const paths = [
    'public/books/工作细胞',
    'public/books/不一样的卡梅拉',
    'public/books/éclair',
    'public/books/a-book',
    'public/books/Z-book',
  ];
  assert.deepEqual(paths.sort(compareStablePaths), [
    'public/books/Z-book',
    'public/books/a-book',
    'public/books/éclair',
    'public/books/不一样的卡梅拉',
    'public/books/工作细胞',
  ]);
});

let generated;
let tempRoot;

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function recursiveKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => recursiveKeys(item, keys));
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      recursiveKeys(nested, keys);
    }
  }
  return keys;
}

before(async () => {
  generated = await generateRuntimeArtifacts();
  tempRoot = await mkdtemp(path.join(os.tmpdir(), 'fr-p4a-runtime-tests-'));
});

after(async () => {
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
});

test('stable JSON uses two spaces, UTF-8-compatible text, and one final newline', () => {
  const rendered = stableJson({ alpha: 1, nested: { beta: '值' } });
  assert.equal(rendered, '{\n  "alpha": 1,\n  "nested": {\n    "beta": "值"\n  }\n}\n');
  assert.equal(rendered.endsWith('\n\n'), false);
});

test('runtime generation is deterministic and does not mutate consumed authoring sources', async () => {
  const beforeSources = new Map(generated.sourceRecords.map((record) => [record.path, record.sha256]));
  const second = await generateRuntimeArtifacts();

  assert.deepEqual([...second.artifacts.keys()], [...generated.artifacts.keys()]);
  for (const [relativePath, bytes] of generated.artifacts) {
    assert.equal(second.artifacts.get(relativePath).equals(bytes), true, `${relativePath} changed`);
  }
  assert.deepEqual(
    new Map(second.sourceRecords.map((record) => [record.path, record.sha256])),
    beforeSources,
  );
});

test('runtime index and Carmela summaries are route-sized exact allowlists', () => {
  const { runtimeIndex, carmelaBooks } = generated.runtimeData;
  assert.equal(generated.sizes.indexBytes <= 20 * 1024, true);
  assert.equal(runtimeIndex.series.length, 2);
  assert.equal(runtimeIndex.series[0].indexPath, 'public/runtime/carmela/books.json');
  assert.equal(runtimeIndex.series[1].indexPath, 'public/runtime/work-cells/topics.json');
  assert.equal(runtimeIndex.series[1].detailPathPattern, 'public/runtime/work-cells/topics/{slug}.json');

  assert.equal(carmelaBooks.books.length, 12);
  assert.deepEqual(carmelaBooks.books.map((book) => book.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const book of carmelaBooks.books) {
    assert.deepEqual(Object.keys(book), [
      'order',
      'title',
      'slug',
      'folder',
      'cover',
      'hasAudio',
      'assetPath',
      'companionPath',
    ]);
    assert.equal(book.hasAudio, true);
    assert.match(book.cover, /^public\/books\/不一样的卡梅拉\/.+\/pages\/001\.png$/);
    assert.match(book.assetPath, /\/book-assets\.json$/);
    assert.match(book.companionPath, /\/companion\.json$/);
    assert.equal(JSON.stringify(book).includes('sourcePath'), false);
    assert.equal(JSON.stringify(book).includes('pageImages'), false);
  }
});

test('Work Cells summary index preserves 27 topics, 24 category order, ids, slugs, and detail paths', () => {
  const index = generated.runtimeData.workCellsTopics;
  assert.equal(index.topics.length, 27);
  assert.equal(index.categories.length, 24);
  assert.equal(new Set(index.categories).size, 24);
  assert.equal(new Set(index.topics.map((topic) => topic.topicId)).size, 27);
  assert.equal(new Set(index.topics.map((topic) => topic.slug)).size, 27);
  assert.equal(index.hasAudio, false);
  assert.equal(index.manifestStatus, 'draft');
  assert.equal(index.verificationStatus, 'from_user_reference_only');
  for (const topic of index.topics) {
    assert.deepEqual(Object.keys(topic), [
      'order',
      'topicId',
      'slug',
      'title',
      'displayTitle',
      'category',
      'sourceLabel',
      'thumbnailPath',
      'mediaStatus',
      'contentVersion',
      'detailPath',
    ]);
    assert.equal(topic.detailPath, `public/runtime/work-cells/topics/${topic.slug}.json`);
  }
  assert.deepEqual(
    index.topics.filter((topic) => topic.topicId !== topic.slug).map(({ topicId, slug }) => ({ topicId, slug })),
    [
      { topicId: 'pneumococcus', slug: 'streptococcus-pneumoniae' },
      { topicId: 'erythroblast-and-bone-marrow-cell', slug: 'erythroblast-and-myelocyte' },
      { topicId: 'acquired-immunity', slug: 'adaptive-immunity' },
      { topicId: 'left-shift', slug: 'left-shift-of-white-blood-cells' },
      { topicId: 'ips-cells', slug: 'induced-pluripotent-stem-cells' },
      { topicId: 'covid-19', slug: 'novel-coronavirus' },
    ],
  );
});

test('27 Work Cells details expose only runtime identity, content, guidance, and reduced page refs', () => {
  const counts = validateRuntimeData(generated.runtimeData);
  assert.deepEqual(counts, {
    carmelaBooks: 12,
    workCellsTopics: 27,
    workCellsCategories: 24,
    workCellsStations: 108,
    workCellsQuestions: 162,
    workCellsPageRefs: 286,
  });

  const denied = AUTHORING_ONLY_KEYS_FOR_TESTS;
  let safeSourceNoteCount = 0;
  for (const detail of generated.runtimeData.workCellsDetails) {
    assert.deepEqual(Object.keys(detail), [
      'schemaVersion',
      'seriesSlug',
      'contentType',
      'order',
      'topicId',
      'slug',
      'title',
      'displayTitle',
      'category',
      'source',
      'publication',
      'hasAudio',
      'overview',
      'bodyScienceStations',
      'parentQuestionCards',
      'parentReadingNote',
      'sensitiveContentGuidance',
      'sourceNotes',
      'pageRefs',
    ]);
    assert.equal(detail.hasAudio, false);
    assert.equal(detail.publication.manifestStatus, 'draft');
    assert.equal(detail.publication.verificationStatus, 'from_user_reference_only');
    assert.equal(detail.publication.contentVersion, 'work-cells-v2');
    assert.equal(detail.bodyScienceStations.length, 4);
    assert.equal(detail.parentQuestionCards.length, 6);
    recursiveKeys(detail).forEach((key) => assert.equal(denied.has(key), false, `${detail.slug}: ${key}`));
    detail.sourceNotes.forEach((note) => assert.equal(isSafeRuntimeSourceNote(note), true));
    safeSourceNoteCount += detail.sourceNotes.length;

    const expectedPageIds = [...new Set([
      ...detail.bodyScienceStations.flatMap((station) => station.relatedPageIds),
      ...detail.parentQuestionCards.flatMap((card) => card.relatedPageIds),
    ])];
    assert.deepEqual(Object.keys(detail.pageRefs), expectedPageIds);
    for (const [pageId, pageRef] of Object.entries(detail.pageRefs)) {
      assert.deepEqual(Object.keys(pageRef), ['pageId', 'imagePath', 'label']);
      assert.equal(pageRef.pageId, pageId);
      assert.match(pageRef.imagePath, /^public\/assets\/cells-at-work\/page-thumbnails\//);
      assert.match(pageRef.label, /^漫画页 \d+$/);
    }
  }
  assert.equal(safeSourceNoteCount, 37);
});

test('global page resolver preserves the cancer-cell cross-topic reference without merging topics', () => {
  const cancer = generated.runtimeData.workCellsDetails.find((topic) => topic.topicId === 'cancer-cell');
  const cancerTwo = generated.runtimeData.workCellsDetails.find((topic) => topic.topicId === 'cancer-cell-ii');
  assert(cancer);
  assert(cancerTwo);
  assert.notEqual(cancer.slug, cancerTwo.slug);
  assert.equal(cancer.parentQuestionCards.at(-1).cardId, 'cancer-cell-q06');
  assert.deepEqual(cancer.parentQuestionCards.at(-1).relatedPageIds, [
    'cancer-cell__v02_page-098',
    'cancer-cell-ii__v05_page-143',
  ]);
  assert.deepEqual(cancer.pageRefs['cancer-cell-ii__v05_page-143'], {
    pageId: 'cancer-cell-ii__v05_page-143',
    imagePath: 'public/assets/cells-at-work/page-thumbnails/v05/cancer-cell-ii__v05_page-143.webp',
    label: '漫画页 143',
  });
});

test('runtime source notes remove paths and authoring-processing notes without rewriting kept notes', () => {
  const notes = [
    '漫画来源：第1卷 第1话，只保留页码线索，不展示漫画全文。',
    '动画来源只记录主题级摘要和集数线索，不接入视频、字幕或对白。',
    'V2正式配图由用户提供PNG转换而来；源PNG位于 data/cells-at-work/source-assets/x/。',
    '动画来源：S1 第1话 summary-only scene notes，sourceMode: srt。',
    'cancer-cell 保持独立，不与 cancer-cell-ii / 癌细胞Ⅱ 合并。',
  ];
  assert.deepEqual(projectSourceNotes(notes), [notes[0], notes[1], notes[4]]);
});

test('manifest hashes all consumed sources and every non-self output without timestamps or absolute paths', () => {
  const manifestBytes = generated.artifacts.get('runtime-manifest.json');
  const manifestText = manifestBytes.toString('utf8');
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.outputFileCount, 31);
  assert.equal(manifest.outputs.length, 30);
  assert.equal(manifest.sources.length, 29);
  assert.equal(manifestText.includes('generatedAt'), false);
  assert.equal(manifestText.includes(PROJECT_ROOT), false);
  assert.equal(manifest.totalBytes, [...generated.artifacts.values()].reduce((sum, bytes) => sum + bytes.length, 0));
  assert.equal(manifest.manifestBytes, manifestBytes.length);
  const sourcePaths = manifest.sources.map((source) => source.path);
  const outputPaths = manifest.outputs.map((output) => output.path);
  assert.deepEqual(sourcePaths, [...sourcePaths].sort(compareStablePaths));
  assert.deepEqual(outputPaths, [...outputPaths].sort(compareStablePaths));

  for (const output of manifest.outputs) {
    const relativePath = output.path.replace(/^public\/runtime\//, '');
    const bytes = generated.artifacts.get(relativePath);
    assert(bytes, `manifest output missing: ${relativePath}`);
    assert.equal(output.bytes, bytes.length);
    assert.equal(output.sha256, hash(bytes));
  }
  assert.equal(manifest.outputs.some((output) => output.path.endsWith('/runtime-manifest.json')), false);
});

test('all generated files meet hard byte budgets and contain one final newline', () => {
  assert.equal(generated.sizes.indexBytes <= 20 * 1024, true);
  assert.equal(generated.sizes.booksBytes <= 50 * 1024, true);
  assert.equal(generated.sizes.topicsBytes <= 100 * 1024, true);
  assert.equal(Math.max(...generated.sizes.detailBytes.map((detail) => detail.bytes)) <= 150 * 1024, true);
  assert.equal(generated.sizes.detailBytes.reduce((sum, detail) => sum + detail.bytes, 0) <= 1.75 * 1024 * 1024, true);
  assert.equal(generated.sizes.totalBytes <= 2 * 1024 * 1024, true);
  for (const [relativePath, bytes] of generated.artifacts) {
    const text = bytes.toString('utf8');
    assert.equal(text.endsWith('\n'), true, relativePath);
    assert.equal(text.endsWith('\n\n'), false, relativePath);
    assert.doesNotThrow(() => JSON.parse(text), relativePath);
  }
});

test('tree comparison reports stale, missing, and extra outputs independently', async () => {
  const outputDir = path.join(tempRoot, 'comparison');
  await writeArtifactsToDirectory(generated.artifacts, outputDir);
  assert.deepEqual(await compareArtifactTree(generated.artifacts, outputDir), {
    missing: [],
    extra: [],
    stale: [],
    ok: true,
  });

  await writeFile(path.join(outputDir, 'index.json'), '{}\n', 'utf8');
  assert.deepEqual((await compareArtifactTree(generated.artifacts, outputDir)).stale, ['index.json']);
  await writeFile(path.join(outputDir, 'index.json'), generated.artifacts.get('index.json'));

  const missingPath = path.join(outputDir, 'work-cells', 'topics', 'novel-coronavirus.json');
  await unlink(missingPath);
  assert.deepEqual(
    (await compareArtifactTree(generated.artifacts, outputDir)).missing,
    ['work-cells/topics/novel-coronavirus.json'],
  );
  await writeFile(missingPath, generated.artifacts.get('work-cells/topics/novel-coronavirus.json'));

  await writeFile(path.join(outputDir, 'extra.json'), '{}\n', 'utf8');
  assert.deepEqual((await compareArtifactTree(generated.artifacts, outputDir)).extra, ['extra.json']);
});

test('validated replacement atomically replaces an existing external runtime tree', async () => {
  const outputDir = path.join(tempRoot, 'atomic-output');
  await writeArtifactsToDirectory(new Map([['old.json', Buffer.from('{}\n')]]), outputDir);
  await replaceArtifactTreeAtomically(generated.artifacts, outputDir);
  assert.equal((await compareArtifactTree(generated.artifacts, outputDir)).ok, true);
  await replaceArtifactTreeAtomically(generated.artifacts, outputDir);
  assert.equal((await compareArtifactTree(generated.artifacts, outputDir)).ok, true);
});

test('output guards distinguish production writes from safe external temp output on both separators', () => {
  assert.throws(
    () => assertSafeOutputPath(PRODUCTION_RUNTIME_DIR),
    /only through --write/,
  );
  assert.equal(
    assertSafeOutputPath(PRODUCTION_RUNTIME_DIR, { allowProduction: true }),
    PRODUCTION_RUNTIME_DIR,
  );
  assert.throws(() => assertSafeOutputPath('../source/runtime'), /traversal/);
  assert.throws(() => assertSafeOutputPath('..\\source\\runtime'), /traversal/);
  assert.throws(() => assertSafeOutputPath('source/runtime'), /outside the repository/);
  assert.throws(() => assertSafeOutputPath('public\\books\\runtime'), /outside the repository/);
  assert.throws(() => assertSafeOutputPath(path.parse(PROJECT_ROOT).root), /filesystem root/);

  const external = path.join(tempRoot, 'safe-output');
  assert.equal(assertSafeOutputPath(external), external);
});

test('authoring source bytes remain unchanged after external generation and replacement tests', async () => {
  for (const record of generated.sourceRecords) {
    const bytes = await readFile(path.join(PROJECT_ROOT, ...record.path.split('/')));
    assert.equal(bytes.length, record.bytes, record.path);
    assert.equal(hash(bytes), record.sha256, record.path);
  }
});
