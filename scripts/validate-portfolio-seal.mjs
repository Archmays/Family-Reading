import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  canonicalPolicyHash,
  validateMediaManifest,
  validateMediaQualityPolicy,
} from './media-manifest-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HASH40 = /^[a-f0-9]{40}$/;
const EXPECTED_PHASE_IDS = [
  'FR-P0/P0R1',
  'FR-P2',
  'FR-P3A',
  'FR-P3B',
  'FR-P4A',
  'FR-P4B',
  'FR-P4B-R1',
  'FR-P5',
  'FR-P6',
];
const REQUIRED_PRIOR_REPORTS = [
  'docs/portfolio/fr-p0/FR-P0-final-report.md',
  'docs/portfolio/fr-p2/FR-P2-final-report.md',
  'docs/portfolio/fr-p3a/FR-P3A-final-report.md',
  'docs/portfolio/fr-p3b/FR-P3B-final-report.md',
  'docs/portfolio/fr-p4a/FR-P4A-final-report.md',
  'docs/portfolio/fr-p4b/FR-P4B-final-report.md',
  'docs/portfolio/fr-p4b-r1/FR-P4B-R1-final-report.md',
  'docs/portfolio/fr-p5/FR-P5-final-report.md',
];
const REQUIRED_FINAL_REPORTS = [
  'docs/portfolio/fr-p6/FR-P6-final-acceptance-report.md',
  'docs/portfolio/fr-p6/FR-P6-live-pages-report.md',
  'docs/portfolio/fr-p6/FR-P6-known-limitations.md',
  'reports/portfolio/fr-p6/fr-p6-content-route-baseline.json',
  'reports/portfolio/fr-p6/fr-p6-media-network-baseline.json',
  'reports/portfolio/fr-p6/fr-p6-live-pages-baseline.json',
  'reports/portfolio/fr-p6/fr-p6-run-manifest.json',
];

async function readText(repositoryPath) {
  return readFile(path.join(rootDir, ...repositoryPath.split('/')), 'utf8');
}

async function readJson(repositoryPath) {
  return JSON.parse(await readText(repositoryPath));
}

async function exists(repositoryPath) {
  try {
    await access(path.join(rootDir, ...repositoryPath.split('/')), constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function finding(code, message, item = '') {
  return { code, message, item };
}

export function validatePhaseLedgerData(ledger, { finalMode = false } = {}) {
  const findings = [];
  if (ledger?.schemaVersion !== 1) {
    findings.push(finding('LEDGER_SCHEMA', 'Phase ledger schemaVersion must be 1.'));
    return findings;
  }
  if (ledger.repository !== 'Archmays/Family-Reading-Codex') {
    findings.push(finding('LEDGER_REPOSITORY', 'Phase ledger must use the canonical repository identity.'));
  }
  if (!Array.isArray(ledger.phases)) {
    findings.push(finding('LEDGER_PHASES', 'Phase ledger phases must be an array.'));
    return findings;
  }
  const ids = ledger.phases.map((phase) => phase.id);
  if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_PHASE_IDS)) {
    findings.push(finding('LEDGER_PHASE_ORDER', `Expected ${EXPECTED_PHASE_IDS.join(', ')}.`));
  }
  if (new Set(ids).size !== ids.length) {
    findings.push(finding('LEDGER_DUPLICATE_PHASE', 'Phase ledger contains duplicate phase ids.'));
  }
  ledger.phases.forEach((phase) => {
    if (!phase.reportPath || typeof phase.reportPath !== 'string') {
      findings.push(finding('LEDGER_REPORT_PATH', 'Each phase needs a reportPath.', phase.id));
    }
    if (!phase.status || typeof phase.status !== 'string') {
      findings.push(finding('LEDGER_STATUS', 'Each phase needs a status.', phase.id));
    }
    if (!phase.currentTruth || typeof phase.currentTruth !== 'string') {
      findings.push(finding('LEDGER_CURRENT_TRUTH', 'Each phase needs currentTruth.', phase.id));
    }
    if (!Array.isArray(phase.limitations)) {
      findings.push(finding('LEDGER_LIMITATIONS', 'Each phase limitations field must be an array.', phase.id));
    }
    if (!Array.isArray(phase.corrections)) {
      findings.push(finding('LEDGER_CORRECTIONS', 'Each phase corrections field must be an array.', phase.id));
    }
  });
  const p6 = ledger.phases.find((phase) => phase.id === 'FR-P6');
  if (!p6) return findings;
  if (finalMode) {
    if (!['COMPLETE', 'COMPLETE_WITH_DOCUMENTED_LIMITATIONS'].includes(p6.status)) {
      findings.push(finding('LEDGER_P6_FINAL', 'Final ledger must mark FR-P6 complete.'));
    }
    if (p6.currentTruth !== 'CURRENT_FINAL_TRUTH') {
      findings.push(finding('LEDGER_P6_TRUTH', 'Final ledger must mark FR-P6 as current final truth.'));
    }
  } else if (p6.status !== 'IN_PROGRESS') {
    findings.push(finding('LEDGER_P6_CANDIDATE', 'Candidate ledger must mark FR-P6 IN_PROGRESS.'));
  }
  return findings;
}

export function validateSealStateData(state) {
  const findings = [];
  if (state?.schemaVersion !== 1) {
    findings.push(finding('SEAL_SCHEMA', 'Seal state schemaVersion must be 1.'));
    return findings;
  }
  if (!['PROVISIONAL', 'SEALED'].includes(state.sealState)) {
    findings.push(finding('SEAL_STATE', 'sealState must be PROVISIONAL or SEALED.'));
    return findings;
  }
  if (state.repository !== 'Archmays/Family-Reading-Codex' || state.repositoryId !== 1271691196) {
    findings.push(finding('SEAL_REPOSITORY', 'Seal state repository identity is incorrect.'));
  }
  if (state.baseMainSha !== 'f55859186f69e98a1cae689f77d7162f1bf565e0') {
    findings.push(finding('SEAL_BASE_SHA', 'FR-P6 base main SHA must be the FR-P5 final main SHA.'));
  }
  if (state.sealState === 'PROVISIONAL') {
    if (state.portfolioStatus !== 'FR_P6_IN_PROGRESS') {
      findings.push(finding('SEAL_PROVISIONAL_STATUS', 'Provisional state must be FR_P6_IN_PROGRESS.'));
    }
    if (state.projectMode !== 'ACTIVE_DEVELOPMENT') {
      findings.push(finding('SEAL_PROVISIONAL_MODE', 'Provisional project mode must remain ACTIVE_DEVELOPMENT.'));
    }
    if (state.nextRecommendedPhase !== 'FR-P6 Final Acceptance and Project Seal') {
      findings.push(finding('SEAL_PROVISIONAL_NEXT', 'Provisional next phase must remain FR-P6.'));
    }
  } else {
    if (state.portfolioStatus !== 'SEALED') {
      findings.push(finding('SEAL_FINAL_STATUS', 'Sealed state must set portfolioStatus SEALED.'));
    }
    if (state.projectMode !== 'MAINTENANCE') {
      findings.push(finding('SEAL_FINAL_MODE', 'Sealed state must set projectMode MAINTENANCE.'));
    }
    if (state.lastCompletedPhase !== 'FR-P6') {
      findings.push(finding('SEAL_FINAL_PHASE', 'Sealed state must set lastCompletedPhase FR-P6.'));
    }
    if (state.nextRecommendedPhase !== 'NONE') {
      findings.push(finding('SEAL_FINAL_NEXT', 'Sealed state must set nextRecommendedPhase NONE.'));
    }
    if (!HASH40.test(String(state.finalMainSha ?? ''))) {
      findings.push(finding('SEAL_FINAL_SHA', 'Sealed state requires a 40-character finalMainSha.'));
    }
    if (state.pagesStatus !== 'VERIFIED' || state.workspaceStatus !== 'CLEAN') {
      findings.push(finding('SEAL_FINAL_CLOSEOUT', 'Sealed state requires verified Pages and a clean workspace.'));
    }
    if (state.qualityCompromises !== 0) {
      findings.push(finding('SEAL_FINAL_QUALITY', 'Sealed state requires qualityCompromises 0.'));
    }
    if (!Number.isInteger(state.finalTestCount) || state.finalTestCount < 201) {
      findings.push(finding('SEAL_FINAL_TESTS', 'Sealed state requires a final test count of at least the FR-P5 baseline.'));
    }
  }
  return findings;
}

function sumTopicContent(topic) {
  return {
    stations: Array.isArray(topic.bodyScienceStations) ? topic.bodyScienceStations.length : 0,
    questions: Array.isArray(topic.parentQuestionCards) ? topic.parentQuestionCards.length : 0,
    pageRefs: topic.pageRefs && typeof topic.pageRefs === 'object' ? Object.keys(topic.pageRefs).length : 0,
  };
}

export async function validatePortfolioSeal() {
  const findings = [];
  const [ledger, state, readme, packageJson, books, topics, rawPolicy, rawManifest] = await Promise.all([
    readJson('reports/portfolio/fr-p6/fr-p6-phase-ledger.json'),
    readJson('reports/portfolio/fr-p6/fr-p6-seal-state.json'),
    readText('README.md'),
    readJson('package.json'),
    readJson('public/runtime/carmela/books.json'),
    readJson('public/runtime/work-cells/topics.json'),
    readJson('reports/portfolio/fr-p5/fr-p5-media-quality-policy.json'),
    readJson('public/media/media-manifest.json'),
  ]);
  const finalMode = state.sealState === 'SEALED';
  findings.push(...validatePhaseLedgerData(ledger, { finalMode }));
  findings.push(...validateSealStateData(state));

  for (const reportPath of REQUIRED_PRIOR_REPORTS) {
    if (!(await exists(reportPath))) findings.push(finding('MISSING_PHASE_REPORT', 'Required historical phase report is missing.', reportPath));
  }
  if (finalMode) {
    for (const reportPath of REQUIRED_FINAL_REPORTS) {
      if (!(await exists(reportPath))) findings.push(finding('MISSING_FINAL_REPORT', 'Required FR-P6 final artifact is missing.', reportPath));
    }
  }

  if (!readme.includes('Archmays/Family-Reading-Codex') || !readme.includes('https://archmays.github.io/Family-Reading-Codex/')) {
    findings.push(finding('README_IDENTITY', 'README must contain the canonical repository and Pages identities.'));
  }
  if (readme.includes('https://archmays.github.io/Family-Reading/')) {
    findings.push(finding('README_OLD_PAGES', 'README must not contain the old active Pages URL.'));
  }
  if (!packageJson.scripts?.['validate:portfolio-seal']) {
    findings.push(finding('PACKAGE_SEAL_SCRIPT', 'package.json must expose validate:portfolio-seal.'));
  }

  if (!Array.isArray(books.books) || books.books.length !== 12) {
    findings.push(finding('CARMELA_COUNT', 'Carmela runtime must contain exactly 12 books.'));
  } else if (books.books.some((book) => book.hasAudio !== true)) {
    findings.push(finding('CARMELA_AUDIO', 'All 12 Carmela books must retain audio availability.'));
  }

  if (!Array.isArray(topics.topics) || topics.topics.length !== 27) {
    findings.push(finding('WORK_CELLS_COUNT', 'Work Cells runtime must contain exactly 27 topics.'));
  }
  if (!Array.isArray(topics.categories) || topics.categories.length !== 24) {
    findings.push(finding('WORK_CELLS_CATEGORIES', 'Work Cells runtime must contain exactly 24 categories.'));
  }
  const slugs = new Set((topics.topics ?? []).map((topic) => topic.slug));
  for (const requiredSlug of ['hemorrhagic-shock', 'cancer-cell', 'cancer-cell-ii']) {
    if (!slugs.has(requiredSlug)) findings.push(finding('WORK_CELLS_IDENTITY', 'Required Work Cells identity is missing.', requiredSlug));
  }
  if (slugs.size !== (topics.topics ?? []).length) {
    findings.push(finding('WORK_CELLS_DUPLICATE_SLUG', 'Work Cells topic slugs must be unique.'));
  }

  let stationCount = 0;
  let questionCount = 0;
  let pageRefCount = 0;
  for (const topicSummary of topics.topics ?? []) {
    try {
      const detail = await readJson(topicSummary.detailPath);
      const counts = sumTopicContent(detail);
      stationCount += counts.stations;
      questionCount += counts.questions;
      pageRefCount += counts.pageRefs;
    } catch (error) {
      findings.push(finding('WORK_CELLS_DETAIL', error.message, topicSummary.detailPath));
    }
  }
  if (stationCount !== 108) findings.push(finding('WORK_CELLS_STATIONS', `Expected 108 stations, found ${stationCount}.`));
  if (questionCount !== 162) findings.push(finding('WORK_CELLS_QUESTIONS', `Expected 162 questions, found ${questionCount}.`));
  if (pageRefCount !== 286) findings.push(finding('WORK_CELLS_PAGE_REFS', `Expected 286 page refs, found ${pageRefCount}.`));

  try {
    const policy = validateMediaQualityPolicy(rawPolicy);
    const manifest = validateMediaManifest(rawManifest);
    if (manifest.policyHash !== canonicalPolicyHash(policy)) {
      findings.push(finding('MEDIA_POLICY_HASH', 'Media manifest policy hash does not match the canonical policy.'));
    }
    if (manifest.totals.sources !== 778) findings.push(finding('MEDIA_SOURCES', `Expected 778 media sources, found ${manifest.totals.sources}.`));
    if (manifest.totals.variants !== 2735) findings.push(finding('MEDIA_VARIANTS', `Expected 2735 media variants, found ${manifest.totals.variants}.`));
    if (manifest.totals.derivativeBytes !== 612770984) {
      findings.push(finding('MEDIA_BYTES', `Expected 612770984 derivative bytes, found ${manifest.totals.derivativeBytes}.`));
    }
  } catch (error) {
    findings.push(finding('MEDIA_CURRENT_TRUTH', error.message));
  }

  return { finalMode, findings };
}

const directPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const scriptPath = fileURLToPath(import.meta.url);
const direct = process.platform === 'win32'
  ? directPath.toLocaleLowerCase('en-US') === scriptPath.toLocaleLowerCase('en-US')
  : directPath === scriptPath;

if (direct) {
  const result = await validatePortfolioSeal();
  if (result.findings.length) {
    console.error(`Portfolio seal validation failed with ${result.findings.length} finding(s).`);
    result.findings.forEach((item) => console.error(`[${item.code}] ${item.item ? `${item.item}: ` : ''}${item.message}`));
    process.exitCode = 1;
  } else {
    console.log(`Portfolio seal ${result.finalMode ? 'final' : 'candidate'} validation passed.`);
  }
}
