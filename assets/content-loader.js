const RUNTIME_INDEX_PATH = 'public/runtime/index.json';
const CARMELA_SERIES_SLUG = 'carmela-season-1';
const WORK_CELLS_SERIES_SLUG = 'work-cells';

function abortError() {
  const error = new Error('The content request was aborted.');
  error.name = 'AbortError';
  return error;
}

function requiredPath(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing runtime path: ${label}`);
  }
  return value;
}

function requiredSeries(index, seriesSlug) {
  const series = index?.series?.find((item) => item.seriesSlug === seriesSlug);
  if (!series) {
    throw new Error(`Missing runtime series: ${seriesSlug}`);
  }
  return series;
}

export function createContentLoader({ fetchJson } = {}) {
  if (typeof fetchJson !== 'function') {
    throw new TypeError('createContentLoader requires fetchJson');
  }

  const cache = new Map();
  const inFlight = new Map();

  function createEntry(resourcePath) {
    const controller = new AbortController();
    const entry = {
      controller,
      invalidated: false,
      settled: false,
      subscribers: new Set(),
      promise: null,
    };

    entry.promise = Promise.resolve()
      .then(() => fetchJson(resourcePath, { signal: controller.signal }))
      .then((value) => {
        if (entry.invalidated) throw abortError();
        cache.set(resourcePath, value);
        return value;
      })
      .finally(() => {
        entry.settled = true;
        if (inFlight.get(resourcePath) === entry) inFlight.delete(resourcePath);
      });

    inFlight.set(resourcePath, entry);
    return entry;
  }

  function abortIfUnobserved(resourcePath, entry) {
    queueMicrotask(() => {
      if (entry.settled || entry.subscribers.size > 0 || inFlight.get(resourcePath) !== entry) return;
      entry.invalidated = true;
      inFlight.delete(resourcePath);
      entry.controller.abort();
    });
  }

  function subscribe(resourcePath, entry, signal) {
    const subscriber = {};
    entry.subscribers.add(subscriber);

    return new Promise((resolve, reject) => {
      let subscriberSettled = false;

      const finish = (callback, value) => {
        if (subscriberSettled) return;
        subscriberSettled = true;
        signal?.removeEventListener('abort', onAbort);
        entry.subscribers.delete(subscriber);
        callback(value);
        abortIfUnobserved(resourcePath, entry);
      };

      const onAbort = () => finish(reject, abortError());
      signal?.addEventListener('abort', onAbort, { once: true });

      entry.promise.then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error),
      );
    });
  }

  function loadResource(resourcePath, { signal } = {}) {
    if (signal?.aborted) return Promise.reject(abortError());
    if (cache.has(resourcePath)) return Promise.resolve(cache.get(resourcePath));
    const entry = inFlight.get(resourcePath) ?? createEntry(resourcePath);
    return subscribe(resourcePath, entry, signal);
  }

  async function loadHome(options = {}) {
    const index = await loadResource(RUNTIME_INDEX_PATH, options);
    return {
      index,
      series: Array.isArray(index?.series) ? index.series : [],
    };
  }

  async function loadCarmelaSeries(options = {}) {
    const home = await loadHome(options);
    const series = requiredSeries(home.index, CARMELA_SERIES_SLUG);
    const catalog = await loadResource(requiredPath(series.indexPath, 'Carmela index'), options);
    return {
      index: home.index,
      series,
      catalog,
      books: Array.isArray(catalog?.books) ? catalog.books : [],
    };
  }

  async function loadCarmelaBook(slug, options = {}) {
    const context = await loadCarmelaSeries(options);
    const summary = context.books.find((book) => book.slug === slug) ?? null;
    if (!summary) {
      return {
        ...context,
        summary: null,
        assets: null,
        companion: null,
        book: null,
      };
    }

    const [assets, companion] = await Promise.all([
      loadResource(requiredPath(summary.assetPath, 'Carmela asset detail'), options),
      loadResource(requiredPath(summary.companionPath, 'Carmela companion detail'), options),
    ]);
    return {
      ...context,
      summary,
      assets,
      companion,
      book: {
        ...summary,
        seriesTitle: context.catalog?.seriesTitle ?? context.series.seriesTitle,
        assets,
        companion,
      },
    };
  }

  async function loadWorkCellsSeries(options = {}) {
    const home = await loadHome(options);
    const series = requiredSeries(home.index, WORK_CELLS_SERIES_SLUG);
    const catalog = await loadResource(requiredPath(series.indexPath, 'Work Cells index'), options);
    return {
      index: home.index,
      series,
      catalog,
      categories: Array.isArray(catalog?.categories) ? catalog.categories : [],
      topics: Array.isArray(catalog?.topics) ? catalog.topics : [],
    };
  }

  async function loadWorkCellsTopic(slug, options = {}) {
    const context = await loadWorkCellsSeries(options);
    const summary = context.topics.find((topic) => topic.slug === slug) ?? null;
    if (!summary) {
      return {
        ...context,
        summary: null,
        topic: null,
      };
    }

    const detail = await loadResource(requiredPath(summary.detailPath, 'Work Cells topic detail'), options);
    return {
      ...context,
      summary,
      topic: {
        ...summary,
        ...detail,
      },
    };
  }

  function clear() {
    cache.clear();
    for (const [resourcePath, entry] of inFlight) {
      entry.invalidated = true;
      inFlight.delete(resourcePath);
      entry.controller.abort();
    }
  }

  return {
    loadHome,
    loadCarmelaSeries,
    loadCarmelaBook,
    loadWorkCellsSeries,
    loadWorkCellsTopic,
    clear,
  };
}
