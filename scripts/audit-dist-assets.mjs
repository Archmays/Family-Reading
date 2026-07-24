import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditMediaReleaseOutput,
  loadMediaReleasePlan,
} from './copy-media-release-plan.mjs';
import {
  MEDIA_RELEASE_PLAN_PATH,
  createMediaReleasePlan,
} from './media-release-plan.mjs';
import {
  MEDIA_MANIFEST_PATH,
  MEDIA_POLICY_PATH,
  projectPath,
} from './media-path-policy.mjs';
import {
  declaredDerivativePaths,
  declaredFallbackPaths,
  validateMediaManifest,
  validateMediaQualityPolicy,
} from './media-manifest-policy.mjs';
import {
  MEDIA_SHARD_INDEX_PATH,
  validateMediaShardSet,
} from './generate-media-shards.mjs';
import { validateResponsiveMedia } from './validate-responsive-media.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const warningLimitBytes = Number(process.env.BUILD_SIZE_WARNING_MB ?? 900) * 1024 * 1024;
const topLimit = Number(process.env.BUILD_SIZE_TOP_N ?? 30);
const forbiddenVideoExtensions = ['.mp4', '.mov', '.m4v', '.webm'];
const forbiddenSubtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa'];
const forbiddenArchivePattern = /\.(zip|7z|tar|gz)$/i;
const forbiddenVideoPattern = new RegExp(`(${forbiddenVideoExtensions.map((extension) => extension.replace('.', '\\.')).join('|')})$`, 'i');
const forbiddenSubtitlePattern = new RegExp(`(${forbiddenSubtitleExtensions.map((extension) => extension.replace('.', '\\.')).join('|')})$`, 'i');
const forbiddenWorkCellsAudioPattern = /(^|\/)(cells-at-work|work-cells|工作细胞)(\/.*)?\.(mp3|wav|m4a|aac|flac|ogg)$/i;
const publishedImagePattern = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const releaseTextExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.xml']);
const sensitiveTextPatterns = [
  {
    code: 'LOCAL_ABSOLUTE_PATH',
    pattern: /(?:(?:^|[^A-Za-z0-9+.-])[A-Za-z]:[\\/]|\/Users\/|\/home\/)/i,
    message: 'Remove local absolute filesystem paths from published text files.',
  },
  {
    code: 'LOCAL_EVIDENCE_REFERENCE',
    pattern: /(?:task[-_.]?scratch|playwright-report|test-results|reports[\\/]portfolio[\\/]fr-p5)/i,
    message: 'Remove task scratch, test output and FR-P5 evidence paths from published text files.',
  },
];
const runtimeAuthoringKeyDenylist = new Set([
  'imagePrompt',
  'imagePromptId',
  'promptRequiredPrefix',
  'notesForCodex',
  'zipPath',
  'privateFullEpubInputDirectory',
  'authoring',
  'reviewOnly',
  'transcript',
  'dialogue',
  'subtitle',
  'sourcePath',
  'pageAnnotations',
  'pageImagePaths',
  'publicAssets',
  'topicMergeRules',
  'bodyScienceStationPolicy',
  'assetPolicy',
]);
const forbiddenReleasePatterns = [
  { code: 'RAW_SOURCE', pattern: /(^|\/)(?:source|source-private)(\/|$)/i, message: 'Remove raw source roots from dist.' },
  { code: 'PRIVATE_ROOT', pattern: /(^|\/)(?:private|data-private)(\/|$)/i, message: 'Remove explicitly private roots from dist.' },
  { code: 'OCR_PROCESSING', pattern: /(^|\/)ocr(?:-output|-artifacts|-processing-output)?(\/|$)|(^|\/)(?:full-text\.txt|ocr[^/]*(?:report|result|summary|index)[^/]*)$/i, message: 'Remove OCR processing intermediates from dist.' },
  { code: 'RAW_DOCUMENT', pattern: /\.(?:pdf|epub)$/i, message: 'Remove raw PDF and EPUB files from dist.' },
  { code: 'VIDEO', pattern: forbiddenVideoPattern, message: 'Remove video files from dist; animation MP4 assets must stay outside the GitHub Pages package.' },
  { code: 'SUBTITLE', pattern: forbiddenSubtitlePattern, message: 'Remove subtitle files from dist; full subtitle files must stay outside the runtime package.' },
  { code: 'ARCHIVE', pattern: forbiddenArchivePattern, message: 'Remove archive files from dist; release packages should not ship ZIP or compressed review bundles.' },
  { code: 'TEMPORARY_FILE', pattern: /\.(?:tmp|temp|bak)$/i, message: 'Remove temporary files from dist.' },
  { code: 'HAR', pattern: /\.har$/i, message: 'Remove browser network archives from dist.' },
  { code: 'TRACE', pattern: /(^|\/)(?:traces?|playwright-traces?)(\/|$)|(^|\/)(?:trace|playwright-trace)\.(?:json|zip|trace)$/i, message: 'Remove browser and test traces from dist.' },
  { code: 'LOG', pattern: /\.log$/i, message: 'Remove generated logs from dist.' },
  { code: 'BROWSER_PROFILE', pattern: /(^|\/)(?:browser-profiles?|chrome-profile|user-data-dir|browser-data)(\/|$)|(^|\/)cookies?(?:\.(?:json|sqlite))?$/i, message: 'Remove browser profiles and cookie stores from dist.' },
  { code: 'TEST_OUTPUT', pattern: /(^|\/)(?:playwright-report|blob-report|test-results|\.playwright)(\/|$)/i, message: 'Remove generated browser-test output from dist.' },
  { code: 'TASK_SCRATCH', pattern: /(^|\/)(?:\.?task[-_.]?scratch|\.?scratch|private-notes|internal-notes|authoring-notes)(?:[./-]|$)/i, message: 'Remove task scratch and internal authoring notes from dist.' },
  { code: 'REPORT_ARTIFACT', pattern: /(^|\/)reports?(\/|$)/i, message: 'Remove reports and task evidence from dist.' },
  { code: 'DOCUMENTATION_ARTIFACT', pattern: /(^|\/)docs?(\/|$)/i, message: 'Remove repository documentation from the runtime release package.' },
  { code: 'WORK_CELLS_AUDIO', pattern: forbiddenWorkCellsAudioPattern, message: 'Remove Work Cells audio files from dist; extracted animation audio is analysis-only.' },
  { code: 'EXTRACTED_AUDIO', pattern: /(^|\/)(audio-extracts?|extracted-audio|audio-fallback)(\/|$)/i, message: 'Remove extracted audio intermediates from dist.' },
  { code: 'TRANSCRIPT', pattern: /(^|\/)(transcripts?|topic-readable-transcripts)(\/|\.|$)/i, message: 'Remove transcript temporary files from dist; publish only reduced companion data.' },
  { code: 'SCREENSHOT_CANDIDATE', pattern: /(^|\/)screenshot-candidates(\/|$)/i, message: 'Remove screenshot-candidates from dist; only selected published WebP stills may ship.' },
  { code: 'REVIEW_CONTACT_SHEET', pattern: /(^|\/)review-contact-sheets(\/|$)/i, message: 'Remove review-contact-sheets from dist; contact sheets are review-only artifacts.' },
  { code: 'SCENE_NOTES', pattern: /(^|\/)scene-notes(\/|$)/i, message: 'Remove scene-notes from dist; publish only explicitly reduced JSON if needed.' },
  { code: 'PAGES_BY_VOLUME', pattern: /(^|\/)pages-by-volume(\/|$)/i, message: 'Remove pages-by-volume from dist; publish page-thumbnails instead.' },
  { code: 'VISUAL_ANNOTATION_BUNDLE', pattern: /(^|\/)visual-annotation-bundles(\/|$)/i, message: 'Remove visual-annotation-bundles from dist; keep review bundles outside public publishing paths.' },
  { code: 'PNG_ORIGINAL', pattern: /(^|\/)png-originals(\/|$)/i, message: 'Remove PNG originals from dist; source station PNG files must stay outside the release package.' },
  { code: 'SCIENCE_STATION_PNG', pattern: /science-station\/.+\.png$/i, message: 'Remove science-station PNG images from dist; only WebP station assets may ship.' },
];

function formatSize(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

async function collectFiles(currentDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }
    if (entry.isFile()) {
      const entryStat = await stat(entryPath);
      files.push({ path: entryPath, size: entryStat.size });
    }
  }

  return files;
}

function largestDirectories(files) {
  const sizes = new Map();
  for (const file of files) {
    let current = path.dirname(file.path);
    while (current.startsWith(distDir)) {
      sizes.set(current, (sizes.get(current) ?? 0) + file.size);
      if (current === distDir) break;
      current = path.dirname(current);
    }
  }

  return [...sizes.entries()]
    .map(([dirPath, size]) => ({ path: relativePath(dirPath), size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, topLimit);
}

function cleanupSuggestions(files) {
  const allPaths = files.map((file) => relativePath(file.path));
  const suggestions = [];

  if (allPaths.some((filePath) => filePath.includes('/pages-by-volume/'))) {
    suggestions.push('Remove public/assets/cells-at-work/pages-by-volume from dist; publish page-thumbnails instead.');
  }
  if (allPaths.some((filePath) => filePath.includes('/visual-annotation-bundles/'))) {
    suggestions.push('Remove visual-annotation-bundles from dist; keep review bundles outside public publishing paths.');
  }
  if (allPaths.some((filePath) => /\.(zip|7z|tar|gz)$/i.test(filePath))) {
    suggestions.push('Remove archives from dist; release artifacts should not include temporary bundles.');
  }
  if (allPaths.some((filePath) => /science-station\/.+\.png$/i.test(filePath))) {
    suggestions.push('Convert science-station PNG images to WebP and keep PNG sources outside dist.');
  }

  return suggestions.length > 0
    ? suggestions
    : ['No obvious Work Cells cleanup item detected in dist.'];
}

export function findForbiddenReleaseItems(relativePaths) {
  const items = [];

  for (const { code, pattern, message } of forbiddenReleasePatterns) {
    const matches = relativePaths.filter((filePath) => pattern.test(filePath));
    if (matches.length > 0) {
      items.push({ code, message, matches });
    }
  }

  return items;
}

export function findSensitiveReleaseText(filePath, content) {
  const findings = [];
  for (const { code, pattern, message } of sensitiveTextPatterns) {
    if (pattern.test(content)) findings.push({ code, message, matches: [filePath] });
  }
  return findings;
}

async function findPublishedTextLeaks(files) {
  const findings = [];
  for (const file of files) {
    const filePath = relativePath(file.path);
    if (!releaseTextExtensions.has(path.extname(filePath).toLowerCase())) continue;
    const content = await readFile(file.path, 'utf8');
    findings.push(...findSensitiveReleaseText(filePath, content));
  }
  return findings;
}

export function findMediaClosureItems(repositoryPaths, manifest) {
  const derivatives = declaredDerivativePaths(manifest);
  const fallbacks = declaredFallbackPaths(manifest);
  const declaredPublishedMedia = new Set([...derivatives, ...fallbacks]);
  const publishedMedia = repositoryPaths.filter((filePath) => (
    filePath.startsWith('public/') && publishedImagePattern.test(filePath)
  ));
  const publishedSet = new Set(publishedMedia);
  const findings = [];
  const missing = [...declaredPublishedMedia].filter((filePath) => !publishedSet.has(filePath));
  if (missing.length > 0) {
    findings.push({
      code: 'MEDIA_CLOSURE_MISSING',
      message: 'Publish every derivative and fallback declared by the media manifest.',
      matches: missing.sort(),
    });
  }
  const undeclared = publishedMedia.filter((filePath) => !declaredPublishedMedia.has(filePath));
  if (undeclared.length > 0) {
    findings.push({
      code: 'MEDIA_CLOSURE_ORPHAN',
      message: 'Remove public images that are not a declared derivative or fallback.',
      matches: undeclared.sort(),
    });
  }
  return findings;
}

export function findFrozenDistBudgetItems(policy, totalBytes) {
  const budget = policy?.budgets?.distBytes;
  if (!Number.isInteger(budget) || budget <= 0) {
    return [{
      code: 'DIST_BUDGET_NOT_FROZEN',
      message: 'The accepted media policy must freeze a positive integer distBytes budget.',
      matches: [MEDIA_POLICY_PATH],
    }];
  }
  if (totalBytes > budget) {
    return [{
      code: 'DIST_BUDGET_EXCEEDED',
      message: `dist exceeds the frozen policy budget (${totalBytes} > ${budget} bytes).`,
      matches: ['dist'],
    }];
  }
  return [];
}

export function findFrozenPagesArtifactBudgetItems(policy, exactDistBytes) {
  const budget = policy?.budgets?.pagesArtifactBytes;
  if (!Number.isInteger(budget) || budget <= 0) {
    return [{
      code: 'PAGES_ARTIFACT_BUDGET_NOT_FROZEN',
      message: 'The accepted media policy must freeze a positive integer pagesArtifactBytes budget.',
      matches: [MEDIA_POLICY_PATH],
    }];
  }
  if (exactDistBytes > budget) {
    return [{
      code: 'PAGES_ARTIFACT_BUDGET_EXCEEDED',
      message: `Exact dist release bytes exceed the conservative pre-upload Pages artifact budget (${exactDistBytes} > ${budget} bytes).`,
      matches: ['dist'],
    }];
  }
  return [];
}

export async function runResponsiveMediaAuditGate({
  inputsAlreadyValidated = false,
  validator = validateResponsiveMedia,
} = {}) {
  if (inputsAlreadyValidated) {
    return {
      status: 'REUSED',
      findings: [],
      summary: null,
    };
  }
  try {
    const result = await validator();
    const findings = (result?.findings ?? []).map((finding) => ({
      code: finding.code,
      message: finding.message,
      matches: [finding.item || MEDIA_MANIFEST_PATH],
    }));
    return {
      status: findings.length > 0 ? 'FAIL' : 'PASS',
      findings,
      summary: result?.summary ?? null,
    };
  } catch (error) {
    return {
      status: 'FAIL',
      findings: [{
        code: 'RESPONSIVE_MEDIA_AUDIT_FAILED',
        message: 'Standalone dist audit could not complete responsive media validation.',
        matches: [error.message],
      }],
      summary: null,
    };
  }
}

async function inspectExactReleasePlan() {
  try {
    const plan = await loadMediaReleasePlan(rootDir, MEDIA_RELEASE_PLAN_PATH);
    const audit = await auditMediaReleaseOutput(distDir, plan);
    const findings = [];
    if (audit.missing.length > 0 || audit.extra.length > 0 || audit.mismatched.length > 0) {
      findings.push({
        code: 'EXACT_RELEASE_PLAN_MISMATCH',
        message: 'dist must exactly match the tracked release plan paths and hashes.',
        matches: [
          ...audit.missing.map((filePath) => `${filePath} (missing)`),
          ...audit.extra.map((filePath) => `${filePath} (extra)`),
          ...audit.mismatched.map((filePath) => `${filePath} (hash-or-size)`),
        ],
      });
    }
    const currentPlan = await createMediaReleasePlan();
    if (JSON.stringify(currentPlan) !== JSON.stringify(plan)) {
      findings.push({
        code: 'EXACT_RELEASE_PLAN_STALE',
        message: 'Regenerate the media release plan from the current application and media closure.',
        matches: [MEDIA_RELEASE_PLAN_PATH],
      });
    }
    return { findings, plan };
  } catch (error) {
    return {
      findings: [{
        code: 'EXACT_RELEASE_PLAN_INVALID',
        message: 'The exact release plan must be present and valid.',
        matches: [error.message],
      }],
      plan: null,
    };
  }
}

function collectDeniedRuntimeKeys(value, currentPath = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDeniedRuntimeKeys(item, `${currentPath}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== 'object') return findings;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if (runtimeAuthoringKeyDenylist.has(key)) findings.push(childPath);
    collectDeniedRuntimeKeys(child, childPath, findings);
  }
  return findings;
}

async function findRuntimeDistributionFindings(files) {
  const findings = [];
  const fileByPath = new Map(files.map((file) => [relativePath(file.path), file]));
  const forbiddenAuthoringPaths = [
    'dist/public/books/工作细胞/draft-manifest.json',
    'dist/data/cells-at-work/page-map.json',
  ];
  const publishedAuthoringPaths = forbiddenAuthoringPaths.filter((filePath) => fileByPath.has(filePath));
  if (publishedAuthoringPaths.length > 0) {
    findings.push({
      code: 'WORK_CELLS_AUTHORING_JSON',
      message: 'Remove Work Cells authoring manifest and page map from dist.',
      matches: publishedAuthoringPaths,
    });
  }

  const manifestPath = 'dist/public/runtime/runtime-manifest.json';
  const manifestFile = fileByPath.get(manifestPath);
  if (!manifestFile) {
    findings.push({
      code: 'RUNTIME_MANIFEST_MISSING',
      message: 'Publish the validated runtime manifest.',
      matches: [manifestPath],
    });
    return findings;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestFile.path, 'utf8'));
  } catch {
    findings.push({
      code: 'RUNTIME_MANIFEST_INVALID',
      message: 'Runtime manifest must be valid JSON.',
      matches: [manifestPath],
    });
    return findings;
  }

  const declaredOutputs = Array.isArray(manifest.outputs)
    ? manifest.outputs
    : Array.isArray(manifest.outputFiles)
      ? manifest.outputFiles
      : [];
  const declaredPaths = new Set([manifestPath]);
  const mismatches = [];

  for (const output of declaredOutputs) {
    const repositoryPath = String(output.path ?? '').replaceAll('\\', '/');
    const distPath = `dist/${repositoryPath}`;
    declaredPaths.add(distPath);
    const published = fileByPath.get(distPath);
    if (!published) {
      mismatches.push(`${distPath} (missing)`);
      continue;
    }
    const bytes = await readFile(published.path);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (published.size !== output.bytes || sha256 !== output.sha256) {
      mismatches.push(`${distPath} (hash-or-size)`);
    }
  }

  const runtimeJsonPaths = files
    .map((file) => relativePath(file.path))
    .filter((filePath) => filePath.startsWith('dist/public/runtime/') && filePath.endsWith('.json'));
  const undeclaredPaths = runtimeJsonPaths.filter((filePath) => !declaredPaths.has(filePath));
  mismatches.push(...undeclaredPaths.map((filePath) => `${filePath} (undeclared)`));
  if (declaredOutputs.length === 0 || mismatches.length > 0) {
    findings.push({
      code: 'RUNTIME_MANIFEST_MISMATCH',
      message: 'Runtime files must exactly match the manifest hashes and file list.',
      matches: declaredOutputs.length === 0 ? [manifestPath] : mismatches,
    });
  }

  const deniedKeys = [];
  for (const filePath of runtimeJsonPaths.filter((item) => /\/work-cells\/topics\/[^/]+\.json$/i.test(item))) {
    try {
      const data = JSON.parse(await readFile(fileByPath.get(filePath).path, 'utf8'));
      deniedKeys.push(...collectDeniedRuntimeKeys(data).map((keyPath) => `${filePath}:${keyPath}`));
    } catch {
      deniedKeys.push(`${filePath}:invalid-json`);
    }
  }
  if (deniedKeys.length > 0) {
    findings.push({
      code: 'RUNTIME_AUTHORING_FIELD',
      message: 'Runtime topic payloads must not expose authoring-only fields.',
      matches: deniedKeys,
    });
  }

  return findings;
}

export async function runDistAudit({ inputsAlreadyValidated = false } = {}) {
  if (!existsSync(distDir)) {
    console.error('dist does not exist. Run node scripts/build.mjs first.');
    return 1;
  }

  const responsiveMediaGate = await runResponsiveMediaAuditGate({ inputsAlreadyValidated });
  const files = await collectFiles(distDir);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const largestFiles = [...files]
    .sort((a, b) => b.size - a.size)
    .slice(0, topLimit)
    .map((file) => ({ path: relativePath(file.path), size: file.size }));
  const allPaths = files.map((file) => relativePath(file.path));
  const repositoryPaths = allPaths.map((filePath) => (
    filePath.startsWith('dist/') ? filePath.slice('dist/'.length) : filePath
  ));
  let mediaClosureFindings = [];
  let releaseBudgetFindings = [];
  let acceptedPolicy = null;
  const shardValidation = await validateMediaShardSet();
  const mediaShardFindings = shardValidation.findings.map((finding) => ({
    code: finding.code,
    message: finding.message,
    matches: [finding.item || MEDIA_SHARD_INDEX_PATH],
  }));
  try {
    const manifest = validateMediaManifest(JSON.parse(
      await readFile(projectPath(rootDir, MEDIA_MANIFEST_PATH), 'utf8'),
    ));
    mediaClosureFindings = findMediaClosureItems(repositoryPaths, manifest);
  } catch (error) {
    mediaClosureFindings = [{
      code: 'MEDIA_MANIFEST_AUDIT_INVALID',
      message: 'The media manifest must be valid before auditing dist.',
      matches: [error.message],
    }];
  }
  try {
    acceptedPolicy = validateMediaQualityPolicy(JSON.parse(
      await readFile(projectPath(rootDir, MEDIA_POLICY_PATH), 'utf8'),
    ));
    releaseBudgetFindings = [
      ...findFrozenDistBudgetItems(acceptedPolicy, totalBytes),
      ...findFrozenPagesArtifactBudgetItems(acceptedPolicy, totalBytes),
    ];
  } catch (error) {
    releaseBudgetFindings = [{
      code: 'MEDIA_POLICY_AUDIT_INVALID',
      message: 'The accepted media policy must be valid before auditing dist.',
      matches: [error.message],
    }];
  }
  const exactReleasePlan = await inspectExactReleasePlan();
  const forbiddenItems = [
    ...responsiveMediaGate.findings,
    ...findForbiddenReleaseItems(allPaths),
    ...await findRuntimeDistributionFindings(files),
    ...mediaClosureFindings,
    ...mediaShardFindings,
    ...releaseBudgetFindings,
    ...await findPublishedTextLeaks(files),
    ...exactReleasePlan.findings,
  ];

  const distBudgetBytes = acceptedPolicy?.budgets?.distBytes ?? null;
  const pagesArtifactBudgetBytes = acceptedPolicy?.budgets?.pagesArtifactBytes ?? null;
  console.log(`RESPONSIVE_MEDIA_VALIDATION: ${responsiveMediaGate.status}`);
  console.log(`EXACT_RELEASE_FILES: ${files.length}`);
  console.log(`EXACT_RELEASE_BYTES: ${totalBytes}`);
  console.log(`FROZEN_DIST_BUDGET_BYTES: ${distBudgetBytes ?? 'NOT_AVAILABLE'}`);
  console.log(`DIST_BUDGET_STATUS: ${
    Number.isInteger(distBudgetBytes) && totalBytes <= distBudgetBytes ? 'PASS' : 'FAIL'
  }`);
  console.log(`FROZEN_PAGES_ARTIFACT_BUDGET_BYTES: ${pagesArtifactBudgetBytes ?? 'NOT_AVAILABLE'}`);
  console.log(`PAGES_ARTIFACT_PREUPLOAD_BASIS_BYTES: ${totalBytes}`);
  console.log(`PAGES_ARTIFACT_PREUPLOAD_STATUS: ${
    Number.isInteger(pagesArtifactBudgetBytes) && totalBytes <= pagesArtifactBudgetBytes ? 'PASS' : 'FAIL'
  }`);
  const byteTotals = exactReleasePlan.plan?.byteTotals;
  if (byteTotals) {
    console.log(`APPLICATION_BYTES_AFTER: ${byteTotals.applicationFiles}`);
    console.log(`RUNTIME_JSON_BYTES_AFTER: ${byteTotals.runtimeJsonFiles}`);
    console.log(`MEDIA_SHARD_BYTES_AFTER: ${byteTotals.mediaShardFiles}`);
    console.log(`AUDIO_BYTES_AFTER: ${byteTotals.audioFiles}`);
    console.log(`MEDIA_PACKAGE_BYTES_AFTER: ${byteTotals.mediaFiles}`);
    console.log(`IMAGE_BYTES_AFTER: ${byteTotals.derivativeFiles}`);
    console.log(`FALLBACK_BYTES_AFTER: ${byteTotals.fallbackFiles}`);
    console.log(`FALLBACK_ORIGINAL_BYTES_AFTER: ${byteTotals.fallbackOriginals}`);
  }
  console.log(`LEGACY_SIZE_WARNING_BYTES: ${warningLimitBytes}`);
  console.log(`LEGACY_SIZE_WARNING_STATUS: ${totalBytes > warningLimitBytes ? 'FAIL' : 'PASS'}`);

  console.log('\nlargest directories:');
  for (const item of largestDirectories(files)) {
    console.log(`${formatSize(item.size).padStart(10)}  ${item.path}`);
  }

  console.log('\nlargest files:');
  for (const item of largestFiles) {
    console.log(`${formatSize(item.size).padStart(10)}  ${item.path}`);
  }

  console.log('\nsuggested cleanup items:');
  for (const suggestion of cleanupSuggestions(files)) {
    console.log(`- ${suggestion}`);
  }

  if (forbiddenItems.length > 0) {
    console.log('\nforbidden release items:');
    for (const item of forbiddenItems) {
      console.log(`- [${item.code}] ${item.message}`);
      for (const match of item.matches.slice(0, topLimit)) {
        console.log(`  - ${match}`);
      }
      if (item.matches.length > topLimit) {
        console.log(`  - ...and ${item.matches.length - topLimit} more`);
      }
    }
  }

  return totalBytes > warningLimitBytes || forbiddenItems.length > 0 ? 1 : 0;
}

const directExecutionPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const scriptPath = fileURLToPath(import.meta.url);
const sameScript = process.platform === 'win32'
  ? directExecutionPath.toLocaleLowerCase('en-US') === scriptPath.toLocaleLowerCase('en-US')
  : directExecutionPath === scriptPath;

if (sameScript) {
  const inputsAlreadyValidated = process.argv.slice(2).includes('--validated-inputs');
  process.exitCode = await runDistAudit({ inputsAlreadyValidated });
}
