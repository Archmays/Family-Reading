import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createMediaResolver } from '../assets/media-resolver.js';
import {
  derivativeRepositoryPath,
  normalizeImagePath,
  stableCompare,
} from '../scripts/media-path-policy.mjs';
import {
  validateMediaManifest,
  validateMediaQualityPolicy,
} from '../scripts/media-manifest-policy.mjs';

const root = path.resolve(import.meta.dirname, '..');

async function readJson(repositoryPath) {
  return JSON.parse(await readFile(path.join(root, ...repositoryPath.split('/')), 'utf8'));
}

function syntheticManifest() {
  const sourceHash = 'a'.repeat(64);
  return {
    schemaVersion: 1,
    generatorVersion: 'fr-p5-test',
    policyHash: 'b'.repeat(64),
    media: [
      {
        sourcePath: 'public/example/page.png',
        sourceHash,
        sourceWidth: 1600,
        sourceHeight: 1200,
        sourceBytes: 900000,
        sourceFormat: 'png',
        sourceMode: 'RGB',
        hasAlpha: false,
        roles: ['carmela-lightbox', 'carmela-page-preview'],
        fallbackPath: 'public/media/derived/aa/aaaaaaaaaaaa/page-preview.webp',
        variants: [
          {
            profileId: 'lightbox-1280',
            path: 'public/media/derived/aa/aaaaaaaaaaaa/page-lightbox-1280.webp',
            width: 1280,
            height: 960,
            format: 'webp',
            bytes: 160000,
            sha256: 'c'.repeat(64),
            sourceHash,
            roles: ['carmela-lightbox'],
            lossless: false,
            quality: 90,
          },
          {
            profileId: 'preview-640',
            path: 'public/media/derived/aa/aaaaaaaaaaaa/page-preview.webp',
            width: 640,
            height: 480,
            format: 'webp',
            bytes: 50000,
            sha256: 'd'.repeat(64),
            sourceHash,
            roles: ['carmela-page-preview'],
            lossless: false,
            quality: 88,
          },
        ],
      },
    ],
    totals: {
      sources: 1,
      sourceBytes: 900000,
      variants: 2,
      derivativeBytes: 210000,
    },
  };
}

test('FR-P5 media paths are ordinal, repository-relative and deterministic', () => {
  assert.equal(stableCompare('A', 'B'), -1);
  assert.equal(stableCompare('B', 'A'), 1);
  assert.equal(stableCompare('同', '同'), 0);
  assert.equal(normalizeImagePath('public/example/page.png'), 'public/example/page.png');
  assert.throws(() => normalizeImagePath('../source/page.png'), /unsafe|public/i);
  assert.throws(() => normalizeImagePath('C:/page.png'), /repository-relative/i);
  assert.throws(() => normalizeImagePath('public/example/page.txt'), /unsupported extension/i);
  assert.equal(
    derivativeRepositoryPath({
      sourcePath: 'public/example/page.png',
      sourceHash: 'a'.repeat(64),
      profileId: 'preview-640',
      extension: 'webp',
    }),
    'public/media/derived/aa/aaaaaaaaaaaa/page-preview-640.webp',
  );
});

test('FR-P5 manifest validation enforces hashes, stable roles and derivative ownership', () => {
  const manifest = syntheticManifest();
  const validated = validateMediaManifest(manifest);
  assert.equal(validated.totals.sources, 1);
  assert.equal(validated.totals.variants, 2);
  const unsafe = structuredClone(manifest);
  unsafe.media[0].variants[0].path = 'public/example/not-derived.webp';
  assert.throws(() => validateMediaManifest(unsafe), /public\/media\/derived/);
  const duplicate = structuredClone(manifest);
  duplicate.media[0].variants[1].path = duplicate.media[0].variants[0].path;
  assert.throws(() => validateMediaManifest(duplicate), /Duplicate derivative path/);
  const timestamp = structuredClone(manifest);
  timestamp.generatedAt = 'now';
  assert.throws(() => validateMediaManifest(timestamp), /forbidden/);
});

test('FR-P5 quality policy must cover every published media role', () => {
  const roles = [
    'carmela-book-cover',
    'carmela-explanation-preview',
    'carmela-lightbox',
    'carmela-page-preview',
    'carmela-series-cover',
    'work-cells-lightbox',
    'work-cells-manga-preview',
    'work-cells-series-thumbnail',
    'work-cells-station-preview',
    'work-cells-topic-hero',
  ];
  const policy = {
    schemaVersion: 1,
    encoder: { name: 'Pillow', version: 'test' },
    profiles: roles.map((role, index) => ({
      id: `profile-${String(index + 1).padStart(2, '0')}`,
      format: 'webp',
      width: 640,
      roles: [role],
      quality: 90,
      lossless: false,
      preserveAlpha: true,
    })),
    visualAcceptance: { sampleMediaIds: ['sample'] },
  };
  assert.equal(validateMediaQualityPolicy(policy).profiles.length, roles.length);
  const missing = structuredClone(policy);
  missing.profiles.pop();
  assert.throws(() => validateMediaQualityPolicy(missing), /does not cover role/);
});

test('FR-P5 browser resolver emits picture/srcset and preserves a safe original fallback', () => {
  const manifest = syntheticManifest();
  const resolver = createMediaResolver(manifest, { sitePath: (value) => `/Family-Reading-Codex/${value}` });
  const markup = resolver.picture('public/example/page.png', {
    role: 'carmela-page-preview',
    alt: '示例页面',
    className: 'example-image',
  });
  assert.match(markup, /^<picture /);
  assert.match(markup, /<source type="image\/webp"/);
  assert.match(markup, /640w/);
  assert.match(markup, /width="640"/);
  assert.match(markup, /height="480"/);
  assert.match(markup, /alt="示例页面"/);
  assert.equal(
    resolver.largestPath('public/example/page.png', 'carmela-lightbox'),
    '/Family-Reading-Codex/public/media/derived/aa/aaaaaaaaaaaa/page-lightbox-1280.webp',
  );
  const fallback = createMediaResolver(null).picture('public/example/original.png', {
    role: 'carmela-page-preview',
    alt: '原图回退',
  });
  assert.match(fallback, /src="public\/example\/original\.png"/);
  assert.doesNotMatch(fallback, /<source /);
});

test('FR-P5 corrected Work Cells truth is 27 topics including hemorrhagic shock', async () => {
  const index = await readJson('public/runtime/work-cells/topics.json');
  assert.equal(index.topics.length, 27);
  assert.equal(new Set(index.topics.map((topic) => topic.category)).size, 24);
  assert.ok(index.topics.some((topic) => topic.slug === 'hemorrhagic-shock'));
  let stations = 0;
  let questions = 0;
  let pageRefs = 0;
  for (const summary of index.topics) {
    const topic = await readJson(summary.detailPath);
    stations += topic.bodyScienceStations.length;
    questions += topic.parentQuestionCards.length;
    pageRefs += Object.keys(topic.pageRefs).length;
  }
  assert.equal(stations, 108);
  assert.equal(questions, 162);
  assert.equal(pageRefs, 286);
});

test('FR-P5 package exposes explicit inventory, generation, validation and release-plan commands', async () => {
  const packageJson = await readJson('package.json');
  assert.equal(packageJson.scripts['inventory:media'], 'node scripts/inventory-runtime-media.mjs');
  assert.equal(packageJson.scripts['generate:media'], 'python scripts/generate-responsive-media.py');
  assert.equal(packageJson.scripts['validate:media'], 'node scripts/validate-responsive-media.mjs');
  assert.equal(packageJson.scripts['plan:media-release'], 'node scripts/media-release-plan.mjs');
});
