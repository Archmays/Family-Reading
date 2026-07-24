import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findForbiddenReleaseItems,
  findFrozenDistBudgetItems,
  findFrozenPagesArtifactBudgetItems,
  findMediaClosureItems,
  findSensitiveReleaseText,
  runResponsiveMediaAuditGate,
} from '../scripts/audit-dist-assets.mjs';
import { derivativeRepositoryPath } from '../scripts/media-path-policy.mjs';

const HASH = 'a'.repeat(64);
const SOURCE_PATH = 'public/books/demo/page.png';
const PREVIEW_PATH = derivativeRepositoryPath({
  sourcePath: SOURCE_PATH,
  sourceHash: HASH,
  policyHash: HASH,
  profileId: 'preview',
  extension: 'webp',
});
const FALLBACK_PATH = derivativeRepositoryPath({
  sourcePath: SOURCE_PATH,
  sourceHash: HASH,
  policyHash: HASH,
  profileId: 'fallback',
  extension: 'webp',
});
const manifest = {
  schemaVersion: 2,
  generatorVersion: 'test/1',
  policyHash: HASH,
  toolVersions: {
    python: '3.14.0',
    pillow: '12.0.0',
    libwebp: '1.5.0',
  },
  media: [
    {
      sourcePath: SOURCE_PATH,
      sourceHash: HASH,
      sourceStoredWidth: 1000,
      sourceStoredHeight: 1200,
      sourceWidth: 1000,
      sourceHeight: 1200,
      sourceBytes: 100,
      sourceFormat: 'png',
      sourceMode: 'RGB',
      hasAlpha: false,
      exifOrientation: 1,
      orientationNormalized: false,
      sourceFrames: 1,
      animated: false,
      lineageKind: 'self',
      derivationSourcePath: SOURCE_PATH,
      referenceHash: HASH,
      referenceStoredWidth: 1000,
      referenceStoredHeight: 1200,
      referenceWidth: 1000,
      referenceHeight: 1200,
      referenceBytes: 100,
      referenceFormat: 'png',
      referenceMode: 'RGB',
      referenceHasAlpha: false,
      referenceExifOrientation: 1,
      referenceOrientationNormalized: false,
      referenceFrames: 1,
      referenceAnimated: false,
      roles: ['carmela-page-preview'],
      fallbackPath: FALLBACK_PATH,
      fallbacksByRole: {
        'carmela-page-preview': FALLBACK_PATH,
      },
      variants: [
        {
          profileId: 'preview',
          path: PREVIEW_PATH,
          format: 'webp',
          width: 600,
          height: 720,
          bytes: 50,
          sha256: HASH,
          sourceHash: HASH,
          mode: 'RGB',
          hasAlpha: false,
          alphaPreserved: false,
          quality: 90,
          lossless: false,
          encoderOptions: {
            quality: 90,
            lossless: false,
            method: 6,
            exact: true,
          },
          roles: ['carmela-page-preview'],
        },
        {
          profileId: 'fallback',
          path: FALLBACK_PATH,
          format: 'webp',
          width: 1000,
          height: 1200,
          bytes: 80,
          sha256: HASH,
          sourceHash: HASH,
          mode: 'RGB',
          hasAlpha: false,
          alphaPreserved: false,
          quality: 94,
          lossless: false,
          encoderOptions: {
            quality: 94,
            lossless: false,
            method: 6,
            exact: true,
          },
          roles: ['carmela-page-preview'],
        },
      ],
    },
  ],
  totals: {
    sources: 1,
    referenceBytes: 100,
    sourceBytes: 100,
    variants: 2,
    derivativeBytes: 130,
  },
};

test('FR-P5 dist path gate rejects source documents, large page trees, reports and scratch', () => {
  const findings = findForbiddenReleaseItems([
    'dist/source/book.pdf',
    'dist/public/assets/cells-at-work/pages-by-volume/v01/001.png',
    'dist/reports/portfolio/fr-p5/evidence.json',
    'dist/task-scratch/fr-p5/contact-sheet.png',
  ]);
  assert.deepEqual(
    findings.map((finding) => finding.code).sort(),
    ['PAGES_BY_VOLUME', 'RAW_DOCUMENT', 'RAW_SOURCE', 'REPORT_ARTIFACT', 'TASK_SCRATCH'].sort(),
  );
});

test('FR-P5 published text gate rejects local absolute and evidence paths', () => {
  assert.deepEqual(
    findSensitiveReleaseText('dist/assets/app.js', 'const p = "C:\\\\Users\\\\demo\\\\file";')
      .map((finding) => finding.code),
    ['LOCAL_ABSOLUTE_PATH'],
  );
  assert.deepEqual(
    findSensitiveReleaseText('dist/public/runtime/index.json', '{"evidence":"task-scratch/fr-p5/x"}')
      .map((finding) => finding.code),
    ['LOCAL_EVIDENCE_REFERENCE'],
  );
  assert.deepEqual(
    findSensitiveReleaseText(
      'dist/assets/app.js',
      'const path = "public/runtime/index.json"; const url = "https://example.test/";',
    ),
    [],
  );
});

test('FR-P5 media closure rejects missing declarations and orphan originals', () => {
  assert.deepEqual(findMediaClosureItems([
    FALLBACK_PATH,
    PREVIEW_PATH,
  ], manifest), []);

  const findings = findMediaClosureItems([
    PREVIEW_PATH,
    'public/books/demo/unreferenced.png',
  ], manifest);
  assert.deepEqual(findings.map((finding) => finding.code), [
    'MEDIA_CLOSURE_MISSING',
    'MEDIA_CLOSURE_ORPHAN',
  ]);
});

test('FR-P5 dist budget gate is frozen and fail-closed', () => {
  assert.deepEqual(findFrozenDistBudgetItems({ budgets: { distBytes: 100 } }, 100), []);
  assert.equal(findFrozenDistBudgetItems({ budgets: { distBytes: 100 } }, 101)[0].code, 'DIST_BUDGET_EXCEEDED');
  assert.equal(findFrozenDistBudgetItems({ budgets: { distBytes: null } }, 1)[0].code, 'DIST_BUDGET_NOT_FROZEN');
});

test('FR-P5 Pages artifact budget uses exact dist bytes as a conservative pre-upload gate', () => {
  assert.deepEqual(
    findFrozenPagesArtifactBudgetItems({ budgets: { pagesArtifactBytes: 100 } }, 100),
    [],
  );
  assert.equal(
    findFrozenPagesArtifactBudgetItems({ budgets: { pagesArtifactBytes: 100 } }, 101)[0].code,
    'PAGES_ARTIFACT_BUDGET_EXCEEDED',
  );
  assert.equal(
    findFrozenPagesArtifactBudgetItems({ budgets: { pagesArtifactBytes: null } }, 1)[0].code,
    'PAGES_ARTIFACT_BUDGET_NOT_FROZEN',
  );
});

test('FR-P5 standalone dist audit validates responsive media once and supports explicit reuse', async () => {
  let calls = 0;
  const validator = async () => {
    calls += 1;
    return {
      findings: [],
      summary: { derivativeBytes: 10 },
    };
  };
  const standalone = await runResponsiveMediaAuditGate({ validator });
  assert.equal(standalone.status, 'PASS');
  assert.equal(calls, 1);

  const reused = await runResponsiveMediaAuditGate({
    inputsAlreadyValidated: true,
    validator,
  });
  assert.equal(reused.status, 'REUSED');
  assert.equal(calls, 1, 'validated build orchestration must not repeat the Pillow pass');

  const failed = await runResponsiveMediaAuditGate({
    validator: async () => ({
      findings: [{ code: 'MEDIA_TEST_FAILURE', message: 'synthetic', item: 'public/media/x' }],
      summary: null,
    }),
  });
  assert.equal(failed.status, 'FAIL');
  assert.equal(failed.findings[0].code, 'MEDIA_TEST_FAILURE');
});
