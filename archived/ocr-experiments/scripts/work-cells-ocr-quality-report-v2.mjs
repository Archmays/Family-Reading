import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultPaths = {
  v1LayoutPath: path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'topic-page-blocks.json'),
  v2LayoutPath: path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout-v2', 'topic-page-blocks-v2.json'),
  v1TranscriptsPath: path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'topic-readable-transcripts.json'),
  v2ReadablePath: path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout-v2', 'page-readable-text-v2.json'),
  v2TranscriptsPath: path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout-v2', 'topic-readable-transcripts-v2.json'),
  v2OutlinePath: path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout-v2', 'topic-story-outline-hints-v2.json'),
  manualTopicRangesPath: path.join(rootDir, 'data', 'cells-at-work', 'manual-topic-ranges.json'),
  terminologyPath: path.join(rootDir, 'data-private', 'cells-at-work', 'terminology.zh-Hans.json'),
  outputPath: path.join(rootDir, 'reports', 'cells-at-work', 'ocr-quality-report-v2.md'),
};
const forbiddenOutputRoots = new Set(['public', 'dist', 'build', 'docs']);
const publicLeakRoots = ['public', 'dist', 'build', 'docs'];
const calibrationPages = [
  {
    topicId: 'acquired-immunity',
    pageId: 'v03_page-099',
    visualSpotCheck: 'fail: page image is readable, but OCR is dominated by Latin/noisy fragments and misses the vertical dialogue order.',
  },
  {
    topicId: 'left-shift',
    pageId: 'v06_page-042',
    visualSpotCheck: 'partial: OCR catches some chart labels, but table order and explanatory text still need manual checking.',
  },
  {
    topicId: 'psoriasis',
    pageId: 'v06_page-121',
    visualSpotCheck: 'fail: page image has many readable bubbles, but OCR has very low Chinese ratio and high Latin noise.',
  },
  {
    topicId: 'cancer-cell-ii',
    pageId: 'v05_page-143',
    visualSpotCheck: 'partial: OCR catches a few key terms, but panel and bubble order are not reliable enough for an A grade.',
  },
];

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function relativePath(targetPath) {
  return toPosix(path.relative(rootDir, targetPath));
}

function assertInsideRoot(targetPath, message) {
  const relative = path.relative(rootDir, path.resolve(targetPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(message ?? `Refusing to access path outside project root: ${targetPath}`);
  }
}

function assertReportOutputPath(outputPath) {
  assertInsideRoot(outputPath);
  const firstSegment = relativePath(outputPath).split('/')[0];
  if (forbiddenOutputRoots.has(firstSegment)) {
    throw new Error(`Refusing to write OCR quality report into a public/deployable directory: ${relativePath(outputPath)}`);
  }
}

async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, 'utf8'));
}

function readJsonSyncIfExists(targetPath) {
  if (!targetPath || !existsSync(targetPath)) {
    return null;
  }
  return JSON.parse(readFileSync(targetPath, 'utf8'));
}

async function collectFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/gu, '');
}

function pageText(page) {
  if (typeof page.text === 'string') {
    return page.text;
  }
  if (typeof page.ocrText === 'string') {
    return page.ocrText;
  }
  return (page.blocks ?? []).map((block) => block.text ?? '').join('\n');
}

function topicText(topic) {
  return (topic.pages ?? []).map(pageText).join('\n');
}

function textMetrics(text) {
  const chars = [...compactText(text)];
  const total = chars.length;
  const han = chars.filter((char) => /\p{Script=Han}/u.test(char)).length;
  const latin = chars.filter((char) => /[A-Za-z]/u.test(char)).length;
  const ascii = chars.filter((char) => /[A-Za-z0-9]/u.test(char)).length;
  const symbols = Math.max(0, total - han - ascii);
  return {
    charCount: total,
    hanCount: han,
    latinCount: latin,
    symbolCount: symbols,
    hanRatio: total > 0 ? Number((han / total).toFixed(3)) : 0,
    latinRatio: total > 0 ? Number((latin / total).toFixed(3)) : 0,
    symbolRatio: total > 0 ? Number((symbols / total).toFixed(3)) : 1,
    noiseRatio: total > 0 ? Number(((latin + symbols) / total).toFixed(3)) : 1,
  };
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0
    ? Number((finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(3))
    : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countForm(text, form) {
  const compactForm = compactText(form);
  if (!compactForm) {
    return 0;
  }
  return [...compactText(text).matchAll(new RegExp(escapeRegex(compactForm), 'giu'))].length;
}

function countKeywords(text, keywords) {
  const matched = [];
  let hitCount = 0;
  for (const keyword of keywords) {
    const count = countForm(text, keyword);
    if (count > 0) {
      matched.push(keyword);
      hitCount += count;
    }
  }
  return { hitCount, matched };
}

function findDraftManifest() {
  const booksDir = path.join(rootDir, 'public', 'books');
  if (!existsSync(booksDir)) {
    return null;
  }
  for (const entry of readdirSync(booksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = path.join(booksDir, entry.name, 'draft-manifest.json');
    const manifest = readJsonSyncIfExists(candidate);
    if (manifest?.pageMapPath === 'data/cells-at-work/page-map.json') {
      return { path: candidate, manifest };
    }
  }
  return null;
}

function buildKeywordMap({ manualTopicRanges, terminology, manifest }) {
  const manifestByTitle = new Map((manifest?.topics ?? []).map((topic) => [topic.displayTitle ?? topic.title, topic]));
  const terminologyByTopic = new Map();
  for (const entry of terminology?.entries ?? []) {
    for (const topicId of entry.topics ?? []) {
      if (topicId === 'all') {
        continue;
      }
      const list = terminologyByTopic.get(topicId) ?? [];
      list.push(entry.preferred, entry.label);
      for (const form of entry.forms ?? []) {
        list.push(typeof form === 'string' ? form : form.text, typeof form === 'string' ? null : form.normalized);
      }
      terminologyByTopic.set(topicId, list.filter(Boolean));
    }
  }

  const byTopic = new Map();
  for (const topic of manualTopicRanges.topics ?? []) {
    const manifestTopic = manifestByTitle.get(topic.displayTitle);
    const keywords = [
      topic.displayTitle,
      manifestTopic?.title,
      manifestTopic?.displayTitle,
      ...(manifestTopic?.originalTitleReferences ?? []),
      ...(terminologyByTopic.get(topic.topicId) ?? []),
    ].filter(Boolean);
    byTopic.set(topic.topicId, [...new Set(keywords)]);
  }
  return byTopic;
}

function summarizeLayoutTopics(layout, keywordMap) {
  const topics = new Map();
  for (const topic of layout.topics ?? []) {
    const text = topicText(topic);
    const metrics = textMetrics(text);
    const keywords = keywordMap.get(topic.topicId) ?? [topic.displayTitle].filter(Boolean);
    const keywordCoverage = countKeywords(text, keywords);
    const pageMetrics = (topic.pages ?? []).map((page) => ({
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      pageNumber: page.pageNumber,
      pageId: page.pageId ?? page.imagePath?.match(/(v\d+\/page-\d+)/)?.[1]?.replace('/', '_').replace('page-', 'page-') ?? null,
      imagePath: page.imagePath,
      confidence: Number.isFinite(page.confidence) ? page.confidence : null,
      blockCount: page.blocks?.length ?? page.blockCount ?? 0,
      scoreMetrics: page.scoreMetrics ?? null,
      ...textMetrics(pageText(page)),
    }));
    topics.set(topic.topicId, {
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      pageCount: topic.pages?.length ?? 0,
      averageConfidence: average((topic.pages ?? []).map((page) => page.confidence).filter(Number.isFinite)),
      ...metrics,
      keywordHitCount: keywordCoverage.hitCount,
      matchedKeywords: keywordCoverage.matched,
      pageMetrics,
    });
  }
  return topics;
}

function summarizeReadableTopics(readable) {
  const topics = new Map();
  for (const topic of readable.topics ?? []) {
    const pages = topic.pages ?? [];
    topics.set(topic.topicId, {
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      unusablePageCount: pages.filter((page) => page.usabilityStatus === 'unusable').length,
      needsReviewPageCount: pages.filter((page) => page.usabilityStatus === 'needs_review').length,
      lowReadingOrderPageCount: pages.filter((page) => page.readingOrderConfidence === 'low').length,
      averageCleanedConfidence: average(pages.map((page) => Number(page.confidence))),
      publicLeakCheck: readable.summary?.publicLeakCheck ?? null,
    });
  }
  return topics;
}

function transcriptQualityMap(transcripts) {
  return new Map((transcripts.summary?.qualityByTopic ?? []).map((topic) => [topic.topicId, topic]));
}

function gradeLetter(grade) {
  return String(grade ?? '').match(/^[A-D]/)?.[0] ?? 'D';
}

function normalizeGrade(grade) {
  const letter = gradeLetter(grade);
  return {
    A: 'A-可优先使用',
    B: 'B-可参考需抽查',
    C: 'C-需人工抽查后使用',
    D: 'D-暂不建议直接使用',
  }[letter];
}

function strictReportGrade({ v2Topic, readableTopic, transcriptTopic }) {
  const reasons = [...(transcriptTopic?.qualityReasons ?? [])];
  const baseLetter = gradeLetter(transcriptTopic?.qualityGrade);
  let letter = baseLetter;

  if ((readableTopic?.unusablePageCount ?? 0) / Math.max(1, v2Topic.pageCount) > 0.2) {
    letter = 'D';
    reasons.push('More than 20% of pages are unusable after text-ratio gating');
  } else if (v2Topic.hanRatio < 0.4 && v2Topic.latinRatio > 0.32) {
    letter = letter === 'D' ? 'D' : 'C';
    reasons.push('Topic-level Chinese ratio is low while Latin noise is high; cannot be A/B');
  } else if (v2Topic.noiseRatio > 0.54) {
    letter = letter === 'D' ? 'D' : 'C';
    reasons.push('Topic-level Latin/symbol noise is high; requires manual image review');
  }

  if (letter === 'A') {
    letter = 'B';
    reasons.push('A grade withheld because 6F-2 only spot-checked calibration pages, not every topic sample');
  }

  return {
    qualityGrade: normalizeGrade(letter),
    reasons: [...new Set(reasons)],
  };
}

function compareTopics({ v1LayoutTopics, v2LayoutTopics, v1Quality, v2Quality, readableTopics, outline }) {
  const outlineRecommended = new Set((outline.summary?.recommendedBodyScienceStationTopics ?? []).map((topic) => topic.topicId));
  const rows = [];
  for (const [topicId, v2Topic] of v2LayoutTopics) {
    const v1Topic = v1LayoutTopics.get(topicId);
    const readableTopic = readableTopics.get(topicId);
    const reportGrade = strictReportGrade({
      v2Topic,
      readableTopic,
      transcriptTopic: v2Quality.get(topicId),
    });
    const bodyStatus = reportGrade.qualityGrade.startsWith('B-') && outlineRecommended.has(topicId)
      ? 'candidate-after-spot-check'
      : reportGrade.qualityGrade.startsWith('D-')
        ? 'hold-use-outline-and-page-images-only'
        : 'hold-for-manual-review';

    rows.push({
      topicId,
      displayTitle: v2Topic.displayTitle,
      pageCount: v2Topic.pageCount,
      v1Grade: normalizeGrade(v1Quality.get(topicId)?.qualityGrade),
      v2TranscriptGrade: normalizeGrade(v2Quality.get(topicId)?.qualityGrade),
      v2ReportGrade: reportGrade.qualityGrade,
      gradeReasons: reportGrade.reasons,
      v1HanRatio: v1Topic?.hanRatio ?? null,
      v2HanRatio: v2Topic.hanRatio,
      hanRatioDelta: v1Topic ? Number((v2Topic.hanRatio - v1Topic.hanRatio).toFixed(3)) : null,
      v1NoiseRatio: v1Topic?.noiseRatio ?? null,
      v2NoiseRatio: v2Topic.noiseRatio,
      noiseRatioDelta: v1Topic ? Number((v2Topic.noiseRatio - v1Topic.noiseRatio).toFixed(3)) : null,
      v1KeywordHitCount: v1Topic?.keywordHitCount ?? 0,
      v2KeywordHitCount: v2Topic.keywordHitCount,
      keywordHitDelta: v1Topic ? v2Topic.keywordHitCount - v1Topic.keywordHitCount : v2Topic.keywordHitCount,
      unusablePageCount: readableTopic?.unusablePageCount ?? 0,
      lowReadingOrderPageCount: readableTopic?.lowReadingOrderPageCount ?? 0,
      bodyScienceStationStatus: bodyStatus,
      matchedKeywords: v2Topic.matchedKeywords.slice(0, 8),
    });
  }
  return rows.sort((a, b) => a.topicId.localeCompare(b.topicId));
}

function aggregateLayout(topics) {
  const text = [...topics.values()].map((topic) => ({
    text: '',
    metrics: topic,
  }));
  const totalChars = text.reduce((sum, item) => sum + item.metrics.charCount, 0);
  const han = text.reduce((sum, item) => sum + item.metrics.hanCount, 0);
  const latin = text.reduce((sum, item) => sum + item.metrics.latinCount, 0);
  const symbols = text.reduce((sum, item) => sum + item.metrics.symbolCount, 0);
  return {
    charCount: totalChars,
    hanRatio: totalChars > 0 ? Number((han / totalChars).toFixed(3)) : 0,
    latinRatio: totalChars > 0 ? Number((latin / totalChars).toFixed(3)) : 0,
    noiseRatio: totalChars > 0 ? Number(((latin + symbols) / totalChars).toFixed(3)) : 1,
    keywordHitCount: [...topics.values()].reduce((sum, topic) => sum + topic.keywordHitCount, 0),
    topicsWithKeywordHits: [...topics.values()].filter((topic) => topic.keywordHitCount > 0).length,
  };
}

function pageIdFromImagePath(imagePath) {
  const match = String(imagePath ?? '').match(/pages-by-volume\/(v\d+)\/page-(\d+)\.webp$/);
  return match ? `${match[1]}_page-${match[2]}` : null;
}

function calibrationResults({ v2LayoutTopics, readingOrder, readable }) {
  const readingPages = new Map();
  for (const topic of readingOrder.topics ?? []) {
    for (const page of topic.pages ?? []) {
      readingPages.set(`${topic.topicId}:${pageIdFromImagePath(page.imagePath)}`, page);
    }
  }
  const readablePages = new Map();
  for (const topic of readable.topics ?? []) {
    for (const page of topic.pages ?? []) {
      readablePages.set(`${topic.topicId}:${pageIdFromImagePath(page.imagePath)}`, page);
    }
  }

  return calibrationPages.map((calibration) => {
    const topic = v2LayoutTopics.get(calibration.topicId);
    const rawPage = topic?.pageMetrics.find((page) => page.pageId === calibration.pageId);
    const orderedPage = readingPages.get(`${calibration.topicId}:${calibration.pageId}`);
    const readablePage = readablePages.get(`${calibration.topicId}:${calibration.pageId}`);
    return {
      ...calibration,
      displayTitle: topic?.displayTitle ?? calibration.topicId,
      pageNumber: rawPage?.pageNumber ?? null,
      sourceConfidence: rawPage?.confidence ?? null,
      sourceHanRatio: rawPage?.scoreMetrics?.chineseCharRatio ?? rawPage?.hanRatio ?? null,
      sourceLatinNoiseRatio: rawPage?.scoreMetrics?.latinNoiseRatio ?? rawPage?.latinRatio ?? null,
      topicKeywordHits: rawPage?.scoreMetrics?.topicKeywordHits ?? null,
      readingOrderConfidence: orderedPage?.readingOrderConfidence ?? null,
      usabilityStatus: orderedPage?.usabilityStatus ?? readablePage?.usabilityStatus ?? 'missing',
      usabilityReasons: orderedPage?.usabilityReasons ?? readablePage?.usabilityReasons ?? [],
      normalizedConfidence: readablePage?.confidence ?? null,
    };
  });
}

function snippetForLeakCheck(text) {
  const compact = compactText(text);
  return compact.length >= 80 ? compact.slice(0, 80) : null;
}

async function checkPublicLeakage({ readable, transcripts }) {
  const snippets = [
    ...(readable.topics ?? []).flatMap((topic) => (topic.pages ?? []).map((page) => snippetForLeakCheck(page.normalizedText))),
    ...(transcripts.topics ?? []).map((topic) => snippetForLeakCheck(topic.transcriptText)),
  ].filter(Boolean).slice(0, 160);

  const matches = [];
  for (const root of publicLeakRoots) {
    const rootPath = path.join(rootDir, root);
    for (const file of await collectFiles(rootPath)) {
      if (!['.json', '.js', '.html', '.md', '.txt'].includes(path.extname(file).toLowerCase())) {
        continue;
      }
      const compact = compactText(await readFile(file, 'utf8').catch(() => ''));
      const snippet = snippets.find((item) => compact.includes(item));
      if (snippet) {
        matches.push({ path: relativePath(file), snippet });
      }
    }
  }

  return {
    checkedRoots: publicLeakRoots.map((root) => `${root}/`),
    completeTextFoundInPublicRoots: matches.length > 0,
    matches,
  };
}

function pct(value) {
  return Number.isFinite(value) ? `${Math.round(value * 1000) / 10}%` : 'n/a';
}

function signedPctPoint(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  const points = Math.round(value * 1000) / 10;
  return `${points >= 0 ? '+' : ''}${points}pp`;
}

function gradeCounts(rows, field) {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const row of rows) {
    counts[gradeLetter(row[field])] += 1;
  }
  return counts;
}

function formatGradeCounts(counts) {
  return `A ${counts.A}, B ${counts.B}, C ${counts.C}, D ${counts.D}`;
}

function listOrNone(items, formatter = (item) => item.displayTitle) {
  return items.length > 0 ? items.map(formatter).join('、') : '无';
}

function markdownTable(rows, columns) {
  const lines = [];
  lines.push(`| ${columns.map((column) => column.title).join(' | ')} |`);
  lines.push(`| ${columns.map((column) => column.align ?? '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${columns.map((column) => String(column.value(row) ?? '').replaceAll('|', '/')).join(' | ')} |`);
  }
  return lines.join('\n');
}

function reportMarkdown({ paths, aggregate, topicRows, calibration, leakCheck }) {
  const v1Counts = gradeCounts(topicRows, 'v1Grade');
  const v2Counts = gradeCounts(topicRows, 'v2ReportGrade');
  const candidateTopics = topicRows.filter((row) => row.bodyScienceStationStatus === 'candidate-after-spot-check');
  const holdOcrTopics = topicRows.filter((row) => row.bodyScienceStationStatus === 'hold-use-outline-and-page-images-only');
  const manualReviewTopics = topicRows.filter((row) => row.bodyScienceStationStatus === 'hold-for-manual-review');
  const lines = [];

  lines.push('# 工作细胞 OCR v2 质量报告');
  lines.push('');
  lines.push(`生成时间：${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 输出边界');
  lines.push('');
  lines.push('- 本报告只写入统计、等级、页码、短关键词和校准结论，不写入完整 OCR 或完整转写文本。');
  lines.push('- 完整 OCR、阅读顺序、可读文本和主题转写草稿只保留在 `data-private/`。');
  lines.push('- 本阶段没有生成身体科学小站正文，没有覆盖 page-map、manual-topic-ranges、manifest 或术语表。');
  lines.push(`- 完整文本进入公开目录：${leakCheck.completeTextFoundInPublicRoots ? '是' : '否'}。检查范围：${leakCheck.checkedRoots.join(' ')}`);
  lines.push('');
  lines.push('## v2 文件');
  lines.push('');
  for (const [label, targetPath] of Object.entries(paths)) {
    lines.push(`- ${label}: \`${relativePath(targetPath)}\``);
  }
  lines.push('');
  lines.push('## v1/v2 对比摘要');
  lines.push('');
  lines.push(`- 中文字符比例：v1 ${pct(aggregate.v1.hanRatio)} -> v2 ${pct(aggregate.v2.hanRatio)}（${signedPctPoint(aggregate.v2.hanRatio - aggregate.v1.hanRatio)}）。`);
  lines.push(`- 拉丁/符号噪声比例：v1 ${pct(aggregate.v1.noiseRatio)} -> v2 ${pct(aggregate.v2.noiseRatio)}（${signedPctPoint(aggregate.v2.noiseRatio - aggregate.v1.noiseRatio)}）。`);
  lines.push(`- 主题关键词命中：v1 ${aggregate.v1.keywordHitCount} 次/${aggregate.v1.topicsWithKeywordHits} 主题 -> v2 ${aggregate.v2.keywordHitCount} 次/${aggregate.v2.topicsWithKeywordHits} 主题。`);
  lines.push(`- 主题质量等级：v1 ${formatGradeCounts(v1Counts)} -> v2 ${formatGradeCounts(v2Counts)}。D 级主题${v2Counts.D < v1Counts.D ? '减少' : v2Counts.D === v1Counts.D ? '持平' : '增加'}。`);
  lines.push('- A 级规则：6F-2 没有给任何主题自动 A 级；A 级必须有主题样本肉眼抽查通过记录。');
  lines.push('');
  lines.push('## 校准页识别结果');
  lines.push('');
  lines.push(markdownTable(calibration, [
    { title: '校准页', value: (row) => `${row.topicId} ${row.pageId}` },
    { title: '主题', value: (row) => row.displayTitle },
    { title: '源 confidence', align: '---:', value: (row) => row.sourceConfidence ?? 'n/a' },
    { title: '中文比例', align: '---:', value: (row) => pct(row.sourceHanRatio) },
    { title: '拉丁噪声', align: '---:', value: (row) => pct(row.sourceLatinNoiseRatio) },
    { title: '关键词命中', align: '---:', value: (row) => row.topicKeywordHits ?? 'n/a' },
    { title: '顺序置信', value: (row) => row.readingOrderConfidence ?? 'n/a' },
    { title: '可用性', value: (row) => row.usabilityStatus },
    { title: '肉眼抽查', value: (row) => row.visualSpotCheck },
  ]));
  lines.push('');
  lines.push('## 主题质量等级变化');
  lines.push('');
  lines.push(markdownTable(topicRows, [
    { title: '主题', value: (row) => row.displayTitle },
    { title: 'v1 等级', value: (row) => row.v1Grade },
    { title: 'v2 等级', value: (row) => row.v2ReportGrade },
    { title: '中文变化', align: '---:', value: (row) => signedPctPoint(row.hanRatioDelta) },
    { title: '噪声变化', align: '---:', value: (row) => signedPctPoint(row.noiseRatioDelta) },
    { title: '关键词变化', align: '---:', value: (row) => row.keywordHitDelta },
    { title: '不可用页', align: '---:', value: (row) => row.unusablePageCount },
    { title: '身体科学小站状态', value: (row) => row.bodyScienceStationStatus },
  ]));
  lines.push('');
  lines.push('## 可进入身体科学小站的主题');
  lines.push('');
  lines.push(`- 可进入后续正文规划但仍需抽查：${listOrNone(candidateTopics)}。`);
  lines.push(`- 需人工复核后再决定：${listOrNone(manualReviewTopics)}。`);
  lines.push(`- 仍只能依赖主题概括和页图，不可依赖 OCR：${listOrNone(holdOcrTopics)}。`);
  lines.push('');
  lines.push('## 说明');
  lines.push('');
  lines.push('- `candidate-after-spot-check` 表示可进入后续身体科学小站规划队列，但正文生成前仍要看页图抽查关键页。');
  lines.push('- `hold-use-outline-and-page-images-only` 表示 OCR 转写不可靠，只能把主题概括、页图和人工阅读作为依据。');
  lines.push('- v2 带坐标结果有助于保存块、行、词位置，但整体识别质量没有全面优于 v1；报告等级按中文比例、噪声比例、关键词命中、不可用页和校准页抽查共同判断。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export async function runWorkCellsOcrQualityReportV2(options = {}) {
  const paths = Object.fromEntries(Object.entries(defaultPaths).map(([key, value]) => [key, path.resolve(rootDir, options[key] ?? value)]));
  for (const [key, targetPath] of Object.entries(paths)) {
    if (key === 'outputPath') {
      assertReportOutputPath(targetPath);
    } else {
      assertInsideRoot(targetPath, `Input must stay inside project root: ${targetPath}`);
    }
  }

  const manifestData = findDraftManifest();
  const [v1Layout, v2Layout, v1Transcripts, v2Readable, v2Transcripts, v2Outline, manualTopicRanges, terminology, readingOrder] = await Promise.all([
    readJson(paths.v1LayoutPath),
    readJson(paths.v2LayoutPath),
    readJson(paths.v1TranscriptsPath),
    readJson(paths.v2ReadablePath),
    readJson(paths.v2TranscriptsPath),
    readJson(paths.v2OutlinePath),
    readJson(paths.manualTopicRangesPath),
    readJson(paths.terminologyPath),
    readJson(path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout-v2', 'page-reading-order-v2.json')),
  ]);

  const keywordMap = buildKeywordMap({ manualTopicRanges, terminology, manifest: manifestData?.manifest ?? null });
  const v1LayoutTopics = summarizeLayoutTopics(v1Layout, keywordMap);
  const v2LayoutTopics = summarizeLayoutTopics(v2Layout, keywordMap);
  const readableTopics = summarizeReadableTopics(v2Readable);
  const topicRows = compareTopics({
    v1LayoutTopics,
    v2LayoutTopics,
    v1Quality: transcriptQualityMap(v1Transcripts),
    v2Quality: transcriptQualityMap(v2Transcripts),
    readableTopics,
    outline: v2Outline,
  });
  const leakCheck = await checkPublicLeakage({ readable: v2Readable, transcripts: v2Transcripts });
  const report = reportMarkdown({
    paths: {
      'OCR v2 带坐标结果': paths.v2LayoutPath,
      '每页阅读顺序 v2': path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout-v2', 'page-reading-order-v2.json'),
      '每页可读文本 v2': paths.v2ReadablePath,
      '主题级转写草稿 v2': paths.v2TranscriptsPath,
      '主题摘要线索 v2': paths.v2OutlinePath,
      'OCR v2 质量报告': paths.outputPath,
    },
    aggregate: {
      v1: aggregateLayout(v1LayoutTopics),
      v2: aggregateLayout(v2LayoutTopics),
    },
    topicRows,
    calibration: calibrationResults({ v2LayoutTopics, readingOrder, readable: v2Readable }),
    leakCheck,
  });

  await mkdir(path.dirname(paths.outputPath), { recursive: true });
  await writeFile(paths.outputPath, report, 'utf8');
  return { outputPath: paths.outputPath, topicRows, leakCheck };
}

function parseCliArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--output') {
      options.outputPath = args[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/work-cells-ocr-quality-report-v2.mjs [options]

Options:
  --output <file>  Default: reports/cells-at-work/ocr-quality-report-v2.md

Writes a private-source OCR v2 quality report without publishing full OCR text.`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const result = await runWorkCellsOcrQualityReportV2(options);
    const dTopics = result.topicRows.filter((row) => row.v2ReportGrade.startsWith('D-')).length;
    console.log(`OCR v2 quality report: ${relativePath(result.outputPath)}`);
    console.log(`D-grade v2 topics: ${dTopics}`);
    console.log(`Complete text in public/dist/build/docs: ${result.leakCheck.completeTextFoundInPublicRoots ? 'yes' : 'no'}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
