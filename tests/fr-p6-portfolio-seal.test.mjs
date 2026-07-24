import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validatePhaseLedgerData,
  validatePortfolioSeal,
  validateSealStateData,
} from '../scripts/validate-portfolio-seal.mjs';

const phaseIds = [
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

function ledger({ p6Status = 'IN_PROGRESS', p6Truth = 'CANDIDATE_FINAL_TRUTH_PENDING_CODEX_ACCEPTANCE' } = {}) {
  return {
    schemaVersion: 1,
    repository: 'Archmays/Family-Reading-Codex',
    phases: phaseIds.map((id) => ({
      id,
      reportPath: id === 'FR-P6'
        ? 'docs/portfolio/fr-p6/FR-P6-final-acceptance-report.md'
        : `docs/portfolio/${id.toLowerCase().replaceAll('/', '-')}/final.md`,
      status: id === 'FR-P6' ? p6Status : 'COMPLETE',
      currentTruth: id === 'FR-P6' ? p6Truth : 'VALID_HISTORICAL_EVIDENCE',
      limitations: [],
      corrections: [],
    })),
  };
}

function provisionalState() {
  return {
    schemaVersion: 1,
    sealState: 'PROVISIONAL',
    portfolioStatus: 'FR_P6_IN_PROGRESS',
    projectMode: 'ACTIVE_DEVELOPMENT',
    repository: 'Archmays/Family-Reading-Codex',
    repositoryId: 1271691196,
    baseMainSha: 'f55859186f69e98a1cae689f77d7162f1bf565e0',
    nextRecommendedPhase: 'FR-P6 Final Acceptance and Project Seal',
  };
}

test('FR-P6 candidate ledger preserves phase order and does not claim a final seal', () => {
  assert.deepEqual(validatePhaseLedgerData(ledger()), []);
  assert.deepEqual(validateSealStateData(provisionalState()), []);
});

test('FR-P6 final mode requires complete ledger truth and strict closeout fields', () => {
  const invalidLedger = ledger({ p6Status: 'IN_PROGRESS' });
  const ledgerFindings = validatePhaseLedgerData(invalidLedger, { finalMode: true });
  assert.ok(ledgerFindings.some((item) => item.code === 'LEDGER_P6_FINAL'));
  assert.ok(ledgerFindings.some((item) => item.code === 'LEDGER_P6_TRUTH'));

  const invalidState = {
    ...provisionalState(),
    sealState: 'SEALED',
    portfolioStatus: 'SEALED',
    projectMode: 'MAINTENANCE',
    lastCompletedPhase: 'FR-P6',
    nextRecommendedPhase: 'NONE',
    finalMainSha: null,
    pagesStatus: 'PENDING',
    workspaceStatus: 'DIRTY',
    qualityCompromises: 1,
    finalTestCount: 200,
  };
  const stateFindings = validateSealStateData(invalidState);
  for (const code of [
    'SEAL_FINAL_SHA',
    'SEAL_FINAL_CLOSEOUT',
    'SEAL_FINAL_QUALITY',
    'SEAL_FINAL_TESTS',
  ]) {
    assert.ok(stateFindings.some((item) => item.code === code), code);
  }
});

test('FR-P6 phase ledger rejects missing, duplicate or reordered phases', () => {
  const invalid = ledger();
  invalid.phases = [invalid.phases[1], ...invalid.phases.slice(1)];
  const findings = validatePhaseLedgerData(invalid);
  assert.ok(findings.some((item) => item.code === 'LEDGER_PHASE_ORDER'));
  assert.ok(findings.some((item) => item.code === 'LEDGER_DUPLICATE_PHASE'));
});

test('FR-P6 candidate validator reconciles the current runtime and media truth', async () => {
  const result = await validatePortfolioSeal();
  assert.equal(result.finalMode, false);
  assert.deepEqual(result.findings, []);
});
