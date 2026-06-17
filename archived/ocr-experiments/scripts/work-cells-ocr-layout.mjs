import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultPageMapPath = path.join(rootDir, 'data', 'cells-at-work', 'page-map.json');
const defaultSourceOcrIndexPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr', 'topic-ocr-index.json');
const defaultOutputPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout-v2', 'topic-page-blocks-v2.json');
const defaultTessdataDirectory = path.join(rootDir, 'data-private', 'cells-at-work', 'tessdata');
const defaultTerminologyPath = path.join(rootDir, 'data-private', 'cells-at-work', 'terminology.zh-Hans.json');
const forbiddenOutputRoots = new Set(['public', 'dist', 'build', 'docs']);
const requiredLanguages = ['chi_tra_vert', 'chi_sim_vert', 'chi_tra', 'chi_sim', 'eng'];
const horizontalLanguages = ['chi_tra', 'chi_sim', 'eng'];
const verticalLanguages = ['chi_tra_vert', 'chi_sim_vert', 'eng'];
const defaultHorizontalPsms = [6, 7, 11];
const defaultVerticalPsms = [5];
const defaultPageTimeoutMs = 45000;
const lowOcrScoreThreshold = 30;
const allowedLatinTerms = ['COVID', 'SARS', 'CoV', 'DNA', 'RNA', 'iPS', 'NK', 'T', 'B'];
const calibrationSamples = [
  {
    pageId: 'v03_page-099',
    expectedPhrases: ['怎麼回事', '這段影像', '流進了', '腦袋'],
  },
  {
    pageId: 'v06_page-042',
    expectedPhrases: ['骨髓芽細胞', '嗜中性骨髓球', '桿狀核粒細胞', '白血球'],
  },
  {
    pageId: 'v06_page-121',
    expectedPhrases: ['增殖', '表皮細胞', '階層'],
  },
  {
    pageId: 'v05_page-143',
    expectedPhrases: ['癌細胞', '白血球', '記憶T細胞', 'NK細胞'],
  },
];
const traditionalSignals = new Set([...`麼這進腦髓細嗜狀顆記憶階層體雙會嗎裡內個們為與對時還過說應該現實際問題種頭顯發書頁氣壞殺傷傳訊號變異獲得免疫細胞白血球癌增殖表皮骨桿`]);
const simplifiedSignals = new Set([...`么这进脑髓细嗜状颗记忆阶层体双会吗里内个们为与对时还过说应该现实际问题种头显发书页气坏杀伤传讯号变异获得免疫细胞白血球癌增殖表皮骨杆`]);

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
    throw new Error(`Refusing to write coordinate OCR into a public/deployable directory: ${relative}`);
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

async function readJsonIfExists(targetPath) {
  if (!(await pathExists(targetPath))) {
    return null;
  }
  return JSON.parse(await readFile(targetPath, 'utf8'));
}

function pageIdFromImagePath(imagePath) {
  const normalized = toPosix(String(imagePath));
  const match = normalized.match(/\/(v\d{2})\/page-(\d+)\.[a-z0-9]+$/i);
  return match ? `${match[1]}_page-${match[2]}` : null;
}

function normalizePageId(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/(v\d{2})[_:/\\-]+(?:page[-_])?(\d{1,3})/i);
  return match ? `${match[1].toLowerCase()}_page-${match[2].padStart(3, '0')}` : text;
}

function parsePageIds(value) {
  if (!value) {
    return null;
  }
  return new Set(String(value).split(',').map(normalizePageId).filter(Boolean));
}

function parsePageNumber(imagePath, fallback) {
  const match = String(imagePath).match(/page-(\d+)\.[a-z0-9]+$/i);
  return match ? Number(match[1]) : fallback;
}

function compactText(text) {
  return String(text ?? '').replace(/\s+/gu, '');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countCompactTerm(text, termText) {
  const termValue = compactText(termText);
  if (termValue.length < 2) {
    return 0;
  }
  return [...compactText(text).matchAll(new RegExp(escapeRegex(termValue), 'giu'))].length;
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter((value) => value.length >= 2))];
}

function calibrationForPage(pageId) {
  return calibrationSamples.find((sample) => sample.pageId === pageId) ?? null;
}

function terminologyTermsForTopic(terminology, topicId) {
  const terms = [];
  for (const entry of terminology?.entries ?? []) {
    const topics = entry.topics ?? [];
    if (topics.length > 0 && !topics.includes('all') && !topics.includes(topicId)) {
      continue;
    }
    terms.push(entry.label, entry.preferred);
    for (const form of entry.forms ?? []) {
      terms.push(form.text, form.normalized);
    }
  }
  return uniqueStrings(terms);
}

function scoringTerms({ topic, pageId, terminology }) {
  const sample = calibrationForPage(pageId);
  const topicKeywords = uniqueStrings([
    topic.topicId,
    topic.displayTitle,
    topic.sourceLabel,
    topic.range,
    ...(sample?.expectedPhrases ?? []),
  ]);
  const glossaryTerms = uniqueStrings([
    ...terminologyTermsForTopic(terminology, topic.topicId),
    ...(sample?.expectedPhrases ?? []),
  ]);
  return { topicKeywords, glossaryTerms, sample };
}

function resolveTesseractCommand(command) {
  if (command !== 'tesseract') {
    return command;
  }

  const candidates = [
    command,
    'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
    'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
  ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { cwd: rootDir, encoding: 'utf8', shell: false });
    if (result.status === 0) {
      return candidate;
    }
  }

  return command;
}

export function checkRequiredOcrLanguages(languages) {
  const languageSet = new Set(languages);
  const missingRequiredLanguages = requiredLanguages.filter((language) => !languageSet.has(language));
  const installedRequiredLanguages = requiredLanguages.filter((language) => languageSet.has(language));
  const channelChecks = [
    {
      channel: 'horizontal',
      languages: horizontalLanguages,
      psms: defaultHorizontalPsms,
      installed: horizontalLanguages.every((language) => languageSet.has(language)),
    },
    {
      channel: 'vertical',
      languages: verticalLanguages,
      psms: defaultVerticalPsms,
      installed: verticalLanguages.every((language) => languageSet.has(language)),
    },
  ];

  return {
    requiredLanguages,
    installedRequiredLanguages,
    missingRequiredLanguages,
    verticalChineseLanguageDataInstalled: languageSet.has('chi_tra_vert') && languageSet.has('chi_sim_vert'),
    horizontalChineseLanguageDataInstalled: languageSet.has('chi_tra') && languageSet.has('chi_sim'),
    channelChecks,
    canRunDualChannel: missingRequiredLanguages.length === 0,
  };
}

function detectTesseract(command, env) {
  const resolvedCommand = resolveTesseractCommand(command);
  const version = spawnSync(resolvedCommand, ['--version'], { cwd: rootDir, encoding: 'utf8', shell: false, env });
  if (version.status !== 0) {
    return {
      available: false,
      command: resolvedCommand,
      version: null,
      languages: [],
      selectedLanguages: [],
      languageCheck: checkRequiredOcrLanguages([]),
      missingDependencies: [{
        type: 'ocr_tool',
        name: command,
        reason: 'Tesseract OCR was not found on PATH.',
        installSuggestion: 'Install Tesseract OCR, then install chi_tra_vert, chi_sim_vert, chi_tra, chi_sim, and eng traineddata files and ensure tesseract is on PATH.',
      }],
    };
  }

  const listed = spawnSync(resolvedCommand, ['--list-langs'], { cwd: rootDir, encoding: 'utf8', shell: false, env });
  const languages = listed.status === 0
    ? listed.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.includes('List of available languages'))
    : [];
  const languageSet = new Set(languages);
  const languageCheck = checkRequiredOcrLanguages(languages);
  const selectedLanguages = languageCheck.installedRequiredLanguages;
  const missingDependencies = [];

  for (const language of requiredLanguages) {
    if (!languageSet.has(language)) {
      missingDependencies.push({
        type: 'ocr_language_data',
        name: language,
        reason: `${language} traineddata is not installed for Tesseract.`,
        installSuggestion: `Install the official Tesseract ${language}.traineddata file into the active tessdata directory. For this project, put it under data-private/cells-at-work/tessdata/.`,
      });
    }
  }

  return {
    available: true,
    command: resolvedCommand,
    version: version.stdout.split(/\r?\n/)[0] ?? null,
    languages,
    selectedLanguages,
    languageCheck,
    missingDependencies,
  };
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bboxFromRow(row) {
  if (!row) {
    return null;
  }
  const left = numberOrNull(row.left);
  const top = numberOrNull(row.top);
  const width = numberOrNull(row.width);
  const height = numberOrNull(row.height);
  if ([left, top, width, height].some((value) => value === null)) {
    return null;
  }
  return { left, top, width, height };
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
  const right = Math.max(first.left + first.width, second.left + second.width);
  const bottom = Math.max(first.top + first.height, second.top + second.height);
  return { left, top, width: right - left, height: bottom - top };
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0
    ? Number((finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(2))
    : null;
}

function countHanChars(text) {
  return [...String(text ?? '')].filter((char) => /\p{Script=Han}/u.test(char)).length;
}

function countChars(text, predicate) {
  return [...String(text ?? '')].filter(predicate).length;
}

function countTraditionalSignalChars(text) {
  return countChars(text, (char) => traditionalSignals.has(char));
}

function countSimplifiedSignalChars(text) {
  return countChars(text, (char) => simplifiedSignals.has(char));
}

function latinNoiseText(text) {
  let value = String(text ?? '');
  for (const termText of allowedLatinTerms) {
    value = value.replace(new RegExp(`\\b${escapeRegex(termText)}\\b`, 'giu'), '');
  }
  return value;
}

function countLongGibberishRuns(text) {
  return String(text ?? '').split(/\s+/u).filter((token) => {
    const compact = compactText(token);
    const chars = [...compact];
    if (chars.length < 10) {
      return false;
    }
    const han = chars.filter((char) => /\p{Script=Han}/u.test(char)).length;
    const latin = chars.filter((char) => /[A-Za-z]/u.test(char)).length;
    const digits = chars.filter((char) => /\d/u.test(char)).length;
    const replacement = chars.filter((char) => char === '\uFFFD').length;
    const uniqueRatio = new Set(chars).size / chars.length;
    const symbol = chars.length - han - latin - digits;
    return replacement > 0 || latin / chars.length > 0.45 || symbol / chars.length > 0.35 || uniqueRatio < 0.22;
  }).length;
}

function countTermHits(text, terms) {
  return terms.reduce((sum, termText) => sum + countCompactTerm(text, termText), 0);
}

export function scoreOcrCandidate({ parsed, candidate, topic, pageId, terminology }) {
  const text = parsed?.text ?? '';
  const compact = compactText(text);
  const charCount = [...compact].length;
  const hanCount = countHanChars(compact);
  const latinNoiseCount = countChars(latinNoiseText(compact), (char) => /[A-Za-z]/u.test(char));
  const digitCount = countChars(compact, (char) => /\d/u.test(char));
  const readablePunctuation = new Set([...`，。！？、：；「」『』（）《》〈〉…—-·,.!?;:()[]`]);
  const symbolNoiseCount = countChars(compact, (char) => (
    !/\p{Script=Han}/u.test(char)
    && !/[A-Za-z]/u.test(char)
    && !/\d/u.test(char)
    && !readablePunctuation.has(char)
  ));
  const traditionalSignalCount = countTraditionalSignalChars(compact);
  const simplifiedSignalCount = countSimplifiedSignalChars(compact);
  const signalTotal = traditionalSignalCount + simplifiedSignalCount;
  const { topicKeywords, glossaryTerms, sample } = scoringTerms({ topic, pageId, terminology });
  const topicKeywordHits = countTermHits(text, topicKeywords);
  const glossaryHits = countTermHits(text, glossaryTerms);
  const expectedPhraseHits = sample ? countTermHits(text, sample.expectedPhrases) : 0;
  const longGibberishRunCount = countLongGibberishRuns(text);
  const confidence = Number.isFinite(parsed?.confidence) ? parsed.confidence : null;
  const confidenceScore = confidence === null ? 0 : Math.max(0, Math.min(100, confidence)) / 100;
  const chineseCharRatio = charCount > 0 ? hanCount / charCount : 0;
  const traditionalCharacterRatio = signalTotal > 0 ? traditionalSignalCount / signalTotal : null;
  const simplifiedCharacterRatio = signalTotal > 0 ? simplifiedSignalCount / signalTotal : null;
  const latinNoiseRatio = charCount > 0 ? latinNoiseCount / charCount : 1;
  const digitAndSymbolNoiseRatio = charCount > 0 ? (digitCount + symbolNoiseCount) / charCount : 1;

  let score = 0;
  score += confidenceScore * 18;
  score += chineseCharRatio * 42;
  score += Math.min(topicKeywordHits, 5) * 5;
  score += Math.min(glossaryHits, 8) * 4;
  score += expectedPhraseHits * 18;
  if (traditionalCharacterRatio !== null) {
    score += traditionalCharacterRatio * 8;
    score -= simplifiedCharacterRatio * 2;
  }
  score -= latinNoiseRatio * 34;
  score -= digitAndSymbolNoiseRatio * 28;
  score -= longGibberishRunCount * 9;
  if (charCount === 0) {
    score -= 35;
  } else if (charCount < 8) {
    score -= 12;
  }
  if (parsed?.layoutStatus !== 'ok') {
    score -= 40;
  }

  const reviewReasons = [];
  if (parsed?.layoutStatus !== 'ok') {
    reviewReasons.push(parsed?.failureReason ?? 'ocr_candidate_not_ok');
  }
  if (charCount === 0) {
    reviewReasons.push('empty_text');
  }
  if (chineseCharRatio < 0.35) {
    reviewReasons.push('low_chinese_character_ratio');
  }
  if (latinNoiseRatio > 0.28) {
    reviewReasons.push('high_latin_noise_ratio');
  }
  if (digitAndSymbolNoiseRatio > 0.35) {
    reviewReasons.push('high_digit_symbol_noise_ratio');
  }
  if (longGibberishRunCount > 0) {
    reviewReasons.push('long_gibberish_runs');
  }
  if (sample && expectedPhraseHits === 0) {
    reviewReasons.push('calibration_terms_not_found');
  }

  return {
    channel: candidate.channel,
    languages: candidate.languages,
    psm: candidate.psm,
    score: Number(score.toFixed(2)),
    metrics: {
      confidence,
      charCount,
      chineseCharRatio: Number(chineseCharRatio.toFixed(3)),
      traditionalCharacterRatio: traditionalCharacterRatio === null ? null : Number(traditionalCharacterRatio.toFixed(3)),
      simplifiedCharacterRatio: simplifiedCharacterRatio === null ? null : Number(simplifiedCharacterRatio.toFixed(3)),
      latinNoiseRatio: Number(latinNoiseRatio.toFixed(3)),
      digitAndSymbolNoiseRatio: Number(digitAndSymbolNoiseRatio.toFixed(3)),
      topicKeywordHits,
      glossaryHits,
      expectedPhraseHits,
      longGibberishRunCount,
    },
    reviewReasons,
  };
}

export function selectBestOcrCandidate(candidates) {
  return [...candidates].sort((a, b) => (
    b.score.score - a.score.score
    || (b.layout.wordCount ?? 0) - (a.layout.wordCount ?? 0)
    || (b.layout.confidence ?? -1) - (a.layout.confidence ?? -1)
  ))[0] ?? null;
}

async function inspectSourceOcrIndex(sourceOcrIndexPath) {
  if (!(await pathExists(sourceOcrIndexPath))) {
    return {
      path: relativePath(sourceOcrIndexPath),
      exists: false,
      topicCount: 0,
      pageCount: 0,
      pageKeys: [],
      hasPageNumber: false,
      hasImagePath: false,
      hasText: false,
      textFieldNames: [],
      hasConfidence: false,
      hasCoordinateData: false,
      layoutIndicatorsFound: [],
    };
  }

  const source = JSON.parse(await readFile(sourceOcrIndexPath, 'utf8'));
  const pages = (source.topics ?? []).flatMap((topic) => topic.pages ?? []);
  const pageKeys = [...new Set(pages.flatMap((page) => Object.keys(page)))].sort();
  const layoutIndicators = ['bbox', 'boundingBox', 'blocks', 'lines', 'words', 'layout', 'tsvRows'];
  const layoutIndicatorsFound = layoutIndicators.filter((field) => pages.some((page) => field in page));
  const textFieldNames = ['text', 'ocrText'].filter((field) => pages.some((page) => typeof page[field] === 'string'));

  return {
    path: relativePath(sourceOcrIndexPath),
    exists: true,
    topicCount: source.topics?.length ?? 0,
    pageCount: pages.length,
    pageKeys,
    hasPageNumber: pages.length > 0 && pages.every((page) => Number.isFinite(page.pageNumber)),
    hasImagePath: pages.length > 0 && pages.every((page) => typeof page.imagePath === 'string' && page.imagePath.length > 0),
    hasText: pages.length > 0 && pages.every((page) => typeof page.text === 'string' || typeof page.ocrText === 'string'),
    textFieldNames,
    hasConfidence: pages.length > 0 && pages.every((page) => page.confidence === null || Number.isFinite(page.confidence)),
    hasCoordinateData: layoutIndicatorsFound.length > 0,
    layoutIndicatorsFound,
  };
}

function parseTsvRows(tsvText) {
  const lines = tsvText.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    return [];
  }

  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const columns = line.split('\t');
    const row = {};
    for (let index = 0; index < header.length; index += 1) {
      row[header[index]] = columns[index] ?? '';
    }
    return row;
  });
}

function sortBlocks(a, b) {
  return a.blockNumber - b.blockNumber;
}

function sortLines(a, b) {
  return a.paragraphNumber - b.paragraphNumber || a.lineNumber - b.lineNumber;
}

function sortWords(a, b) {
  return a.wordNumber - b.wordNumber || a.bbox.left - b.bbox.left || a.bbox.top - b.bbox.top;
}

export function parseTsvLayout(tsvText) {
  const rows = parseTsvRows(tsvText);
  const pageRow = rows.find((row) => Number(row.level) === 1);
  const blockRows = new Map();
  const lineRows = new Map();
  const blockMap = new Map();

  for (const row of rows) {
    const level = Number(row.level);
    const blockNumber = Number(row.block_num);
    const paragraphNumber = Number(row.par_num);
    const lineNumber = Number(row.line_num);

    if (level === 2 && blockNumber > 0) {
      blockRows.set(blockNumber, row);
    }
    if (level === 4 && blockNumber > 0 && lineNumber > 0) {
      lineRows.set(`${blockNumber}:${paragraphNumber}:${lineNumber}`, row);
    }
  }

  for (const row of rows) {
    if (Number(row.level) !== 5) {
      continue;
    }

    const text = String(row.text ?? '').trim();
    const bbox = bboxFromRow(row);
    if (!text || !bbox) {
      continue;
    }

    const blockNumber = Number(row.block_num);
    const paragraphNumber = Number(row.par_num);
    const lineNumber = Number(row.line_num);
    const wordNumber = Number(row.word_num);
    const blockRow = blockRows.get(blockNumber);
    const lineRow = lineRows.get(`${blockNumber}:${paragraphNumber}:${lineNumber}`);
    const confidence = numberOrNull(row.conf);
    const word = {
      wordNumber,
      text,
      bbox,
      confidence: confidence !== null && confidence >= 0 ? confidence : null,
    };

    if (!blockMap.has(blockNumber)) {
      blockMap.set(blockNumber, {
        blockNumber,
        bbox: bboxFromRow(blockRow ?? row),
        text: '',
        confidence: null,
        lines: new Map(),
      });
    }

    const block = blockMap.get(blockNumber);
    const lineKey = `${paragraphNumber}:${lineNumber}`;
    if (!block.lines.has(lineKey)) {
      block.lines.set(lineKey, {
        paragraphNumber,
        lineNumber,
        bbox: bboxFromRow(lineRow ?? row),
        text: '',
        confidence: null,
        words: [],
      });
    }

    const line = block.lines.get(lineKey);
    line.words.push(word);
    line.bbox = mergeBbox(line.bbox, bbox);
    block.bbox = mergeBbox(block.bbox, bbox);
  }

  const blocks = [...blockMap.values()].sort(sortBlocks).map((block) => {
    const lines = [...block.lines.values()].sort(sortLines).map((line) => {
      const words = line.words.sort(sortWords);
      const text = words.map((word) => word.text).join(' ');
      return {
        paragraphNumber: line.paragraphNumber,
        lineNumber: line.lineNumber,
        text,
        bbox: line.bbox,
        confidence: average(words.map((word) => word.confidence)),
        words,
      };
    });
    const words = lines.flatMap((line) => line.words);
    return {
      blockNumber: block.blockNumber,
      text: lines.map((line) => line.text).filter(Boolean).join('\n'),
      bbox: block.bbox,
      confidence: average(words.map((word) => word.confidence)),
      lines,
    };
  });
  const lines = blocks.flatMap((block) => block.lines);
  const words = lines.flatMap((line) => line.words);

  return {
    imageSize: bboxFromRow(pageRow),
    text: lines.map((line) => line.text).filter(Boolean).join('\n'),
    confidence: average(words.map((word) => word.confidence)),
    blockCount: blocks.length,
    lineCount: lines.length,
    wordCount: words.length,
    blocks,
  };
}

function uniqueNumbers(values) {
  return [...new Set(values.map(Number).filter(Number.isFinite))];
}

function buildOcrCandidates(options = {}) {
  const horizontalPsms = uniqueNumbers(options.horizontalPsms ?? defaultHorizontalPsms);
  const verticalPsms = uniqueNumbers(options.verticalPsms ?? defaultVerticalPsms);
  return [
    ...horizontalPsms.map((psm) => ({
      channel: 'horizontal',
      purpose: 'horizontal Chinese and Latin text',
      languages: horizontalLanguages,
      psm,
    })),
    ...verticalPsms.map((psm) => ({
      channel: 'vertical',
      purpose: 'vertical Traditional/Simplified Chinese text',
      languages: verticalLanguages,
      psm,
    })),
  ];
}

function runPageLayoutOcr({ command, candidate, imagePath, env, pageTimeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(command, [
      imagePath,
      'stdout',
      '-l',
      candidate.languages.join('+'),
      '--psm',
      String(candidate.psm),
      'tsv',
    ], {
      cwd: rootDir,
      env,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, pageTimeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        text: '',
        confidence: null,
        layoutStatus: 'failed',
        failureReason: error.message,
        imageSize: null,
        blockCount: 0,
        lineCount: 0,
        wordCount: 0,
        blocks: [],
        candidate,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({
          text: '',
          confidence: null,
          layoutStatus: 'failed',
          failureReason: `page_ocr_timeout_${pageTimeoutMs}ms`,
          imageSize: null,
          blockCount: 0,
          lineCount: 0,
          wordCount: 0,
          blocks: [],
          candidate,
        });
        return;
      }

      if (code !== 0 && !stdout.startsWith('level\t')) {
        resolve({
          text: '',
          confidence: null,
          layoutStatus: 'failed',
          failureReason: (stderr || stdout || 'Tesseract OCR failed.').trim(),
          imageSize: null,
          blockCount: 0,
          lineCount: 0,
          wordCount: 0,
          blocks: [],
          candidate,
        });
        return;
      }

      const parsed = parseTsvLayout(stdout);
      resolve({
        ...parsed,
        layoutStatus: parsed.wordCount > 0 ? 'ok' : 'empty',
        failureReason: parsed.wordCount > 0 ? null : 'OCR completed but returned no word boxes.',
        candidate,
      });
    });
  });
}

function createFailedPage({ topic, imagePath, pageNumber, reason, status = 'failed' }) {
  const pageId = pageIdFromImagePath(imagePath);
  return {
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: topic.sourceLabel ?? topic.source ?? null,
    pageRange: topic.range ?? topic.pageRange ?? null,
    pageId,
    pageNumber,
    imagePath,
    text: '',
    imageSize: null,
    confidence: null,
    layoutStatus: status,
    failureReason: reason,
    ocrSelection: null,
    candidateScores: [],
    ocrScore: null,
    scoreMetrics: null,
    needs_image_review: true,
    reviewReasons: [reason],
    blockCount: 0,
    lineCount: 0,
    wordCount: 0,
    blocks: [],
  };
}

function summarizeCandidate(candidateResult) {
  const failureReason = candidateResult.layout.failureReason ?? null;
  return {
    channel: candidateResult.score.channel,
    languages: candidateResult.score.languages,
    psm: candidateResult.score.psm,
    layoutStatus: candidateResult.layout.layoutStatus,
    failureReason,
    score: candidateResult.score.score,
    metrics: candidateResult.score.metrics,
    reviewReasons: candidateResult.score.reviewReasons,
    blockCount: candidateResult.layout.blockCount,
    lineCount: candidateResult.layout.lineCount,
    wordCount: candidateResult.layout.wordCount,
  };
}

function selectedPageFromCandidate({ topic, page, best, candidates }) {
  if (!best) {
    return createFailedPage({
      topic,
      imagePath: page.imagePath,
      pageNumber: page.pageNumber,
      reason: 'no_ocr_candidates_returned',
    });
  }

  const needsReview = best.layout.layoutStatus !== 'ok' || best.score.score < lowOcrScoreThreshold;
  const reviewReasons = [...new Set([
    ...(best.score.reviewReasons ?? []),
    ...(best.score.score < lowOcrScoreThreshold ? ['low_ocr_score'] : []),
  ])];

  return {
    ...page,
    text: best.layout.text,
    imageSize: best.layout.imageSize,
    confidence: best.layout.confidence,
    layoutStatus: best.layout.layoutStatus,
    failureReason: best.layout.failureReason,
    blockCount: best.layout.blockCount,
    lineCount: best.layout.lineCount,
    wordCount: best.layout.wordCount,
    blocks: best.layout.blocks,
    ocrSelection: {
      channel: best.score.channel,
      languages: best.score.languages,
      psm: best.score.psm,
      purpose: best.layout.candidate.purpose,
    },
    candidateScores: candidates.map(summarizeCandidate),
    ocrScore: best.score.score,
    scoreMetrics: best.score.metrics,
    needs_image_review: needsReview,
    reviewReasons,
  };
}

function calibrationSampleSummaries(topics) {
  const pagesById = new Map();
  for (const topic of topics) {
    for (const page of topic.pages ?? []) {
      if (page.pageId) {
        pagesById.set(page.pageId, { topic, page });
      }
    }
  }

  return calibrationSamples.map((sample) => {
    const found = pagesById.get(sample.pageId);
    const text = found?.page?.text ?? '';
    const matchedPhrases = sample.expectedPhrases.filter((phrase) => countCompactTerm(text, phrase) > 0);
    return {
      pageId: sample.pageId,
      topicId: found?.topic?.topicId ?? null,
      displayTitle: found?.topic?.displayTitle ?? null,
      imagePath: found?.page?.imagePath ?? null,
      expectedPhrases: sample.expectedPhrases,
      matchedPhrases,
      missingPhrases: sample.expectedPhrases.filter((phrase) => !matchedPhrases.includes(phrase)),
      selectedChannel: found?.page?.ocrSelection?.channel ?? null,
      selectedPsm: found?.page?.ocrSelection?.psm ?? null,
      ocrScore: found?.page?.ocrScore ?? null,
      needs_image_review: found?.page?.needs_image_review ?? true,
    };
  });
}

function buildOutput({ pageMap, pageMapPath, sourceOcrInspection, outputPath, tool, canRunOcr, topics, terminologyPath, ocrCandidates }) {
  const failedPages = [];
  const reviewPages = [];
  const topicPageCounts = [];

  for (const topic of topics) {
    const successfulPages = topic.pages.filter((page) => page.layoutStatus === 'ok').length;
    const failedPageCount = topic.pages.filter((page) => page.layoutStatus !== 'ok').length;
    const needsImageReviewPageCount = topic.pages.filter((page) => page.needs_image_review).length;
    topic.successfulPageCount = successfulPages;
    topic.layoutStatus = topic.pages.length === 0
      ? 'skipped'
      : successfulPages === topic.pages.length ? 'ok' : successfulPages > 0 ? 'partial' : 'failed';

    topicPageCounts.push({
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      expectedPageCount: topic.expectedPageCount,
      successfulPageCount: successfulPages,
      failedPageCount,
      needsImageReviewPageCount,
    });

    for (const page of topic.pages) {
      if (page.layoutStatus !== 'ok') {
        failedPages.push({
          topicId: topic.topicId,
          displayTitle: topic.displayTitle,
          pageNumber: page.pageNumber,
          imagePath: page.imagePath,
          layoutStatus: page.layoutStatus,
          reason: page.failureReason,
        });
      }
      if (page.needs_image_review) {
        reviewPages.push({
          topicId: topic.topicId,
          displayTitle: topic.displayTitle,
          pageId: page.pageId,
          pageNumber: page.pageNumber,
          imagePath: page.imagePath,
          ocrScore: page.ocrScore,
          selectedChannel: page.ocrSelection?.channel ?? null,
          selectedPsm: page.ocrSelection?.psm ?? null,
          reasons: page.reviewReasons ?? [],
        });
      }
    }
  }

  const successfulPageCount = topics.reduce((sum, topic) => sum + topic.successfulPageCount, 0);
  const totalPageCount = topics.reduce((sum, topic) => sum + topic.pages.length, 0);

  return {
    schemaVersion: 2,
    stage: '6F-1',
    generatedAt: new Date().toISOString(),
    seriesId: pageMap.seriesId ?? 'cells-at-work',
    sourceOcrIndexPath: sourceOcrInspection.path,
    sourceOcrInspection,
    pageMapPath: relativePath(pageMapPath),
    terminologyPath: terminologyPath ? relativePath(terminologyPath) : null,
    outputPolicy: {
      privateOutputPath: relativePath(outputPath),
      containsFullOcrText: true,
      publicOutputWritten: false,
      pageMapModified: false,
      manualTopicRangesModified: false,
      manifestModified: false,
      terminologyModified: false,
      forbiddenPublicDirectories: [...forbiddenOutputRoots].map((item) => `${item}/`),
    },
    ocrTool: {
      ...tool,
      outputFormat: 'tesseract-tsv-derived-json',
      requiredLanguages,
      horizontalChannel: {
        languages: horizontalLanguages,
        psms: ocrCandidates.filter((candidate) => candidate.channel === 'horizontal').map((candidate) => candidate.psm),
      },
      verticalChannel: {
        languages: verticalLanguages,
        psms: ocrCandidates.filter((candidate) => candidate.channel === 'vertical').map((candidate) => candidate.psm),
      },
      scoring: {
        thresholdForNeedsImageReview: lowOcrScoreThreshold,
        factors: [
          'tesseract confidence',
          'Chinese character ratio',
          'Traditional/Simplified signal ratio',
          'Latin noise ratio',
          'digit and symbol noise ratio',
          'topic keyword hits',
          'terminology hits',
          'long gibberish run penalty',
        ],
      },
      coordinateSystem: 'pixel coordinates from source page image, origin top-left, bbox={left,top,width,height}',
      layoutLevels: ['page', 'block', 'line', 'word'],
    },
    ocrRunStatus: canRunOcr
      ? failedPages.length > 0 ? 'completed_with_page_failures' : reviewPages.length > 0 ? 'completed_with_review_flags' : 'ok'
      : 'blocked_missing_dependency',
    topicCount: topics.length,
    successfulTopicCount: topics.filter((topic) => topic.layoutStatus === 'ok').length,
    pageCount: totalPageCount,
    successfulPageCount,
    failedPages,
    needsImageReviewPages: reviewPages,
    calibrationSamples: calibrationSampleSummaries(topics),
    topicPageCounts,
    topics,
  };
}

export async function runWorkCellsOcrLayout(options = {}) {
  const pageMapPath = path.resolve(rootDir, options.pageMapPath ?? defaultPageMapPath);
  const sourceOcrIndexPath = path.resolve(rootDir, options.sourceOcrIndexPath ?? defaultSourceOcrIndexPath);
  const outputPath = path.resolve(rootDir, options.outputPath ?? defaultOutputPath);
  const ocrCommand = options.ocrCommand ?? 'tesseract';
  const tessdataDirectory = path.resolve(rootDir, options.tessdataDirectory ?? defaultTessdataDirectory);
  const terminologyPath = path.resolve(rootDir, options.terminologyPath ?? defaultTerminologyPath);
  const ocrEnv = existsSync(tessdataDirectory)
    ? { ...process.env, TESSDATA_PREFIX: tessdataDirectory }
    : process.env;
  const pageTimeoutMs = Number(options.pageTimeoutMs ?? defaultPageTimeoutMs);
  const ocrCandidates = buildOcrCandidates(options);
  const onlyPageIds = parsePageIds(options.pageIds);
  const concurrency = Math.max(1, Number(options.concurrency ?? Math.min(2, Math.max(1, os.cpus().length - 1))));

  assertInsideRoot(pageMapPath, `Page map must stay inside project root: ${pageMapPath}`);
  assertInsideRoot(sourceOcrIndexPath, `Source OCR index must stay inside project root: ${sourceOcrIndexPath}`);
  assertInsideRoot(terminologyPath, `Terminology file must stay inside project root: ${terminologyPath}`);
  assertPrivateOutputPath(outputPath);

  const pageMap = JSON.parse(await readFile(pageMapPath, 'utf8'));
  const sourceOcrInspection = await inspectSourceOcrIndex(sourceOcrIndexPath);
  const terminology = await readJsonIfExists(terminologyPath);
  const tool = detectTesseract(ocrCommand, ocrEnv);
  const canRunOcr = tool.available && tool.languageCheck.canRunDualChannel;
  const topics = [];
  const tasks = [];

  async function writeCurrentOutput() {
    const output = buildOutput({
      pageMap,
      pageMapPath,
      sourceOcrInspection,
      outputPath,
      tool,
      canRunOcr,
      topics,
      terminologyPath: terminology ? terminologyPath : null,
      ocrCandidates,
    });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    return output;
  }

  for (const [topicIndex, topic] of (pageMap.topics ?? []).entries()) {
    const pages = [];
    for (const [index, imagePath] of (topic.pageImagePaths ?? []).entries()) {
      const pageId = pageIdFromImagePath(imagePath);
      if (onlyPageIds && !onlyPageIds.has(pageId)) {
        continue;
      }

      const pageNumber = parsePageNumber(imagePath, topic.startPage + index);
      const absoluteImagePath = path.resolve(rootDir, imagePath);
      assertInsideRoot(absoluteImagePath, `Page image must stay inside project root: ${imagePath}`);

      const page = {
        topicId: topic.topicId,
        displayTitle: topic.displayTitle,
        source: topic.sourceLabel ?? null,
        pageRange: topic.range,
        pageId,
        pageNumber,
        imagePath,
        text: '',
        imageSize: null,
        confidence: null,
        layoutStatus: 'pending',
        failureReason: null,
        ocrSelection: null,
        candidateScores: [],
        ocrScore: null,
        scoreMetrics: null,
        needs_image_review: false,
        reviewReasons: [],
        blockCount: 0,
        lineCount: 0,
        wordCount: 0,
        blocks: [],
      };

      if (!(await pathExists(absoluteImagePath))) {
        Object.assign(page, createFailedPage({ topic, imagePath, pageNumber, reason: 'page_image_missing' }));
      } else if (!canRunOcr) {
        Object.assign(page, createFailedPage({
          topic,
          imagePath,
          pageNumber,
          reason: tool.available ? 'required_chinese_language_data_missing' : 'ocr_tool_missing',
        }));
      } else {
        tasks.push({ topicIndex, pageIndex: pages.length, absoluteImagePath });
      }

      pages.push(page);
    }

    topics.push({
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      source: topic.sourceLabel ?? null,
      pageRange: topic.range,
      expectedPageCount: onlyPageIds ? pages.length : topic.pageImagePaths?.length ?? 0,
      successfulPageCount: 0,
      layoutStatus: pages.some((page) => page.layoutStatus === 'pending') ? 'pending' : 'failed',
      pages,
    });
  }

  if (canRunOcr) {
    let cursor = 0;
    let completed = 0;
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (cursor < tasks.length) {
        const task = tasks[cursor];
        cursor += 1;
        const page = topics[task.topicIndex].pages[task.pageIndex];
        const topic = topics[task.topicIndex];
        const candidateResults = await Promise.all(ocrCandidates.map(async (candidate) => {
          const layout = await runPageLayoutOcr({
            command: tool.command,
            candidate,
            imagePath: task.absoluteImagePath,
            env: ocrEnv,
            pageTimeoutMs,
          });
          return {
            layout,
            score: scoreOcrCandidate({
              parsed: layout,
              candidate,
              topic,
              pageId: page.pageId,
              terminology,
            }),
          };
        }));
        const best = selectBestOcrCandidate(candidateResults);
        Object.assign(page, selectedPageFromCandidate({
          topic,
          page,
          best,
          candidates: candidateResults,
        }));
        completed += 1;
        if (completed % 25 === 0) {
          await writeCurrentOutput();
          console.log(`Layout OCR pages completed: ${completed}/${tasks.length}`);
        }
      }
    });
    await Promise.all(workers);
  }

  return writeCurrentOutput();
}

function parseCliArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--page-map') {
      options.pageMapPath = args[++index];
    } else if (arg === '--source-ocr') {
      options.sourceOcrIndexPath = args[++index];
    } else if (arg === '--output') {
      options.outputPath = args[++index];
    } else if (arg === '--ocr-command') {
      options.ocrCommand = args[++index];
    } else if (arg === '--tessdata-dir') {
      options.tessdataDirectory = args[++index];
    } else if (arg === '--terminology') {
      options.terminologyPath = args[++index];
    } else if (arg === '--concurrency') {
      options.concurrency = Number(args[++index]);
    } else if (arg === '--page-timeout-ms') {
      options.pageTimeoutMs = Number(args[++index]);
    } else if (arg === '--horizontal-psm') {
      options.horizontalPsms = String(args[++index]).split(',').map(Number);
    } else if (arg === '--vertical-psm') {
      options.verticalPsms = String(args[++index]).split(',').map(Number);
    } else if (arg === '--page-ids') {
      options.pageIds = args[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/work-cells-ocr-layout.mjs [options]

Options:
  --page-map <file>     Default: data/cells-at-work/page-map.json
  --source-ocr <file>   Default: data-private/cells-at-work/ocr/topic-ocr-index.json
  --output <file>       Default: data-private/cells-at-work/ocr-layout-v2/topic-page-blocks-v2.json
  --ocr-command <cmd>   Default: tesseract
  --tessdata-dir <dir>  Default: data-private/cells-at-work/tessdata when present
  --terminology <file>  Default: data-private/cells-at-work/terminology.zh-Hans.json
  --concurrency <n>     Default: CPU count minus one, capped at 2
  --page-timeout-ms <n> Default: 45000
  --horizontal-psm <n>  Comma-separated PSMs. Default: 6,7,11
  --vertical-psm <n>    Comma-separated PSMs. Default: 5
  --page-ids <ids>      Optional comma-separated calibration subset, e.g. v03_page-099,v06_page-042

Writes private v2 Tesseract TSV-derived JSON with page/block/line/word boxes and selected channel scoring.`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runWorkCellsOcrLayout(options);
    console.log(`Layout OCR run status: ${result.ocrRunStatus}`);
    console.log(`OCR tool: ${result.ocrTool.available ? result.ocrTool.version : `${result.ocrTool.command} missing`}`);
    console.log(`Required OCR languages installed: ${result.ocrTool.languageCheck.installedRequiredLanguages.join(', ') || 'none'}`);
    console.log(`Horizontal OCR: ${result.ocrTool.horizontalChannel.languages.join('+')} PSM ${result.ocrTool.horizontalChannel.psms.join('/')}`);
    console.log(`Vertical OCR: ${result.ocrTool.verticalChannel.languages.join('+')} PSM ${result.ocrTool.verticalChannel.psms.join('/')}`);
    console.log(`Layout OCR data: ${result.outputPolicy.privateOutputPath}`);
    console.log(`Successful topics: ${result.successfulTopicCount}/${result.topicCount}`);
    console.log(`Successful pages: ${result.successfulPageCount}/${result.pageCount}`);
    console.log(`Failed pages: ${result.failedPages.length}`);
    console.log(`Needs image review pages: ${result.needsImageReviewPages.length}`);
    console.log('Calibration samples:');
    for (const sample of result.calibrationSamples) {
      console.log(`- ${sample.pageId}: matched ${sample.matchedPhrases.join(', ') || 'none'}; missing ${sample.missingPhrases.join(', ') || 'none'}; selected ${sample.selectedChannel ?? 'none'} PSM ${sample.selectedPsm ?? 'n/a'}`);
    }
    if (result.ocrTool.missingDependencies.length > 0) {
      console.log('Missing dependencies:');
      for (const dependency of result.ocrTool.missingDependencies) {
        console.log(`- ${dependency.name}: ${dependency.installSuggestion}`);
      }
    }
    if (result.ocrRunStatus === 'blocked_missing_dependency') {
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
