import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentLoader } from '../assets/content-loader.js';

const paths = {
  index: 'public/runtime/index.json',
  carmela: 'public/runtime/carmela/books.json',
  carmelaAssets: 'public/books/不一样的卡梅拉/我想去看海/book-assets.json',
  carmelaCompanion: 'public/books/不一样的卡梅拉/我想去看海/companion.json',
  workCells: 'public/runtime/work-cells/topics.json',
  workCellsTopic: 'public/runtime/work-cells/topics/streptococcus-pneumoniae.json',
};

const fixtures = {
  [paths.index]: {
    schemaVersion: 1,
    series: [
      {
        seriesSlug: 'carmela-season-1',
        seriesTitle: '不一样的卡梅拉',
        indexPath: paths.carmela,
      },
      {
        seriesSlug: 'work-cells',
        seriesTitle: '工作细胞',
        indexPath: paths.workCells,
      },
    ],
  },
  [paths.carmela]: {
    schemaVersion: 1,
    seriesTitle: '不一样的卡梅拉',
    books: [
      {
        order: 1,
        title: '我想去看海',
        slug: 'carmela-s1-01',
        folder: 'public/books/不一样的卡梅拉/我想去看海',
        cover: 'public/books/不一样的卡梅拉/我想去看海/pages/001.png',
        hasAudio: true,
        assetPath: paths.carmelaAssets,
        companionPath: paths.carmelaCompanion,
      },
    ],
  },
  [paths.carmelaAssets]: { pageImages: ['pages/001.png'] },
  [paths.carmelaCompanion]: { overview: { oneLine: '去看大海。' } },
  [paths.workCells]: {
    schemaVersion: 1,
    seriesTitle: '工作细胞',
    categories: ['病原体与免疫'],
    topics: [
      {
        order: 1,
        topicId: 'pneumococcus',
        slug: 'streptococcus-pneumoniae',
        title: '肺炎链球菌',
        displayTitle: '肺炎链球菌',
        category: '病原体与免疫',
        sourceLabel: '第1卷 第1话',
        thumbnailPath: 'public/assets/cells-at-work/page-thumbnails/pneumococcus.webp',
        detailPath: paths.workCellsTopic,
      },
    ],
  },
  [paths.workCellsTopic]: {
    schemaVersion: 1,
    seriesSlug: 'work-cells',
    slug: 'streptococcus-pneumoniae',
    source: { sourceLabel: '第1卷 第1话' },
    topicOverview: { summary: '身体里的防御反应。' },
  },
};

function createFetchMock(overrides = {}) {
  const calls = [];
  const resources = { ...fixtures, ...overrides };
  const attempts = new Map();
  const fetchJson = async (resourcePath, options = {}) => {
    calls.push({ resourcePath, signal: options.signal });
    const attempt = (attempts.get(resourcePath) ?? 0) + 1;
    attempts.set(resourcePath, attempt);
    const value = resources[resourcePath];
    if (typeof value === 'function') {
      return value({ resourcePath, signal: options.signal, attempt });
    }
    if (value instanceof Error) throw value;
    if (value === undefined) throw new Error(`Unexpected request: ${resourcePath}`);
    return value;
  };
  return { calls, fetchJson };
}

function requestedPaths(mock) {
  return mock.calls.map((call) => call.resourcePath);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('P4A cold route loaders request only their exact JSON closure', async (t) => {
  await t.test('home', async () => {
    const mock = createFetchMock();
    const context = await createContentLoader(mock).loadHome();
    assert.deepEqual(requestedPaths(mock), [paths.index]);
    assert.equal(context.series.length, 2);
  });

  await t.test('Carmela series', async () => {
    const mock = createFetchMock();
    const context = await createContentLoader(mock).loadCarmelaSeries();
    assert.deepEqual(requestedPaths(mock), [paths.index, paths.carmela]);
    assert.equal(context.books.length, 1);
    assert.equal(requestedPaths(mock).some((item) => item.includes('work-cells')), false);
  });

  await t.test('selected Carmela book', async () => {
    const mock = createFetchMock();
    const context = await createContentLoader(mock).loadCarmelaBook('carmela-s1-01');
    assert.deepEqual(requestedPaths(mock), [
      paths.index,
      paths.carmela,
      paths.carmelaAssets,
      paths.carmelaCompanion,
    ]);
    assert.equal(context.book.slug, 'carmela-s1-01');
    assert.equal(context.book.seriesTitle, '不一样的卡梅拉');
    assert.equal(context.book.assets, fixtures[paths.carmelaAssets]);
    assert.equal(context.book.companion, fixtures[paths.carmelaCompanion]);
    assert.equal(requestedPaths(mock).some((item) => item.includes('work-cells')), false);
  });

  await t.test('Work Cells series', async () => {
    const mock = createFetchMock();
    const context = await createContentLoader(mock).loadWorkCellsSeries();
    assert.deepEqual(requestedPaths(mock), [paths.index, paths.workCells]);
    assert.deepEqual(context.categories, ['病原体与免疫']);
    assert.equal(requestedPaths(mock).some((item) => item.includes('book-assets')), false);
  });

  await t.test('selected Work Cells topic', async () => {
    const mock = createFetchMock();
    const context = await createContentLoader(mock).loadWorkCellsTopic('streptococcus-pneumoniae');
    assert.deepEqual(requestedPaths(mock), [paths.index, paths.workCells, paths.workCellsTopic]);
    assert.equal(context.topic.slug, 'streptococcus-pneumoniae');
    assert.equal(context.topic.thumbnailPath, fixtures[paths.workCells].topics[0].thumbnailPath);
    assert.deepEqual(context.topic.topicOverview, fixtures[paths.workCellsTopic].topicOverview);
    assert.equal(requestedPaths(mock).some((item) => item.includes('book-assets')), false);
  });
});

test('P4A coalesces concurrent subscribers for the same resource', async () => {
  const pending = deferred();
  const mock = createFetchMock({ [paths.index]: () => pending.promise });
  const loader = createContentLoader(mock);
  const first = loader.loadHome();
  const second = loader.loadHome();

  await Promise.resolve();
  assert.deepEqual(requestedPaths(mock), [paths.index]);
  pending.resolve(fixtures[paths.index]);
  const [firstContext, secondContext] = await Promise.all([first, second]);
  assert.equal(firstContext.index, secondContext.index);
});

test('P4A evicts failures so retry fetches only the failed resource again', async () => {
  const retryError = new Error('temporary topic failure');
  const mock = createFetchMock({
    [paths.workCellsTopic]: ({ attempt }) => {
      if (attempt === 1) throw retryError;
      return fixtures[paths.workCellsTopic];
    },
  });
  const loader = createContentLoader(mock);

  await assert.rejects(
    loader.loadWorkCellsTopic('streptococcus-pneumoniae'),
    /temporary topic failure/,
  );
  const context = await loader.loadWorkCellsTopic('streptococcus-pneumoniae');
  assert.equal(context.topic.slug, 'streptococcus-pneumoniae');
  assert.deepEqual(requestedPaths(mock), [
    paths.index,
    paths.workCells,
    paths.workCellsTopic,
    paths.workCellsTopic,
  ]);
});

test('P4A aborting one subscriber does not cancel another coalesced subscriber', async () => {
  const pending = deferred();
  let sharedSignal;
  const mock = createFetchMock({
    [paths.index]: ({ signal }) => {
      sharedSignal = signal;
      return pending.promise;
    },
  });
  const loader = createContentLoader(mock);
  const firstController = new AbortController();
  const secondController = new AbortController();
  const first = loader.loadHome({ signal: firstController.signal });
  const second = loader.loadHome({ signal: secondController.signal });

  await Promise.resolve();
  firstController.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(sharedSignal.aborted, false);
  pending.resolve(fixtures[paths.index]);
  assert.equal((await second).series.length, 2);
  assert.deepEqual(requestedPaths(mock), [paths.index]);
});

test('P4A fully aborted work is evicted and a later call starts a fresh request', async () => {
  const pendingByAttempt = [deferred(), deferred()];
  const observedSignals = [];
  const mock = createFetchMock({
    [paths.index]: ({ signal, attempt }) => {
      observedSignals.push(signal);
      return pendingByAttempt[attempt - 1].promise;
    },
  });
  const loader = createContentLoader(mock);
  const controller = new AbortController();
  const first = loader.loadHome({ signal: controller.signal });

  await Promise.resolve();
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  await Promise.resolve();
  assert.equal(observedSignals[0].aborted, true);

  const retry = loader.loadHome();
  await Promise.resolve();
  assert.deepEqual(requestedPaths(mock), [paths.index, paths.index]);
  pendingByAttempt[1].resolve(fixtures[paths.index]);
  assert.equal((await retry).series.length, 2);
  pendingByAttempt[0].resolve(fixtures[paths.index]);
});

test('P4A invalid slugs stop after the relevant summary index', async () => {
  const carmelaMock = createFetchMock();
  const carmela = await createContentLoader(carmelaMock).loadCarmelaBook('missing-book');
  assert.equal(carmela.summary, null);
  assert.equal(carmela.book, null);
  assert.deepEqual(requestedPaths(carmelaMock), [paths.index, paths.carmela]);

  const workCellsMock = createFetchMock();
  const workCells = await createContentLoader(workCellsMock).loadWorkCellsTopic('missing-topic');
  assert.equal(workCells.summary, null);
  assert.equal(workCells.topic, null);
  assert.deepEqual(requestedPaths(workCellsMock), [paths.index, paths.workCells]);
});

test('P4A cache reuse avoids requests for a section-like repeat and clear refetches', async () => {
  const mock = createFetchMock();
  const loader = createContentLoader(mock);
  const first = await loader.loadCarmelaBook('carmela-s1-01');
  const firstRequests = requestedPaths(mock);
  const second = await loader.loadCarmelaBook('carmela-s1-01');

  assert.deepEqual(requestedPaths(mock), firstRequests);
  assert.equal(first.book.assets, second.book.assets);
  assert.equal(first.book.companion, second.book.companion);

  loader.clear();
  await loader.loadHome();
  assert.equal(requestedPaths(mock).filter((item) => item === paths.index).length, 2);
});

test('P4A clear aborts in-flight work and removes it from the request cache', async () => {
  const pending = deferred();
  let requestSignal;
  const mock = createFetchMock({
    [paths.index]: ({ signal }) => {
      requestSignal = signal;
      return pending.promise;
    },
  });
  const loader = createContentLoader(mock);
  const loading = loader.loadHome();

  await Promise.resolve();
  loader.clear();
  assert.equal(requestSignal.aborted, true);
  pending.resolve(fixtures[paths.index]);
  await assert.rejects(loading, { name: 'AbortError' });
});

test('P4A rejects a pre-aborted call without issuing a request', async () => {
  const mock = createFetchMock();
  const loader = createContentLoader(mock);
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(loader.loadHome({ signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(requestedPaths(mock), []);
});
