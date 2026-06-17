import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultInputPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'topic-page-blocks.json');
const defaultOutputPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'page-reading-order.json');
const forbiddenOutputRoots = new Set(['public', 'dist', 'build', 'docs']);
const lowConfidenceThreshold = 25;
const uncertainConfidenceThreshold = 38;
const hanCharPattern = /\p{Script=Han}/u;
const latinCharPattern = /[A-Za-z]/u;

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
    throw new Error(`Refusing to write page reading order into a public/deployable directory: ${relative}`);
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

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBbox(bbox) {
  if (!bbox) {
    return null;
  }
  const left = numberOrNull(bbox.left);
  const top = numberOrNull(bbox.top);
  const width = numberOrNull(bbox.width);
  const height = numberOrNull(bbox.height);
  if ([left, top, width, height].some((value) => value === null)) {
    return null;
  }
  return { left, top, width, height };
}

function bboxRight(bbox) {
  return bbox.left + bbox.width;
}

function bboxBottom(bbox) {
  return bbox.top + bbox.height;
}

function bboxCenterX(bbox) {
  return bbox.left + bbox.width / 2;
}

function bboxCenterY(bbox) {
  return bbox.top + bbox.height / 2;
}

function bboxArea(bbox) {
  return bbox.width * bbox.height;
}

function mergeBbox(first, second) {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  const left = Math.min(first.left, second.left);
  const top = Math.min(first.top, second.top);
  const right = Math.max(bboxRight(first), bboxRight(second));
  const bottom = Math.max(bboxBottom(first), bboxBottom(second));
  return { left, top, width: right - left, height: bottom - top };
}

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function compactText(text) {
  return String(text ?? '').replace(/\s+/g, '').trim();
}

function textQualityMetrics(text) {
  const chars = [...compactText(text)];
  const total = chars.length;
  const han = chars.filter((char) => hanCharPattern.test(char)).length;
  const latin = chars.filter((char) => latinCharPattern.test(char)).length;
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

function classifyPageUsability({ page, reconstructedText, mainBlocks }) {
  const textQuality = textQualityMetrics(reconstructedText);
  const sourceMetrics = page.scoreMetrics ?? {};
  const reasons = [];

  if (mainBlocks.length === 0 || textQuality.charCount === 0) {
    reasons.push('empty_reconstructed_main_text');
  }
  if (page.layoutStatus !== 'ok') {
    reasons.push(`layout_status_${page.layoutStatus ?? 'unknown'}`);
  }
  if (
    Number(sourceMetrics.charCount ?? textQuality.charCount) >= 120
    && Number(sourceMetrics.chineseCharRatio ?? textQuality.hanRatio) < 0.3
    && Number(sourceMetrics.latinNoiseRatio ?? textQuality.latinRatio) > 0.42
  ) {
    reasons.push('source_text_low_chinese_high_latin_noise');
  }
  if (textQuality.charCount >= 120 && textQuality.hanRatio < 0.32 && textQuality.latinRatio > 0.38) {
    reasons.push('reconstructed_text_low_chinese_high_latin_noise');
  }
  if (textQuality.charCount >= 160 && textQuality.noiseRatio > 0.68) {
    reasons.push('reconstructed_text_noise_dominates');
  }
  if (Number(sourceMetrics.longGibberishRunCount ?? 0) >= 3 && textQuality.hanRatio < 0.45) {
    reasons.push('long_gibberish_runs');
  }

  if (reasons.length > 0) {
    return { usabilityStatus: 'unusable', usabilityReasons: reasons, textQuality };
  }

  const reviewReasons = [];
  if (textQuality.charCount >= 80 && textQuality.hanRatio < 0.42) {
    reviewReasons.push('low_chinese_ratio');
  }
  if (textQuality.charCount >= 80 && textQuality.latinRatio > 0.3) {
    reviewReasons.push('high_latin_noise_ratio');
  }
  if (Number(sourceMetrics.longGibberishRunCount ?? 0) > 0) {
    reviewReasons.push('possible_gibberish_run');
  }

  return {
    usabilityStatus: reviewReasons.length > 0 ? 'needs_review' : 'usable',
    usabilityReasons: reviewReasons,
    textQuality,
  };
}

function hasReadableText(text) {
  return /[\p{L}\p{N}]/u.test(text);
}

function textLength(text) {
  return [...compactText(text)].length;
}

function needsSpaceBetween(left, right) {
  return /[A-Za-z0-9]$/.test(left) && /^[A-Za-z0-9]/.test(right);
}

function joinTextParts(parts) {
  return parts.map(normalizeText).filter(Boolean).reduce((joined, part) => {
    if (!joined) {
      return part;
    }
    return needsSpaceBetween(joined, part) ? `${joined} ${part}` : `${joined}${part}`;
  }, '');
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0
    ? Number((finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(2))
    : null;
}

function collectWords(block) {
  const words = [];
  for (const line of block.lines ?? []) {
    for (const word of line.words ?? []) {
      const bbox = normalizeBbox(word.bbox);
      const text = normalizeText(word.text);
      if (!bbox || !text) {
        continue;
      }
      words.push({
        text,
        bbox,
        confidence: numberOrNull(word.confidence),
        wordNumber: numberOrNull(word.wordNumber),
      });
    }
  }
  return words;
}

function groupByAxis(items, axis, threshold) {
  const sorted = [...items].sort((a, b) => axis(a) - axis(b));
  const groups = [];
  for (const item of sorted) {
    const center = axis(item);
    const current = groups.at(-1);
    if (!current || Math.abs(center - current.center) > threshold) {
      groups.push({ center, items: [item] });
    } else {
      current.items.push(item);
      current.center = average(current.items.map(axis));
    }
  }
  return groups;
}

function reconstructWords(words, direction) {
  if (words.length === 0) {
    return '';
  }

  if (direction === 'vertical') {
    const threshold = Math.max(12, (median(words.map((word) => word.bbox.width)) ?? 12) * 1.4);
    const columns = groupByAxis(words, (word) => bboxCenterX(word.bbox), threshold)
      .sort((a, b) => b.center - a.center);
    return joinTextParts(columns.flatMap((column) => column.items.sort((a, b) => a.bbox.top - b.bbox.top).map((word) => word.text)));
  }

  if (direction === 'horizontal') {
    const threshold = Math.max(10, (median(words.map((word) => word.bbox.height)) ?? 10) * 0.8);
    const rows = groupByAxis(words, (word) => bboxCenterY(word.bbox), threshold)
      .sort((a, b) => a.center - b.center);
    return joinTextParts(rows.flatMap((row) => row.items.sort((a, b) => a.bbox.left - b.bbox.left).map((word) => word.text)));
  }

  return joinTextParts(words.sort((a, b) => a.bbox.top - b.bbox.top || b.bbox.left - a.bbox.left).map((word) => word.text));
}

function lineDirectionSignals(block) {
  const lines = (block.lines ?? []).map((line) => normalizeBbox(line.bbox)).filter(Boolean);
  if (lines.length <= 1) {
    return null;
  }
  const union = lines.reduce((box, line) => mergeBbox(box, line), null);
  const xSpread = Math.max(...lines.map(bboxCenterX)) - Math.min(...lines.map(bboxCenterX));
  const ySpread = Math.max(...lines.map(bboxCenterY)) - Math.min(...lines.map(bboxCenterY));
  const medianLineWidth = median(lines.map((bbox) => bbox.width)) ?? 0;
  const medianLineHeight = median(lines.map((bbox) => bbox.height)) ?? 0;
  return { union, xSpread, ySpread, medianLineWidth, medianLineHeight };
}

function classifyDirection(block) {
  const bbox = block.bbox;
  const ratio = bbox.height / Math.max(1, bbox.width);
  const words = block.words;
  const lineSignals = lineDirectionSignals(block.sourceBlock);
  const wordCenters = words.map((word) => ({ x: bboxCenterX(word.bbox), y: bboxCenterY(word.bbox) }));

  if (ratio >= 1.45 && bbox.height >= 28) {
    return { direction: 'vertical', directionConfidence: 'high' };
  }
  if (ratio <= 0.72 && bbox.width >= 28) {
    return { direction: 'horizontal', directionConfidence: 'high' };
  }

  if (lineSignals && lineSignals.ySpread > lineSignals.xSpread * 1.35 && lineSignals.medianLineHeight >= lineSignals.medianLineWidth * 0.8) {
    return { direction: 'vertical', directionConfidence: 'medium' };
  }
  if (lineSignals && lineSignals.xSpread > lineSignals.ySpread * 1.35) {
    return { direction: 'horizontal', directionConfidence: 'medium' };
  }

  if (wordCenters.length >= 2) {
    const xSpread = Math.max(...wordCenters.map((point) => point.x)) - Math.min(...wordCenters.map((point) => point.x));
    const ySpread = Math.max(...wordCenters.map((point) => point.y)) - Math.min(...wordCenters.map((point) => point.y));
    if (ySpread > xSpread * 1.35) {
      return { direction: 'vertical', directionConfidence: 'medium' };
    }
    if (xSpread > ySpread * 1.35) {
      return { direction: 'horizontal', directionConfidence: 'medium' };
    }
    if (xSpread > bbox.width * 0.35 && ySpread > bbox.height * 0.35) {
      return { direction: 'mixed', directionConfidence: 'low' };
    }
  }

  if (ratio >= 1.15) {
    return { direction: 'vertical', directionConfidence: 'low' };
  }
  if (ratio <= 0.88) {
    return { direction: 'horizontal', directionConfidence: 'low' };
  }
  return { direction: 'unknown', directionConfidence: 'low' };
}

function classifyExclusion(block, pageSize) {
  const text = compactText(block.text);
  const length = textLength(text);
  const pageWidth = pageSize?.width ?? 1;
  const pageHeight = pageSize?.height ?? 1;
  const nearPageEdge = block.bbox.top > pageHeight * 0.88 || block.bbox.top < pageHeight * 0.04;
  const smallText = length <= 3;
  const relativeArea = bboxArea(block.bbox) / Math.max(1, pageWidth * pageHeight);

  if (!text || !hasReadableText(text)) {
    return 'non_readable_noise';
  }
  if (/^\d{1,4}$/.test(text) && nearPageEdge) {
    return 'page_number';
  }
  if (/isbn|copyright|publisher|published|edition|www\.|http|allrights|reserved/i.test(text.replace(/\s+/g, ''))) {
    return 'publication_info';
  }
  if (/版权|出版|发行|印刷|作者|译者|校对|定价|书号/.test(text)) {
    return 'publication_info';
  }
  if (Number.isFinite(block.confidence) && block.confidence < lowConfidenceThreshold && (smallText || !/[A-Za-z0-9]{3,}/.test(text))) {
    return 'low_confidence_noise';
  }
  if (relativeArea > 0.035 && length <= 4 && block.confidence !== null && block.confidence < 62) {
    return 'sound_effect_or_decorative_large_text';
  }
  if (/^(ha|haha|bang|boom|bam|tap|clap|whoosh|crash|zzz|ah|ow|ugh)+$/i.test(text)) {
    return 'sound_effect_or_decorative_large_text';
  }
  if (/入口|出口|禁止|注意|警告|通路|案内|看板|室|号室|EXIT|WARNING/i.test(text)) {
    return 'background_sign';
  }
  return null;
}

function normalizeBlock(sourceBlock, index, pageSize) {
  const bbox = normalizeBbox(sourceBlock.bbox);
  const fallbackText = normalizeText(sourceBlock.text);
  if (!bbox || !fallbackText) {
    return null;
  }

  const words = collectWords(sourceBlock);
  const base = {
    id: `b${sourceBlock.blockNumber ?? index + 1}`,
    sourceBlockNumber: sourceBlock.blockNumber ?? index + 1,
    sourceBlock,
    bbox,
    confidence: numberOrNull(sourceBlock.confidence),
    lineCount: Array.isArray(sourceBlock.lines) ? sourceBlock.lines.length : 0,
    wordCount: words.length,
    words,
  };
  const direction = classifyDirection(base);
  const text = words.length > 0
    ? reconstructWords(words, direction.direction)
    : fallbackText;
  const normalized = {
    ...base,
    text: text || fallbackText,
    direction: direction.direction,
    directionConfidence: direction.directionConfidence,
  };
  return {
    ...normalized,
    exclusionReason: classifyExclusion(normalized, pageSize),
  };
}

function overlapAmount(firstStart, firstEnd, secondStart, secondEnd) {
  return Math.max(0, Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart));
}

function shouldCluster(first, second, pageSize) {
  const pageWidth = pageSize?.width ?? 1000;
  const pageHeight = pageSize?.height ?? 1400;
  const horizontalGap = Math.max(0, Math.max(first.bbox.left, second.bbox.left) - Math.min(bboxRight(first.bbox), bboxRight(second.bbox)));
  const verticalGap = Math.max(0, Math.max(first.bbox.top, second.bbox.top) - Math.min(bboxBottom(first.bbox), bboxBottom(second.bbox)));
  const xOverlap = overlapAmount(first.bbox.left, bboxRight(first.bbox), second.bbox.left, bboxRight(second.bbox));
  const yOverlap = overlapAmount(first.bbox.top, bboxBottom(first.bbox), second.bbox.top, bboxBottom(second.bbox));
  const sameDirection = first.direction === second.direction || first.direction === 'mixed' || second.direction === 'mixed';
  const closeHorizontal = horizontalGap <= Math.max(pageWidth * 0.035, Math.min(first.bbox.width, second.bbox.width) * 1.2);
  const closeVertical = verticalGap <= Math.max(pageHeight * 0.026, Math.min(first.bbox.height, second.bbox.height) * 1.6);

  if (sameDirection && closeHorizontal && (yOverlap > 0 || closeVertical)) {
    return true;
  }
  if (sameDirection && closeVertical && (xOverlap > 0 || closeHorizontal)) {
    return true;
  }

  const centerDistance = Math.hypot(bboxCenterX(first.bbox) - bboxCenterX(second.bbox), bboxCenterY(first.bbox) - bboxCenterY(second.bbox));
  return sameDirection && centerDistance <= Math.hypot(pageWidth, pageHeight) * 0.045;
}

class DisjointSet {
  constructor(size) {
    this.parents = Array.from({ length: size }, (_, index) => index);
  }

  find(index) {
    if (this.parents[index] !== index) {
      this.parents[index] = this.find(this.parents[index]);
    }
    return this.parents[index];
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) {
      this.parents[rightRoot] = leftRoot;
    }
  }
}

function dominantDirection(blocks) {
  const counts = { vertical: 0, horizontal: 0, mixed: 0, unknown: 0 };
  for (const block of blocks) {
    counts[block.direction] += 1;
  }
  if (counts.vertical > counts.horizontal && counts.vertical >= counts.mixed + counts.unknown) {
    return 'vertical';
  }
  if (counts.horizontal > counts.vertical && counts.horizontal >= counts.mixed + counts.unknown) {
    return 'horizontal';
  }
  if (counts.vertical > 0 && counts.horizontal > 0) {
    return 'mixed';
  }
  if (counts.mixed > 0) {
    return 'mixed';
  }
  return counts.vertical > 0 ? 'vertical' : counts.horizontal > 0 ? 'horizontal' : 'mixed';
}

function mangaPanelKey(bbox, pageSize) {
  const pageHeight = pageSize?.height ?? 1400;
  const bandHeight = Math.max(1, pageHeight * 0.22);
  return {
    rowBand: Math.floor(bboxCenterY(bbox) / bandHeight),
    rtlColumn: -bboxCenterX(bbox),
    top: bbox.top,
  };
}

function compareMangaPosition(first, second, pageSize) {
  const firstKey = mangaPanelKey(first.bbox, pageSize);
  const secondKey = mangaPanelKey(second.bbox, pageSize);
  return firstKey.rowBand - secondKey.rowBand
    || firstKey.rtlColumn - secondKey.rtlColumn
    || firstKey.top - secondKey.top
    || second.bbox.left - first.bbox.left;
}

function sortBlocksInsideGroup(blocks, direction, pageSize) {
  if (direction === 'vertical') {
    return [...blocks].sort((a, b) => b.bbox.left - a.bbox.left || a.bbox.top - b.bbox.top);
  }
  if (direction === 'horizontal') {
    return [...blocks].sort((a, b) => a.bbox.top - b.bbox.top || a.bbox.left - b.bbox.left);
  }
  return [...blocks].sort((a, b) => compareMangaPosition(a, b, pageSize));
}

function makePublicBlock(block, order, groupId) {
  return {
    order,
    groupId,
    sourceBlockNumber: block.sourceBlockNumber,
    text: block.text,
    direction: block.direction,
    directionConfidence: block.directionConfidence,
    bbox: block.bbox,
    confidence: block.confidence,
    lineCount: block.lineCount,
    wordCount: block.wordCount,
  };
}

function createGroups(blocks, pageSize) {
  if (blocks.length === 0) {
    return [];
  }

  const set = new DisjointSet(blocks.length);
  for (let left = 0; left < blocks.length; left += 1) {
    for (let right = left + 1; right < blocks.length; right += 1) {
      if (shouldCluster(blocks[left], blocks[right], pageSize)) {
        set.union(left, right);
      }
    }
  }

  const grouped = new Map();
  for (const [index, block] of blocks.entries()) {
    const root = set.find(index);
    if (!grouped.has(root)) {
      grouped.set(root, []);
    }
    grouped.get(root).push(block);
  }

  return [...grouped.values()].map((groupBlocks, index) => {
    const bbox = groupBlocks.reduce((box, block) => mergeBbox(box, block.bbox), null);
    const direction = dominantDirection(groupBlocks);
    const sortedBlocks = sortBlocksInsideGroup(groupBlocks, direction, pageSize);
    return {
      groupId: `g${index + 1}`,
      bbox,
      direction,
      blocks: sortedBlocks,
      text: joinTextParts(sortedBlocks.map((block) => block.text)),
    };
  }).sort((a, b) => compareMangaPosition(a, b, pageSize));
}

function confidenceForPage({ mainBlocks, uncertainBlocks, noiseBlocks, groups, page, usabilityStatus }) {
  if (mainBlocks.length === 0) {
    return 'low';
  }
  if (usabilityStatus === 'unusable') {
    return 'low';
  }

  const averageConfidence = average(mainBlocks.map((block) => block.confidence)) ?? 0;
  const uncertainRatio = uncertainBlocks.length / Math.max(1, mainBlocks.length);
  const noiseRatio = noiseBlocks.length / Math.max(1, mainBlocks.length + noiseBlocks.length);
  const hasManyTinyBlocks = mainBlocks.filter((block) => textLength(block.text) <= 1).length > mainBlocks.length * 0.45;

  if (page.layoutStatus !== 'ok' || averageConfidence < uncertainConfidenceThreshold || uncertainRatio > 0.35 || hasManyTinyBlocks) {
    return 'low';
  }
  if (averageConfidence >= 62 && uncertainRatio <= 0.12 && noiseRatio <= 0.45 && groups.length <= Math.max(1, mainBlocks.length * 0.85)) {
    return 'high';
  }
  return 'medium';
}

function layoutNoteForPage(layout, counts) {
  return `dominant layout: ${layout}; vertical=${counts.vertical}, horizontal=${counts.horizontal}, mixed=${counts.mixed}, unknown=${counts.unknown}`;
}

function processPage(page, topic) {
  const pageSize = normalizeBbox(page.imageSize) ?? { left: 0, top: 0, width: 1000, height: 1400 };
  const allBlocks = (page.blocks ?? [])
    .map((block, index) => normalizeBlock(block, index, pageSize))
    .filter(Boolean);
  const noiseBlocks = allBlocks.filter((block) => block.exclusionReason);
  const mainBlocks = allBlocks.filter((block) => !block.exclusionReason);
  const uncertainSourceBlocks = mainBlocks.filter((block) => block.direction === 'mixed' || block.direction === 'unknown' || block.directionConfidence === 'low');
  const groups = createGroups(mainBlocks, pageSize).map((group, index) => ({ ...group, groupId: `g${index + 1}` }));
  const orderedBlocks = groups.flatMap((group) => group.blocks.map((block) => ({ block, groupId: group.groupId })));
  const reconstructedText = groups.map((group) => group.text).filter(Boolean).join('\n');
  const usability = classifyPageUsability({ page, reconstructedText, mainBlocks });
  const publicBlocks = orderedBlocks.map(({ block, groupId }, index) => makePublicBlock(block, index + 1, groupId));
  const uncertainBlocks = uncertainSourceBlocks.map((block) => ({
    sourceBlockNumber: block.sourceBlockNumber,
    text: block.text,
    direction: block.direction,
    directionConfidence: block.directionConfidence,
    bbox: block.bbox,
    confidence: block.confidence,
  }));
  const publicNoiseBlocks = noiseBlocks.map((block) => ({
    sourceBlockNumber: block.sourceBlockNumber,
    text: block.text,
    direction: block.direction,
    bbox: block.bbox,
    confidence: block.confidence,
    reason: block.exclusionReason,
  }));
  const directionCounts = { vertical: 0, horizontal: 0, mixed: 0, unknown: 0 };
  for (const block of mainBlocks) {
    directionCounts[block.direction] += 1;
  }
  const dominantLayout = dominantDirection(mainBlocks);
  const readingOrderConfidence = confidenceForPage({
    mainBlocks,
    uncertainBlocks,
    noiseBlocks,
    groups,
    page,
    usabilityStatus: usability.usabilityStatus,
  });

  return {
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: page.source ?? topic.source ?? null,
    pageRange: page.pageRange ?? topic.pageRange ?? null,
    pageNumber: page.pageNumber,
    imagePath: page.imagePath,
    reconstructedText,
    blocks: publicBlocks,
    uncertainBlocks,
    noiseBlocks: publicNoiseBlocks,
    readingOrderConfidence,
    usabilityStatus: usability.usabilityStatus,
    usabilityReasons: usability.usabilityReasons,
    textQuality: usability.textQuality,
    dominantLayout,
    layoutNotes: layoutNoteForPage(dominantLayout, directionCounts),
    readingGroups: groups.map((group) => ({
      groupId: group.groupId,
      direction: group.direction,
      bbox: group.bbox,
      text: group.text,
      sourceBlockNumbers: group.blocks.map((block) => block.sourceBlockNumber),
    })),
  };
}

function summarizePages(topics) {
  const pages = topics.flatMap((topic) => topic.pages ?? []);
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  const usabilityCounts = { usable: 0, needs_review: 0, unusable: 0 };
  const layoutCounts = { vertical: 0, horizontal: 0, mixed: 0 };
  const manualReviewPages = [];

  for (const page of pages) {
    confidenceCounts[page.readingOrderConfidence] += 1;
    usabilityCounts[page.usabilityStatus] += 1;
    layoutCounts[page.dominantLayout === 'vertical' ? 'vertical' : page.dominantLayout === 'horizontal' ? 'horizontal' : 'mixed'] += 1;
    const uncertainRatio = page.uncertainBlocks.length / Math.max(1, page.blocks.length);
    const noiseRatio = page.noiseBlocks.length / Math.max(1, page.blocks.length + page.noiseBlocks.length);
    const reviewReasons = [];
    if (page.readingOrderConfidence === 'low') {
      reviewReasons.push('low_reading_order_confidence');
    }
    if (!page.reconstructedText.trim()) {
      reviewReasons.push('empty_reconstructed_text');
    }
    if (uncertainRatio > 0.25) {
      reviewReasons.push('many_uncertain_blocks');
    }
    if (noiseRatio > 0.7) {
      reviewReasons.push('many_noise_blocks');
    }
    if (reviewReasons.length > 0) {
      manualReviewPages.push({
        topicId: page.topicId,
        displayTitle: page.displayTitle,
        pageNumber: page.pageNumber,
        imagePath: page.imagePath,
        readingOrderConfidence: page.readingOrderConfidence,
        reasons: reviewReasons,
        uncertainBlockCount: page.uncertainBlocks.length,
        noiseBlockCount: page.noiseBlocks.length,
      });
    }
  }

  return {
    pageCount: pages.length,
    reconstructedPageCount: pages.filter((page) => page.reconstructedText.trim()).length,
    confidenceCounts,
    usabilityCounts,
    layoutCounts,
    manualReviewPageCount: manualReviewPages.length,
    manualReviewPages,
  };
}

function buildOutput({ input, inputPath, outputPath, stage = '6D-2' }) {
  const topics = (input.topics ?? []).map((topic) => ({
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: topic.source ?? null,
    pageRange: topic.pageRange ?? null,
    pageCount: topic.pages?.length ?? 0,
    pages: (topic.pages ?? []).map((page) => processPage(page, topic)),
  }));
  const summary = summarizePages(topics);

  return {
    schemaVersion: 1,
    stage,
    generatedAt: new Date().toISOString(),
    seriesId: input.seriesId ?? 'cells-at-work',
    inputPath: relativePath(inputPath),
    outputPolicy: {
      privateOutputPath: relativePath(outputPath),
      sourceOcrModified: false,
      publicOutputWritten: false,
      containsReconstructedFullComicText: true,
      forbiddenPublicDirectories: [...forbiddenOutputRoots].map((item) => `${item}/`),
    },
    algorithm: {
      pageScope: 'each page processed independently',
      directionRules: {
        vertical: 'height clearly greater than width; columns sort right-to-left; text sorts top-to-bottom inside each column',
        horizontal: 'width clearly greater than height; rows sort top-to-bottom; text sorts left-to-right inside each row',
        uncertain: 'ambiguous blocks are marked mixed or unknown and listed in uncertainBlocks',
      },
      mangaOrderRule: 'approximate top-to-bottom bands with right-to-left ordering inside each band',
      excludedBlockTypes: [
        'sound_effect_or_decorative_large_text',
        'background_sign',
        'page_number',
        'publication_info',
        'low_confidence_noise',
        'non_readable_noise',
      ],
    },
    summary,
    topics,
  };
}

export async function runWorkCellsPageReadingOrder(options = {}) {
  const inputPath = path.resolve(rootDir, options.inputPath ?? defaultInputPath);
  const outputPath = path.resolve(rootDir, options.outputPath ?? defaultOutputPath);
  assertInsideRoot(inputPath, `Input OCR layout must stay inside project root: ${inputPath}`);
  assertPrivateOutputPath(outputPath);

  if (!(await pathExists(inputPath))) {
    throw new Error(`Coordinate OCR input not found: ${relativePath(inputPath)}`);
  }

  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const output = buildOutput({ input, inputPath, outputPath, stage: options.stage });
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
    } else if (arg === '--input') {
      options.inputPath = args[++index];
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
  node scripts/work-cells-page-reading-order.mjs [options]

Options:
  --input <file>   Default: data-private/cells-at-work/ocr-layout/topic-page-blocks.json
  --output <file>  Default: data-private/cells-at-work/ocr-layout/page-reading-order.json
  --stage <label>  Default: 6D-2

Writes private per-page reading-order reconstruction from coordinate OCR blocks.`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runWorkCellsPageReadingOrder(options);
    console.log(`Page reading order data: ${result.outputPolicy.privateOutputPath}`);
    console.log(`Reconstructed pages: ${result.summary.reconstructedPageCount}/${result.summary.pageCount}`);
    console.log(`Confidence pages: high=${result.summary.confidenceCounts.high}, medium=${result.summary.confidenceCounts.medium}, low=${result.summary.confidenceCounts.low}`);
    console.log(`Layout pages: vertical=${result.summary.layoutCounts.vertical}, horizontal=${result.summary.layoutCounts.horizontal}, mixed=${result.summary.layoutCounts.mixed}`);
    console.log(`Manual review pages: ${result.summary.manualReviewPages.length}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
