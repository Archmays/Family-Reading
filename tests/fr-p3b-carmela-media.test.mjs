import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import {
  canonicalMediaPath,
  createCarmelaCompanionViewModel,
} from '../assets/carmela-companion.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readText = (relativePath) => readFileSync(path.join(rootDir, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const appJs = readText(path.join('assets', 'app.js'));
const a11yJs = readText(path.join('assets', 'a11y.js'));
const series = readJson(path.join('public', 'books', '不一样的卡梅拉', 'series.json'));

const QUESTION_SOURCES = ['factualRecall', 'comprehension', 'openExpression'];

function createRawBook(book) {
  const assets = readJson(path.join(...book.folder.split('/'), book.assetFile));
  const companion = readJson(path.join(...book.folder.split('/'), book.companionFile));
  return {
    ...book,
    seriesTitle: series.seriesTitle,
    assets,
    companion,
    cover: `${book.folder}/${assets.pageImages[0]}`,
    previewPages: assets.pageImages.slice(0, 4).map((page) => `${book.folder}/${page}`),
  };
}

function bookRecords() {
  return series.books.slice(0, 12).map((book) => {
    const rawBook = createRawBook(book);
    return {
      rawBook,
      view: createCarmelaCompanionViewModel(rawBook),
    };
  });
}

function sourceGroups({ rawBook, view }) {
  const groups = [];
  const add = (id, paths, kind, section) => groups.push({ id, paths: paths ?? [], kind, section });

  view.scenes.forEach((scene, index) => {
    add(scene.mediaGroupId, rawBook.companion.scenes[index]?.imageRefs, 'page', 'scenes');
  });
  view.questionGroups.forEach((group, groupIndex) => {
    group.questions.forEach((question, questionIndex) => {
      add(
        question.mediaGroupId,
        rawBook.companion.questionCards[QUESTION_SOURCES[groupIndex]]?.[questionIndex]?.evidenceImageRefs,
        'page',
        'questions',
      );
    });
  });
  view.background.forEach((entry, index) => {
    const source = rawBook.companion.backgroundNotes[index] ?? {};
    add(entry.pageMediaGroupId, source.imageRefs, 'page', 'background');
    add(entry.explanationMediaGroupId, source.generatedImageRefs, 'explanation', 'background');
  });
  view.encyclopedia.forEach((entry, index) => {
    const source = rawBook.companion.encyclopediaEntries[index] ?? {};
    add(entry.pageMediaGroupId, source.imageRefs, 'page', 'encyclopedia');
    add(entry.explanationMediaGroupId, source.generatedImageRefs, 'explanation', 'encyclopedia');
  });
  return groups;
}

function normalizedSourcePaths(paths) {
  return (Array.isArray(paths) ? paths : [])
    .map((value) => (typeof value === 'string' ? value : ''))
    .filter(Boolean)
    .map(canonicalMediaPath)
    .filter(Boolean);
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      keys.push(key);
      collectKeys(item, keys);
    });
  }
  return keys;
}

function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `${startMarker} should exist`);
  assert.ok(end > start, `${endMarker} should follow ${startMarker}`);
  return source.slice(start, end);
}

test('P3B builds deterministic canonical registries for all twelve Carmela books', () => {
  const records = bookRecords();
  assert.equal(records.length, 12);

  const totals = { registry: 0, groups: 0, uses: 0 };
  for (const { rawBook, view } of records) {
    assert.deepEqual(
      createCarmelaCompanionViewModel(rawBook),
      view,
      `${rawBook.title} should produce a byte-stable object graph from the same input`,
    );

    const registryEntries = Object.values(view.mediaRegistry);
    const registryIds = Object.keys(view.mediaRegistry);
    const registryPaths = registryEntries.map((media) => media.path);
    assert.equal(new Set(registryIds).size, registryIds.length);
    assert.equal(new Set(registryPaths).size, registryPaths.length);
    assert.deepEqual(registryEntries.map((media) => media.id), registryIds);

    for (const media of registryEntries) {
      assert.equal(media.path, canonicalMediaPath(media.path));
      assert.equal(media.absolutePath, `${view.identity.mediaBase}/${media.path}`);
      assert.equal(media.absolutePath.includes('\\'), false);
      assert.equal(/^(?:[a-z][a-z\d+.-]*:|\/)|(?:^|\/)\.\.(?:\/|$)/i.test(media.path), false);
      assert.ok(
        existsSync(path.join(rootDir, ...media.absolutePath.split('/'))),
        `${rawBook.title} should resolve ${media.absolutePath}`,
      );
    }

    totals.registry += registryEntries.length;
    totals.groups += Object.keys(view.mediaGroups).length;
    totals.uses += registryEntries.reduce((sum, media) => sum + media.uses.length, 0);
  }

  assert.deepEqual(totals, { registry: 366, groups: 333, uses: 988 });
  assert.equal(totals.uses - totals.registry, 622);

  assert.equal(canonicalMediaPath('.\\pages\\001.webp'), 'pages/001.webp');
  assert.equal(canonicalMediaPath('pages/../explanations/map.webp'), 'explanations/map.webp');
  for (const unsafePath of ['../outside.webp', '/root.webp', 'C:\\private.webp', 'https://example.test/a.webp']) {
    assert.equal(canonicalMediaPath(unsafePath), '', `${unsafePath} should be rejected`);
  }
});

test('P3B groups preserve first-seen order, deduplicate navigation, and retain every use site', () => {
  let expectedUseCount = 0;
  let observedUseCount = 0;
  let expectedGroupCount = 0;
  const missingReferences = [];

  for (const record of bookRecords()) {
    const { rawBook, view } = record;
    const registryEntries = Object.values(view.mediaRegistry);
    const registryByPath = new Map(registryEntries.map((media) => [media.path, media]));
    const expectedGroups = sourceGroups(record);
    expectedGroupCount += expectedGroups.length;
    assert.equal(Object.keys(view.mediaGroups).length, expectedGroups.length);

    for (const expected of expectedGroups) {
      const group = view.mediaGroups[expected.id];
      assert.ok(group, `${rawBook.title} should expose group ${expected.id}`);
      assert.equal(group.kind, expected.kind);
      assert.equal(group.section, expected.section);

      const sourcePaths = normalizedSourcePaths(expected.paths);
      const firstSeenPaths = [...new Set(sourcePaths)];
      const groupPaths = group.mediaIds.map((mediaId) => {
        const media = view.mediaRegistry[mediaId];
        if (!media) missingReferences.push(`${rawBook.title}:${expected.id}:${mediaId}`);
        return media?.path;
      });
      assert.deepEqual(groupPaths, firstSeenPaths, `${expected.id} should retain first-seen order`);
      assert.equal(new Set(group.mediaIds).size, group.mediaIds.length, `${expected.id} should be deduplicated`);

      const uses = registryEntries
        .flatMap((media) => media.uses
          .filter((use) => use.groupId === expected.id)
          .map((use) => ({ ...use, path: media.path })))
        .sort((left, right) => left.position - right.position);
      assert.deepEqual(uses.map((use) => use.path), sourcePaths);
      assert.deepEqual(uses.map((use) => use.position), sourcePaths.map((_, index) => index + 1));
      uses.forEach((use) => {
        assert.equal(use.section, group.section);
        assert.equal(use.itemId, group.ownerId);
        assert.ok(group.mediaIds.includes(registryByPath.get(use.path)?.id));
      });

      expectedUseCount += sourcePaths.length;
      observedUseCount += uses.length;
    }

    for (const media of registryEntries) {
      for (const use of media.uses) {
        const group = view.mediaGroups[use.groupId];
        if (!group || !group.mediaIds.includes(media.id)) {
          missingReferences.push(`${rawBook.title}:${media.id}:${use.groupId}`);
        }
      }
    }
  }

  assert.equal(expectedGroupCount, 333);
  assert.equal(expectedUseCount, 988);
  assert.equal(observedUseCount, expectedUseCount);
  assert.deepEqual(missingReferences, []);
});

test('P3B view models expose only the public allowlist and no authoring internals', () => {
  const allowedRootKeys = [
    'identity',
    'summary',
    'facts',
    'storyReview',
    'scenes',
    'questionGroups',
    'background',
    'encyclopedia',
    'mediaRegistry',
    'mediaGroups',
    'audio',
    'parentGuide',
  ];
  const forbiddenKeys = [
    'schemaVersion',
    'contentType',
    'assetFile',
    'companionFile',
    'assets',
    'companion',
    'previewPages',
    'sourceEvidence',
    'sourcePath',
    'sourcePdf',
    'ocrUse',
    'manualReview',
    'imageRefs',
    'evidenceImageRefs',
    'generatedImageRefs',
    'imagePromptRefs',
    'generatedImagePromptId',
    'needsGeneratedImage',
  ];

  for (const { rawBook, view } of bookRecords()) {
    assert.deepEqual(Object.keys(view), allowedRootKeys);
    const keys = collectKeys(view);
    forbiddenKeys.forEach((key) => {
      assert.equal(keys.includes(key), false, `${rawBook.title} should not expose ${key}`);
    });

    Object.values(view.mediaRegistry).forEach((media) => {
      assert.deepEqual(
        Object.keys(media),
        ['id', 'path', 'absolutePath', 'kind', 'label', 'alt', ...(media.pageNumber == null ? [] : ['pageNumber']), 'uses'],
      );
      media.uses.forEach((use) => {
        assert.deepEqual(Object.keys(use), ['section', 'itemId', 'groupId', 'position']);
      });
    });
    Object.values(view.mediaGroups).forEach((group) => {
      assert.deepEqual(Object.keys(group), ['id', 'label', 'mediaIds', 'kind', 'section', 'ownerId']);
    });

    const serialized = JSON.stringify(view);
    for (const privateValue of [rawBook.assets.sourcePdf, rawBook.companion.audio?.sourcePath]) {
      if (typeof privateValue === 'string' && privateValue) {
        assert.equal(serialized.includes(privateValue), false);
      }
    }
    assert.equal(/[A-Za-z]:\\|\/Users\/|\\Users\\/.test(serialized), false);
  }
});

test('P3B disclosures keep media inert until an opened non-print group is mounted', () => {
  const disclosureMarkup = sourceSlice(appJs, 'function EvidenceDisclosure', 'function ExplanationImages');
  const lightboxMarkup = sourceSlice(appJs, 'function ImageLightbox', 'function SciencePageThumbnail');
  const disclosureWiring = sourceSlice(appJs, 'function wireEvidenceDisclosures', 'function wireAnswers');

  assert.match(disclosureMarkup, /<details class="evidence-disclosure" data-media-disclosure/);
  assert.doesNotMatch(disclosureMarkup, /<details[^>]*\sopen(?:\s|>)/);
  assert.ok(disclosureMarkup.indexOf('data-media-mount') < disclosureMarkup.indexOf('data-media-template'));
  assert.match(disclosureMarkup, /<template data-media-template>[\s\S]*CarmelaMediaGroupTemplate/);
  assert.match(disclosureWiring, /if \(!disclosure\.open \|\| disclosure\.dataset\.mediaMounted === 'true'\) return/);
  assert.match(disclosureWiring, /matchMedia\('print'\)\.matches/);
  assert.match(disclosureWiring, /template\.content\.cloneNode\(true\)/);
  assert.match(disclosureWiring, /disclosure\.dataset\.mediaMounted = 'true'/);

  assert.match(lightboxMarkup, /<img data-lightbox-image alt="" hidden>/);
  assert.doesNotMatch(lightboxMarkup, /<img[^>]*\ssrc=/);
  assert.match(a11yJs, /function resetRenderedMedia\(\)[\s\S]*image\.removeAttribute\('src'\)[\s\S]*image\.hidden = true/);
});

test('P3B audio is idle by default, attaches only on intent, and covers recoverable states', () => {
  const audioMarkup = sourceSlice(appJs, 'function audioSection', 'function parentsSection');
  const audioWiring = sourceSlice(appJs, 'function wireAudio', 'function wireReturnContext');

  assert.match(audioMarkup, /data-audio-phase="idle" aria-busy="false"/);
  assert.match(audioMarkup, /<audio[\s\S]*preload="none"[\s\S]*data-audio-src="\$\{html\(source\)\}"/);
  assert.doesNotMatch(audioMarkup, /<audio[^>]*\ssrc=/);
  assert.doesNotMatch(audioMarkup, /<source[^>]*\ssrc=/);
  assert.doesNotMatch(audioMarkup, /\bautoplay\b/i);
  assert.match(audioMarkup, /role="status" aria-live="polite" aria-atomic="true"/);

  for (const phase of ['idle', 'loading', 'ready', 'playing', 'paused', 'ended', 'error']) {
    assert.match(audioWiring, new RegExp(`\\b${phase}: \\[`), `${phase} should have explicit UI copy`);
  }
  assert.equal((appJs.match(/audio\.src\s*=\s*sourcePath/g) ?? []).length, 1);
  assert.match(audioWiring, /button\.addEventListener\('click',[\s\S]*requestPlay\(\)/);
  assert.match(audioWiring, /audio\.addEventListener\('pointerdown', primeNativeControls/);
  assert.match(audioWiring, /event\.key === ' ' \|\| event\.key === 'Enter'/);
  assert.match(audioWiring, /markerButton\.addEventListener\('click',[\s\S]*attachSource/);
  assert.match(audioWiring, /retry: phase === 'error'/);
  assert.match(audioWiring, /Math\.min\(Math\.max\(nextTime, 0\), total\)/);
  assert.match(audioWiring, /audio\.addEventListener\('error', handleAudioError/);

  assert.match(audioWiring, /function detachSource\(\)[\s\S]*audio\.pause\(\)[\s\S]*audio\.removeAttribute\('src'\)[\s\S]*audio\.load\(\)/);
  assert.match(audioWiring, /return \(\) => \{[\s\S]*tearingDown = true;[\s\S]*detachSource\(\)/);
  assert.equal(appJs.includes('localStorage'), false);
  assert.equal(appJs.includes('sessionStorage'), false);
  assert.equal(appJs.includes('indexedDB'), false);
});

test('P3B lightbox delegates dynamic openers and navigates only the active media group', () => {
  assert.match(a11yJs, /root\.addEventListener\('click', onOpenerClick, \{ signal \}\)/);
  assert.match(a11yJs, /event\.target\?\.closest\?\.\('\[data-lightbox-src\]'\)/);
  assert.match(a11yJs, /getAttribute\('data-lightbox-group'\)\?\.trim\(\) \|\| '__legacy-default__'/);
  assert.match(a11yJs, /function collectGroupItems\(groupId\)[\s\S]*groupIdFor\(opener\) !== groupId/);
  assert.match(a11yJs, /seenMediaIds = new Set\(\)[\s\S]*seenSources = new Set\(\)/);
  assert.match(a11yJs, /activeItems = items;[\s\S]*activeGroupId = groupId/);
  assert.match(a11yJs, /const position = `第 \$\{activeIndex \+ 1\} 张，共 \$\{activeItems\.length\} 张`/);
  assert.match(a11yJs, /event\.key === 'ArrowLeft'[\s\S]*show\(activeIndex - 1\)/);
  assert.match(a11yJs, /event\.key === 'ArrowRight'[\s\S]*show\(activeIndex \+ 1\)/);
  assert.match(a11yJs, /activeOpener\?\.isConnected[\s\S]*activeSummary[\s\S]*activeFallback/);
  assert.match(a11yJs, /return \(\) => \{[\s\S]*close\(\{ restoreFocus: false \}\);[\s\S]*controller\.abort\(\);[\s\S]*dialog\.remove\(\)/);
});
