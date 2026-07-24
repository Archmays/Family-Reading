import path from 'node:path';

export const MEDIA_MANIFEST_PATH = 'public/media/media-manifest.json';
export const MEDIA_DERIVATIVE_ROOT = 'public/media/derived';
export const MEDIA_REFERENCE_REPORT_PATH = 'reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json';
export const CORRECTED_WORK_CELLS_INVENTORY_PATH = 'reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json';
export const MEDIA_POLICY_PATH = 'reports/portfolio/fr-p5/fr-p5-media-quality-policy.json';

export const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
export const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav']);

export const MEDIA_ROLES = Object.freeze({
  'carmela-series-cover': { family: 'cover', defaultSizes: '(max-width: 680px) 44vw, 176px' },
  'carmela-book-cover': { family: 'cover', defaultSizes: '(max-width: 900px) 44vw, 320px' },
  'carmela-page-preview': { family: 'page', defaultSizes: '(max-width: 680px) 42vw, 240px' },
  'carmela-explanation-preview': { family: 'illustration', defaultSizes: '(max-width: 680px) 88vw, 640px' },
  'carmela-lightbox': { family: 'detail', defaultSizes: 'min(92vw, 1600px)' },
  'work-cells-series-thumbnail': { family: 'cover', defaultSizes: '(max-width: 680px) 42vw, 200px' },
  'work-cells-topic-hero': { family: 'hero', defaultSizes: '(max-width: 1088px) min(88vw, 448px), 320px' },
  'work-cells-station-preview': { family: 'illustration', defaultSizes: '(max-width: 680px) 88vw, 640px' },
  'work-cells-manga-preview': { family: 'page', defaultSizes: '(max-width: 680px) 42vw, 240px' },
  'work-cells-lightbox': { family: 'detail', defaultSizes: 'min(92vw, 1600px)' },
});

export function stableCompare(left, right) {
  const a = String(left);
  const b = String(right);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function normalizeRepositoryPath(value, {
  label = 'Repository path',
  requirePublic = true,
  allowedExtensions = null,
} = {}) {
  const raw = String(value ?? '').trim().replaceAll('\\', '/');
  if (
    !raw
    || raw.startsWith('/')
    || /^[A-Za-z]:\//.test(raw)
    || raw.includes('//')
  ) {
    throw new Error(`${label} must be a non-empty repository-relative path: ${raw || '<empty>'}`);
  }

  const parts = raw.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`${label} contains an unsafe path segment: ${raw}`);
  }
  if (requirePublic && parts[0] !== 'public') {
    throw new Error(`${label} must stay under public/: ${raw}`);
  }

  const extension = path.posix.extname(raw).toLowerCase();
  if (allowedExtensions && !allowedExtensions.has(extension)) {
    throw new Error(`${label} has an unsupported extension ${extension || '<none>'}: ${raw}`);
  }
  return parts.join('/');
}

export function normalizeImagePath(value, options = {}) {
  return normalizeRepositoryPath(value, {
    ...options,
    allowedExtensions: IMAGE_EXTENSIONS,
  });
}

export function normalizeAudioPath(value, options = {}) {
  return normalizeRepositoryPath(value, {
    ...options,
    allowedExtensions: AUDIO_EXTENSIONS,
  });
}

export function projectPath(rootDir, repositoryPath) {
  const normalized = normalizeRepositoryPath(repositoryPath, { requirePublic: false });
  const target = path.resolve(rootDir, ...normalized.split('/'));
  const relative = path.relative(path.resolve(rootDir), target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Resolved path escaped the project root: ${repositoryPath}`);
  }
  return target;
}

export function assertAllowedOutput(rootDir, outputPath, allowedRepositoryRoots = [
  'public/media',
  'reports/portfolio/fr-p5',
  'task-scratch/fr-p5',
]) {
  const root = path.resolve(rootDir);
  const target = path.resolve(outputPath);
  const relative = path.relative(root, target).split(path.sep).join('/');
  if (!relative || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error(`Output must stay inside the project root: ${target}`);
  }
  const allowed = allowedRepositoryRoots.some((prefix) => (
    relative === prefix || relative.startsWith(`${prefix}/`)
  ));
  if (!allowed) {
    throw new Error(`Output is outside the FR-P5 allowlist: ${relative}`);
  }
  return target;
}

function safeStem(repositoryPath) {
  const filename = path.posix.basename(repositoryPath, path.posix.extname(repositoryPath));
  return filename
    .normalize('NFKD')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'media';
}

export function derivativeRepositoryPath({ sourcePath, sourceHash, profileId, extension }) {
  const normalizedSource = normalizeImagePath(sourcePath, { label: 'Derivative source path' });
  const hash = String(sourceHash ?? '').toLowerCase();
  const profile = String(profileId ?? '').trim().toLowerCase();
  const ext = String(extension ?? '').trim().toLowerCase().replace(/^\./, '');
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid source SHA-256: ${sourceHash}`);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(profile)) throw new Error(`Invalid derivative profile id: ${profileId}`);
  if (!['avif', 'jpeg', 'jpg', 'png', 'webp'].includes(ext)) {
    throw new Error(`Unsupported derivative extension: ${extension}`);
  }
  return `${MEDIA_DERIVATIVE_ROOT}/${hash.slice(0, 2)}/${hash.slice(2, 14)}/${safeStem(normalizedSource)}-${profile}.${ext}`;
}

export function roleDefinition(role) {
  const definition = MEDIA_ROLES[role];
  if (!definition) throw new Error(`Unknown media role: ${role}`);
  return definition;
}

export function sortedUnique(values) {
  return [...new Set((values ?? []).filter(Boolean))].sort(stableCompare);
}
