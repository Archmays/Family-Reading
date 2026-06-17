import { constants } from 'node:fs';
import { access, copyFile, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundleDir = path.join(rootDir, 'reports', 'cells-at-work', 'ai-ocr-review-bundle');
const samplePagesDir = path.join(bundleDir, 'sample-pages');
const reportsDir = path.join(rootDir, 'reports', 'cells-at-work');
const dataZipPath = path.join(reportsDir, 'work-cells-ai-ocr-review-data.zip');
const sampleZipPath = path.join(reportsDir, 'work-cells-ai-ocr-review-sample-pages.zip');
const sampleZipPart1Path = path.join(reportsDir, 'work-cells-ai-ocr-review-sample-pages-part1.zip');
const sampleZipPart2Path = path.join(reportsDir, 'work-cells-ai-ocr-review-sample-pages-part2.zip');
const zipStagingDir = path.join(bundleDir, '.zip-staging');

const maxSamplePages = 140;
const sampleSplitThresholdBytes = 180 * 1024 * 1024;

const dataFiles = [
  { sourcePath: 'data/cells-at-work/page-map.json', optional: false },
  { sourcePath: 'data/cells-at-work/manual-topic-ranges.json', optional: false },
  { sourcePath: 'public/books/工作细胞/draft-manifest.json', optional: false },
  { sourcePath: 'data/cells-at-work/terminology.zh-Hans.json', optional: true },
  { sourcePath: 'reports/cells-at-work/ocr-quality-report.md', optional: false },
  { sourcePath: 'data-private/cells-at-work/ocr/topic-content-hints.json', optional: true },
  { sourcePath: 'data-private/cells-at-work/ocr-layout/topic-page-blocks.json', optional: false },
  { sourcePath: 'data-private/cells-at-work/ocr-layout/page-reading-order.json', optional: false },
  { sourcePath: 'data-private/cells-at-work/ocr-layout/page-readable-text.json', optional: false },
  { sourcePath: 'data-private/cells-at-work/ocr-layout/topic-readable-transcripts.json', optional: false },
  { sourcePath: 'data-private/cells-at-work/ocr-layout/topic-story-outline-hints.json', optional: false },
];

const dTopicIds = new Set([
  'acquired-immunity',
  'hemorrhagic-shock',
  'cytokines',
  'cancer-cell-ii',
]);

const cTopicIds = new Set([
  'pneumococcus',
  'abrasion',
  'food-poisoning',
  'heatstroke',
  'erythroblast-and-bone-marrow-cell',
  'cancer-cell',
  'staphylococcus-aureus',
  'dengue-fever',
  'helicobacter-pylori',
  'antigenic-variation',
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relativePath(targetPath) {
  return toPosix(path.relative(rootDir, targetPath));
}

function assertInsideRoot(targetPath) {
  const relative = path.relative(rootDir, path.resolve(targetPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to access path outside project root: ${targetPath}`);
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

async function readJson(relativeFilePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativeFilePath), 'utf8'));
}

async function removeIfExists(targetPath) {
  assertInsideRoot(targetPath);
  await rm(targetPath, { recursive: true, force: true });
}

function paddedPage(pageNumber) {
  return String(pageNumber).padStart(3, '0');
}

function parseImagePath(imagePath) {
  const match = String(imagePath).match(/pages-by-volume\/(v\d+)\/page-(\d+)\.webp$/u);
  if (!match) {
    return {
      volumeId: 'unknown',
      imagePageNumber: null,
      pageId: `unknown_page-${paddedPage(0)}`,
    };
  }
  return {
    volumeId: match[1],
    imagePageNumber: Number(match[2]),
    pageId: `${match[1]}_page-${match[2]}`,
  };
}

function excerpt(value, maxLength = 180) {
  const compact = String(value ?? '').replace(/\s+/gu, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength)}...`;
}

function gradeLetter(grade) {
  return String(grade ?? '').slice(0, 1);
}

function topicGrade(topic, outlineByTopic) {
  return outlineByTopic.get(topic.topicId)?.transcriptQualityGrade ?? topic.qualityGrade ?? 'unknown';
}

function topicPriorityGroup(topicId, grade) {
  if (dTopicIds.has(topicId) || gradeLetter(grade) === 'D') {
    return 'D';
  }
  if (cTopicIds.has(topicId) || gradeLetter(grade) === 'C') {
    return 'C';
  }
  return 'AB';
}

function topicOrderMap(topics) {
  return new Map(topics.map((topic, index) => [topic.topicId, index + 1]));
}

function pageByNumber(topic) {
  return new Map((topic.pages ?? []).map((page) => [page.pageNumber, page]));
}

function anchorPages(topic, group) {
  const pages = topic.pages ?? [];
  if (pages.length === 0) {
    return [];
  }
  const middle = pages[Math.floor((pages.length - 1) / 2)];
  if (group === 'D') {
    return [pages[0], pages[1], middle, pages.at(-2), pages.at(-1)].filter(Boolean);
  }
  if (group === 'C') {
    return [pages[0], middle, pages.at(-1)].filter(Boolean);
  }
  return [representativePage(topic)].filter(Boolean);
}

function confidenceRank(confidence) {
  const value = Number(confidence);
  return Number.isFinite(value) ? value : 0;
}

function readingOrderRank(value) {
  return { high: 3, medium: 2, low: 1 }[value] ?? 0;
}

function representativePage(topic) {
  const pages = topic.pages ?? [];
  const midpoint = pages[Math.floor((pages.length - 1) / 2)]?.pageNumber ?? 0;
  return [...pages].sort((a, b) => {
    return readingOrderRank(b.readingOrderConfidence) - readingOrderRank(a.readingOrderConfidence)
      || confidenceRank(b.confidence) - confidenceRank(a.confidence)
      || Math.abs(a.pageNumber - midpoint) - Math.abs(b.pageNumber - midpoint)
      || a.pageNumber - b.pageNumber;
  })[0];
}

function parseQualityReportPages(reportText, topics) {
  const sections = reportText.split(/^### /mu).slice(1);
  const byTopic = new Map();
  for (let index = 0; index < sections.length && index < topics.length; index += 1) {
    const pageNumbers = new Set();
    for (const match of sections[index].matchAll(/\bp(\d{1,3})(?=\()/gu)) {
      pageNumbers.add(Number(match[1]));
    }
    byTopic.set(topics[index].topicId, pageNumbers);
  }
  return byTopic;
}

function pageIssueReasons(page, reportPages) {
  const reasons = [];
  if (reportPages?.has(page.pageNumber)) {
    reasons.push('listed in ocr-quality-report.md');
  }
  if (page.readingOrderConfidence === 'low') {
    reasons.push('readingOrderConfidence=low');
  }
  if (confidenceRank(page.confidence) < 0.45) {
    reasons.push(`OCR confidence ${confidenceRank(page.confidence).toFixed(2)} < 0.45`);
  }
  const uncertainCount = (page.uncertainTerms ?? []).length;
  if (uncertainCount > 0) {
    reasons.push(`${uncertainCount} uncertain OCR term(s)`);
  }
  const dropped = Number(page.cleaningDiagnostics?.droppedLineCount ?? 0);
  const suspicious = Number(page.cleaningDiagnostics?.suspiciousLineCount ?? 0);
  if (dropped >= 10) {
    reasons.push(`${dropped} dropped OCR noise line(s)`);
  }
  if (suspicious > 0) {
    reasons.push(`${suspicious} suspicious OCR line(s)`);
  }
  return reasons;
}

function pageSeverity(page, reportPages) {
  let score = 0;
  if (reportPages?.has(page.pageNumber)) {
    score += 100;
  }
  if (page.readingOrderConfidence === 'low') {
    score += 60;
  }
  const confidence = confidenceRank(page.confidence);
  if (confidence < 0.45) {
    score += (0.45 - confidence) * 200;
  }
  score += Math.min(30, (page.uncertainTerms ?? []).length * 5);
  score += Math.min(30, Number(page.cleaningDiagnostics?.droppedLineCount ?? 0));
  score += Math.min(30, Number(page.cleaningDiagnostics?.suspiciousLineCount ?? 0) * 10);
  return Number(score.toFixed(2));
}

function addCandidate(candidates, topic, page, options) {
  if (!page) {
    return;
  }
  const key = `${topic.topicId}:${page.pageNumber}`;
  const existing = candidates.get(key);
  const reasons = new Set([...(existing?.selectionReasons ?? []), ...options.selectionReasons]);
  const priority = Math.min(existing?.priority ?? Number.POSITIVE_INFINITY, options.priority);
  candidates.set(key, {
    topic,
    page,
    priority,
    mandatory: Boolean(existing?.mandatory || options.mandatory),
    selectionReasons: [...reasons],
  });
}

function collectSampleCandidates({ pageReadableText, outlineHints, qualityReportText }) {
  const outlineByTopic = new Map((outlineHints.topics ?? []).map((topic) => [topic.topicId, topic]));
  const qualityReportPagesByTopic = parseQualityReportPages(qualityReportText, pageReadableText.topics ?? []);
  const candidates = new Map();

  for (const topic of pageReadableText.topics ?? []) {
    const grade = topicGrade(topic, outlineByTopic);
    const group = topicPriorityGroup(topic.topicId, grade);
    const reportPages = qualityReportPagesByTopic.get(topic.topicId) ?? new Set();
    const byNumber = pageByNumber(topic);

    for (const page of anchorPages(topic, group)) {
      const label = group === 'D'
        ? 'D topic required anchor page'
        : group === 'C'
          ? 'C topic required anchor page'
          : 'A/B topic representative page';
      addCandidate(candidates, topic, page, {
        priority: group === 'D' ? 20 : group === 'C' ? 40 : 50,
        mandatory: true,
        selectionReasons: [label],
      });
    }

    if (group === 'D') {
      for (const page of topic.pages ?? []) {
        if (page.readingOrderConfidence === 'low' || confidenceRank(page.confidence) < 0.45 || reportPages.has(page.pageNumber)) {
          addCandidate(candidates, topic, page, {
            priority: 10,
            mandatory: false,
            selectionReasons: ['D topic low confidence or quality-report page'],
          });
        }
      }
    } else if (group === 'C') {
      for (const pageNumber of reportPages) {
        addCandidate(candidates, topic, byNumber.get(pageNumber), {
          priority: 30,
          mandatory: false,
          selectionReasons: ['C topic quality-report page'],
        });
      }
    }
  }

  const candidatesWithReasons = [...candidates.values()].map((candidate) => {
    const reportPages = qualityReportPagesByTopic.get(candidate.topic.topicId) ?? new Set();
    return {
      ...candidate,
      issueReasons: pageIssueReasons(candidate.page, reportPages),
      severity: pageSeverity(candidate.page, reportPages),
    };
  });

  return { candidates: candidatesWithReasons, qualityReportPagesByTopic };
}

function selectSamples(candidates, topicOrder) {
  const mandatory = candidates.filter((candidate) => candidate.mandatory);
  const optional = candidates.filter((candidate) => !candidate.mandatory);
  const sortSamples = (a, b) => {
    return a.priority - b.priority
      || b.severity - a.severity
      || (topicOrder.get(a.topic.topicId) ?? 999) - (topicOrder.get(b.topic.topicId) ?? 999)
      || a.page.pageNumber - b.page.pageNumber;
  };
  const selectedByKey = new Map();
  for (const candidate of mandatory.sort(sortSamples)) {
    selectedByKey.set(`${candidate.topic.topicId}:${candidate.page.pageNumber}`, candidate);
  }
  for (const candidate of optional.sort(sortSamples)) {
    if (selectedByKey.size >= maxSamplePages) {
      break;
    }
    selectedByKey.set(`${candidate.topic.topicId}:${candidate.page.pageNumber}`, candidate);
  }
  return {
    selected: [...selectedByKey.values()].sort(sortSamples),
    omitted: candidates.length - selectedByKey.size,
    candidateCount: candidates.length,
  };
}

function sampleFileName(topicId, imagePath) {
  const { volumeId, imagePageNumber } = parseImagePath(imagePath);
  return `${topicId}__${volumeId}_page-${paddedPage(imagePageNumber ?? 0)}.webp`;
}

function ocrQualityReason(sample) {
  const reasons = [...sample.selectionReasons, ...sample.issueReasons];
  return [...new Set(reasons)].join('; ') || 'representative comparison sample';
}

async function copyDataFiles() {
  const included = [];
  const missing = [];
  for (const file of dataFiles) {
    const source = path.join(rootDir, file.sourcePath);
    if (!(await pathExists(source))) {
      missing.push({ path: file.sourcePath, optional: file.optional });
      continue;
    }
    const destination = path.join(bundleDir, file.sourcePath);
    assertInsideRoot(destination);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    included.push({ path: file.sourcePath, optional: file.optional });
  }
  return { included, missing };
}

async function copySamplePages(selected, outlineByTopic) {
  await mkdir(samplePagesDir, { recursive: true });
  const copied = [];
  const missingImages = [];

  for (const sample of selected) {
    const originalImagePath = sample.page.imagePath;
    const source = path.join(rootDir, originalImagePath);
    const fileName = sampleFileName(sample.topic.topicId, originalImagePath);
    const destination = path.join(samplePagesDir, fileName);
    const parsed = parseImagePath(originalImagePath);

    if (await pathExists(source)) {
      await copyFile(source, destination);
    } else {
      missingImages.push({ topicId: sample.topic.topicId, pageNumber: sample.page.pageNumber, imagePath: originalImagePath });
    }

    copied.push({
      topicId: sample.topic.topicId,
      displayTitle: sample.topic.displayTitle,
      source: sample.topic.source,
      pageId: parsed.pageId,
      volumeId: parsed.volumeId,
      pageNumber: sample.page.pageNumber,
      imagePathInBundle: `sample-pages/${fileName}`,
      originalImagePath,
      readingOrderConfidence: sample.page.readingOrderConfidence ?? null,
      ocrQualityReason: ocrQualityReason(sample),
      reconstructedTextExcerpt: excerpt(sample.page.reconstructedText),
      normalizedTextExcerpt: excerpt(sample.page.normalizedText),
      transcriptQualityGrade: outlineByTopic.get(sample.topic.topicId)?.transcriptQualityGrade ?? sample.topic.qualityGrade ?? null,
      confidence: sample.page.confidence ?? null,
      selectionReasons: sample.selectionReasons,
    });
  }

  return { samples: copied, missingImages };
}

function groupSamplesByTopic(samples) {
  const byTopic = new Map();
  for (const sample of samples) {
    const current = byTopic.get(sample.topicId) ?? {
      topicId: sample.topicId,
      displayTitle: sample.displayTitle,
      transcriptQualityGrade: sample.transcriptQualityGrade,
      samples: [],
    };
    current.samples.push(sample);
    byTopic.set(sample.topicId, current);
  }
  return [...byTopic.values()];
}

function renderDataFileList(files) {
  if (files.length === 0) {
    return '- none';
  }
  return files
    .map((file) => `- \`${file.path}\`${file.optional ? ' (optional)' : ''}`)
    .join('\n');
}

function renderTopicSampleList(groupedSamples) {
  return groupedSamples
    .map((topic) => {
      const pages = topic.samples
        .map((sample) => `${sample.volumeId}/p${paddedPage(sample.pageNumber)} (${sample.imagePathInBundle})`)
        .join(', ');
      return `- ${topic.displayTitle} (\`${topic.topicId}\`, ${topic.transcriptQualityGrade}): ${topic.samples.length} page(s) - ${pages}`;
    })
    .join('\n');
}

function renderSampleDetails(groupedSamples) {
  const lines = [];
  for (const topic of groupedSamples) {
    lines.push(`### ${topic.displayTitle} (\`${topic.topicId}\`)`);
    lines.push('');
    for (const sample of topic.samples) {
      lines.push(`- \`${sample.imagePathInBundle}\``);
      lines.push(`  - topicId: \`${sample.topicId}\`; displayTitle: ${sample.displayTitle}`);
      lines.push(`  - volume/page: ${sample.volumeId}/p${paddedPage(sample.pageNumber)}; pageId: \`${sample.pageId}\``);
      lines.push(`  - original imagePath: \`${sample.originalImagePath}\``);
      lines.push(`  - readingOrderConfidence: ${sample.readingOrderConfidence ?? 'unknown'}; OCR quality reason: ${sample.ocrQualityReason}`);
      lines.push(`  - reconstructedText excerpt: ${sample.reconstructedTextExcerpt || '(empty)'}`);
      lines.push(`  - normalizedText excerpt: ${sample.normalizedTextExcerpt || '(empty)'}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderReviewIndex({
  generatedAt,
  includedDataFiles,
  missingDataFiles,
  groupedSamples,
  sampleCount,
  candidateCount,
  omittedCandidateCount,
  missingImages,
}) {
  const lines = [];
  lines.push('# 工作细胞 6E OCR 重排审核包索引');
  lines.push('');
  lines.push(`生成时间：${generatedAt}`);
  lines.push('');
  lines.push('## 用途和边界');
  lines.push('');
  lines.push('- 本审核包只用于 ChatGPT 审核 OCR 重排质量、竖排/横排组合、主题转写质量和后续修复方向。');
  lines.push('- 完整 EPUB 没有进入审核包。');
  lines.push('- 本阶段没有把完整 OCR 文本发布到 public、dist、build 或 docs。');
  lines.push('- 本阶段不改前端、不生成身体科学小站正文、不自动接入页面。');
  lines.push('- 样本页是高风险优先的裁剪包；由于 140 页上限和 D 级低置信页数量冲突，索引保留了每个 D/C/A/B 主题的代表样本，并优先补入 D 级低置信页。');
  lines.push('');
  lines.push('## 已包含数据文件');
  lines.push('');
  lines.push(renderDataFileList(includedDataFiles));
  lines.push('');
  lines.push('## 缺失数据文件');
  lines.push('');
  lines.push(renderDataFileList(missingDataFiles));
  lines.push('');
  lines.push('## 样本页面概况');
  lines.push('');
  lines.push(`- 样本页面总数：${sampleCount}`);
  lines.push(`- 候选样本页数：${candidateCount}`);
  lines.push(`- 因 ${maxSamplePages} 页上限裁剪的候选页数：${omittedCandidateCount}`);
  lines.push(`- 缺失图片文件数：${missingImages.length}`);
  lines.push('');
  lines.push('## 每个主题包含的样本页');
  lines.push('');
  lines.push(renderTopicSampleList(groupedSamples));
  lines.push('');
  lines.push('## 样本页明细');
  lines.push('');
  lines.push(renderSampleDetails(groupedSamples));
  return `${lines.join('\n')}\n`;
}

async function writeIndexes({ samples, includedDataFiles, missingDataFiles, candidateCount, omittedCandidateCount, missingImages }) {
  const generatedAt = new Date().toISOString();
  const groupedSamples = groupSamplesByTopic(samples);
  const reviewSamples = {
    schemaVersion: 1,
    stage: '6E-ai-ocr-review-bundle',
    generatedAt,
    purpose: 'ChatGPT review of OCR reading-order reconstruction and topic transcript quality',
    samplePolicy: {
      maxSamplePages,
      candidateCount,
      omittedCandidateCount,
      fullEpubIncluded: false,
      publicFullOcrTextWritten: false,
      frontendModified: false,
      bodyScienceStationGenerated: false,
    },
    samples,
  };
  const reviewIndex = renderReviewIndex({
    generatedAt,
    includedDataFiles,
    missingDataFiles,
    groupedSamples,
    sampleCount: samples.length,
    candidateCount,
    omittedCandidateCount,
    missingImages,
  });

  await writeFile(path.join(bundleDir, 'review-samples.json'), `${JSON.stringify(reviewSamples, null, 2)}\n`, 'utf8');
  await writeFile(path.join(bundleDir, 'review-index.md'), reviewIndex, 'utf8');
}

async function listFilesRecursive(targetDir) {
  if (!(await pathExists(targetDir))) {
    return [];
  }
  const entries = await readdir(targetDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

async function stageDataZip(stagingDir) {
  await copyFile(path.join(bundleDir, 'review-index.md'), path.join(stagingDir, 'review-index.md'));
  await copyFile(path.join(bundleDir, 'review-samples.json'), path.join(stagingDir, 'review-samples.json'));
  for (const directory of ['data', 'data-private', 'public', 'reports']) {
    const source = path.join(bundleDir, directory);
    if (await pathExists(source)) {
      await cp(source, path.join(stagingDir, directory), { recursive: true });
    }
  }
}

async function stageSampleZip(stagingDir, sampleFiles) {
  await copyFile(path.join(bundleDir, 'review-index.md'), path.join(stagingDir, 'review-index.md'));
  await copyFile(path.join(bundleDir, 'review-samples.json'), path.join(stagingDir, 'review-samples.json'));
  const sampleTargetDir = path.join(stagingDir, 'sample-pages');
  await mkdir(sampleTargetDir, { recursive: true });
  for (const sampleFile of sampleFiles) {
    await copyFile(sampleFile, path.join(sampleTargetDir, path.basename(sampleFile)));
  }
}

async function compressDirectoryContents(stagingDir, zipPath) {
  await removeIfExists(zipPath);
  if (process.platform === 'win32') {
    const psScriptPath = path.join(zipStagingDir, 'compress-archive.ps1');
    await writeFile(psScriptPath, [
      'param([string]$SourceDir, [string]$ZipPath)',
      '$source = Join-Path -Path $SourceDir -ChildPath "*"',
      'Compress-Archive -Path $source -DestinationPath $ZipPath -Force',
      '',
    ].join('\n'), 'utf8');
    await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath, stagingDir, zipPath], {
      cwd: rootDir,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
    });
    await removeIfExists(psScriptPath);
    return;
  }
  await execFileAsync('zip', ['-r', zipPath, '.'], {
    cwd: stagingDir,
    maxBuffer: 1024 * 1024 * 8,
  });
}

async function createZip(zipName, zipPath, stageFn) {
  const stagingDir = path.join(zipStagingDir, zipName);
  await removeIfExists(stagingDir);
  await mkdir(stagingDir, { recursive: true });
  await stageFn(stagingDir);
  await compressDirectoryContents(stagingDir, zipPath);
  await removeIfExists(stagingDir);
  const zipStats = await stat(zipPath);
  return { path: relativePath(zipPath), sizeBytes: zipStats.size };
}

async function createZips() {
  await removeIfExists(dataZipPath);
  await removeIfExists(sampleZipPath);
  await removeIfExists(sampleZipPart1Path);
  await removeIfExists(sampleZipPart2Path);
  await removeIfExists(zipStagingDir);
  await mkdir(zipStagingDir, { recursive: true });

  const zips = [];
  zips.push(await createZip('data', dataZipPath, stageDataZip));

  const sampleFiles = (await listFilesRecursive(samplePagesDir)).sort((a, b) => a.localeCompare(b));
  const sampleZip = await createZip('sample-pages', sampleZipPath, (stagingDir) => stageSampleZip(stagingDir, sampleFiles));
  if (sampleZip.sizeBytes <= sampleSplitThresholdBytes) {
    zips.push(sampleZip);
  } else {
    await removeIfExists(sampleZipPath);
    const midpoint = Math.ceil(sampleFiles.length / 2);
    zips.push(await createZip('sample-pages-part1', sampleZipPart1Path, (stagingDir) => stageSampleZip(stagingDir, sampleFiles.slice(0, midpoint))));
    zips.push(await createZip('sample-pages-part2', sampleZipPart2Path, (stagingDir) => stageSampleZip(stagingDir, sampleFiles.slice(midpoint))));
  }

  await removeIfExists(zipStagingDir);
  return zips;
}

async function assertNoEpubInBundle() {
  const files = await listFilesRecursive(bundleDir);
  const epubFiles = files.filter((file) => path.extname(file).toLowerCase() === '.epub');
  if (epubFiles.length > 0) {
    throw new Error(`EPUB files must not be included in review bundle: ${epubFiles.map(relativePath).join(', ')}`);
  }
}

async function run() {
  await removeIfExists(bundleDir);
  await mkdir(bundleDir, { recursive: true });

  const [pageReadableText, outlineHints, qualityReportText] = await Promise.all([
    readJson('data-private/cells-at-work/ocr-layout/page-readable-text.json'),
    readJson('data-private/cells-at-work/ocr-layout/topic-story-outline-hints.json'),
    readFile(path.join(rootDir, 'reports/cells-at-work/ocr-quality-report.md'), 'utf8'),
  ]);
  const outlineByTopic = new Map((outlineHints.topics ?? []).map((topic) => [topic.topicId, topic]));
  const topicOrder = topicOrderMap(pageReadableText.topics ?? []);

  const copiedData = await copyDataFiles();
  const { candidates } = collectSampleCandidates({ pageReadableText, outlineHints, qualityReportText });
  const { selected, omitted, candidateCount } = selectSamples(candidates, topicOrder);
  const copiedSamples = await copySamplePages(selected, outlineByTopic);

  await writeIndexes({
    samples: copiedSamples.samples,
    includedDataFiles: copiedData.included,
    missingDataFiles: copiedData.missing,
    candidateCount,
    omittedCandidateCount: omitted,
    missingImages: copiedSamples.missingImages,
  });
  await assertNoEpubInBundle();
  const zips = await createZips();

  const countsByTopic = groupSamplesByTopic(copiedSamples.samples).map((topic) => ({
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    transcriptQualityGrade: topic.transcriptQualityGrade,
    sampleCount: topic.samples.length,
  }));

  return {
    bundleDir: relativePath(bundleDir),
    zips,
    dataFilesIncluded: copiedData.included,
    dataFilesMissing: copiedData.missing,
    sampleCount: copiedSamples.samples.length,
    candidateCount,
    omittedCandidateCount: omitted,
    countsByTopic,
    dTopicsCovered: [...dTopicIds].every((topicId) => countsByTopic.some((topic) => topic.topicId === topicId && topic.sampleCount > 0)),
    cTopicsCovered: [...cTopicIds].every((topicId) => countsByTopic.some((topic) => topic.topicId === topicId && topic.sampleCount > 0)),
    fullEpubIncluded: false,
    publicFullOcrTextWritten: false,
    missingImages: copiedSamples.missingImages,
  };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  run().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export {
  collectSampleCandidates,
  run,
  selectSamples,
};
