import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultManifestPath = path.join(rootDir, 'public', 'books', '工作细胞', 'draft-manifest.json');
const defaultPageMapPath = path.join(rootDir, 'data', 'cells-at-work', 'page-map.json');
const defaultReportPath = path.join(rootDir, 'docs', 'work-cells-visual-annotations-import-report.md');

const topicFields = [
  'topicSummary',
  'keyBiologyConcepts',
  'recommendedBodyScienceStationFocus',
  'recommendedParentQuestions',
  'recommendedEncyclopediaEntries',
  'sensitiveContentGuidance',
  'codexImportNotes',
];
const pageFields = [
  'pageId',
  'sourcePath',
  'zipPath',
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

function toPosix(value) {
  return String(value).replaceAll(path.sep, '/');
}

function isBlank(value) {
  return value === null
    || value === undefined
    || value === ''
    || (Array.isArray(value) && value.length === 0);
}

function basenameWithoutExtension(resourcePath) {
  return path.basename(String(resourcePath), path.extname(String(resourcePath)));
}

function isHighBodyScienceStationUse(value) {
  return /^\s*高(?:\b|[:：])/.test(String(value ?? ''));
}

function buildTopicIndex(manifest, pageMap) {
  const byTopicId = new Map();
  const pageMapByOrder = new Map((pageMap?.topics ?? []).map((topic) => [topic.order, topic]));

  manifest.topics.forEach((topic, index) => {
    if (topic.topicId) {
      byTopicId.set(topic.topicId, index);
      return;
    }

    const pageMapTopic = pageMapByOrder.get(topic.order);
    if (pageMapTopic?.topicId) {
      byTopicId.set(pageMapTopic.topicId, index);
    }
  });

  return byTopicId;
}

function imagePathByPageId(paths = []) {
  return new Map(paths.map((imagePath) => [basenameWithoutExtension(imagePath), imagePath]));
}

function resolveAnnotationSourcePath(page, topic, pageMapTopic, rootDirForCheck) {
  if (page.sourcePath && existsSync(path.join(rootDirForCheck, ...page.sourcePath.split('/')))) {
    return page.sourcePath;
  }

  const mappedImages = imagePathByPageId([
    ...(topic.pageImagePaths ?? []),
    ...(pageMapTopic?.pageImagePaths ?? []),
  ]);
  return mappedImages.get(page.pageId) ?? page.sourcePath ?? null;
}

function cleanPageAnnotation(page, topic, pageMapTopic, rootDirForCheck) {
  const sourcePath = resolveAnnotationSourcePath(page, topic, pageMapTopic, rootDirForCheck);
  const cleaned = {};
  for (const field of pageFields) {
    if (field === 'sourcePath') {
      cleaned.sourcePath = sourcePath;
      continue;
    }
    cleaned[field] = page[field] ?? (Array.isArray(page[field]) ? [] : null);
  }
  return cleaned;
}

function missingTopicFields(topic) {
  return topicFields.filter((field) => isBlank(topic[field]));
}

function missingPageFields(page) {
  return pageFields.filter((field) => isBlank(page[field]));
}

function missingImagesForTopic(topic, rootDirForCheck) {
  return (topic.pageAnnotations ?? [])
    .filter((page) => !page.sourcePath || !existsSync(path.join(rootDirForCheck, ...page.sourcePath.split('/'))))
    .map((page) => page.pageId);
}

function topicReport(topic, annotationTopic, action, rootDirForCheck) {
  const missingPageFieldIds = (topic.pageAnnotations ?? [])
    .map((page) => ({ pageId: page.pageId, fields: missingPageFields(page) }))
    .filter((item) => item.fields.length > 0);
  const candidates = topic.bodyScienceStationCandidatePageIds ?? [];

  return {
    topicId: topic.topicId,
    title: topic.displayTitle ?? topic.title,
    action,
    importedPageCount: topic.pageAnnotations?.length ?? 0,
    expectedImageCount: annotationTopic?.imageCount ?? topic.imageCount ?? null,
    missingImages: missingImagesForTopic(topic, rootDirForCheck),
    missingTopicFields: missingTopicFields(topic),
    missingPageFieldIds,
    bodyScienceStationCandidateCount: candidates.length,
  };
}

export function mergeWorkCellsVisualAnnotations({
  manifest,
  pageMap,
  annotationBatch,
  rootDir: rootDirForCheck = rootDir,
}) {
  if (!Array.isArray(annotationBatch?.topics)) {
    throw new Error('Annotation JSON must contain topics[].');
  }

  const nextManifest = structuredClone(manifest);
  const pageMapByTopicId = new Map((pageMap?.topics ?? []).map((topic) => [topic.topicId, topic]));
  const indexByTopicId = buildTopicIndex(nextManifest, pageMap);
  const report = {
    importedAt: new Date().toISOString(),
    annotationTopicCount: annotationBatch.topics.length,
    topics: [],
  };

  for (const annotationTopic of annotationBatch.topics) {
    const existingIndex = indexByTopicId.get(annotationTopic.topicId);
    const pageMapTopic = pageMapByTopicId.get(annotationTopic.topicId);
    const action = existingIndex === undefined ? 'added' : 'updated';
    const baseTopic = existingIndex === undefined
      ? {
          order: nextManifest.topics.length + 1,
          slug: annotationTopic.topicId,
          source: {},
          pageImagePaths: pageMapTopic?.pageImagePaths ?? [],
          thumbnailPath: pageMapTopic?.thumbnailPath ?? null,
        }
      : nextManifest.topics[existingIndex];
    const pageImagePaths = baseTopic.pageImagePaths ?? pageMapTopic?.pageImagePaths ?? [];
    const pageAnnotations = (annotationTopic.pageAnnotations ?? []).map((page) => (
      cleanPageAnnotation(page, { ...baseTopic, pageImagePaths }, pageMapTopic, rootDirForCheck)
    ));
    const bodyScienceStationCandidatePageIds = pageAnnotations
      .filter((page) => isHighBodyScienceStationUse(page.bodyScienceStationUse))
      .map((page) => page.pageId);

    const mergedTopic = {
      ...baseTopic,
      topicId: annotationTopic.topicId,
      title: annotationTopic.displayTitle ?? baseTopic.title,
      displayTitle: annotationTopic.displayTitle ?? baseTopic.displayTitle ?? baseTopic.title,
      source: {
        ...baseTopic.source,
        sourceLabel: annotationTopic.sourceLabel ?? pageMapTopic?.sourceLabel ?? baseTopic.source?.sourceLabel,
      },
      sourceLabel: annotationTopic.sourceLabel ?? baseTopic.sourceLabel,
      volumeId: annotationTopic.volumeId ?? baseTopic.volumeId,
      range: annotationTopic.range ?? baseTopic.range,
      imageCount: annotationTopic.imageCount ?? pageMapTopic?.imageCount ?? baseTopic.imageCount,
      ...Object.fromEntries(topicFields.map((field) => [field, annotationTopic[field]])),
      notesForCodex: annotationTopic.notesForCodex ?? baseTopic.notesForCodex,
      pageAnnotations,
      bodyScienceStationCandidatePageIds,
    };

    if (existingIndex === undefined) {
      nextManifest.topics.push(mergedTopic);
      indexByTopicId.set(annotationTopic.topicId, nextManifest.topics.length - 1);
    } else {
      nextManifest.topics[existingIndex] = mergedTopic;
    }

    report.topics.push(topicReport(mergedTopic, annotationTopic, action, rootDirForCheck));
  }

  return { manifest: nextManifest, report };
}

export function validateWorkCellsVisualAnnotations({
  manifest,
  rootDir: rootDirForCheck = rootDir,
  topicIds = null,
}) {
  const errors = [];
  const topics = topicIds
    ? manifest.topics.filter((topic) => topicIds.includes(topic.topicId))
    : manifest.topics.filter((topic) => Array.isArray(topic.pageAnnotations));

  for (const topic of topics) {
    if (!topic.topicId) {
      errors.push(`Topic ${topic.title ?? topic.order} is missing topicId.`);
      continue;
    }

    if ((topic.pageAnnotations?.length ?? 0) !== topic.imageCount) {
      errors.push(`${topic.topicId} pageAnnotations count does not match imageCount.`);
    }

    if (Array.isArray(topic.pageImagePaths) && topic.pageAnnotations?.length !== topic.pageImagePaths.length) {
      errors.push(`${topic.topicId} pageAnnotations count does not match pageImagePaths.`);
    }

    for (const field of missingTopicFields(topic)) {
      errors.push(`${topic.topicId} is missing ${field}.`);
    }

    for (const page of topic.pageAnnotations ?? []) {
      for (const field of missingPageFields(page)) {
        errors.push(`${topic.topicId}/${page.pageId ?? 'unknown-page'} is missing ${field}.`);
      }

      if (!page.sourcePath || !existsSync(path.join(rootDirForCheck, ...page.sourcePath.split('/')))) {
        errors.push(`${topic.topicId}/${page.pageId ?? 'unknown-page'} image is missing.`);
      }
    }
  }

  return { errors };
}

function renderImportReport(report) {
  const rows = report.topics.map((topic) => [
    topic.topicId,
    topic.title,
    topic.action === 'added' ? '新增' : '更新',
    String(topic.importedPageCount),
    topic.missingImages.length === 0 ? '否' : `是（${topic.missingImages.length}）`,
    topic.missingTopicFields.length === 0 && topic.missingPageFieldIds.length === 0
      ? '否'
      : `是（主题 ${topic.missingTopicFields.length} 项，页面 ${topic.missingPageFieldIds.length} 页）`,
    String(topic.bodyScienceStationCandidateCount),
  ]);

  return [
    '# 工作细胞视觉标注导入报告',
    '',
    `- 导入时间：${report.importedAt}`,
    `- 导入主题数：${report.annotationTopicCount}`,
    '',
    '| topicId | 主题 | 新增/更新 | 导入页数 | 缺失图片 | 字段缺失 | 身体科学小站候选页数 |',
    '| --- | --- | --- | ---: | --- | --- | ---: |',
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll('|', '\\|')).join(' | ')} |`),
    '',
  ].join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--input') {
      options.inputPath = args[++index];
    } else if (arg === '--manifest') {
      options.manifestPath = args[++index];
    } else if (arg === '--page-map') {
      options.pageMapPath = args[++index];
    } else if (arg === '--report-output') {
      options.reportPath = args[++index];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/import-work-cells-visual-annotations.mjs --input <annotation-json>

Options:
  --input <file>          Visual annotation JSON to import.
  --manifest <file>       Default: public/books/工作细胞/draft-manifest.json
  --page-map <file>       Default: data/cells-at-work/page-map.json
  --report-output <file>  Default: docs/work-cells-visual-annotations-import-report.md
`);
}

export async function runWorkCellsVisualAnnotationImport(options = {}) {
  const inputPath = options.inputPath;
  if (!inputPath) {
    throw new Error('Missing --input <annotation-json>.');
  }

  const manifestPath = options.manifestPath ?? defaultManifestPath;
  const pageMapPath = options.pageMapPath ?? defaultPageMapPath;
  const reportPath = options.reportPath ?? defaultReportPath;
  const [manifest, pageMap, annotationBatch] = await Promise.all([
    readJson(manifestPath),
    readJson(pageMapPath),
    readJson(inputPath),
  ]);
  const { manifest: mergedManifest, report } = mergeWorkCellsVisualAnnotations({
    manifest,
    pageMap,
    annotationBatch,
    rootDir,
  });
  const validation = validateWorkCellsVisualAnnotations({
    manifest: mergedManifest,
    rootDir,
    topicIds: annotationBatch.topics.map((topic) => topic.topicId),
  });

  if (validation.errors.length > 0) {
    throw new Error(`Visual annotation import validation failed:\n${validation.errors.join('\n')}`);
  }

  await writeJson(manifestPath, mergedManifest);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderImportReport(report), 'utf8');

  return {
    manifestPath,
    reportPath,
    report,
  };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runWorkCellsVisualAnnotationImport(options);
    console.log(`Imported topics: ${result.report.annotationTopicCount}`);
    console.log(`Manifest: ${toPosix(path.relative(rootDir, result.manifestPath))}`);
    console.log(`Report: ${toPosix(path.relative(rootDir, result.reportPath))}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
