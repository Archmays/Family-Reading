import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(scriptPath), '..');

export const SYNTHETIC_OCR_FIXTURE_PREFIX =
  'tests/fixtures/public-repository-validator/synthetic-ocr/';

const DEFAULT_MAX_FILE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const DEFAULT_MAX_FINDINGS = 200;
const GIT_OUTPUT_LIMIT_BYTES = 64 * 1024 * 1024;

const textExtensions = new Set([
  '.bat',
  '.cjs',
  '.conf',
  '.cfg',
  '.css',
  '.csv',
  '.gitignore',
  '.gitattributes',
  '.htm',
  '.html',
  '.ini',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.key',
  '.kt',
  '.md',
  '.mjs',
  '.pem',
  '.ps1',
  '.py',
  '.rb',
  '.rs',
  '.scss',
  '.sh',
  '.srt',
  '.ssa',
  '.sql',
  '.svg',
  '.toml',
  '.ts',
  '.tsv',
  '.tsx',
  '.txt',
  '.vtt',
  '.webmanifest',
  '.xml',
  '.yaml',
  '.yml',
  '.ass',
]);

const textFileNames = new Set([
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  'dockerfile',
  'makefile',
  'procfile',
]);

const knownBinaryExtensions = new Set([
  '.7z',
  '.aac',
  '.avi',
  '.bin',
  '.bmp',
  '.doc',
  '.docx',
  '.epub',
  '.flac',
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.m4a',
  '.m4v',
  '.mov',
  '.mp3',
  '.mp4',
  '.ogg',
  '.otf',
  '.pdf',
  '.png',
  '.tar',
  '.tif',
  '.tiff',
  '.ttf',
  '.wav',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
  '.xls',
  '.xlsx',
  '.zip',
]);

const contentRules = [
  {
    code: 'WINDOWS_ABSOLUTE_PATH',
    message: 'Tracked text contains a Windows absolute local path.',
    pattern: /(?<![A-Za-z0-9+.-])[A-Za-z]:(?:\\\\|[\\/])(?!(?:[\\/]))(?:[^\\/\s"'`<>]+(?:\\\\|[\\/]))*[^\\/\s"'`<>]*/g,
  },
  {
    code: 'UNIX_HOME_ABSOLUTE_PATH',
    message: 'Tracked text contains a macOS or Linux home-directory absolute path.',
    pattern: /(?<![A-Za-z0-9+.-])\/(?:Users|home|root|Volumes)\/(?![<${%])(?:[^/\s"'`<>]+\/?)+/g,
  },
  {
    code: 'UNIX_TEMP_ABSOLUTE_PATH',
    message: 'Tracked text contains a Unix temporary-directory absolute path.',
    pattern: /(?<![A-Za-z0-9+.-])\/(?:tmp|var\/tmp|private\/tmp)\/(?![<${%])(?:[^/\s"'`<>]+\/?)+/g,
  },
  {
    code: 'UNIX_LOCAL_STATE_PATH',
    message: 'Tracked text contains a Unix machine-local state path.',
    pattern: /(?<![A-Za-z0-9+.-])\/var\/(?:lib|log|cache|run)\/(?![<${%])(?:[^/\s"'`<>]+\/?)+/g,
  },
  {
    code: 'WSL_MOUNTED_HOME_PATH',
    message: 'Tracked text contains a Windows home-directory path mounted through WSL.',
    pattern: /(?<![A-Za-z0-9+.-])\/mnt\/[a-z]\/Users\/(?![<${%])(?:[^/\s"'`<>]+\/?)+/gi,
  },
  {
    code: 'UNC_ABSOLUTE_PATH',
    message: 'Tracked text contains a UNC absolute local path.',
    pattern: new RegExp(
      String.raw`(?<![\\:.A-Za-z0-9])\\{2,4}(?![?.\\])[A-Za-z0-9][A-Za-z0-9.$_-]{1,62}(?:\\{1,2}[A-Za-z0-9$][A-Za-z0-9$._()-]{0,79})+`,
      'gi',
    ),
  },
  {
    code: 'PRIVATE_KEY_MATERIAL',
    message: 'Tracked text contains a private-key header.',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g,
  },
  {
    code: 'KNOWN_SERVICE_TOKEN',
    message: 'Tracked text contains a service-token pattern.',
    pattern: /(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[0-9A-Za-z-]{20,})/g,
  },
  {
    code: 'EMBEDDED_DATA_URL',
    message: 'Tracked text contains an embedded base64 data URL.',
    pattern: /data:[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;[a-z0-9.+-]+=[^;,\s]+)*;base64,[a-z0-9+/]{32,}={0,2}/gi,
  },
];

const genericSecretPatterns = [
  {
    pattern: /(?<![A-Za-z0-9])["']?(?:api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|secret[_-]?key|aws[_-]?secret[_-]?access[_-]?key|password|passwd)["']?\s*[:=]\s*(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s,;#}\]]+))/gi,
    valueIndexes: [1, 2, 3],
  },
  {
    pattern: /(?<![A-Za-z0-9])["']?(?:token|secret)["']?\s*[:=]\s*(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([A-Za-z0-9_./+=-]{8,})(?=[\s,;#}\]]|$))/gi,
    valueIndexes: [1, 2, 3],
  },
];

const sensitiveTokenPatterns = [
  {
    code: 'BEARER_TOKEN',
    message: 'Tracked text contains a non-placeholder bearer token.',
    pattern: /\bBearer\s+([A-Za-z0-9][A-Za-z0-9._~+/-]{7,}=*)/gi,
    valueIndex: 1,
  },
  {
    code: 'JWT_TOKEN',
    message: 'Tracked text contains a JSON Web Token.',
    pattern: /\b(eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{8,})\b/g,
    valueIndex: 1,
  },
];

const placeholderFragments = [
  'change-me',
  'changeme',
  'dummy',
  'example',
  'fake',
  'not-a-real',
  'placeholder',
  'redacted',
  'replace-me',
  'sample',
  'test-only',
  'your-',
  'your_',
];

const allowedWindowsLiteralPartsByFile = new Map([
  [
    'archived/ocr-experiments/scripts/work-cells-ocr-layout.mjs',
    [
      ['C:', 'Program Files', 'Tesseract-OCR', 'tesseract.exe'],
      ['C:', 'Program Files (x86)', 'Tesseract-OCR', 'tesseract.exe'],
    ],
  ],
  [
    'archived/ocr-experiments/scripts/work-cells-topic-ocr.mjs',
    [
      ['C:', 'Program Files', 'Tesseract-OCR', 'tesseract.exe'],
      ['C:', 'Program Files (x86)', 'Tesseract-OCR', 'tesseract.exe'],
    ],
  ],
  [
    'docs/portfolio/fr-p0/fr-p0-final-report.md',
    [
      ['C:', 'Users', 'mays-', '.codex', 'AGENTS.md'],
    ],
  ],
  [
    'docs/portfolio/fr-p0/fr-p0r1-authorization-and-privacy-correction.md',
    [
      ['C:', 'Users', 'mays-', '.codex', 'AGENTS.md'],
    ],
  ],
]);

function maskAllowedWindowsLiterals(repositoryPath, text) {
  const normalizedPath = normalizeRepositoryPath(repositoryPath)
    .toLocaleLowerCase('en-US');
  const allowedLiteralParts = allowedWindowsLiteralPartsByFile.get(normalizedPath);
  if (!allowedLiteralParts) {
    return text;
  }

  const candidateVariants = allowedLiteralParts
    .map((parts) => parts.join('\\'))
    .flatMap((candidate) => [candidate, candidate.replaceAll('\\', '\\\\')]);
  const characters = text.split('');

  for (const candidate of candidateVariants) {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const index = text.indexOf(candidate, searchFrom);
      if (index < 0) {
        break;
      }

      const before = index === 0 ? '' : text[index - 1];
      const afterIndex = index + candidate.length;
      const after = afterIndex >= text.length ? '' : text[afterIndex];
      const beforeIsBoundary = before === '' || !/[A-Za-z0-9+.-]/.test(before);
      const afterIsBoundary = after === '' || /[\s"'`,;)\]}]/.test(after);

      if (beforeIsBoundary && afterIsBoundary) {
        characters.fill(' ', index, afterIndex);
      }
      searchFrom = afterIndex;
    }
  }

  return characters.join('');
}

function finding(code, repositoryPath, message, line) {
  return {
    code,
    path: repositoryPath,
    ...(line === undefined ? {} : { line }),
    message,
  };
}

export function normalizeRepositoryPath(repositoryPath) {
  return String(repositoryPath)
    .replaceAll('\0', '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/');
}

function lowerPathParts(repositoryPath) {
  const normalizedPath = normalizeRepositoryPath(repositoryPath);
  return {
    normalizedPath,
    lowerPath: normalizedPath.toLocaleLowerCase('en-US'),
    parts: normalizedPath.toLocaleLowerCase('en-US').split('/').filter(Boolean),
  };
}

export function isSyntheticOcrFixture(repositoryPath) {
  const { lowerPath } = lowerPathParts(repositoryPath);
  const prefix = SYNTHETIC_OCR_FIXTURE_PREFIX.toLocaleLowerCase('en-US');
  return lowerPath === prefix.slice(0, -1) || lowerPath.startsWith(prefix);
}

export function isOcrProcessingArtifact(repositoryPath) {
  if (isSyntheticOcrFixture(repositoryPath)) {
    return false;
  }

  const { parts } = lowerPathParts(repositoryPath);
  const fileName = parts.at(-1) ?? '';
  const hasOcrOutputDirectory = parts.some((part) => (
    part === 'ocr'
    || part === 'ocr-output'
    || part === 'ocr-artifacts'
    || part === 'ocr-processing-output'
  ));
  const isFullTextArtifact = fileName === 'full-text.txt';
  const isOcrReport = (
    /\.(?:json|md|txt|csv|tsv)$/i.test(fileName)
    && /ocr.*(?:report|results?|summary|index)/i.test(fileName)
  );

  return hasOcrOutputDirectory || isFullTextArtifact || isOcrReport;
}

function isPrivateTrackedPath(repositoryPath) {
  const { parts } = lowerPathParts(repositoryPath);
  return parts.some((part) => (
    part === 'data-private'
    || part === 'private'
    || part === 'source-private'
  ));
}

function isRawSourceTrackedPath(repositoryPath) {
  const { parts } = lowerPathParts(repositoryPath);
  return parts[0] === 'source';
}

export function validateTrackedPath(repositoryPath) {
  const { normalizedPath, lowerPath, parts } = lowerPathParts(repositoryPath);
  const findings = [];
  const fileName = parts.at(-1) ?? '';
  const extension = path.posix.extname(fileName);

  if (
    normalizedPath.startsWith('/')
    || /^[A-Za-z]:\//.test(normalizedPath)
    || parts.includes('..')
  ) {
    findings.push(finding(
      'INVALID_TRACKED_PATH',
      normalizedPath,
      'Tracked paths must be repository-relative and stay inside the repository.',
    ));
  }

  if (isPrivateTrackedPath(normalizedPath)) {
    findings.push(finding(
      'PRIVATE_ROOT_TRACKED',
      normalizedPath,
      'A file under an explicitly private root is tracked in the public current tree.',
    ));
  }

  if (isRawSourceTrackedPath(normalizedPath)) {
    findings.push(finding(
      'SOURCE_ROOT_TRACKED',
      normalizedPath,
      'A raw source file is tracked in the public current tree.',
    ));
  }

  if (isOcrProcessingArtifact(normalizedPath)) {
    findings.push(finding(
      'OCR_PROCESSING_ARTIFACT_TRACKED',
      normalizedPath,
      'An OCR processing intermediate is tracked outside the synthetic fixture namespace.',
    ));
  }

  if (parts.some((part) => (
    part === 'playwright-report'
    || part === 'blob-report'
    || part === 'test-results'
    || part === '.playwright'
  ))) {
    findings.push(finding(
      'PLAYWRIGHT_OUTPUT_TRACKED',
      normalizedPath,
      'A Playwright-generated report or test output is tracked.',
    ));
  }

  if (extension === '.har') {
    findings.push(finding(
      'HAR_FILE_TRACKED',
      normalizedPath,
      'A browser network archive is tracked.',
    ));
  }

  if (
    extension === '.trace'
    || /^(?:trace|playwright-trace)\.(?:json|zip)$/i.test(fileName)
    || parts.some((part) => part === 'traces' || part === 'playwright-traces')
  ) {
    findings.push(finding(
      'TRACE_FILE_TRACKED',
      normalizedPath,
      'A browser or test trace is tracked.',
    ));
  }

  if (parts.some((part) => (
    part === 'browser-profile'
    || part === 'browser-profiles'
    || part === 'chrome-profile'
    || part === 'user-data-dir'
    || part === 'browser-data'
  )) || /^(?:cookies?|cookies?\.(?:json|sqlite))$/i.test(fileName)) {
    findings.push(finding(
      'BROWSER_PROFILE_TRACKED',
      normalizedPath,
      'A browser profile or cookie store is tracked.',
    ));
  }

  if (
    extension === '.log'
    || parts.some((part) => part === 'log' || part === 'logs')
  ) {
    findings.push(finding(
      'LOG_FILE_TRACKED',
      normalizedPath,
      'A generated log is tracked.',
    ));
  }

  if (parts.some((part) => (
    /^(?:\.?task[-_.]?scratch|\.?scratch)(?:[.-]|$)/i.test(part)
    || part === 'private-notes'
    || part === 'internal-notes'
    || part === 'authoring-notes'
  ))) {
    findings.push(finding(
      'TASK_SCRATCH_TRACKED',
      normalizedPath,
      'Task scratch or internal authoring notes are tracked.',
    ));
  }

  return findings;
}

export function shouldInspectTrackedContent(repositoryPath) {
  const { normalizedPath, lowerPath, parts } = lowerPathParts(repositoryPath);

  if (
    isPrivateTrackedPath(normalizedPath)
    || isRawSourceTrackedPath(normalizedPath)
    || isOcrProcessingArtifact(normalizedPath)
  ) {
    return false;
  }

  const fileName = parts.at(-1) ?? '';
  if (fileName.startsWith('.env')) {
    return true;
  }

  const extension = path.posix.extname(lowerPath);
  if (knownBinaryExtensions.has(extension)) {
    return false;
  }
  if (textExtensions.has(extension) || textFileNames.has(fileName)) {
    return true;
  }

  return true;
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }
  return line;
}

function isPlaceholderSecret(value) {
  const normalized = value.trim().toLocaleLowerCase('en-US');
  if (
    normalized.length < 8
    || normalized === 'null'
    || normalized === 'undefined'
    || normalized === 'none'
    || normalized.includes('${')
    || normalized.includes('{{')
    || normalized.startsWith('$env:')
    || normalized.startsWith('process.env')
    || normalized.startsWith('env.')
    || /^(?:args?|config|data|entry|item|options?|payload|result)\.[a-z_$][\w$]*$/i.test(normalized)
    || /^[x*._-]+$/i.test(normalized)
  ) {
    return true;
  }

  return placeholderFragments.some((fragment) => normalized.includes(fragment));
}

function contentRuleMatches(text, rule, repositoryPath, maxFindings) {
  const matches = [];
  const flags = rule.pattern.flags.includes('g')
    ? rule.pattern.flags
    : `${rule.pattern.flags}g`;
  const pattern = new RegExp(rule.pattern.source, flags);
  const scannedText = (
    rule.code === 'WINDOWS_ABSOLUTE_PATH'
    || rule.code === 'UNC_ABSOLUTE_PATH'
  )
    ? maskAllowedWindowsLiterals(repositoryPath, text)
    : text;

  for (const match of scannedText.matchAll(pattern)) {
    matches.push(finding(
      rule.code,
      repositoryPath,
      rule.message,
      lineNumberAt(scannedText, match.index ?? 0),
    ));
    if (matches.length >= maxFindings) {
      break;
    }
  }

  return matches;
}

function genericSecretMatches(text, repositoryPath, maxFindings) {
  const findings = [];
  for (const rule of genericSecretPatterns) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of text.matchAll(pattern)) {
      const value = rule.valueIndexes
        .map((index) => match[index])
        .find((candidate) => candidate !== undefined) ?? '';
      if (isPlaceholderSecret(value)) {
        continue;
      }
      findings.push(finding(
        'GENERIC_SECRET_ASSIGNMENT',
        repositoryPath,
        'Tracked text contains a non-placeholder secret assignment.',
        lineNumberAt(text, match.index ?? 0),
      ));
      if (findings.length >= maxFindings) {
        return findings;
      }
    }
  }

  return findings;
}

function sensitiveTokenMatches(text, repositoryPath, maxFindings) {
  const findings = [];
  for (const rule of sensitiveTokenPatterns) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of text.matchAll(pattern)) {
      const value = match[rule.valueIndex] ?? '';
      if (isPlaceholderSecret(value)) {
        continue;
      }
      findings.push(finding(
        rule.code,
        repositoryPath,
        rule.message,
        lineNumberAt(text, match.index ?? 0),
      ));
      if (findings.length >= maxFindings) {
        return findings;
      }
    }
  }

  return findings;
}

export function scanTrackedText(
  repositoryPath,
  text,
  { maxFindings = DEFAULT_MAX_FINDINGS } = {},
) {
  const normalizedPath = normalizeRepositoryPath(repositoryPath);
  const findings = [];

  for (const rule of contentRules) {
    const remaining = maxFindings - findings.length;
    if (remaining <= 0) {
      break;
    }
    findings.push(...contentRuleMatches(String(text), rule, normalizedPath, remaining));
  }

  const remaining = maxFindings - findings.length;
  if (remaining > 0) {
    findings.push(...sensitiveTokenMatches(String(text), normalizedPath, remaining));
  }

  const genericRemaining = maxFindings - findings.length;
  if (genericRemaining > 0) {
    findings.push(...genericSecretMatches(
      String(text),
      normalizedPath,
      genericRemaining,
    ));
  }

  return findings;
}

function deduplicateAndSortFindings(findings, maxFindings) {
  const unique = new Map();
  for (const item of findings) {
    const key = `${item.code}\0${item.path}\0${item.line ?? ''}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()]
    .sort((left, right) => (
      left.path.localeCompare(right.path, 'en')
      || left.code.localeCompare(right.code, 'en')
      || (left.line ?? 0) - (right.line ?? 0)
    ))
    .slice(0, maxFindings);
}

export function validateTrackedEntries(
  entries,
  { maxFindings = DEFAULT_MAX_FINDINGS } = {},
) {
  const findings = [];
  let scannedTextFileCount = 0;
  let truncatedTextFileCount = 0;
  let skippedProtectedFileCount = 0;
  let skippedBinaryOrUnknownFileCount = 0;
  let scanBudgetSkippedFileCount = 0;

  for (const entryValue of entries) {
    const entry = typeof entryValue === 'string'
      ? { path: entryValue }
      : entryValue;
    const repositoryPath = normalizeRepositoryPath(entry.path);
    findings.push(...validateTrackedPath(repositoryPath));

    if (entry.gitMode === '120000') {
      findings.push(finding(
        'TRACKED_SYMLINK',
        repositoryPath,
        'A symbolic link is tracked; public-tree validation does not follow or trust symlink targets.',
      ));
    }
    if (entry.gitStage !== undefined && entry.gitStage !== 0) {
      findings.push(finding(
        'UNMERGED_INDEX_ENTRY',
        repositoryPath,
        'The Git index contains an unresolved non-stage-zero entry.',
      ));
    }

    if (typeof entry.content === 'string') {
      scannedTextFileCount += 1;
      findings.push(...scanTrackedText(repositoryPath, entry.content, { maxFindings }));
    } else if (entry.scanStatus === 'protected') {
      skippedProtectedFileCount += 1;
    } else if (entry.scanStatus === 'budget') {
      scanBudgetSkippedFileCount += 1;
      findings.push(finding(
        'TRACKED_TEXT_SCAN_BUDGET_EXCEEDED',
        repositoryPath,
        'A tracked text file could not be scanned within the bounded repository budget.',
      ));
    } else if (entry.scanStatus === 'unrecognized-text-encoding') {
      skippedBinaryOrUnknownFileCount += 1;
      findings.push(finding(
        'TRACKED_TEXT_ENCODING_UNRECOGNIZED',
        repositoryPath,
        'A tracked candidate text file contains unrecognized NUL-encoded content.',
      ));
    } else {
      skippedBinaryOrUnknownFileCount += 1;
    }

    if (entry.truncated === true) {
      truncatedTextFileCount += 1;
      findings.push(finding(
        'TRACKED_TEXT_FILE_TRUNCATED',
        repositoryPath,
        'A tracked text file exceeded the bounded per-file scan limit.',
      ));
    }
  }

  const finalFindings = deduplicateAndSortFindings(findings, maxFindings);
  return {
    schemaVersion: 1,
    validator: 'public-repository',
    status: finalFindings.length === 0 ? 'PASS' : 'FAIL',
    trackedFileCount: entries.length,
    scannedTextFileCount,
    truncatedTextFileCount,
    skippedProtectedFileCount,
    skippedBinaryOrUnknownFileCount,
    scanBudgetSkippedFileCount,
    findingCount: finalFindings.length,
    findingsTruncated: findings.length > finalFindings.length,
    findings: finalFindings,
  };
}

function listTrackedIndexEntries(rootDir = defaultRootDir) {
  const result = spawnSync('git', ['ls-files', '--stage', '-z'], {
    cwd: rootDir,
    encoding: null,
    maxBuffer: GIT_OUTPUT_LIMIT_BYTES,
    shell: false,
    windowsHide: true,
  });

  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new Error('Unable to obtain the tracked-file list from Git.');
  }

  return result.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((record) => {
      const separatorIndex = record.indexOf('\t');
      const header = separatorIndex < 0 ? '' : record.slice(0, separatorIndex);
      const repositoryPath = separatorIndex < 0 ? '' : record.slice(separatorIndex + 1);
      const match = /^([0-7]{6}) ([0-9a-f]{40,64}) ([0-3])$/.exec(header);
      if (!match || repositoryPath.length === 0) {
        throw new Error('Git returned an invalid tracked-index record.');
      }
      return {
        path: normalizeRepositoryPath(repositoryPath),
        gitMode: match[1],
        objectId: match[2],
        gitStage: Number(match[3]),
      };
    });
}

export function listTrackedFiles(rootDir = defaultRootDir) {
  return listTrackedIndexEntries(rootDir).map((entry) => entry.path);
}

function inspectIndexObjectSizes(rootDir, candidates) {
  const objectIds = [...new Set(candidates.map((entry) => entry.objectId))];
  if (objectIds.length === 0) {
    return new Map();
  }

  const result = spawnSync(
    'git',
    ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
    {
      cwd: rootDir,
      input: `${objectIds.join('\n')}\n`,
      encoding: 'utf8',
      maxBuffer: GIT_OUTPUT_LIMIT_BYTES,
      shell: false,
      windowsHide: true,
    },
  );
  if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
    throw new Error('Unable to inspect tracked index objects.');
  }

  const lines = result.stdout.trimEnd().split(/\r?\n/);
  if (lines.length !== objectIds.length) {
    throw new Error('Git returned an incomplete tracked-object inventory.');
  }

  const objects = new Map();
  for (let index = 0; index < objectIds.length; index += 1) {
    const match = /^([0-9a-f]{40,64}) ([a-z]+) ([0-9]+)$/.exec(lines[index]);
    if (!match || match[1] !== objectIds[index]) {
      throw new Error('Git returned invalid tracked-object metadata.');
    }
    objects.set(match[1], {
      type: match[2],
      size: Number(match[3]),
    });
  }
  return objects;
}

function readIndexBlobs(rootDir, candidates) {
  const objectIds = [...new Set(candidates.map((entry) => entry.objectId))];
  if (objectIds.length === 0) {
    return new Map();
  }

  const expectedBytes = objectIds.reduce(
    (total, objectId) => total + candidates.find(
      (candidate) => candidate.objectId === objectId,
    ).objectSize,
    0,
  );
  const protocolOverhead = objectIds.length * 128 + 1024;
  const result = spawnSync('git', ['cat-file', '--batch'], {
    cwd: rootDir,
    input: `${objectIds.join('\n')}\n`,
    encoding: null,
    maxBuffer: Math.max(
      GIT_OUTPUT_LIMIT_BYTES,
      expectedBytes + protocolOverhead,
    ),
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new Error('Unable to read tracked index objects.');
  }

  const blobs = new Map();
  let offset = 0;
  for (const expectedObjectId of objectIds) {
    const lineEnd = result.stdout.indexOf(10, offset);
    if (lineEnd < 0) {
      throw new Error('Git returned a truncated tracked-object stream.');
    }
    const header = result.stdout.subarray(offset, lineEnd).toString('ascii');
    const match = /^([0-9a-f]{40,64}) blob ([0-9]+)$/.exec(header);
    if (!match || match[1] !== expectedObjectId) {
      throw new Error('Git returned invalid tracked-object content metadata.');
    }

    const size = Number(match[2]);
    const contentStart = lineEnd + 1;
    const contentEnd = contentStart + size;
    if (
      contentEnd >= result.stdout.length
      || result.stdout[contentEnd] !== 10
    ) {
      throw new Error('Git returned incomplete tracked-object content.');
    }
    blobs.set(expectedObjectId, result.stdout.subarray(contentStart, contentEnd));
    offset = contentEnd + 1;
  }

  return blobs;
}

function decodeTrackedTextBuffer(buffer) {
  let text;
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    const encoded = buffer.subarray(2);
    if (encoded.length % 2 !== 0) {
      return null;
    }
    text = encoded.toString('utf16le');
  } else if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const encoded = buffer.subarray(2);
    if (encoded.length % 2 !== 0) {
      return null;
    }
    const littleEndian = Buffer.allocUnsafe(encoded.length);
    for (let index = 0; index < encoded.length; index += 2) {
      littleEndian[index] = encoded[index + 1];
      littleEndian[index + 1] = encoded[index];
    }
    text = littleEndian.toString('utf16le');
  } else {
    if (buffer.includes(0)) {
      return null;
    }
    text = buffer.toString('utf8');
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }
  }

  return text.includes('\0') ? null : text;
}

export async function validatePublicRepository({
  rootDir = defaultRootDir,
  maxFileBytes = DEFAULT_MAX_FILE_BYTES,
  maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
  maxFindings = DEFAULT_MAX_FINDINGS,
} = {}) {
  const trackedIndexEntries = listTrackedIndexEntries(rootDir);
  const entries = [];
  const scanCandidates = [];
  let remainingBytes = maxTotalBytes;

  for (const trackedEntry of trackedIndexEntries) {
    const repositoryPath = trackedEntry.path;
    const baseEntry = {
      path: repositoryPath,
      gitMode: trackedEntry.gitMode,
      gitStage: trackedEntry.gitStage,
    };

    if (trackedEntry.gitMode === '120000') {
      entries.push({ ...baseEntry, scanStatus: 'binary-or-unknown' });
      continue;
    }

    if (!shouldInspectTrackedContent(repositoryPath)) {
      const scanStatus = (
        isPrivateTrackedPath(repositoryPath)
        || isRawSourceTrackedPath(repositoryPath)
        || isOcrProcessingArtifact(repositoryPath)
      ) ? 'protected' : 'binary-or-unknown';
      entries.push({ ...baseEntry, scanStatus });
      continue;
    }

    scanCandidates.push({
      ...baseEntry,
      objectId: trackedEntry.objectId,
    });
  }

  const objectMetadata = inspectIndexObjectSizes(rootDir, scanCandidates);
  const selectedCandidates = [];
  for (const candidate of scanCandidates) {
    const metadata = objectMetadata.get(candidate.objectId);
    if (!metadata || metadata.type !== 'blob' || !Number.isSafeInteger(metadata.size)) {
      entries.push({ ...candidate, content: '', readError: true });
      continue;
    }
    if (metadata.size > maxFileBytes) {
      remainingBytes = Math.max(0, remainingBytes - Math.min(
        maxFileBytes,
        remainingBytes,
      ));
      entries.push({ ...candidate, content: '', truncated: true });
      continue;
    }
    if (metadata.size > remainingBytes) {
      entries.push({ ...candidate, scanStatus: 'budget' });
      continue;
    }
    remainingBytes -= metadata.size;
    selectedCandidates.push({
      ...candidate,
      objectSize: metadata.size,
    });
  }

  let indexBlobs;
  try {
    indexBlobs = readIndexBlobs(rootDir, selectedCandidates);
  } catch {
    indexBlobs = new Map();
  }

  for (const candidate of selectedCandidates) {
    const buffer = indexBlobs.get(candidate.objectId);
    if (!buffer) {
      entries.push({ ...candidate, content: '', readError: true });
      continue;
    }
    const text = decodeTrackedTextBuffer(buffer);
    if (text === null) {
      entries.push({
        ...candidate,
        scanStatus: 'unrecognized-text-encoding',
      });
      continue;
    }
    entries.push({
      ...candidate,
      content: text,
      truncated: false,
    });
  }

  const report = validateTrackedEntries(entries, { maxFindings });
  const readErrors = entries
    .filter((entry) => entry.readError)
    .map((entry) => finding(
      'TRACKED_FILE_UNREADABLE',
      normalizeRepositoryPath(entry.path),
      'A tracked text file could not be read.',
    ));

  if (readErrors.length === 0) {
    return report;
  }

  const finalFindings = deduplicateAndSortFindings(
    [...report.findings, ...readErrors],
    maxFindings,
  );
  return {
    ...report,
    status: 'FAIL',
    findingCount: finalFindings.length,
    findingsTruncated: (
      report.findingsTruncated
      || report.findings.length + readErrors.length > finalFindings.length
    ),
    findings: finalFindings,
  };
}

export function formatHumanSummary(report) {
  const lines = [
    `Public repository validation: ${report.status}`,
    `Tracked files: ${report.trackedFileCount}; scanned text: ${report.scannedTextFileCount}; findings: ${report.findingCount}`,
  ];

  for (const item of report.findings.slice(0, 20)) {
    const location = item.line === undefined ? item.path : `${item.path}:${item.line}`;
    lines.push(`- [${item.code}] ${location}`);
  }
  if (report.findingCount > 20) {
    lines.push(`- ...and ${report.findingCount - 20} more finding(s)`);
  }

  return lines.join('\n');
}

function parseCliArguments(args) {
  const options = {
    jsonOnly: false,
    rootDir: defaultRootDir,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--json') {
      options.jsonOnly = true;
      continue;
    }
    if (argument === '--root') {
      const rootValue = args[index + 1];
      if (!rootValue) {
        throw new Error('--root requires a directory.');
      }
      options.rootDir = path.resolve(process.cwd(), rootValue);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

export async function runCli({
  args = process.argv.slice(2),
  stdout = process.stdout,
} = {}) {
  let options;
  try {
    options = parseCliArguments(args);
  } catch {
    const report = {
      schemaVersion: 1,
      validator: 'public-repository',
      status: 'FAIL',
      trackedFileCount: 0,
      scannedTextFileCount: 0,
      truncatedTextFileCount: 0,
      skippedProtectedFileCount: 0,
      skippedBinaryOrUnknownFileCount: 0,
      scanBudgetSkippedFileCount: 0,
      findingCount: 1,
      findingsTruncated: false,
      findings: [
        finding(
          'INVALID_VALIDATOR_ARGUMENT',
          '<command-line>',
          'Validator arguments are invalid.',
        ),
      ],
    };
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return 1;
  }

  let report;
  try {
    report = await validatePublicRepository({ rootDir: options.rootDir });
  } catch {
    report = {
      schemaVersion: 1,
      validator: 'public-repository',
      status: 'FAIL',
      trackedFileCount: 0,
      scannedTextFileCount: 0,
      truncatedTextFileCount: 0,
      skippedProtectedFileCount: 0,
      skippedBinaryOrUnknownFileCount: 0,
      scanBudgetSkippedFileCount: 0,
      findingCount: 1,
      findingsTruncated: false,
      findings: [
        finding(
          'TRACKED_FILE_ENUMERATION_FAILED',
          '<repository>',
          'The tracked-file inventory could not be obtained.',
        ),
      ],
    };
  }

  if (!options.jsonOnly) {
    stdout.write(`${formatHumanSummary(report)}\n`);
  }
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report.status === 'PASS' ? 0 : 1;
}

const directExecutionPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : '';
const sameScript = process.platform === 'win32'
  ? directExecutionPath.toLocaleLowerCase('en-US') === scriptPath.toLocaleLowerCase('en-US')
  : directExecutionPath === scriptPath;

if (sameScript) {
  process.exitCode = await runCli();
}
