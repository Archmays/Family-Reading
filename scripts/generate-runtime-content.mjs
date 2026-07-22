import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GENERATOR_VERSION = 'fr-p4a-runtime-content/1';
export const RUNTIME_SCHEMA_VERSION = 1;

const scriptPath = fileURLToPath(import.meta.url);
export const PROJECT_ROOT = path.resolve(path.dirname(scriptPath), '..');
export const PRODUCTION_RUNTIME_DIR = path.join(PROJECT_ROOT, 'public', 'runtime');

const SOURCE_PATHS = Object.freeze({
  publicIndex: 'public/books/index.json',
  carmelaSeries: 'public/books/不一样的卡梅拉/series.json',
  workCellsManifest: 'public/books/工作细胞/draft-manifest.json',
  workCellsPageMap: 'data/cells-at-work/page-map.json',
  workCellsManualRanges: 'data/cells-at-work/manual-topic-ranges.json',
});

const AUTHORING_ONLY_KEYS = new Set([
  'assetPolicy',
  'authoring',
  'bodyScienceStationCandidatePageIds',
  'bodyScienceStationPolicy',
  'codexImportNotes',
  'dialogue',
  'imagePrompt',
  'imagePromptId',
  'mergeGroup',
  'mergedFrom',
  'mustNotMergeWith',
  'notesForCodex',
  'originalTitleReferences',
  'pageAnnotations',
  'pageImagePaths',
  'privateFullEpubInputDirectory',
  'promptRequiredPrefix',
  'publicAssets',
  'qualityFlags',
  'recommendedEncyclopediaEntries',
  'recommendedParentQuestions',
  'relatedAnimationScenes',
  'relatedComicPages',
  'reviewOnly',
  'sourcePath',
  'subtitle',
  'topicMergeRules',
  'transcript',
  'zipPath',
]);

export const AUTHORING_ONLY_KEYS_FOR_TESTS = new Set(AUTHORING_ONLY_KEYS);

const AUTHORING_SOURCE_NOTE_PATTERNS = [
  /^animationMatch:/i,
  /^audio-fallback/i,
  /^pageAnnotationUse:/i,
  /^range:/i,
  /^sourceLabel:/i,
  /^V2正式配图/i,
  /\b(?:data|docs|source|source-private)\//i,
  /\b(?:matchConfidence|medium-confidence|sourceMode|summary-only)\b/i,
  /\b(?:MP4|SRT)\b/i,
];

const POSIX_ROOT_PATTERN = /^\/+$/;
const WINDOWS_ROOT_PATTERN = /^[A-Za-z]:[\\/]?$/;
const UNC_ROOT_PATTERN = /^\\\\[^\\/]+[\\/][^\\/]+[\\/]?$/;

function toRepositoryPath(value) {
  return String(value).replaceAll('\\', '/');
}

export function compareStablePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function canonicalizeJsonSourceBytes(bytes) {
  const normalizedText = Buffer.from(bytes).toString('utf8').replace(/\r\n?/g, '\n');
  return Buffer.from(normalizedText, 'utf8');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertString(value, label) {
  assert(typeof value === 'string' && value.length > 0, `${label} must be a non-empty string.`);
  return value;
}

function cloneStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array.`);
  value.forEach((item, index) => assertString(item, `${label}[${index}]`));
  return [...value];
}

function uniqueInOrder(values) {
  return [...new Set(values)];
}

function samePath(left, right) {
  const normalize = process.platform === 'win32'
    ? (value) => path.resolve(value).toLocaleLowerCase('en-US')
    : (value) => path.resolve(value);
  return normalize(left) === normalize(right);
}

function isInside(baseDir, targetPath) {
  const relative = path.relative(path.resolve(baseDir), path.resolve(targetPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function containsTraversal(rawPath) {
  return String(rawPath).replaceAll('\\', '/').split('/').some((part) => part === '..');
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function isSafeRuntimeSourceNote(note) {
  return typeof note === 'string'
    && note.trim().length > 0
    && !AUTHORING_SOURCE_NOTE_PATTERNS.some((pattern) => pattern.test(note));
}

export function projectSourceNotes(sourceNotes) {
  assert(Array.isArray(sourceNotes), 'sourceNotes must be an array.');
  return sourceNotes.filter(isSafeRuntimeSourceNote);
}

export function assertSafeOutputPath(
  rawOutputPath,
  { rootDir = PROJECT_ROOT, allowProduction = false } = {},
) {
  const raw = String(rawOutputPath ?? '').trim();
  assert(raw.length > 0, 'Output path is required.');
  assert(!raw.includes('\0'), 'Output path must not contain NUL.');
  assert(!containsTraversal(raw), 'Output path must not contain traversal segments.');
  assert(
    !POSIX_ROOT_PATTERN.test(raw)
      && !WINDOWS_ROOT_PATTERN.test(raw)
      && !UNC_ROOT_PATTERN.test(raw),
    'Output path must not be a filesystem root.',
  );

  const resolvedRoot = path.resolve(rootDir);
  const resolvedOutput = path.resolve(resolvedRoot, raw);
  const productionDir = path.join(resolvedRoot, 'public', 'runtime');

  if (samePath(resolvedOutput, productionDir)) {
    assert(allowProduction, 'Production runtime output is available only through --write.');
    return resolvedOutput;
  }

  assert(!isInside(resolvedRoot, resolvedOutput), 'Temporary output must be outside the repository.');
  return resolvedOutput;
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function readJsonSource(rootDir, relativePath, sourceRecords) {
  const normalizedPath = toRepositoryPath(relativePath);
  assert(!path.isAbsolute(normalizedPath), `Source path must be relative: ${normalizedPath}`);
  assert(!containsTraversal(normalizedPath), `Source path must not traverse: ${normalizedPath}`);
  const absolutePath = path.join(rootDir, ...normalizedPath.split('/'));
  assert(isInside(rootDir, absolutePath), `Source path escapes the repository: ${normalizedPath}`);
  const bytes = canonicalizeJsonSourceBytes(await readFile(absolutePath));
  sourceRecords.set(normalizedPath, {
    path: normalizedPath,
    sha256: sha256(bytes),
    bytes: bytes.length,
  });
  return JSON.parse(bytes.toString('utf8'));
}

function carmelaCoverPath(book, assets) {
  const firstPage = assertString(assets.pageImages?.[0], `${book.slug} first page image`);
  return `${toRepositoryPath(book.folder)}/${toRepositoryPath(firstPage)}`;
}

export function projectCarmelaBookSummary(book, assets, companion) {
  const folder = assertString(toRepositoryPath(book.folder), `${book.slug} folder`);
  const assetFile = assertString(book.assetFile, `${book.slug} assetFile`);
  const companionFile = assertString(book.companionFile, `${book.slug} companionFile`);
  const hasAudio = Boolean(book.audio?.path || companion.audio?.path);
  return {
    order: Number(book.order),
    title: assertString(book.title, `${book.slug} title`),
    slug: assertString(book.slug, 'Carmela slug'),
    folder,
    cover: carmelaCoverPath(book, assets),
    hasAudio,
    assetPath: `${folder}/${assetFile}`,
    companionPath: `${folder}/${companionFile}`,
  };
}

function pageIdFromImagePath(imagePath) {
  return path.posix.basename(toRepositoryPath(imagePath), path.posix.extname(imagePath));
}

function pageLabel(pageId) {
  const match = String(pageId).match(/__v(\d+)_page-(\d+)$/);
  assert(match, `Cannot derive a runtime label from page id: ${pageId}`);
  return `漫画页 ${Number(match[2])}`;
}

function assertPublicImagePath(imagePath, label) {
  const normalized = assertString(toRepositoryPath(imagePath), label);
  assert(
    normalized.startsWith('public/assets/cells-at-work/'),
    `${label} must be a public Work Cells image path.`,
  );
  assert(!containsTraversal(normalized), `${label} must not traverse.`);
  return normalized;
}

export function createGlobalPageResolver(manifest, pageMap) {
  const annotationPaths = new Map();
  for (const topic of manifest.topics ?? []) {
    for (const annotation of topic.pageAnnotations ?? []) {
      const pageId = assertString(annotation.pageId, `${topic.topicId} annotation pageId`);
      const imagePath = assertPublicImagePath(
        annotation.sourcePath,
        `${topic.topicId}:${pageId} annotation sourcePath`,
      );
      const existing = annotationPaths.get(pageId);
      assert(!existing || existing === imagePath, `Conflicting annotation paths for ${pageId}.`);
      annotationPaths.set(pageId, imagePath);
    }
  }

  const pageMapPaths = new Map();
  for (const topic of pageMap.topics ?? []) {
    for (const rawImagePath of topic.pageImagePaths ?? []) {
      const imagePath = assertPublicImagePath(rawImagePath, `${topic.topicId} page-map image`);
      const pageId = pageIdFromImagePath(imagePath);
      const existing = pageMapPaths.get(pageId);
      assert(!existing || existing === imagePath, `Conflicting page-map paths for ${pageId}.`);
      pageMapPaths.set(pageId, imagePath);
    }
  }

  assert(annotationPaths.size === 991, `Expected 991 annotation pages, found ${annotationPaths.size}.`);
  assert(pageMapPaths.size === 991, `Expected 991 page-map pages, found ${pageMapPaths.size}.`);
  for (const [pageId, imagePath] of annotationPaths) {
    assert(pageMapPaths.get(pageId) === imagePath, `Annotation/page-map mismatch for ${pageId}.`);
  }

  return (pageId) => {
    const imagePath = annotationPaths.get(pageId) ?? pageMapPaths.get(pageId);
    assert(imagePath, `Related page id does not resolve globally: ${pageId}`);
    return {
      pageId,
      imagePath,
      label: pageLabel(pageId),
    };
  };
}

function projectStation(station) {
  return {
    stationId: assertString(station.stationId, 'stationId'),
    topicId: assertString(station.topicId, `${station.stationId} topicId`),
    title: assertString(station.title, `${station.stationId} title`),
    coreQuestion: assertString(station.coreQuestion, `${station.stationId} coreQuestion`),
    explanation: assertString(station.explanation, `${station.stationId} explanation`),
    imageAsset: assertPublicImagePath(station.imageAsset, `${station.stationId} imageAsset`),
    imageAlt: assertString(station.imageAlt, `${station.stationId} imageAlt`),
    relatedPageIds: cloneStringArray(station.relatedPageIds, `${station.stationId} relatedPageIds`),
    biologyConcepts: cloneStringArray(station.biologyConcepts, `${station.stationId} biologyConcepts`),
    encyclopediaTags: cloneStringArray(station.encyclopediaTags, `${station.stationId} encyclopediaTags`),
    parentNote: assertString(station.parentNote, `${station.stationId} parentNote`),
  };
}

function projectQuestionCard(card) {
  return {
    cardId: assertString(card.cardId, 'cardId'),
    topicId: assertString(card.topicId, `${card.cardId} topicId`),
    type: assertString(card.type, `${card.cardId} type`),
    category: assertString(card.category, `${card.cardId} category`),
    title: assertString(card.title, `${card.cardId} title`),
    question: assertString(card.question, `${card.cardId} question`),
    answer: assertString(card.answer, `${card.cardId} answer`),
    relatedPageIds: cloneStringArray(card.relatedPageIds, `${card.cardId} relatedPageIds`),
    parentHint: assertString(card.parentHint, `${card.cardId} parentHint`),
    biologyConcepts: cloneStringArray(card.biologyConcepts, `${card.cardId} biologyConcepts`),
  };
}

export function projectWorkCellsTopic(topic, manifest, resolvePage) {
  const stations = (topic.bodyScienceStations ?? []).map(projectStation);
  const questions = (topic.parentQuestionCards ?? []).map(projectQuestionCard);
  const relatedPageIds = uniqueInOrder([
    ...stations.flatMap((station) => station.relatedPageIds),
    ...questions.flatMap((card) => card.relatedPageIds),
  ]);
  const pageRefs = {};
  for (const pageId of relatedPageIds) pageRefs[pageId] = resolvePage(pageId);

  const overview = topic.topicOverview ?? {};
  assert(topic.parentReadingNote === topic.parentNote, `${topic.topicId} parent note aliases drifted.`);
  assert(topic.hasAudio === false && manifest.hasAudio === false, `${topic.topicId} must not expose audio.`);

  return {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    seriesSlug: assertString(manifest.seriesSlug, 'Work Cells seriesSlug'),
    contentType: assertString(manifest.contentType, 'Work Cells contentType'),
    order: Number(topic.order),
    topicId: assertString(topic.topicId, 'topicId'),
    slug: assertString(topic.slug, `${topic.topicId} slug`),
    title: assertString(topic.title, `${topic.topicId} title`),
    displayTitle: assertString(topic.displayTitle, `${topic.topicId} displayTitle`),
    category: assertString(topic.category, `${topic.topicId} category`),
    source: {
      volume: Number(topic.source?.volume),
      chapterLabel: assertString(topic.source?.chapterLabel, `${topic.topicId} chapterLabel`),
      sourceLabel: assertString(topic.source?.sourceLabel, `${topic.topicId} sourceLabel`),
    },
    publication: {
      manifestStatus: assertString(manifest.manifestStatus, 'Work Cells manifestStatus'),
      verificationStatus: assertString(topic.verificationStatus, `${topic.topicId} verificationStatus`),
      contentVersion: assertString(topic.contentVersion, `${topic.topicId} contentVersion`),
    },
    hasAudio: false,
    overview: {
      summary: assertString(overview.summary, `${topic.topicId} overview summary`),
      readingFocus: assertString(overview.readingFocus, `${topic.topicId} readingFocus`),
      keyBiologyConcepts: cloneStringArray(
        overview.keyBiologyConcepts,
        `${topic.topicId} overview keyBiologyConcepts`,
      ),
      recommendedBodyScienceStationFocus: Array.isArray(topic.recommendedBodyScienceStationFocus)
        ? cloneStringArray(
          topic.recommendedBodyScienceStationFocus,
          `${topic.topicId} recommendedBodyScienceStationFocus`,
        )
        : assertString(
          topic.recommendedBodyScienceStationFocus,
          `${topic.topicId} recommendedBodyScienceStationFocus`,
        ),
    },
    bodyScienceStations: stations,
    parentQuestionCards: questions,
    parentReadingNote: assertString(topic.parentReadingNote, `${topic.topicId} parentReadingNote`),
    sensitiveContentGuidance: assertString(
      topic.sensitiveContentGuidance,
      `${topic.topicId} sensitiveContentGuidance`,
    ),
    sourceNotes: projectSourceNotes(topic.sourceNotes),
    pageRefs,
  };
}

function topicSummary(topic) {
  return {
    order: Number(topic.order),
    topicId: assertString(topic.topicId, 'topicId'),
    slug: assertString(topic.slug, `${topic.topicId} slug`),
    title: assertString(topic.title, `${topic.topicId} title`),
    displayTitle: assertString(topic.displayTitle, `${topic.topicId} displayTitle`),
    category: assertString(topic.category, `${topic.topicId} category`),
    sourceLabel: assertString(topic.source?.sourceLabel, `${topic.topicId} sourceLabel`),
    thumbnailPath: assertPublicImagePath(topic.thumbnailPath, `${topic.topicId} thumbnailPath`),
    mediaStatus: assertString(topic.mediaStatus, `${topic.topicId} mediaStatus`),
    contentVersion: assertString(topic.contentVersion, `${topic.topicId} contentVersion`),
    detailPath: `public/runtime/work-cells/topics/${topic.slug}.json`,
  };
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

function runtimeCounts(runtimeData) {
  const details = runtimeData.workCellsDetails;
  return {
    carmelaBooks: runtimeData.carmelaBooks.books.length,
    workCellsTopics: details.length,
    workCellsCategories: runtimeData.workCellsTopics.categories.length,
    workCellsStations: details.reduce((sum, topic) => sum + topic.bodyScienceStations.length, 0),
    workCellsQuestions: details.reduce((sum, topic) => sum + topic.parentQuestionCards.length, 0),
    workCellsPageRefs: details.reduce((sum, topic) => sum + Object.keys(topic.pageRefs).length, 0),
  };
}

export function validateRuntimeData(runtimeData) {
  const counts = runtimeCounts(runtimeData);
  assert(counts.carmelaBooks === 12, `Expected 12 Carmela books, found ${counts.carmelaBooks}.`);
  assert(counts.workCellsTopics === 27, `Expected 27 Work Cells topics, found ${counts.workCellsTopics}.`);
  assert(counts.workCellsCategories === 24, `Expected 24 Work Cells categories, found ${counts.workCellsCategories}.`);
  assert(counts.workCellsStations === 108, `Expected 108 stations, found ${counts.workCellsStations}.`);
  assert(counts.workCellsQuestions === 162, `Expected 162 questions, found ${counts.workCellsQuestions}.`);
  assert(counts.workCellsPageRefs === 286, `Expected 286 reduced page refs, found ${counts.workCellsPageRefs}.`);

  assert(new Set(runtimeData.carmelaBooks.books.map((book) => book.slug)).size === 12, 'Duplicate Carmela slug.');
  assert(new Set(runtimeData.workCellsTopics.topics.map((topic) => topic.slug)).size === 27, 'Duplicate topic slug.');
  assert(new Set(runtimeData.workCellsTopics.topics.map((topic) => topic.topicId)).size === 27, 'Duplicate topic id.');

  for (const detail of runtimeData.workCellsDetails) {
    for (const key of recursiveKeys(detail)) {
      assert(!AUTHORING_ONLY_KEYS.has(key), `Authoring-only key leaked into ${detail.slug}: ${key}`);
    }
    assert(detail.hasAudio === false, `${detail.slug} unexpectedly has audio.`);
    for (const note of detail.sourceNotes) {
      assert(isSafeRuntimeSourceNote(note), `${detail.slug} source note is not runtime-safe.`);
    }
    const expectedPageIds = uniqueInOrder([
      ...detail.bodyScienceStations.flatMap((station) => station.relatedPageIds),
      ...detail.parentQuestionCards.flatMap((card) => card.relatedPageIds),
    ]);
    assert(
      JSON.stringify(Object.keys(detail.pageRefs)) === JSON.stringify(expectedPageIds),
      `${detail.slug} pageRefs are not the exact reduced related-page set.`,
    );
  }
  return counts;
}

async function validateReferencedFiles(rootDir, runtimeData) {
  const paths = new Set();
  for (const book of runtimeData.carmelaBooks.books) {
    paths.add(book.cover);
    paths.add(book.assetPath);
    paths.add(book.companionPath);
  }
  for (const topic of runtimeData.workCellsTopics.topics) paths.add(topic.thumbnailPath);
  for (const detail of runtimeData.workCellsDetails) {
    detail.bodyScienceStations.forEach((station) => paths.add(station.imageAsset));
    Object.values(detail.pageRefs).forEach((pageRef) => paths.add(pageRef.imagePath));
  }
  for (const relativePath of paths) {
    const absolutePath = path.join(rootDir, ...relativePath.split('/'));
    assert(isInside(rootDir, absolutePath), `Referenced path escapes the repository: ${relativePath}`);
    assert(await pathExists(absolutePath), `Referenced runtime file is missing: ${relativePath}`);
  }
}

function addArtifact(artifacts, relativePath, value) {
  const normalizedPath = toRepositoryPath(relativePath);
  assert(!normalizedPath.startsWith('/') && !containsTraversal(normalizedPath), `Invalid output path: ${normalizedPath}`);
  assert(!artifacts.has(normalizedPath), `Duplicate output path: ${normalizedPath}`);
  artifacts.set(normalizedPath, Buffer.from(stableJson(value), 'utf8'));
}

function finalizeManifest(manifest, contentBytes) {
  let previous = '';
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const serialized = stableJson(manifest);
    const manifestBytes = Buffer.byteLength(serialized);
    manifest.manifestBytes = manifestBytes;
    manifest.totalBytes = contentBytes + manifestBytes;
    const next = stableJson(manifest);
    if (next === previous || next === serialized) return Buffer.from(next, 'utf8');
    previous = next;
  }
  throw new Error('Runtime manifest byte totals did not stabilize.');
}

export async function generateRuntimeArtifacts({ rootDir = PROJECT_ROOT } = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const sourceRecords = new Map();
  const publicIndex = await readJsonSource(resolvedRoot, SOURCE_PATHS.publicIndex, sourceRecords);
  const carmelaSeries = await readJsonSource(resolvedRoot, SOURCE_PATHS.carmelaSeries, sourceRecords);
  const workCellsManifest = await readJsonSource(
    resolvedRoot,
    SOURCE_PATHS.workCellsManifest,
    sourceRecords,
  );
  const workCellsPageMap = await readJsonSource(
    resolvedRoot,
    SOURCE_PATHS.workCellsPageMap,
    sourceRecords,
  );
  const manualRanges = await readJsonSource(
    resolvedRoot,
    SOURCE_PATHS.workCellsManualRanges,
    sourceRecords,
  );

  const carmelaEntry = publicIndex.series.find((entry) => entry.seriesSlug === 'carmela-season-1');
  const workCellsEntry = publicIndex.series.find((entry) => entry.seriesSlug === 'work-cells');
  assert(carmelaEntry && workCellsEntry, 'Both runtime series must exist in the public authoring index.');
  assert(carmelaSeries.books.length === 12, 'Carmela authoring series must contain 12 books.');
  assert(workCellsManifest.topics.length === 27, 'Work Cells authoring manifest must contain 27 topics.');
  assert(workCellsPageMap.topics.length === 27, 'Work Cells page map must contain 27 topics.');
  assert(manualRanges.topics.length === 27, 'Work Cells manual ranges must contain 27 topics.');

  const carmelaBookSummaries = [];
  for (const book of carmelaSeries.books) {
    const assetPath = `${toRepositoryPath(book.folder)}/${book.assetFile}`;
    const companionPath = `${toRepositoryPath(book.folder)}/${book.companionFile}`;
    const assets = await readJsonSource(resolvedRoot, assetPath, sourceRecords);
    const companion = await readJsonSource(resolvedRoot, companionPath, sourceRecords);
    const seriesAudioPath = assertString(book.audio?.path, `${book.slug} series audio path`);
    const companionAudioPath = assertString(companion.audio?.path, `${book.slug} companion audio path`);
    assert(seriesAudioPath === companionAudioPath, `${book.slug} audio path drifted between sources.`);
    assert(
      seriesAudioPath.startsWith('public/audio/carmela-s1/') && !containsTraversal(seriesAudioPath),
      `${book.slug} audio path is not a safe public Carmela path.`,
    );
    assert(
      await pathExists(path.join(resolvedRoot, ...seriesAudioPath.split('/'))),
      `${book.slug} public audio is missing.`,
    );
    carmelaBookSummaries.push(projectCarmelaBookSummary(book, assets, companion));
  }

  const manualById = new Map(manualRanges.topics.map((topic) => [topic.topicId, topic]));
  const pageMapById = new Map(workCellsPageMap.topics.map((topic) => [topic.topicId, topic]));
  for (const topic of workCellsManifest.topics) {
    const manual = manualById.get(topic.topicId);
    const mapped = pageMapById.get(topic.topicId);
    assert(manual && mapped, `Missing range/page-map topic: ${topic.topicId}`);
    for (const key of ['order', 'sourceLabel', 'volumeId', 'range', 'imageCount']) {
      const authoringValue = key === 'sourceLabel' ? topic.source?.sourceLabel : topic[key];
      assert(authoringValue === manual[key], `${topic.topicId} manual range drift for ${key}.`);
      assert(authoringValue === mapped[key], `${topic.topicId} page-map drift for ${key}.`);
    }
    assert(topic.pageAnnotations.length === mapped.pageImagePaths.length, `${topic.topicId} page count drift.`);
  }

  const resolvePage = createGlobalPageResolver(workCellsManifest, workCellsPageMap);
  const workCellsDetails = workCellsManifest.topics.map((topic) => (
    projectWorkCellsTopic(topic, workCellsManifest, resolvePage)
  ));
  const categories = uniqueInOrder(workCellsManifest.topics.map((topic) => topic.category));
  const carmelaBooks = {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    seriesSlug: carmelaSeries.seriesSlug,
    seriesTitle: carmelaSeries.seriesTitle,
    books: carmelaBookSummaries,
  };
  const workCellsTopics = {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    seriesSlug: workCellsManifest.seriesSlug,
    seriesTitle: workCellsManifest.seriesTitle,
    contentType: workCellsManifest.contentType,
    navigationMode: workCellsManifest.navigationMode,
    manifestStatus: workCellsManifest.manifestStatus,
    verificationStatus: workCellsManifest.verificationStatus,
    hasAudio: false,
    categories,
    topics: workCellsManifest.topics.map(topicSummary),
  };
  const runtimeIndex = {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    siteTitle: 'Book Companion / 家庭阅读助手',
    series: [
      {
        seriesSlug: carmelaSeries.seriesSlug,
        seriesTitle: carmelaSeries.seriesTitle,
        contentType: carmelaEntry.type,
        navigationMode: carmelaEntry.navigationMode,
        description: '从绘本书架选择书目，回顾故事、聊一聊问题，也可以听配套音频。',
        coverImage: carmelaBookSummaries[0].cover,
        hasAudio: true,
        indexPath: 'public/runtime/carmela/books.json',
      },
      {
        seriesSlug: workCellsManifest.seriesSlug,
        seriesTitle: workCellsManifest.seriesTitle,
        contentType: workCellsManifest.contentType,
        navigationMode: workCellsManifest.navigationMode,
        description: '从科学主题馆按类别找到导读、身体科学小站与亲子问题卡。',
        coverImage: workCellsManifest.topics[0].thumbnailPath,
        hasAudio: false,
        indexPath: 'public/runtime/work-cells/topics.json',
        detailPathPattern: 'public/runtime/work-cells/topics/{slug}.json',
        manifestStatus: workCellsManifest.manifestStatus,
        verificationStatus: workCellsManifest.verificationStatus,
      },
    ],
  };

  const runtimeData = {
    runtimeIndex,
    carmelaBooks,
    workCellsTopics,
    workCellsDetails,
  };
  const counts = validateRuntimeData(runtimeData);
  await validateReferencedFiles(resolvedRoot, runtimeData);

  const artifacts = new Map();
  addArtifact(artifacts, 'index.json', runtimeIndex);
  addArtifact(artifacts, 'carmela/books.json', carmelaBooks);
  addArtifact(artifacts, 'work-cells/topics.json', workCellsTopics);
  for (const detail of workCellsDetails) {
    addArtifact(artifacts, `work-cells/topics/${detail.slug}.json`, detail);
  }

  const outputRecords = [...artifacts]
    .sort(([left], [right]) => compareStablePaths(left, right))
    .map(([relativePath, bytes]) => ({
      path: `public/runtime/${relativePath}`,
      sha256: sha256(bytes),
      bytes: bytes.length,
    }));
  const contentBytes = outputRecords.reduce((sum, output) => sum + output.bytes, 0);
  const manifest = {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    sources: [...sourceRecords.values()].sort((left, right) => compareStablePaths(left.path, right.path)),
    outputs: outputRecords,
    recordCounts: counts,
    parity: {
      carmelaBooks: { expected: 12, actual: counts.carmelaBooks },
      workCellsTopics: { expected: 27, actual: counts.workCellsTopics },
      workCellsCategories: { expected: 24, actual: counts.workCellsCategories },
      workCellsStations: { expected: 108, actual: counts.workCellsStations },
      workCellsQuestions: { expected: 162, actual: counts.workCellsQuestions },
      workCellsPageRefs: { expected: 286, actual: counts.workCellsPageRefs },
    },
    outputFileCount: outputRecords.length + 1,
    contentBytes,
    manifestBytes: 0,
    totalBytes: 0,
  };
  artifacts.set('runtime-manifest.json', finalizeManifest(manifest, contentBytes));

  const indexBytes = artifacts.get('index.json').length;
  const booksBytes = artifacts.get('carmela/books.json').length;
  const topicsBytes = artifacts.get('work-cells/topics.json').length;
  const detailBytes = workCellsDetails.map((detail) => ({
    slug: detail.slug,
    bytes: artifacts.get(`work-cells/topics/${detail.slug}.json`).length,
  }));
  const totalBytes = [...artifacts.values()].reduce((sum, bytes) => sum + bytes.length, 0);
  assert(indexBytes <= 20 * 1024, `Runtime index exceeds 20 KiB: ${indexBytes}`);
  assert(booksBytes <= 50 * 1024, `Carmela books index exceeds 50 KiB: ${booksBytes}`);
  assert(topicsBytes <= 100 * 1024, `Work Cells topics index exceeds 100 KiB: ${topicsBytes}`);
  detailBytes.forEach(({ slug, bytes }) => assert(bytes <= 150 * 1024, `${slug} exceeds 150 KiB: ${bytes}`));
  assert(detailBytes.reduce((sum, detail) => sum + detail.bytes, 0) <= 1.75 * 1024 * 1024, 'Topic details exceed 1.75 MiB.');
  assert(totalBytes <= 2 * 1024 * 1024, `Runtime JSON exceeds 2 MiB: ${totalBytes}`);

  return {
    artifacts,
    runtimeData,
    sourceRecords: [...sourceRecords.values()],
    sizes: { indexBytes, booksBytes, topicsBytes, detailBytes, totalBytes },
  };
}

async function listFiles(rootDir, currentDir = rootDir) {
  if (!await pathExists(currentDir)) return [];
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(rootDir, absolutePath));
    else if (entry.isFile()) files.push(toRepositoryPath(path.relative(rootDir, absolutePath)));
  }
  return files.sort(compareStablePaths);
}

export async function writeArtifactsToDirectory(artifacts, outputDir) {
  await mkdir(outputDir, { recursive: true });
  for (const [relativePath, bytes] of [...artifacts].sort(([left], [right]) => compareStablePaths(left, right))) {
    const targetPath = path.join(outputDir, ...relativePath.split('/'));
    assert(isInside(outputDir, targetPath), `Artifact escapes output: ${relativePath}`);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes);
  }
}

export async function compareArtifactTree(artifacts, outputDir) {
  const expected = [...artifacts.keys()].sort(compareStablePaths);
  const actual = await listFiles(outputDir);
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((file) => !actualSet.has(file));
  const extra = actual.filter((file) => !expectedSet.has(file));
  const stale = [];
  for (const relativePath of expected.filter((file) => actualSet.has(file))) {
    const actualBytes = await readFile(path.join(outputDir, ...relativePath.split('/')));
    if (!actualBytes.equals(artifacts.get(relativePath))) stale.push(relativePath);
  }
  return { missing, extra, stale, ok: missing.length === 0 && extra.length === 0 && stale.length === 0 };
}

export async function replaceArtifactTreeAtomically(artifacts, outputDir) {
  const parentDir = path.dirname(outputDir);
  await mkdir(parentDir, { recursive: true });
  const swapDir = await mkdtemp(path.join(parentDir, '.fr-p4a-runtime-swap-'));
  const stagedDir = path.join(swapDir, 'staged');
  const previousDir = path.join(swapDir, 'previous');
  let previousMoved = false;
  let replacementInstalled = false;
  try {
    await writeArtifactsToDirectory(artifacts, stagedDir);
    const stagedComparison = await compareArtifactTree(artifacts, stagedDir);
    assert(stagedComparison.ok, 'Staged runtime tree failed byte validation.');
    if (await pathExists(outputDir)) {
      const outputStats = await stat(outputDir);
      assert(outputStats.isDirectory(), `Runtime output is not a directory: ${outputDir}`);
      await rename(outputDir, previousDir);
      previousMoved = true;
    }
    try {
      await rename(stagedDir, outputDir);
      replacementInstalled = true;
    } catch (error) {
      if (previousMoved && !await pathExists(outputDir)) await rename(previousDir, outputDir);
      throw error;
    }
    try {
      const finalComparison = await compareArtifactTree(artifacts, outputDir);
      assert(finalComparison.ok, 'Installed runtime tree failed byte validation.');
    } catch (error) {
      if (replacementInstalled) await rm(outputDir, { recursive: true, force: true });
      if (previousMoved) await rename(previousDir, outputDir);
      throw error;
    }
  } finally {
    await rm(swapDir, { recursive: true, force: true });
  }
}

function describeDifferences(differences) {
  const lines = [];
  differences.missing.forEach((file) => lines.push(`missing ${file}`));
  differences.extra.forEach((file) => lines.push(`extra ${file}`));
  differences.stale.forEach((file) => lines.push(`stale ${file}`));
  return lines;
}

function parseArguments(argv) {
  const args = [...argv];
  if (args.length === 1 && args[0] === '--write') return { mode: 'write' };
  if (args.length === 1 && args[0] === '--check') return { mode: 'check' };
  if (args.length === 2 && args[0] === '--output') return { mode: 'output', outputPath: args[1] };
  throw new Error('Usage: node scripts/generate-runtime-content.mjs --write | --check | --output <safe-temp-dir>');
}

export async function runCli(argv = process.argv.slice(2), { rootDir = PROJECT_ROOT } = {}) {
  const options = parseArguments(argv);
  const generated = await generateRuntimeArtifacts({ rootDir });
  const productionDir = path.join(path.resolve(rootDir), 'public', 'runtime');

  if (options.mode === 'check') {
    const differences = await compareArtifactTree(generated.artifacts, productionDir);
    if (!differences.ok) {
      console.error('Runtime content is missing, extra, or stale:');
      describeDifferences(differences).forEach((line) => console.error(`- ${line}`));
      return 1;
    }
    console.log(`Runtime content check passed: ${generated.artifacts.size} files, ${generated.sizes.totalBytes} bytes.`);
    return 0;
  }

  const outputDir = options.mode === 'write'
    ? assertSafeOutputPath(productionDir, { rootDir, allowProduction: true })
    : assertSafeOutputPath(options.outputPath, { rootDir, allowProduction: false });
  await replaceArtifactTreeAtomically(generated.artifacts, outputDir);
  console.log(`Runtime content written: ${generated.artifacts.size} files, ${generated.sizes.totalBytes} bytes.`);
  return 0;
}

const directExecutionPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectExecution = process.platform === 'win32'
  ? directExecutionPath.toLocaleLowerCase('en-US') === scriptPath.toLocaleLowerCase('en-US')
  : directExecutionPath === scriptPath;

if (isDirectExecution) {
  runCli().then(
    (status) => { process.exitCode = status; },
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
