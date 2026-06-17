import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultPageMapPath = path.join(rootDir, 'data', 'cells-at-work', 'page-map.json');
const defaultOutputPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr', 'topic-ocr-index.json');
const defaultTessdataDirectory = path.join(rootDir, 'data-private', 'cells-at-work', 'tessdata');
const forbiddenOutputRoots = new Set(['public', 'dist', 'build', 'docs']);
const preferredLanguages = ['chi_sim', 'chi_tra', 'eng'];
const defaultPageTimeoutMs = 45000;

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
    throw new Error(`Refusing to write OCR text into a public/deployable directory: ${relative}`);
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

function parsePageNumber(imagePath, fallback) {
  const match = String(imagePath).match(/page-(\d+)\.[a-z0-9]+$/i);
  return match ? Number(match[1]) : fallback;
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
      missingDependencies: [{
        type: 'ocr_tool',
        name: command,
        reason: 'Tesseract OCR was not found on PATH.',
        installSuggestion: 'Install Tesseract OCR, then install chi_sim and chi_tra traineddata language packs and ensure tesseract is on PATH.',
      }],
    };
  }

  const listed = spawnSync(resolvedCommand, ['--list-langs'], { cwd: rootDir, encoding: 'utf8', shell: false, env });
  const languages = listed.status === 0
    ? listed.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.includes('List of available languages'))
    : [];
  const languageSet = new Set(languages);
  const selectedLanguages = preferredLanguages.filter((language) => languageSet.has(language));
  const missingDependencies = [];

  for (const language of ['chi_sim', 'chi_tra']) {
    if (!languageSet.has(language)) {
      missingDependencies.push({
        type: 'ocr_language_data',
        name: language,
        reason: `${language} traineddata is not installed for Tesseract.`,
        installSuggestion: `Install the Tesseract ${language} traineddata file into the tessdata directory.`,
      });
    }
  }

  return {
    available: true,
    command: resolvedCommand,
    version: version.stdout.split(/\r?\n/)[0] ?? null,
    languages,
    selectedLanguages,
    missingDependencies,
  };
}

function parseTsv(tsvText) {
  const lines = tsvText.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    return { text: '', confidence: null };
  }

  const header = lines[0].split('\t');
  const textIndex = header.indexOf('text');
  const confidenceIndex = header.indexOf('conf');
  const words = [];
  const confidences = [];

  for (const line of lines.slice(1)) {
    const columns = line.split('\t');
    const text = (columns[textIndex] ?? '').trim();
    const confidence = Number(columns[confidenceIndex]);
    if (text) {
      words.push(text);
    }
    if (Number.isFinite(confidence) && confidence >= 0) {
      confidences.push(confidence);
    }
  }

  return {
    text: words.join('\n'),
    confidence: confidences.length > 0
      ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(2))
      : null,
  };
}

function runPageOcr({ command, languages, imagePath, env, pageTimeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(command, [imagePath, 'stdout', '-l', languages.join('+'), '--psm', '6', 'tsv'], {
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
        ocrText: '',
        confidence: null,
        ocrStatus: 'failed',
        failureReason: error.message,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({
          ocrText: '',
          confidence: null,
          ocrStatus: 'failed',
          failureReason: `page_ocr_timeout_${pageTimeoutMs}ms`,
        });
        return;
      }

      if (code !== 0) {
        if (stdout.startsWith('level\t')) {
          const parsed = parseTsv(stdout);
          if (parsed.text) {
            resolve({
              ocrText: parsed.text,
              confidence: parsed.confidence,
              ocrStatus: 'ok',
              failureReason: null,
            });
            return;
          }
        }
        resolve({
          ocrText: '',
          confidence: null,
          ocrStatus: 'failed',
          failureReason: (stderr || stdout || 'Tesseract OCR failed.').trim(),
        });
        return;
      }

      const parsed = parseTsv(stdout);
      resolve({
        ocrText: parsed.text,
        confidence: parsed.confidence,
        ocrStatus: parsed.text ? 'ok' : 'empty',
        failureReason: parsed.text ? null : 'OCR completed but returned no text.',
      });
    });
  });
}

function runPageOcrSync({ command, languages, imagePath, env, pageTimeoutMs }) {
  const result = spawnSync(command, [imagePath, 'stdout', '-l', languages.join('+'), '--psm', '6', 'tsv'], {
    cwd: rootDir,
    env,
    encoding: 'utf8',
    shell: false,
    timeout: pageTimeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    return {
      ocrText: '',
      confidence: null,
      ocrStatus: 'failed',
      failureReason: result.error.message,
    };
  }

  if (result.status !== 0) {
    return {
      ocrText: '',
      confidence: null,
      ocrStatus: 'failed',
      failureReason: (result.stderr || result.stdout || 'Tesseract OCR failed.').trim(),
    };
  }

  const parsed = parseTsv(result.stdout);
  return {
    ocrText: parsed.text,
    confidence: parsed.confidence,
    ocrStatus: parsed.text ? 'ok' : 'empty',
    failureReason: parsed.text ? null : 'OCR completed but returned no text.',
  };
}

function buildOutput({ pageMap, pageMapPath, outputPath, tool, canRunOcr, topics }) {
  const failedPages = [];
  const qualityWarnings = [];

  for (const topic of topics) {
    for (const page of topic.pages) {
      if (page.ocrStatus !== 'ok') {
        failedPages.push({
          topicId: topic.topicId,
          displayTitle: topic.displayTitle,
          pageNumber: page.pageNumber,
          imagePath: page.imagePath,
          ocrStatus: page.ocrStatus,
          reason: page.failureReason,
        });
      }
    }

    const emptyPages = topic.pages.filter((page) => !page.ocrText.trim()).length;
    const lowConfidencePages = topic.pages.filter((page) => Number.isFinite(page.confidence) && page.confidence < 45).length;
    if (emptyPages > 0 || lowConfidencePages > 0) {
      qualityWarnings.push({
        topicId: topic.topicId,
        displayTitle: topic.displayTitle,
        emptyPages,
        lowConfidencePages,
      });
    }
  }

  const topicPageCounts = topics.map((topic) => {
    const successfulPages = topic.pages.filter((page) => page.ocrStatus === 'ok').length;
    return {
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      expectedPageCount: topic.expectedPageCount,
      ocrPageCount: successfulPages,
      failedPageCount: topic.pages.filter((page) => page.ocrStatus !== 'ok').length,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    seriesId: pageMap.seriesId ?? 'cells-at-work',
    pageMapPath: relativePath(pageMapPath),
    outputPolicy: {
      privateOutputPath: relativePath(outputPath),
      fullOcrTextPubliclyAccessible: false,
      forbiddenPublicDirectories: [...forbiddenOutputRoots].map((item) => `${item}/`),
    },
    ocrTool: tool,
    ocrRunStatus: canRunOcr
      ? failedPages.length === 0 ? 'ok' : 'completed_with_page_failures'
      : 'blocked_missing_dependency',
    topicCount: topics.length,
    successfulTopicCount: topics.filter((topic) => topic.ocrStatus === 'ok').length,
    failedPages,
    qualityWarnings,
    topicPageCounts,
    topics,
  };
}

function createFailedPage({ topic, imagePath, pageNumber, reason, status = 'failed' }) {
  return {
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: topic.sourceLabel ?? null,
    pageRange: topic.range,
    pageNumber,
    imagePath,
    ocrText: '',
    confidence: null,
    ocrStatus: status,
    failureReason: reason,
  };
}

export async function runWorkCellsTopicOcr(options = {}) {
  const pageMapPath = path.resolve(rootDir, options.pageMapPath ?? defaultPageMapPath);
  const outputPath = path.resolve(rootDir, options.outputPath ?? defaultOutputPath);
  const ocrCommand = options.ocrCommand ?? 'tesseract';
  const tessdataDirectory = path.resolve(rootDir, options.tessdataDirectory ?? defaultTessdataDirectory);
  const ocrEnv = existsSync(tessdataDirectory)
    ? { ...process.env, TESSDATA_PREFIX: tessdataDirectory }
    : process.env;
  const pageTimeoutMs = Number(options.pageTimeoutMs ?? defaultPageTimeoutMs);
  const concurrency = Math.max(1, Number(options.concurrency ?? Math.min(6, Math.max(1, os.cpus().length - 1))));

  assertInsideRoot(pageMapPath, `Page map must stay inside project root: ${pageMapPath}`);
  assertPrivateOutputPath(outputPath);

  const pageMap = JSON.parse(await readFile(pageMapPath, 'utf8'));
  const existingPagesByKey = new Map();
  if (await pathExists(outputPath)) {
    try {
      const existingOutput = JSON.parse(await readFile(outputPath, 'utf8'));
      for (const topic of existingOutput.topics ?? []) {
        for (const page of topic.pages ?? []) {
          if (page.ocrStatus === 'ok') {
            existingPagesByKey.set(`${page.topicId}:${page.imagePath}`, page);
          }
        }
      }
    } catch {
      existingPagesByKey.clear();
    }
  }
  const tool = detectTesseract(ocrCommand, ocrEnv);
  const canRunOcr = tool.available && tool.selectedLanguages.includes('chi_sim') && tool.selectedLanguages.includes('chi_tra');
  const topics = [];
  const tasks = [];

  async function writeCurrentOutput() {
    for (const topic of topics) {
      const successfulPages = topic.pages.filter((page) => page.ocrStatus === 'ok').length;
      const completedPages = topic.pages.filter((page) => page.ocrStatus !== 'pending').length;
      topic.ocrPageCount = successfulPages;
      topic.ocrStatus = completedPages < topic.pages.length
        ? 'pending'
        : successfulPages === topic.pages.length ? 'ok' : successfulPages > 0 ? 'partial' : 'failed';
    }

    const output = buildOutput({ pageMap, pageMapPath, outputPath, tool, canRunOcr, topics });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    return output;
  }

  for (const [topicIndex, topic] of (pageMap.topics ?? []).entries()) {
    const pages = [];
    for (const [index, imagePath] of (topic.pageImagePaths ?? []).entries()) {
      const pageNumber = parsePageNumber(imagePath, topic.startPage + index);
      const absoluteImagePath = path.resolve(rootDir, imagePath);
      assertInsideRoot(absoluteImagePath, `Page image must stay inside project root: ${imagePath}`);

      const page = {
        topicId: topic.topicId,
        displayTitle: topic.displayTitle,
        source: topic.sourceLabel ?? null,
        pageRange: topic.range,
        pageNumber,
        imagePath,
        ocrText: '',
        confidence: null,
        ocrStatus: 'pending',
        failureReason: null,
      };
      const existingPage = existingPagesByKey.get(`${topic.topicId}:${imagePath}`);

      if (existingPage) {
        Object.assign(page, existingPage);
      } else if (!(await pathExists(absoluteImagePath))) {
        Object.assign(page, createFailedPage({ topic, imagePath, pageNumber, reason: 'page_image_missing' }));
      } else if (!canRunOcr) {
        Object.assign(page, createFailedPage({
          topic, imagePath, pageNumber, reason: tool.available ? 'required_chinese_language_data_missing' : 'ocr_tool_missing',
        }));
      } else {
        tasks.push({ topicIndex, pageIndex: index, absoluteImagePath });
      }

      pages.push(page);
    }

    topics.push({
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      source: topic.sourceLabel ?? null,
      pageRange: topic.range,
      expectedPageCount: topic.pageImagePaths?.length ?? 0,
      ocrPageCount: 0,
      ocrStatus: pages.some((page) => page.ocrStatus === 'pending') ? 'pending' : 'failed',
      pages,
    });
  }

  if (canRunOcr) {
    let cursor = 0;
    let completed = 0;
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (cursor < tasks.length) {
        const task = tasks[cursor++];
        const page = topics[task.topicIndex].pages[task.pageIndex];
        const result = await runPageOcr({
          command: tool.command,
          languages: tool.selectedLanguages,
          imagePath: task.absoluteImagePath,
          env: ocrEnv,
          pageTimeoutMs,
        });
        Object.assign(page, result);
        completed += 1;
        if (completed % 25 === 0) {
          await writeCurrentOutput();
          console.log(`OCR pages completed: ${completed}/${tasks.length}`);
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
    } else if (arg === '--output') {
      options.outputPath = args[++index];
    } else if (arg === '--ocr-command') {
      options.ocrCommand = args[++index];
    } else if (arg === '--tessdata-dir') {
      options.tessdataDirectory = args[++index];
    } else if (arg === '--concurrency') {
      options.concurrency = Number(args[++index]);
    } else if (arg === '--page-timeout-ms') {
      options.pageTimeoutMs = Number(args[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/work-cells-topic-ocr.mjs [options]

Options:
  --page-map <file>     Default: data/cells-at-work/page-map.json
  --output <file>       Default: data-private/cells-at-work/ocr/topic-ocr-index.json
  --ocr-command <cmd>   Default: tesseract
  --tessdata-dir <dir>  Default: data-private/cells-at-work/tessdata when present
  --concurrency <n>     Default: CPU count minus one, capped at 6
  --page-timeout-ms <n> Default: 45000

Requires Tesseract OCR with chi_sim and chi_tra language data installed.`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runWorkCellsTopicOcr(options);
    console.log(`OCR run status: ${result.ocrRunStatus}`);
    console.log(`OCR tool: ${result.ocrTool.available ? result.ocrTool.version : `${result.ocrTool.command} missing`}`);
    console.log(`OCR data: ${result.outputPolicy.privateOutputPath}`);
    console.log(`Successful topics: ${result.successfulTopicCount}/${result.topicCount}`);
    console.log(`Failed pages: ${result.failedPages.length}`);
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
