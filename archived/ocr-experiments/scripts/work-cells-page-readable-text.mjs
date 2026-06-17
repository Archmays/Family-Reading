import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultReadingOrderPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'page-reading-order.json');
const defaultRawOcrPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'topic-page-blocks.json');
const defaultTerminologyPath = path.join(rootDir, 'data-private', 'cells-at-work', 'terminology.zh-Hans.json');
const defaultHintsPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr', 'topic-content-hints.json');
const defaultTopicDataPath = path.join(rootDir, 'data', 'cells-at-work', 'manual-topic-ranges.json');
const defaultOutputPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'page-readable-text.json');
const forbiddenOutputRoots = new Set(['public', 'dist', 'build', 'docs']);
const leakCheckRoots = ['public', 'dist', 'build', 'docs'];
const allowedStandaloneLatin = new Set(['COVID', 'DNA', 'RNA', 'iPS', 'NK', 'IgE', 'MHC', 'SARS', 'CoV']);
const readingOrderConfidenceScores = { high: 0.84, medium: 0.62, low: 0.36 };
const suspiciousSymbolPattern = /[\\|_=<>~^`]{2,}|[﹁﹂﹣ˍ′‵‥]{2,}|[□■◆◇△▽○●◎]/u;
const hanPattern = /\p{Script=Han}/u;

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

function assertPrivateOutputPath(outputPath) {
  assertInsideRoot(outputPath);
  const relative = relativePath(outputPath);
  const firstSegment = relative.split('/')[0];
  if (forbiddenOutputRoots.has(firstSegment)) {
    throw new Error(`Refusing to write readable OCR text into a public/deployable directory: ${relative}`);
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function looseTermRegex(term) {
  const compact = [...String(term).replace(/\s+/gu, '')];
  if (compact.length === 0) {
    return null;
  }
  const glue = '[\\s\\u3000·・．.]*';
  return new RegExp(compact.map(escapeRegex).join(glue), 'giu');
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/gu, '');
}

function lineHasMeaningfulText(line) {
  if (hanPattern.test(line)) {
    return true;
  }
  const latinTokens = line.match(/[A-Za-z][A-Za-z0-9-]*/g) ?? [];
  return latinTokens.some((token) => allowedStandaloneLatin.has(token) || /^i\s*p\s*s$/iu.test(token));
}

function stripOuterNoise(line) {
  return line
    .replace(/^[\s"'“”‘’.,，。!?！？、;；:：()[\]{}<>《》【】|\\/_=~^`﹁﹂﹣ˍ′‵‥]+/u, '')
    .replace(/[\s"'“”‘’.,，。!?！？、;；:：()[\]{}<>《》【】|\\/_=~^`﹁﹂﹣ˍ′‵‥]+$/u, '');
}

function normalizeSpacing(line) {
  return String(line ?? '')
    .replace(/\u3000/gu, ' ')
    .replace(/[ \t]+/gu, ' ')
    .replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, '$1')
    .replace(/\bi\s*P\s*S\b/giu, 'iPS')
    .replace(/\bi\s*P\s*8\b/giu, 'iPS')
    .trim();
}

function symbolRatio(line) {
  const chars = [...String(line).replace(/\s+/gu, '')];
  if (chars.length === 0) {
    return 1;
  }
  const meaningful = chars.filter((char) => /[\p{Script=Han}A-Za-z0-9]/u.test(char)).length;
  return Number(((chars.length - meaningful) / chars.length).toFixed(3));
}

function shouldDropLine(line) {
  const compact = compactText(line);
  if (!compact) {
    return true;
  }
  if (!lineHasMeaningfulText(line)) {
    return true;
  }
  if (compact.length <= 2 && !hanPattern.test(compact)) {
    return true;
  }
  return compact.length <= 3 && symbolRatio(compact) >= 0.5;
}

function normalizeCorrectionKey(from, to) {
  return `${from} -> ${to}`;
}

function pushUnique(list, item, keyFn = JSON.stringify) {
  const key = keyFn(item);
  if (!list.some((existing) => keyFn(existing) === key)) {
    list.push(item);
  }
}

function formObjectsForEntry(entry) {
  const forms = [];
  for (const form of entry.forms ?? []) {
    if (typeof form === 'string') {
      forms.push({
        text: form,
        normalized: entry.preferred ?? form,
        kind: 'accepted',
      });
    } else if (form?.text) {
      forms.push({
        text: form.text,
        normalized: form.normalized ?? entry.preferred ?? form.text,
        kind: form.kind ?? 'accepted',
        note: form.note ?? null,
        uncertain: Boolean(form.uncertain),
      });
    }
  }
  if (entry.preferred) {
    forms.unshift({
      text: entry.preferred,
      normalized: entry.preferred,
      kind: 'preferred',
      note: null,
      uncertain: false,
    });
  }
  return forms;
}

function topicMatchesEntry(topic, entry) {
  const scopes = entry.topics ?? ['all'];
  return scopes.includes('all')
    || scopes.includes(topic.topicId)
    || scopes.includes(topic.displayTitle);
}

function applyGlossary(line, topic, terminology, pageNotes, glossaryHits, uncertainTerms, correctionCounts) {
  let current = line;
  for (const entry of terminology.entries ?? []) {
    if (!topicMatchesEntry(topic, entry)) {
      continue;
    }
    for (const form of formObjectsForEntry(entry)) {
      const regex = looseTermRegex(form.text);
      if (!regex) {
        continue;
      }
      const matches = [...current.matchAll(regex)];
      if (matches.length === 0) {
        continue;
      }

      const matchedForms = [...new Set(matches.map((match) => match[0]))];
      pushUnique(glossaryHits, {
        termId: entry.id,
        label: entry.label ?? entry.preferred,
        normalizedTo: form.normalized,
        matchedForms,
        kind: form.kind,
        occurrenceCount: matches.length,
      }, (item) => `${item.termId}:${item.normalizedTo}:${item.matchedForms.join('|')}`);

      if (form.uncertain || form.kind === 'source-term') {
        pushUnique(uncertainTerms, {
          term: form.normalized,
          original: matchedForms[0],
          reason: form.note ?? 'source term needs human confirmation',
        }, (item) => `${item.term}:${item.original}:${item.reason}`);
      }

      if (matchedForms.some((matched) => compactText(matched) !== compactText(form.normalized))) {
        current = current.replace(regex, form.normalized);
        for (const matched of matchedForms) {
          const key = normalizeCorrectionKey(matched, form.normalized);
          correctionCounts.set(key, (correctionCounts.get(key) ?? 0) + matches.length);
          pageNotes.push(form.note ?? `术语校正：${matched} -> ${form.normalized}`);
        }
      }
    }
  }
  return current;
}

function cleanPageText({ page, rawOcrText, topic, terminology }) {
  const glossaryHits = [];
  const uncertainTerms = [];
  const correctionNotes = [];
  const correctionCounts = new Map();
  const droppedLines = [];
  const suspiciousLines = [];
  const normalizedLines = [];
  const sourceLines = String(page.reconstructedText ?? '').split(/\r?\n/u);

  for (const [index, sourceLine] of sourceLines.entries()) {
    const spaced = normalizeSpacing(sourceLine);
    const stripped = stripOuterNoise(spaced);
    if (shouldDropLine(stripped)) {
      if (compactText(sourceLine)) {
        droppedLines.push({ lineNumber: index + 1, text: sourceLine, reason: 'likely_ocr_noise' });
      }
      continue;
    }

    let normalized = applyGlossary(
      stripped,
      topic,
      terminology,
      correctionNotes,
      glossaryHits,
      uncertainTerms,
      correctionCounts,
    );
    normalized = normalizeSpacing(normalized);

    if (symbolRatio(normalized) >= 0.42 || suspiciousSymbolPattern.test(normalized)) {
      suspiciousLines.push({ lineNumber: index + 1, text: normalized, reason: 'high_symbol_or_fragment_noise' });
      pushUnique(uncertainTerms, {
        term: normalized.slice(0, 40),
        original: normalized,
        reason: 'line contains substantial OCR noise',
      }, (item) => `${item.reason}:${item.term}`);
    }

    if (normalized) {
      normalizedLines.push(normalized);
    }
  }

  if (!normalizedLines.join('').trim() && compactText(page.reconstructedText)) {
    correctionNotes.push('未能得到可靠清洗文本，保留空 normalizedText 并列入人工抽查。');
  }
  if (droppedLines.length > 0) {
    correctionNotes.push(`剔除疑似 OCR 噪声行 ${droppedLines.length} 行。`);
  }
  if (page.readingOrderConfidence === 'low') {
    correctionNotes.push('阅读顺序置信度低，需人工核对气泡和分镜顺序。');
  }
  if (page.usabilityStatus === 'unusable') {
    correctionNotes.push('OCR readable-text gate marked this page unusable; do not rely on it for transcript drafting.');
  } else if (page.usabilityStatus === 'needs_review') {
    correctionNotes.push('OCR readable-text gate marked this page for manual review before transcript use.');
  }
  if ((page.uncertainBlocks ?? []).length > 0) {
    correctionNotes.push(`阅读顺序阶段已有不确定块 ${page.uncertainBlocks.length} 个。`);
  }

  const normalizedText = normalizedLines.join('\n');
  const confidence = confidenceForPage({
    page,
    rawOcrText,
    normalizedText,
    droppedLineCount: droppedLines.length,
    sourceLineCount: sourceLines.filter((line) => compactText(line)).length,
    suspiciousLineCount: suspiciousLines.length,
    uncertainTermCount: uncertainTerms.length,
  });

  return {
    rawOcrText,
    reconstructedText: page.reconstructedText ?? '',
    normalizedText,
    glossaryHits,
    uncertainTerms,
    correctionNotes: [...new Set(correctionNotes)],
    confidence,
    usabilityStatus: page.usabilityStatus ?? 'unknown',
    usabilityReasons: page.usabilityReasons ?? [],
    textQuality: page.textQuality ?? null,
    cleaningDiagnostics: {
      droppedLineCount: droppedLines.length,
      suspiciousLineCount: suspiciousLines.length,
      droppedLines: droppedLines.slice(0, 12),
      suspiciousLines: suspiciousLines.slice(0, 12),
    },
    correctionCounts,
  };
}

function confidenceForPage({
  page,
  rawOcrText,
  normalizedText,
  droppedLineCount,
  sourceLineCount,
  suspiciousLineCount,
  uncertainTermCount,
}) {
  let score = readingOrderConfidenceScores[page.readingOrderConfidence] ?? 0.45;
  const rawSignal = rawOcrText && rawOcrText.trim() ? 0.04 : -0.08;
  const textSignal = normalizedText && normalizedText.trim() ? 0.05 : -0.22;
  const blockCount = Math.max(1, (page.blocks ?? []).length);
  const uncertainBlockRatio = (page.uncertainBlocks ?? []).length / blockCount;
  const noiseRatio = (page.noiseBlocks ?? []).length / Math.max(1, blockCount + (page.noiseBlocks ?? []).length);
  const droppedRatio = droppedLineCount / Math.max(1, sourceLineCount);

  score += rawSignal + textSignal;
  score -= Math.min(0.16, uncertainBlockRatio * 0.18);
  score -= Math.min(0.1, noiseRatio * 0.12);
  score -= Math.min(0.14, droppedRatio * 0.16);
  score -= Math.min(0.12, suspiciousLineCount * 0.025);
  score -= Math.min(0.1, uncertainTermCount * 0.018);
  if (page.usabilityStatus === 'unusable') {
    score = Math.min(score - 0.28, 0.32);
  } else if (page.usabilityStatus === 'needs_review') {
    score -= 0.08;
  }

  return Number(Math.max(0.05, Math.min(0.95, score)).toFixed(2));
}

function indexRawOcr(rawInput) {
  const byTopicPage = new Map();
  for (const topic of rawInput?.topics ?? []) {
    for (const page of topic.pages ?? []) {
      byTopicPage.set(`${topic.topicId}:${page.pageNumber}`, page.text ?? page.ocrText ?? '');
    }
  }
  return byTopicPage;
}

async function findDraftManifestPath() {
  const booksDir = path.join(rootDir, 'public', 'books');
  if (!(await pathExists(booksDir))) {
    return null;
  }
  for (const entry of await readdir(booksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = path.join(booksDir, entry.name, 'draft-manifest.json');
    if (!(await pathExists(candidate))) {
      continue;
    }
    const manifest = readJsonSyncIfExists(candidate);
    if (manifest?.seriesSlug === 'cells-at-work' || manifest?.pageMapPath === 'data/cells-at-work/page-map.json') {
      return candidate;
    }
  }
  return null;
}

function indexTopicData(topicData, manifest) {
  const byTopicId = new Map();
  const byTitle = new Map();
  for (const topic of topicData?.topics ?? []) {
    byTopicId.set(topic.topicId, topic);
    byTitle.set(topic.displayTitle ?? topic.title, topic);
  }
  for (const topic of manifest?.topics ?? []) {
    const title = topic.displayTitle ?? topic.title;
    if (title && !byTitle.has(title)) {
      byTitle.set(title, topic);
    }
  }
  return { byTopicId, byTitle };
}

function topicContext({ topic, hints, topicDataIndex }) {
  return {
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: topic.source ?? topicDataIndex.byTopicId.get(topic.topicId)?.sourceLabel ?? null,
    pageRange: topic.pageRange ?? topicDataIndex.byTopicId.get(topic.topicId)?.range ?? null,
    hints: hints?.topics?.find((item) => item.topicId === topic.topicId) ?? null,
    manifestTopic: topicDataIndex.byTopicId.get(topic.topicId) ?? topicDataIndex.byTitle.get(topic.displayTitle) ?? null,
  };
}

function manualReviewReasons(page) {
  const reasons = [];
  if (page.confidence < 0.5) {
    reasons.push('low_cleaning_confidence');
  }
  if (!page.normalizedText.trim()) {
    reasons.push('empty_normalized_text');
  }
  if (page.uncertainTerms.length > 0) {
    reasons.push('uncertain_terms');
  }
  if (page.correctionNotes.some((note) => note.includes('阅读顺序置信度低'))) {
    reasons.push('low_reading_order_confidence');
  }
  if (page.cleaningDiagnostics.droppedLineCount >= 10) {
    reasons.push('many_dropped_noise_lines');
  }
  return reasons;
}

function summarize(topics, outputPath) {
  const pages = topics.flatMap((topic) => topic.pages.map((page) => ({ ...page, topic })));
  const correctionCounts = new Map();
  const uncertainCounts = new Map();
  const manualReviewPages = [];
  const topicConfidence = [];

  for (const topic of topics) {
    const averageConfidence = average(topic.pages.map((page) => page.confidence));
    topicConfidence.push({
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      averageConfidence,
      pageCount: topic.pages.length,
    });
  }

  for (const page of pages) {
    for (const entry of page.correctionFrequency ?? []) {
      correctionCounts.set(entry.correction, (correctionCounts.get(entry.correction) ?? 0) + entry.count);
    }
    for (const term of page.uncertainTerms) {
      const key = `${term.term} (${term.reason})`;
      const current = uncertainCounts.get(key) ?? {
        term: term.term,
        reason: term.reason,
        count: 0,
        pages: [],
      };
      current.count += 1;
      current.pages.push(`${page.topic.topicId}:p${page.pageNumber}`);
      uncertainCounts.set(key, current);
    }
    const reasons = manualReviewReasons(page);
    if (reasons.length > 0) {
      manualReviewPages.push({
        topicId: page.topic.topicId,
        displayTitle: page.topic.displayTitle,
        pageNumber: page.pageNumber,
        imagePath: page.imagePath,
        confidence: page.confidence,
        reasons,
      });
    }
  }

  return {
    pageCount: pages.length,
    processedPageCount: pages.filter((page) => typeof page.normalizedText === 'string').length,
    topicAverageConfidence: topicConfidence,
    correctionFrequency: [...correctionCounts.entries()]
      .map(([correction, count]) => ({ correction, count }))
      .sort((a, b) => b.count - a.count || a.correction.localeCompare(b.correction, 'zh-Hans-CN'))
      .slice(0, 50),
    uncertainTerms: [...uncertainCounts.values()]
      .map((entry) => ({
        ...entry,
        pages: [...new Set(entry.pages)].slice(0, 20),
      }))
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'zh-Hans-CN'))
      .slice(0, 80),
    manualReviewPageCount: manualReviewPages.length,
    manualReviewPages,
    publicLeakCheck: {
      checkedRoots: leakCheckRoots.map((item) => `${item}/`),
      completeNormalizedTextInPublicDirectory: false,
      note: `Output was written only to ${relativePath(outputPath)}; scanner checks representative normalized text snippets, not every short fragment.`,
    },
  };
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0
    ? Number((finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(2))
    : null;
}

async function collectFiles(dir) {
  if (!(await pathExists(dir))) {
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

function snippetForLeakCheck(text) {
  const compact = compactText(text);
  return compact.length >= 40 ? compact.slice(0, 40) : null;
}

async function checkPublicLeakage(output) {
  const snippets = output.topics
    .flatMap((topic) => topic.pages)
    .map((page) => snippetForLeakCheck(page.normalizedText))
    .filter(Boolean)
    .slice(0, 80);

  if (snippets.length === 0) {
    return output;
  }

  const leaked = [];
  for (const root of leakCheckRoots) {
    const rootPath = path.join(rootDir, root);
    for (const file of await collectFiles(rootPath)) {
      const ext = path.extname(file).toLowerCase();
      if (!['.json', '.js', '.html', '.md', '.txt'].includes(ext)) {
        continue;
      }
      const text = await readFile(file, 'utf8').catch(() => '');
      const compact = compactText(text);
      const hit = snippets.find((snippet) => compact.includes(snippet));
      if (hit) {
        leaked.push({ path: relativePath(file), snippet: hit });
      }
    }
  }

  output.summary.publicLeakCheck.completeNormalizedTextInPublicDirectory = leaked.length > 0;
  output.summary.publicLeakCheck.matches = leaked;
  output.outputPolicy.publicOutputWritten = leaked.length > 0;
  output.outputPolicy.fullNormalizedTextPubliclyAccessible = leaked.length > 0;
  return output;
}

function pageCorrectionFrequency(correctionCounts) {
  return [...correctionCounts.entries()]
    .map(([correction, count]) => ({ correction, count }))
    .sort((a, b) => b.count - a.count || a.correction.localeCompare(b.correction, 'zh-Hans-CN'));
}

function buildOutput({ readingOrder, rawOcr, terminology, hints, topicData, manifest, inputPaths, outputPath, stage = '6D-3' }) {
  const rawByTopicPage = indexRawOcr(rawOcr);
  const topicDataIndex = indexTopicData(topicData, manifest);
  const topics = (readingOrder.topics ?? []).map((topic) => {
    const context = topicContext({ topic, hints, topicDataIndex });
    const pages = (topic.pages ?? []).map((page) => {
      const rawOcrText = rawByTopicPage.get(`${topic.topicId}:${page.pageNumber}`) ?? '';
      const cleaned = cleanPageText({ page, rawOcrText, topic: context, terminology });
      const correctionFrequency = pageCorrectionFrequency(cleaned.correctionCounts);
      return {
        topicId: topic.topicId,
        displayTitle: topic.displayTitle,
        source: topic.source ?? context.source,
        pageRange: topic.pageRange ?? context.pageRange,
        pageNumber: page.pageNumber,
        imagePath: page.imagePath,
        rawOcrText: cleaned.rawOcrText,
        reconstructedText: cleaned.reconstructedText,
        normalizedText: cleaned.normalizedText,
        glossaryHits: cleaned.glossaryHits,
        uncertainTerms: cleaned.uncertainTerms,
        correctionNotes: cleaned.correctionNotes,
        confidence: cleaned.confidence,
        readingOrderConfidence: page.readingOrderConfidence,
        usabilityStatus: cleaned.usabilityStatus,
        usabilityReasons: cleaned.usabilityReasons,
        textQuality: cleaned.textQuality,
        cleaningDiagnostics: cleaned.cleaningDiagnostics,
        correctionFrequency,
      };
    });
    return {
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      source: topic.source ?? context.source,
      pageRange: topic.pageRange ?? context.pageRange,
      contextHints: {
        frequentKeywords: context.hints?.frequentKeywords ?? [],
        termsNeedingScientificReview: context.hints?.termsNeedingScientificReview ?? [],
        manifestTitle: context.manifestTopic?.displayTitle ?? context.manifestTopic?.title ?? null,
      },
      pageCount: pages.length,
      averageConfidence: average(pages.map((page) => page.confidence)),
      pages,
    };
  });

  const output = {
    schemaVersion: 1,
    stage,
    generatedAt: new Date().toISOString(),
    seriesId: readingOrder.seriesId ?? 'cells-at-work',
    inputPaths,
    outputPolicy: {
      privateOutputPath: relativePath(outputPath),
      containsFullNormalizedText: true,
      containsRawOcrText: true,
      publicOutputWritten: false,
      fullNormalizedTextPubliclyAccessible: false,
      sourceOcrModified: false,
      frontendModified: false,
      bodyScienceStationGenerated: false,
      forbiddenPublicDirectories: [...forbiddenOutputRoots].map((item) => `${item}/`),
    },
    cleaningPolicy: {
      scope: 'light OCR cleanup from per-page reconstructed reading order',
      preservesRawOcrText: true,
      preservesReconstructedText: true,
      doesNotRewriteMeaning: true,
      keepsBubbleLikeLineBreaks: true,
      topicAwareTerminology: true,
      traditionalChinesePolicy: 'recognized terms may be normalized by glossary entry; remaining text is not mechanically converted',
    },
    topics,
    summary: null,
  };
  output.summary = summarize(topics, outputPath);
  return output;
}

export async function runWorkCellsPageReadableText(options = {}) {
  const readingOrderPath = path.resolve(rootDir, options.readingOrderPath ?? defaultReadingOrderPath);
  const rawOcrPath = path.resolve(rootDir, options.rawOcrPath ?? defaultRawOcrPath);
  const terminologyPath = path.resolve(rootDir, options.terminologyPath ?? defaultTerminologyPath);
  const hintsPath = path.resolve(rootDir, options.hintsPath ?? defaultHintsPath);
  const topicDataPath = path.resolve(rootDir, options.topicDataPath ?? defaultTopicDataPath);
  const manifestPath = options.manifestPath
    ? path.resolve(rootDir, options.manifestPath)
    : await findDraftManifestPath();
  const outputPath = path.resolve(rootDir, options.outputPath ?? defaultOutputPath);

  for (const inputPath of [readingOrderPath, rawOcrPath, terminologyPath, hintsPath, topicDataPath, manifestPath].filter(Boolean)) {
    assertInsideRoot(inputPath, `Input must stay inside project root: ${inputPath}`);
  }
  assertPrivateOutputPath(outputPath);

  for (const requiredPath of [readingOrderPath, rawOcrPath, terminologyPath, hintsPath, topicDataPath]) {
    if (!(await pathExists(requiredPath))) {
      throw new Error(`Required 6D-3 input not found: ${relativePath(requiredPath)}`);
    }
  }

  const [readingOrder, rawOcr, terminology, hints, topicData] = await Promise.all([
    readJson(readingOrderPath),
    readJson(rawOcrPath),
    readJson(terminologyPath),
    readJson(hintsPath),
    readJson(topicDataPath),
  ]);
  const manifest = manifestPath ? await readJson(manifestPath) : null;
  const inputPaths = {
    pageReadingOrderPath: relativePath(readingOrderPath),
    rawOcrPath: relativePath(rawOcrPath),
    terminologyPath: relativePath(terminologyPath),
    topicContentHintsPath: relativePath(hintsPath),
    topicDataPath: relativePath(topicDataPath),
    manifestPath: manifestPath ? relativePath(manifestPath) : null,
  };

  const output = buildOutput({
    readingOrder,
    rawOcr,
    terminology,
    hints,
    topicData,
    manifest,
    inputPaths,
    outputPath,
    stage: options.stage,
  });
  await checkPublicLeakage(output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  return output;
}

function parseCliArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--reading-order') {
      options.readingOrderPath = args[++index];
    } else if (arg === '--raw-ocr') {
      options.rawOcrPath = args[++index];
    } else if (arg === '--terminology') {
      options.terminologyPath = args[++index];
    } else if (arg === '--hints') {
      options.hintsPath = args[++index];
    } else if (arg === '--topic-data') {
      options.topicDataPath = args[++index];
    } else if (arg === '--manifest') {
      options.manifestPath = args[++index];
    } else if (arg === '--output') {
      options.outputPath = args[++index];
    } else if (arg === '--stage') {
      options.stage = args[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/work-cells-page-readable-text.mjs [options]

Options:
  --reading-order <file>  Default: data-private/cells-at-work/ocr-layout/page-reading-order.json
  --raw-ocr <file>        Default: data-private/cells-at-work/ocr-layout/topic-page-blocks.json
  --terminology <file>    Default: data-private/cells-at-work/terminology.zh-Hans.json
  --hints <file>          Default: data-private/cells-at-work/ocr/topic-content-hints.json
  --topic-data <file>     Default: data/cells-at-work/manual-topic-ranges.json
  --manifest <file>       Default: auto-detect Work Cells draft manifest
  --output <file>         Default: data-private/cells-at-work/ocr-layout/page-readable-text.json
  --stage <label>         Default: 6D-3

Writes private 6D-3 per-page readable OCR cleanup. It does not write frontend or public text.`);
}

function formatTop(items, formatter, limit = 10) {
  const shown = items.slice(0, limit).map(formatter);
  if (items.length > limit) {
    shown.push(`... +${items.length - limit}`);
  }
  return shown.length > 0 ? shown.join('\n') : '- none';
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runWorkCellsPageReadableText(options);
    console.log(`Page readable text: ${result.outputPolicy.privateOutputPath}`);
    console.log(`Processed pages: ${result.summary.processedPageCount}/${result.summary.pageCount}`);
    console.log('Average confidence by topic:');
    console.log(formatTop(
      result.summary.topicAverageConfidence,
      (item) => `- ${item.displayTitle}: ${item.averageConfidence}`,
      40,
    ));
    console.log('Frequent corrections:');
    console.log(formatTop(
      result.summary.correctionFrequency,
      (item) => `- ${item.correction}: ${item.count}`,
      20,
    ));
    console.log('Uncertain terms:');
    console.log(formatTop(
      result.summary.uncertainTerms,
      (item) => `- ${item.term}: ${item.reason} (${item.count})`,
      20,
    ));
    console.log(`Manual review pages: ${result.summary.manualReviewPageCount}`);
    console.log(formatTop(
      result.summary.manualReviewPages,
      (item) => `- ${item.displayTitle} p${item.pageNumber}: ${item.reasons.join(', ')}`,
      20,
    ));
    console.log(`Complete normalized text in public/dist/build/docs: ${result.summary.publicLeakCheck.completeNormalizedTextInPublicDirectory ? 'yes' : 'no'}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
