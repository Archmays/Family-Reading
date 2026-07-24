import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FR_P5_FINAL_EVIDENCE_PATHS,
  FR_P5_A11Y_CHECK_KEYS,
  FR_P5_GEOMETRY_CONTINUOUS_WIDTHS,
  FR_P5_GEOMETRY_PHASE_COUNTS,
  FR_P5_REQUIRED_DOC_PATHS,
  FR_P5_ROUTE_INVARIANTS,
  FR_P5_SRCSET_CASES,
  FR_P5_VISUAL_QUALITY_CHECK_KEYS,
  FR_P5_VISUAL_STATUS_KEYS,
  validateFinalEvidence,
  validateFinalEvidenceDocuments,
} from '../scripts/validate-fr-p5-final-evidence.mjs';
import {
  canonicalJson,
  canonicalPolicyHash,
} from '../scripts/media-manifest-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function productionPolicy() {
  return JSON.parse(await readFile(
    path.join(rootDir, ...FR_P5_FINAL_EVIDENCE_PATHS.policy.split('/')),
    'utf8',
  ));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function evidenceHash(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function geometrySample(phase, slug, width, height, scale = 100) {
  return {
    phase,
    slug,
    requestedViewport: { width, height },
    actualViewport: { width, height, dpr: 1 },
    scale,
    mode: width >= 1089 ? 'dual-column' : 'single-column',
    contained: true,
    controlsBelow44: 0,
    findings: {
      heroOverlap: 0,
      horizontalOverflow: 0,
      clippedText: 0,
      brokenMedia: 0,
    },
    pass: true,
  };
}

function geometrySamples() {
  const deepTopics = [
    'food-poisoning',
    'cancer-cell-ii',
    'novel-coronavirus',
    'hemorrhagic-shock',
    'erythroblast-and-myelocyte',
    'left-shift-of-white-blood-cells',
    'induced-pluripotent-stem-cells',
  ];
  const namedViewports = [
    [773, 709], [1024, 400], [900, 500], [844, 390], [800, 450],
    [768, 1024], [667, 375], [430, 932], [390, 844], [1280, 720],
    [1440, 900], [1088, 400], [1089, 400], [1089, 481],
  ];
  const samples = [];
  for (const slug of deepTopics) {
    for (const width of FR_P5_GEOMETRY_CONTINUOUS_WIDTHS) {
      samples.push(geometrySample('continuous-width', slug, width, 900));
    }
  }
  for (const [width, height] of namedViewports) {
    samples.push(geometrySample('named-viewport', 'food-poisoning', width, height));
  }
  for (let topic = 1; topic <= 27; topic += 1) {
    for (const [width, height] of [[390, 844], [1280, 720]]) {
      samples.push(geometrySample('topic-endpoint', `topic-${topic}`, width, height));
    }
  }
  for (const scale of [80, 90, 100, 110, 125, 150, 175, 200]) {
    const width = Math.max(320, Math.round(773 * 100 / scale));
    const height = Math.max(320, Math.round(709 * 100 / scale));
    samples.push(geometrySample(
      'zoom-equivalent',
      'food-poisoning',
      width,
      height,
      scale,
    ));
  }
  return samples;
}

function liveExactRecord(record) {
  return {
    status: 'PASS',
    path: record.path,
    url: `https://archmays.github.io/Family-Reading-Codex/${record.path}`,
    observedSha256: record.sha256,
    observedBytes: record.bytes,
    expectedGitSha256: record.sha256,
    expectedGitBytes: record.bytes,
    gitBlobMatch: true,
  };
}

function selectedCurrentSrc(label) {
  return [{
    role: 'hero',
    currentSrc: `https://example.test/Family-Reading-Codex/public/media/derived/ab/abcdef123456/${label}.webp`,
    status: 'PASS',
  }];
}

function routeMeasurement(label, phase, coldBytes) {
  const cold = phase === 'cold';
  return {
    status: 'PASS',
    requests: cold ? 5 : 2,
    jsonBytes: cold ? 100 : 0,
    imageBytes: cold ? 200 : 0,
    audioBytes: 0,
    otherBytes: cold ? coldBytes - 300 : 0,
    totalTransferBytes: cold ? coldBytes : 0,
    lcp: {
      path: `/Family-Reading-Codex/public/media/derived/ab/abcdef123456/${label}.webp`,
      bytes: cold ? 200 : 0,
    },
    cls: 0,
    duplicateDownloads: 0,
    cacheHits: cold ? 0 : 3,
    shardIndexRequests: cold ? 1 : 0,
    ownerShardRequests: cold ? 1 : 0,
    selectedCurrentSrc: selectedCurrentSrc(label),
  };
}

function srcsetMatrix() {
  return FR_P5_SRCSET_CASES.map(({ viewportWidth, dpr }) => {
    const renderedWidth = Math.min(viewportWidth - 32, 640);
    const renderedHeight = renderedWidth * 0.75;
    const requiredPixelWidth = renderedWidth * dpr;
    const selectedVariantWidth = Math.ceil(requiredPixelWidth);
    const selectedVariantHeight = Math.ceil(selectedVariantWidth * 0.75);
    const selectedProfileId = `matrix-${viewportWidth}-${String(dpr).replace('.', '_')}`;
    const selectedPath = `public/media/derived/ab/abcdef123456/${selectedProfileId}.webp`;
    const resourceBytes = 2_000 + viewportWidth;
    return {
      viewportWidth,
      dpr,
      currentSrc: `https://example.test/Family-Reading-Codex/${selectedPath}`,
      selectedProfileId,
      selectedPath,
      selectedVariantWidth,
      selectedVariantHeight,
      transferBytes: resourceBytes + 300,
      resourceBytes,
      cacheState: 'NETWORK_MISS',
      naturalWidth: selectedVariantWidth,
      naturalHeight: selectedVariantHeight,
      renderedWidth,
      renderedHeight,
      renderedBox: 'OBJECT_FIT_CONTENT_BOX',
      requiredPixelWidth,
      upscalingRatio: requiredPixelWidth / selectedVariantWidth,
      transferredCandidates: 1,
      dimensionsTruthful: true,
      status: 'PASS',
    };
  });
}

function screenshots() {
  const roles = ['cover', 'explanation', 'hero', 'lightbox', 'preview', 'textHeavyManga'];
  return roles.flatMap((role) => [1, 2].map((ordinal) => ({
    id: `${role}-${ordinal}`,
    path: `reports/portfolio/fr-p5/screenshots/${role}-${ordinal}.png`,
    sha256: evidenceHash(`fr-p5-${role}-${ordinal}`),
    bytes: 10_000 + ordinal,
    role,
    status: 'PASS',
  })));
}

async function writeBoundFixtureFile(projectRoot, record, bytes) {
  record.bytes = bytes.length;
  record.sha256 = createHash('sha256').update(bytes).digest('hex');
  const target = path.join(projectRoot, ...record.path.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

async function materializeBoundEvidence(projectRoot, fixtures) {
  const variants = [];
  for (const [index, record] of fixtures.routeNetwork.srcsetMatrix.entries()) {
    const bytes = Buffer.alloc(record.resourceBytes, index + 1);
    const sha = createHash('sha256').update(bytes).digest('hex');
    const target = path.join(projectRoot, ...record.selectedPath.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    variants.push({
      profileId: record.selectedProfileId,
      path: record.selectedPath,
      width: record.selectedVariantWidth,
      height: record.selectedVariantHeight,
      bytes: record.resourceBytes,
      sha256: sha,
    });
  }

  const manifest = {
    schemaVersion: 2,
    media: [{
      sourcePath: 'public/example/source.png',
      variants,
    }],
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8');
  const manifestRecord = fixtures.pagesPerformance.localExactChecks.manifestMimeHash;
  await writeBoundFixtureFile(projectRoot, manifestRecord, manifestBytes);

  for (const [index, record] of fixtures.pagesPerformance.localExactChecks.derivativeMimeHash.samples.entries()) {
    await writeBoundFixtureFile(projectRoot, record, Buffer.alloc(record.bytes, 40 + index));
  }
  for (const [index, record] of fixtures.visualQuality.screenshots.entries()) {
    await writeBoundFixtureFile(projectRoot, record, Buffer.alloc(record.bytes, 80 + index));
  }
  for (const repositoryPath of FR_P5_REQUIRED_DOC_PATHS) {
    const target = path.join(projectRoot, ...repositoryPath.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      `# FR-P5 fixture report\n\nThis compact fixture validates persistent evidence path ${repositoryPath}.\n`
        + 'It contains substantive deterministic content and documents the literal <picture> HTML element.\n',
      'utf8',
    );
  }
}

function evidenceFixtures(policy) {
  const policyHash = canonicalPolicyHash(policy);
  const finalBytes = Math.min(
    1_000_000,
    policy.budgets.distBytes,
    policy.budgets.pagesArtifactBytes,
  );
  const acceptedGeometrySamples = geometrySamples();
  return {
    policy,
    routeNetwork: {
      schemaVersion: 1,
      status: 'PASS',
      policyHash,
      routes: Object.entries(policy.budgets.routeTransferBytes).map(([route, budgetBytes]) => ({
        route,
        status: 'PASS',
        cold: routeMeasurement(
          evidenceHash(route).slice(0, 12),
          'cold',
          Math.max(301, budgetBytes - 1),
        ),
        warm: routeMeasurement(evidenceHash(route).slice(0, 12), 'warm', 0),
        integrity: {
          index: {
            status: 'PASS',
            canonicalManifestShaMatch: true,
          },
          ownerShard: {
            status: 'PASS',
            bodyHashMatch: true,
          },
        },
      })),
      srcsetMatrix: srcsetMatrix(),
      invariants: Object.fromEntries(FR_P5_ROUTE_INVARIANTS.map((key) => [key, 0])),
      lighthouse: {
        status: 'PASS',
        runs: ['mobile', 'desktop'].map((formFactor) => ({
          status: 'PASS',
          formFactor,
          route: Object.keys(policy.budgets.routeTransferBytes)[0],
          performance: 90,
          accessibility: 100,
          bestPractices: 100,
          seo: 100,
        })),
      },
    },
    visualQuality: {
      schemaVersion: 1,
      status: 'PASS',
      policyHash,
      findings: {
        heroOverlap: 0,
        horizontalOverflow: 0,
        clippedText: 0,
        brokenMedia: 0,
      },
      statuses: Object.fromEntries(FR_P5_VISUAL_STATUS_KEYS.map((key) => [key, 'PASS'])),
      qualityChecks: Object.fromEntries(
        FR_P5_VISUAL_QUALITY_CHECK_KEYS.map((key) => [key, 'PASS']),
      ),
      a11yChecks: Object.fromEntries(FR_P5_A11Y_CHECK_KEYS.map((key) => [key, 'PASS'])),
      screenshots: screenshots(),
      matrix: {
        content: {
          carmelaBooks: 12,
          workCellsTopics: 27,
          scienceStations: 108,
          questions: 162,
          pageReferences: 286,
          audioTracks: 12,
          allMediaUseSites: true,
        },
        roleSamples: {
          cover: 2,
          explanation: 2,
          hero: 2,
          lightbox: 2,
          preview: 2,
          textHeavyManga: 2,
        },
        geometry: {
          continuous320To1440: true,
          dense680To1120: true,
          phaseCounts: { ...FR_P5_GEOMETRY_PHASE_COUNTS },
          totalSamples: 545,
          passedSamples: 545,
          samplesSha256: createHash('sha256')
            .update(canonicalJson(acceptedGeometrySamples), 'utf8')
            .digest('hex'),
          samples: acceptedGeometrySamples,
          viewports: [
            '390x844',
            '773x709',
            '1088x400',
            '1089x400',
          ],
        },
      },
    },
    pagesPerformance: {
      schemaVersion: 1,
      status: 'PASS',
      policyHash,
      dist: {
        status: 'PASS',
        filesBefore: 1565,
        bytesBefore: 835935148,
        filesAfter: 100,
        bytesAfter: finalBytes,
        imageBytesBefore: 800000000,
        imageBytesAfter: Math.floor(finalBytes / 2),
        audioBytes: Math.floor(finalBytes / 4),
        topDirectories: [
          { path: 'public/media', files: 80, bytes: Math.floor(finalBytes / 2) },
          { path: 'assets', files: 20, bytes: Math.floor(finalBytes / 4) },
        ],
        topFiles: [
          { path: 'public/audio/sample.mp3', bytes: Math.floor(finalBytes / 4) },
          { path: 'assets/app.js', bytes: 1000 },
        ],
      },
      pagesArtifact: {
        status: 'PASS',
        conservativeBytes: finalBytes,
        compressedBytes: Math.max(1, finalBytes - 100),
      },
      localExactChecks: {
        status: 'PASS',
        projectSubpath: {
          status: 'PASS',
          value: '/Family-Reading-Codex/',
        },
        manifestMimeHash: {
          status: 'PASS',
          path: 'public/media/media-manifest.json',
          mime: 'application/json',
          sha256: evidenceHash('media-manifest'),
          bytes: 12345,
        },
        derivativeMimeHash: {
          status: 'PASS',
          samples: [{
            status: 'PASS',
            path: 'public/media/derived/ab/abcdef123456/sample.webp',
            mime: 'image/webp',
            sha256: evidenceHash('sample-derivative'),
            bytes: 54321,
          }],
        },
        etag: {
          status: 'PASS',
          value: '"fr-p5-local-etag"',
        },
        conditional304: {
          status: 'PASS',
          statusCode: 304,
        },
        notFound404: {
          status: 'PASS',
          statusCode: 404,
        },
        audioRange206: {
          status: 'PASS',
          statusCode: 206,
          acceptRanges: 'bytes',
          contentRange: 'bytes 0-1023/4096',
        },
        immutableCache: {
          status: 'PASS',
          checkedDerivedResponses: 2,
          violations: 0,
          stableUrlBytesHash: true,
          observedCacheControl: 'max-age=600',
        },
        sourcePolicyPathChange: {
          status: 'PASS',
          cases: 2,
          sourceChangeProducesNewPath: true,
          policyChangeProducesNewPath: true,
          unchangedPathViolations: 0,
        },
        orphanClosure: {
          status: 'PASS',
          missing: 0,
          stale: 0,
          orphan: 0,
          unexpectedOriginals: 0,
        },
        noServiceWorkers: {
          status: 'PASS',
          registrations: 0,
        },
        noPrivateState: {
          status: 'PASS',
          exposedEntries: 0,
        },
      },
      deploymentBoundary: {
        status: 'PENDING_POSTDEPLOY_FINAL_HANDOFF',
        liveVerified: false,
        durations: {
          status: 'PENDING_POSTDEPLOY_FINAL_HANDOFF',
        },
        cdnPropagation: {
          status: 'PENDING_POSTDEPLOY_FINAL_HANDOFF',
          liveVerified: false,
        },
        liveExactChecks: {
          status: 'PENDING_POSTDEPLOY_FINAL_HANDOFF',
        },
      },
    },
    runManifest: {
      schemaVersion: 1,
      status: 'PASS',
      policyHash,
      counts: {
        commands: 4,
        targetedTestsPassed: 10,
        targetedTestsTotal: 10,
        finalTestsPassed: 200,
        finalTestsTotal: 200,
        fullGateRuns: 1,
        builds: 1,
      },
      commands: [
        'node --test tests/fr-p5-final-evidence.test.mjs',
        'node scripts/validate-fr-p5-final-evidence.mjs',
        'node scripts/run-tests.mjs',
        'node scripts/build.mjs --validated-inputs',
      ],
      protectedSignatures: {
        status: 'PASS',
        beforeSha256: evidenceHash('protected-roots'),
        afterSha256: evidenceHash('protected-roots'),
        unchanged: true,
      },
    },
  };
}

test('FR-P5 final evidence uses the mandated compact baseline paths', () => {
  assert.deepEqual(FR_P5_FINAL_EVIDENCE_PATHS, {
    policy: 'reports/portfolio/fr-p5/fr-p5-media-quality-policy.json',
    routeNetwork: 'reports/portfolio/fr-p5/fr-p5-route-network-baseline.json',
    visualQuality: 'reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json',
    pagesPerformance: 'reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json',
    runManifest: 'reports/portfolio/fr-p5/fr-p5-run-manifest.json',
  });
  assert.equal(FR_P5_REQUIRED_DOC_PATHS.length, 6);
  assert.deepEqual(
    FR_P5_SRCSET_CASES.map(({ viewportWidth, dpr }) => `${viewportWidth}@${dpr}`),
    [
      '390@1', '390@2',
      '430@1', '430@2',
      '768@1', '768@2',
      '1024@1', '1024@2',
      '1280@1', '1280@1.5', '1280@2',
      '1440@1', '1440@2',
      '1088@2', '1089@2',
    ],
  );
  assert.deepEqual(FR_P5_ROUTE_INVARIANTS, [
    'originalSelections',
    'globalManifestRequests',
    'unexpectedShardIndexRequests',
    'unexpectedUpscaling',
    'requestFailures',
    'consoleErrors',
    'horizontalOverflow',
  ]);
  assert.deepEqual(FR_P5_VISUAL_STATUS_KEYS, [
    'interaction',
    'a11y',
    'mode',
    'lightbox',
    'previewDetail',
  ]);
  assert.deepEqual(FR_P5_VISUAL_QUALITY_CHECK_KEYS, [
    'textReadability',
    'crop',
    'rotation',
    'alpha',
    'color',
    'lineEdges',
    'blur',
    'lightboxClarity',
  ]);
  assert.deepEqual(FR_P5_A11Y_CHECK_KEYS, [
    'keyboard',
    'focus',
    'aria',
    'reducedMotion',
    'forcedColors',
    'textSpacing',
    'reflow',
    'shortLandscape',
    'print',
    'audio',
  ]);
});

test('FR-P5 final evidence accepts explicit pre-deploy pending state and a fully bound live PASS', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  const result = validateFinalEvidenceDocuments(fixtures);
  assert.deepEqual(result.findings, []);
  assert.equal(
    result.summary.frozenRouteBudgets,
    Object.keys(fixtures.policy.budgets.routeTransferBytes).length,
  );
  assert.equal(result.summary.measuredRoutes, result.summary.frozenRouteBudgets);
  assert.equal(result.summary.srcsetMatrixCases, 15);
  assert.equal(result.summary.lighthouseStatus, 'PASS');
  assert.equal(result.summary.distBytes, fixtures.pagesPerformance.dist.bytesAfter);
  assert.equal(result.summary.deploymentBoundaryStatus, 'PENDING_POSTDEPLOY_FINAL_HANDOFF');
  assert.equal(result.summary.liveDeploymentVerified, false);

  fixtures.pagesPerformance.commitSha = '0123456789abcdef0123456789abcdef01234567';
  assert.deepEqual(validateFinalEvidenceDocuments(fixtures).findings, []);

  const deployed = clone(fixtures);
  const exactSha = '0123456789abcdef0123456789abcdef01234567';
  const localChecks = deployed.pagesPerformance.localExactChecks;
  deployed.pagesPerformance.deploymentBoundary = {
    status: 'PASS',
    liveVerified: true,
    exactSha,
    liveSha: exactSha,
    deploymentUrl: 'https://mayswind.github.io/Family-Reading-Codex/',
    artifact: {
      status: 'PASS',
      id: 123456789,
      bytes: deployed.pagesPerformance.pagesArtifact.compressedBytes,
      sha256: evidenceHash('pages-artifact'),
    },
    durations: {
      status: 'PASS',
      uploadMs: 1200,
      deployMs: 3400,
    },
    cdnPropagation: {
      status: 'PASS',
      liveVerified: true,
      checks: 3,
      finalStatusCode: 200,
    },
    liveExactChecks: {
      status: 'PASS',
      scope: 'LIVE_EXACT_SHA',
      manifest: liveExactRecord(localChecks.manifestMimeHash),
      derivatives: localChecks.derivativeMimeHash.samples.map(liveExactRecord),
    },
  };
  const deployedResult = validateFinalEvidenceDocuments(deployed);
  assert.deepEqual(deployedResult.findings, []);
  assert.equal(deployedResult.summary.deploymentBoundaryStatus, 'PASS');
  assert.equal(deployedResult.summary.liveDeploymentVerified, true);

  deployed.pagesPerformance.deploymentBoundary.artifact.bytes += 1;
  assert.equal(
    validateFinalEvidenceDocuments(deployed).findings.some(
      (finding) => finding.code === 'PAGES_DEPLOYMENT_ARTIFACT_INVALID',
    ),
    true,
  );
});

test('FR-P5 final evidence fails closed on route budgets, visual coverage, Pages budgets and placeholders', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  const firstRoute = fixtures.routeNetwork.routes[0];
  firstRoute.cold.totalTransferBytes = fixtures.policy.budgets.routeTransferBytes[firstRoute.route] + 1;
  fixtures.routeNetwork.routes.pop();
  fixtures.visualQuality.findings.brokenMedia = 1;
  fixtures.visualQuality.matrix.roleSamples.preview = 1;
  fixtures.visualQuality.matrix.geometry.viewports = ['390x844'];
  fixtures.pagesPerformance.dist.bytesAfter = Math.max(
    fixtures.policy.budgets.distBytes,
    fixtures.policy.budgets.pagesArtifactBytes,
  ) + 1;
  fixtures.pagesPerformance.pagesArtifact.conservativeBytes = fixtures.pagesPerformance.dist.bytesAfter;
  fixtures.pagesPerformance.finalMainSha = 'RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF';

  const codes = new Set(validateFinalEvidenceDocuments(fixtures).findings.map((finding) => finding.code));
  for (const code of [
    'ROUTE_NETWORK_BUDGET_EXCEEDED',
    'ROUTE_NETWORK_BUDGET_ROUTE_MISSING',
    'VISUAL_ZERO_FINDING_REQUIRED',
    'VISUAL_ROLE_COVERAGE_INCOMPLETE',
    'VISUAL_VIEWPORT_COVERAGE_INCOMPLETE',
    'PAGES_PERFORMANCE_DIST_BUDGET_EXCEEDED',
    'PAGES_ARTIFACT_BUDGET_EXCEEDED',
    'FINAL_EVIDENCE_COMMIT_SHA_INVALID',
  ]) {
    assert.equal(codes.has(code), true, `expected ${code}`);
  }
});

test('FR-P5 route evidence requires reconciled cold/warm metrics, derived selections, zero invariants and all srcset cases', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  const firstRoute = fixtures.routeNetwork.routes[0];
  const secondRoute = fixtures.routeNetwork.routes[1];
  delete firstRoute.warm;
  delete firstRoute.cold.jsonBytes;
  firstRoute.cold.otherBytes += 1;
  firstRoute.cold.lcp.path = '';
  firstRoute.cold.cls = 0.11;
  firstRoute.cold.duplicateDownloads = 1;
  firstRoute.cold.shardIndexRequests = 0;
  firstRoute.cold.ownerShardRequests = 2;
  firstRoute.cold.cacheHits = 1;
  firstRoute.cold.selectedCurrentSrc[0].currentSrc = 'public/books/original.png';
  firstRoute.integrity.index.canonicalManifestShaMatch = false;
  firstRoute.integrity.ownerShard.bodyHashMatch = false;
  secondRoute.warm.requests = 0;
  secondRoute.warm.cacheHits = 0;
  fixtures.routeNetwork.invariants.originalSelections = 1;
  fixtures.routeNetwork.srcsetMatrix.pop();
  fixtures.routeNetwork.srcsetMatrix[0].currentSrc = 'public/books/original.png';
  fixtures.routeNetwork.srcsetMatrix[0].selectedProfileId = '';
  fixtures.routeNetwork.srcsetMatrix[0].naturalWidth -= 1;
  fixtures.routeNetwork.srcsetMatrix[0].transferBytes = 0;
  fixtures.routeNetwork.srcsetMatrix[0].cacheState = 'MEMORY_CACHE';
  fixtures.routeNetwork.srcsetMatrix[0].renderedBox = 'IMG_ELEMENT_BOX';
  fixtures.routeNetwork.srcsetMatrix[0].upscalingRatio = 1.02;
  fixtures.routeNetwork.srcsetMatrix[0].transferredCandidates = 2;
  fixtures.routeNetwork.srcsetMatrix[0].dimensionsTruthful = false;

  const codes = new Set(validateFinalEvidenceDocuments(fixtures).findings.map((finding) => finding.code));
  for (const code of [
    'ROUTE_NETWORK_MEASUREMENT_INVALID',
    'ROUTE_NETWORK_MEASUREMENT_VALUE_INVALID',
    'ROUTE_NETWORK_TOTAL_BYTES_INCONSISTENT',
    'ROUTE_NETWORK_LCP_INVALID',
    'ROUTE_NETWORK_CLS_INVALID',
    'ROUTE_NETWORK_DUPLICATE_DOWNLOADS',
    'ROUTE_NETWORK_SHARD_REQUEST_COUNT_INVALID',
    'ROUTE_NETWORK_COLD_CACHE_STATE_INVALID',
    'ROUTE_NETWORK_WARM_CACHE_PROOF_MISSING',
    'ROUTE_NETWORK_CURRENT_SRC_NOT_DERIVED',
    'ROUTE_NETWORK_INDEX_INTEGRITY_INVALID',
    'ROUTE_NETWORK_OWNER_SHARD_INTEGRITY_INVALID',
    'ROUTE_NETWORK_INVARIANT_NONZERO',
    'SRCSET_MATRIX_CASE_COUNT_INVALID',
    'SRCSET_MATRIX_CASE_MISSING',
    'SRCSET_MATRIX_CURRENT_SRC_NOT_DERIVED',
    'SRCSET_MATRIX_PROFILE_INVALID',
    'SRCSET_MATRIX_SELECTED_PATH_MISMATCH',
    'SRCSET_MATRIX_TRANSFER_INVALID',
    'SRCSET_MATRIX_NATURAL_DIMENSIONS_MISMATCH',
    'SRCSET_MATRIX_RENDERED_BOX_INVALID',
    'SRCSET_MATRIX_UPSCALING_INVALID',
    'SRCSET_MATRIX_TRANSFER_COUNT_INVALID',
    'SRCSET_MATRIX_DIMENSIONS_UNTRUTHFUL',
  ]) {
    assert.equal(codes.has(code), true, `expected ${code}`);
  }
});

test('FR-P5 Lighthouse evidence is measured PASS or an explicit bounded documented limitation', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  fixtures.routeNetwork.lighthouse = {
    status: 'DOCUMENTED_LIMITATION',
    reason: 'Three bounded local runs were unstable because the CI host throttled Chromium.',
    boundedAttempts: 3,
    routeNetworkHardBudgetsPrimary: true,
  };
  const limitation = validateFinalEvidenceDocuments(fixtures);
  assert.deepEqual(limitation.findings, []);
  assert.equal(limitation.summary.lighthouseStatus, 'DOCUMENTED_LIMITATION');

  fixtures.routeNetwork.lighthouse.reason = 'TODO';
  fixtures.routeNetwork.lighthouse.boundedAttempts = 0;
  fixtures.routeNetwork.lighthouse.routeNetworkHardBudgetsPrimary = false;
  const limitationCodes = new Set(
    validateFinalEvidenceDocuments(fixtures).findings.map((finding) => finding.code),
  );
  assert.equal(limitationCodes.has('LIGHTHOUSE_LIMITATION_INVALID'), true);

  const measured = evidenceFixtures(await productionPolicy());
  measured.routeNetwork.lighthouse.runs[0].accessibility = Number.NaN;
  measured.routeNetwork.lighthouse.runs[1].formFactor = 'mobile';
  const measuredCodes = new Set(
    validateFinalEvidenceDocuments(measured).findings.map((finding) => finding.code),
  );
  assert.equal(measuredCodes.has('LIGHTHOUSE_SCORE_INVALID'), true);
  assert.equal(measuredCodes.has('LIGHTHOUSE_FORM_FACTOR_MISSING'), true);
});

test('FR-P5 visual evidence binds PASS statuses and real screenshot records to role counts', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  fixtures.visualQuality.statuses.a11y = 'FAIL';
  fixtures.visualQuality.qualityChecks.blur = 'FAIL';
  fixtures.visualQuality.a11yChecks.keyboard = 'FAIL';
  fixtures.visualQuality.screenshots[0].sha256 = '0'.repeat(64);
  fixtures.visualQuality.screenshots[1].bytes = 0;
  fixtures.visualQuality.screenshots[2].path = ['C:', 'task-scratch', 'screenshot.png'].join('/');
  fixtures.visualQuality.screenshots[3].status = 'PENDING';
  fixtures.visualQuality.screenshots.find((record) => record.role === 'preview').role = 'hero';
  fixtures.visualQuality.matrix.geometry.samples[0].pass = false;
  fixtures.visualQuality.matrix.geometry.phaseCounts['continuous-width'] -= 1;

  const codes = new Set(validateFinalEvidenceDocuments(fixtures).findings.map((finding) => finding.code));
  for (const code of [
    'VISUAL_REQUIRED_STATUS_INVALID',
    'VISUAL_CHECK_STATUS_INVALID',
    'VISUAL_SCREENSHOT_HASH_INVALID',
    'VISUAL_SCREENSHOT_BYTES_INVALID',
    'VISUAL_SCREENSHOT_PATH_INVALID',
    'VISUAL_SCREENSHOT_STATUS_INVALID',
    'VISUAL_ROLE_COVERAGE_INCOMPLETE',
    'VISUAL_GEOMETRY_SAMPLE_INVALID',
    'VISUAL_GEOMETRY_SAMPLE_HASH_MISMATCH',
    'VISUAL_GEOMETRY_PHASE_COUNTS_INVALID',
    'VISUAL_GEOMETRY_TOTAL_INVALID',
  ]) {
    assert.equal(codes.has(code), true, `expected ${code}`);
  }
});

test('FR-P5 Pages evidence requires exact local HTTP checks and an unambiguous deployment boundary', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  const checks = fixtures.pagesPerformance.localExactChecks;
  checks.projectSubpath.value = '/';
  checks.manifestMimeHash.sha256 = 'f'.repeat(64);
  checks.derivativeMimeHash.samples[0].mime = 'image/png';
  checks.etag.value = 'placeholder';
  checks.conditional304.statusCode = 200;
  checks.notFound404.statusCode = 200;
  checks.audioRange206.statusCode = 200;
  checks.immutableCache.stableUrlBytesHash = false;
  checks.sourcePolicyPathChange.sourceChangeProducesNewPath = false;
  checks.orphanClosure.orphan = 1;
  checks.noServiceWorkers.registrations = 1;
  checks.noPrivateState.exposedEntries = 1;
  fixtures.pagesPerformance.dist.imageBytesBefore = fixtures.pagesPerformance.dist.bytesBefore + 1;
  fixtures.pagesPerformance.dist.topFiles[0].path = ['C:', 'dist', 'private.bin'].join('/');
  fixtures.pagesPerformance.deploymentBoundary = {
    status: 'PENDING_POSTDEPLOY_FINAL_HANDOFF',
    liveVerified: true,
    exactSha: 'a'.repeat(40),
  };

  const codes = new Set(validateFinalEvidenceDocuments(fixtures).findings.map((finding) => finding.code));
  for (const code of [
    'PAGES_PROJECT_SUBPATH_INVALID',
    'PAGES_MANIFEST_MIME_HASH_INVALID',
    'PAGES_DERIVATIVE_MIME_HASH_INVALID',
    'PAGES_ETAG_INVALID',
    'PAGES_HTTP_STATUS_INVALID',
    'PAGES_AUDIO_RANGE_INVALID',
    'PAGES_IMMUTABLE_CACHE_INVALID',
    'PAGES_SOURCE_POLICY_PATH_CHANGE_INVALID',
    'PAGES_ORPHAN_CLOSURE_INVALID',
    'PAGES_SERVICE_WORKER_STATE_INVALID',
    'PAGES_PRIVATE_STATE_INVALID',
    'PAGES_PERFORMANCE_IMAGE_BYTES_INVALID',
    'PAGES_TOP_BYTES_INVALID',
    'PAGES_DEPLOYMENT_PENDING_STATE_INVALID',
    'PAGES_DEPLOYMENT_PENDING_LIVE_DATA_FORBIDDEN',
    'PAGES_DEPLOYMENT_PENDING_DURATIONS_INVALID',
    'PAGES_CDN_PROPAGATION_PENDING_INVALID',
    'PAGES_LIVE_EXACT_PENDING_INVALID',
  ]) {
    assert.equal(codes.has(code), true, `expected ${code}`);
  }

  const falseLivePass = evidenceFixtures(await productionPolicy());
  falseLivePass.pagesPerformance.deploymentBoundary = {
    status: 'PASS',
    liveVerified: true,
    exactSha: 'a'.repeat(40),
    liveSha: 'b'.repeat(40),
    deploymentUrl: 'https://example.com/pending',
    artifact: {
      status: 'PASS',
      id: 0,
      bytes: 0,
      sha256: '0'.repeat(64),
    },
  };
  const liveCodes = new Set(
    validateFinalEvidenceDocuments(falseLivePass).findings.map((finding) => finding.code),
  );
  assert.equal(liveCodes.has('PAGES_DEPLOYMENT_EXACT_SHA_INVALID'), true);
  assert.equal(liveCodes.has('PAGES_DEPLOYMENT_URL_INVALID'), true);
  assert.equal(liveCodes.has('PAGES_DEPLOYMENT_ARTIFACT_INVALID'), true);
  assert.equal(liveCodes.has('PAGES_DEPLOYMENT_DURATIONS_INVALID'), true);
  assert.equal(liveCodes.has('PAGES_CDN_PROPAGATION_INVALID'), true);
  assert.equal(liveCodes.has('PAGES_LIVE_EXACT_CHECKS_INVALID'), true);
});

test('FR-P5 Pages evidence requires exact byte improvement and a measured compressed artifact', async () => {
  const noImprovement = evidenceFixtures(await productionPolicy());
  noImprovement.pagesPerformance.dist.bytesBefore =
    noImprovement.pagesPerformance.dist.bytesAfter;
  noImprovement.pagesPerformance.dist.imageBytesBefore =
    noImprovement.pagesPerformance.dist.imageBytesAfter;
  const improvementCodes = new Set(
    validateFinalEvidenceDocuments(noImprovement).findings.map((finding) => finding.code),
  );
  assert.equal(improvementCodes.has('PAGES_PERFORMANCE_DIST_NOT_IMPROVED'), true);
  assert.equal(improvementCodes.has('PAGES_PERFORMANCE_IMAGE_NOT_IMPROVED'), true);

  const missingCompressedBytes = evidenceFixtures(await productionPolicy());
  delete missingCompressedBytes.pagesPerformance.pagesArtifact.compressedBytes;
  const artifactCodes = new Set(
    validateFinalEvidenceDocuments(missingCompressedBytes).findings.map(
      (finding) => finding.code,
    ),
  );
  assert.equal(artifactCodes.has('PAGES_ARTIFACT_COMPRESSED_BYTES_INVALID'), true);
});

test('FR-P5 run manifest binds command, test, build and protected-root evidence without placeholders', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  fixtures.runManifest.counts.commands = 3;
  fixtures.runManifest.counts.finalTestsPassed -= 1;
  fixtures.runManifest.counts.fullGateRuns = 2;
  fixtures.runManifest.commands[0] = `node ${['C:', 'task-scratch', 'TODO.js'].join('/')}`;
  fixtures.runManifest.protectedSignatures.afterSha256 = evidenceHash('changed-protected-roots');

  const codes = new Set(validateFinalEvidenceDocuments(fixtures).findings.map((finding) => finding.code));
  for (const code of [
    'FR_P5_PERSISTENT_ARTIFACT_PLACEHOLDER',
    'FR_P5_PERSISTENT_ARTIFACT_ABSOLUTE_PATH',
    'RUN_MANIFEST_TEST_COUNT_MISMATCH',
    'RUN_MANIFEST_FULL_GATE_COUNT_INVALID',
    'RUN_MANIFEST_COMMANDS_INVALID',
    'RUN_MANIFEST_PROTECTED_SIGNATURE_INVALID',
  ]) {
    assert.equal(codes.has(code), true, `expected ${code}`);
  }
});

test('FR-P5 final evidence rejects schema, status and policy hash drift', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  fixtures.routeNetwork.schemaVersion = 2;
  fixtures.routeNetwork.status = 'DOCUMENTED_LIMITATION';
  fixtures.visualQuality.policyHash = '0'.repeat(64);
  fixtures.pagesPerformance.pagesArtifact.status = 'PENDING';

  const codes = new Set(validateFinalEvidenceDocuments(fixtures).findings.map((finding) => finding.code));
  assert.equal(codes.has('FINAL_EVIDENCE_SCHEMA_INVALID'), true);
  assert.equal(codes.has('FINAL_EVIDENCE_STATUS_INVALID'), true);
  assert.equal(codes.has('FINAL_EVIDENCE_POLICY_HASH_MISMATCH'), true);
  assert.equal(codes.has('PAGES_ARTIFACT_EVIDENCE_STATUS_INVALID'), true);
});

test('FR-P5 final evidence supports temp paths and reports missing production-class evidence', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'fr-p5-final-evidence-'));
  const fixtures = evidenceFixtures(await productionPolicy());
  const paths = {
    policy: 'policy.json',
    routeNetwork: 'route-network.json',
    visualQuality: 'visual-quality.json',
    pagesPerformance: 'pages-performance.json',
    runManifest: 'run-manifest.json',
  };
  try {
    await materializeBoundEvidence(temporaryRoot, fixtures);
    await Promise.all([
      writeFile(path.join(temporaryRoot, paths.policy), JSON.stringify(fixtures.policy), 'utf8'),
      writeFile(path.join(temporaryRoot, paths.routeNetwork), JSON.stringify(fixtures.routeNetwork), 'utf8'),
      writeFile(path.join(temporaryRoot, paths.visualQuality), JSON.stringify(fixtures.visualQuality), 'utf8'),
      writeFile(path.join(temporaryRoot, paths.pagesPerformance), JSON.stringify(fixtures.pagesPerformance), 'utf8'),
      writeFile(path.join(temporaryRoot, paths.runManifest), JSON.stringify(fixtures.runManifest), 'utf8'),
    ]);
    assert.deepEqual(
      (await validateFinalEvidence({ projectRoot: temporaryRoot, paths })).findings,
      [],
    );

    const screenshotPath = path.join(
      temporaryRoot,
      ...fixtures.visualQuality.screenshots[0].path.split('/'),
    );
    await writeFile(screenshotPath, Buffer.from('tampered screenshot'));
    const tampered = await validateFinalEvidence({ projectRoot: temporaryRoot, paths });
    assert.equal(
      tampered.findings.some((finding) => finding.code === 'FR_P5_BOUND_FILE_MISMATCH'),
      true,
    );

    await materializeBoundEvidence(temporaryRoot, fixtures);
    const manifestRecord = fixtures.pagesPerformance.localExactChecks.manifestMimeHash;
    const manifestPath = path.join(temporaryRoot, ...manifestRecord.path.split('/'));
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.media[0].variants[0].width += 1;
    await writeBoundFixtureFile(
      temporaryRoot,
      manifestRecord,
      Buffer.from(JSON.stringify(manifest), 'utf8'),
    );
    await writeFile(
      path.join(temporaryRoot, paths.pagesPerformance),
      JSON.stringify(fixtures.pagesPerformance),
      'utf8',
    );
    const manifestDrift = await validateFinalEvidence({ projectRoot: temporaryRoot, paths });
    assert.equal(
      manifestDrift.findings.some((finding) => finding.code === 'SRCSET_MATRIX_MANIFEST_BINDING_MISMATCH'),
      true,
    );

    await materializeBoundEvidence(temporaryRoot, fixtures);
    await writeFile(
      path.join(temporaryRoot, paths.pagesPerformance),
      JSON.stringify(fixtures.pagesPerformance),
      'utf8',
    );
    const requiredDocPath = path.join(
      temporaryRoot,
      ...FR_P5_REQUIRED_DOC_PATHS.at(-1).split('/'),
    );
    await unlink(requiredDocPath);
    const missingDoc = await validateFinalEvidence({ projectRoot: temporaryRoot, paths });
    assert.equal(
      missingDoc.findings.some((finding) => finding.code === 'FR_P5_REQUIRED_DOC_MISSING'),
      true,
    );
    await materializeBoundEvidence(temporaryRoot, fixtures);

    await unlink(path.join(temporaryRoot, paths.visualQuality));
    const missing = await validateFinalEvidence({ projectRoot: temporaryRoot, paths });
    assert.equal(missing.findings[0].code, 'FINAL_EVIDENCE_FILE_MISSING');
    assert.equal(missing.summary, null);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('FR-P5 final evidence policy hash changes whenever frozen evidence policy changes', async () => {
  const fixtures = evidenceFixtures(await productionPolicy());
  const changed = clone(fixtures);
  changed.policy.budgets.distBytes += 1;
  const findings = validateFinalEvidenceDocuments(changed).findings;
  assert.equal(
    findings.filter((finding) => finding.code === 'FINAL_EVIDENCE_POLICY_HASH_MISMATCH').length,
    4,
  );
});
