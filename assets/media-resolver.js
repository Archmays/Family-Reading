const DEFAULT_ROLE_SIZES = Object.freeze({
  'carmela-series-cover': '(max-width: 680px) 44vw, 176px',
  'carmela-book-cover': '(max-width: 900px) 44vw, 320px',
  'carmela-page-preview': '(max-width: 680px) 42vw, 240px',
  'carmela-explanation-preview': '(max-width: 680px) 88vw, 640px',
  'carmela-lightbox': 'min(92vw, 1600px)',
  'work-cells-series-thumbnail': '(max-width: 680px) 42vw, 200px',
  'work-cells-topic-hero': '(max-width: 1088px) min(88vw, 448px), 320px',
  'work-cells-station-preview': '(max-width: 680px) 88vw, 640px',
  'work-cells-manga-preview': '(max-width: 680px) 42vw, 240px',
  'work-cells-lightbox': 'min(92vw, 1600px)',
});

const FORMAT_MIME = Object.freeze({
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
});

function html(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizePath(value) {
  return String(value ?? '').trim().replace(/^\.?\//, '').replaceAll('\\', '/');
}

function ordinal(left, right) {
  const a = String(left);
  const b = String(right);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function roleVariants(entry, role) {
  return (entry?.variants ?? [])
    .filter((variant) => variant.roles?.includes(role))
    .sort((left, right) => left.width - right.width || ordinal(left.format, right.format) || ordinal(left.path, right.path));
}

function groupedByFormat(variants) {
  const groups = new Map();
  for (const variant of variants) {
    const format = String(variant.format ?? '').toLowerCase();
    if (!groups.has(format)) groups.set(format, []);
    groups.get(format).push(variant);
  }
  return [...groups.entries()]
    .map(([format, items]) => ({ format, items: items.sort((left, right) => left.width - right.width) }))
    .sort((left, right) => {
      const priority = { avif: 0, webp: 1, jpeg: 2, jpg: 2, png: 3 };
      return (priority[left.format] ?? 9) - (priority[right.format] ?? 9) || ordinal(left.format, right.format);
    });
}

function chooseFallback(entry, variants) {
  if (!entry) return null;
  const declared = variants.find((variant) => variant.path === entry.fallbackPath);
  if (declared) return declared;
  const preferred = [...variants]
    .filter((variant) => ['webp', 'jpeg', 'jpg', 'png'].includes(variant.format))
    .sort((left, right) => right.width - left.width || ordinal(left.path, right.path))[0];
  if (preferred) return preferred;
  return {
    path: entry.fallbackPath || entry.sourcePath,
    width: entry.sourceWidth,
    height: entry.sourceHeight,
    format: entry.sourceFormat,
  };
}

function renderAttributes(attributes) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '')
    .map(([name, value]) => value === true ? name : `${name}="${html(value)}"`)
    .join(' ');
}

export function createMediaResolver(manifest, { sitePath = (value) => value } = {}) {
  const entries = new Map((manifest?.media ?? []).map((entry) => [normalizePath(entry.sourcePath), entry]));

  function entryFor(sourcePath) {
    return entries.get(normalizePath(sourcePath)) ?? null;
  }

  function resolve(sourcePath, role) {
    const normalizedSource = normalizePath(sourcePath);
    const entry = entryFor(normalizedSource);
    if (!entry || !role) {
      return {
        sourcePath: normalizedSource,
        role,
        manifestEntry: null,
        variants: [],
        fallback: {
          path: normalizedSource,
          width: null,
          height: null,
          format: normalizedSource.split('.').pop()?.toLowerCase() || '',
        },
      };
    }
    const variants = roleVariants(entry, role);
    return {
      sourcePath: normalizedSource,
      role,
      manifestEntry: entry,
      variants,
      fallback: chooseFallback(entry, variants),
    };
  }

  function largestPath(sourcePath, role) {
    const resolved = resolve(sourcePath, role);
    const largest = [...resolved.variants].sort((left, right) => right.width - left.width || ordinal(left.path, right.path))[0];
    return sitePath(largest?.path ?? resolved.fallback.path);
  }

  function picture(sourcePath, {
    role,
    alt = '',
    sizes = DEFAULT_ROLE_SIZES[role] ?? '100vw',
    className = '',
    pictureClassName = '',
    loading = 'lazy',
    decoding = 'async',
    fetchPriority = '',
    hidden = false,
    data = {},
  } = {}) {
    const resolved = resolve(sourcePath, role);
    const groups = groupedByFormat(resolved.variants);
    const sourceMarkup = groups.map(({ format, items }) => {
      const mime = FORMAT_MIME[format];
      if (!mime) return '';
      const srcset = items.map((variant) => `${sitePath(variant.path)} ${variant.width}w`).join(', ');
      return `<source type="${mime}" srcset="${html(srcset)}" sizes="${html(sizes)}">`;
    }).join('');
    const fallback = resolved.fallback;
    const dataAttributes = Object.fromEntries(Object.entries(data).map(([key, value]) => [`data-${key}`, value]));
    const imageAttributes = renderAttributes({
      src: sitePath(fallback.path),
      alt,
      class: className,
      width: fallback.width,
      height: fallback.height,
      loading,
      decoding,
      fetchpriority: fetchPriority,
      hidden,
      ...dataAttributes,
    });
    const pictureAttributes = renderAttributes({ class: pictureClassName, 'data-responsive-media': role || true });
    return `<picture ${pictureAttributes}>${sourceMarkup}<img ${imageAttributes}></picture>`;
  }

  return {
    entryFor,
    resolve,
    largestPath,
    picture,
    has(sourcePath) {
      return entries.has(normalizePath(sourcePath));
    },
    count: entries.size,
  };
}

export function responsiveMediaFallback(sourcePath, options = {}) {
  return createMediaResolver(null, options);
}
