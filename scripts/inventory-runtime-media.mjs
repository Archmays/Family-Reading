import { createHash } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CORRECTED_WORK_CELLS_INVENTORY_PATH,
  IMAGE_EXTENSIONS,
  MEDIA_REFERENCE_REPORT_PATH,
  assertAllowedOutput,
  normalizeAudioPath,
  normalizeImagePath,
  projectPath,
  sortedUnique,
  stableCompare,
} from './media-path-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const branchInputPaths = Object.freeze({
  carmelaBooks: 'public/runtime/carmela/books.json',
  carmelaSeries: 'public/books/不一样的卡梅拉/series.json',
  workCellsTopics: 'public/runtime/work-cells/topics.json',
});
const mediaScanRoots = Object.freeze([
  'public/books/不一样的卡梅拉',
  'public/assets/cells-at-work/page-thumbnails',
  'public/assets/cells-at-work/science-station',
]);

function parseArguments(argv) {
  const options = { mode: 'print', outputDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--write') options.mode = 'write';
    else if (argument === '--check') options.mode = 'check';
    else if (argument === '--output') {
      const next = argv[index + 1];
      if (!next) throw new Error('--output requires a directory.');
      options.outputDir = next;
      index += 1;
    } else {
      throw new Error(`Unknown inventory argument: ${argument}`);
    }
  }
  if (options.outputDir && options.mode === 'check') {
    throw new Error('--output cannot be combined with --check.');
  }
  return options;
}

async function readJson(repositoryPath) {
  return JSON.parse(await readFile(projectPath(rootDir, repositoryPath), 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function hashFile(repositoryPath) {
  const bytes = await readFile(projectPath(rootDir, repositoryPath));
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function repositoryPathFromAbsolute(targetPath) {
  return path.relative(rootDir, targetPath).split(path.sep).join('/');
}

async function walkImages(repositoryRoot) {
  const absoluteRoot = projectPath(rootDir, repositoryRoot);
  const results = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => stableCompare(left.name, right.name));
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(entryPath);
      else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(normalizeImagePath(repositoryPathFromAbsolute(entryPath)));
      }
    }
  }
  try {
    await walk(absoluteRoot);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return results;
}

function createRegistry() {
  return new Map();
}

function addUse(registry, mediaPath, {
  domain,
  ownerType,
  ownerId,
  ownerTitle,
  role,
  section,
  field,
}) {
  const normalizedPath = normalizeImagePath(mediaPath, { label: 'Referenced media path' });
  if (!registry.has(normalizedPath)) {
    registry.set(normalizedPath, {
      path: normalizedPath,
      domains: new Set(),
      roles: new Set(),
      useSites: new Map(),
    });
  }
  const media = registry.get(normalizedPath);
  media.domains.add(domain);
  media.roles.add(role);
  const useSite = {
    domain,
    ownerType,
    ownerId,
    ownerTitle,
    role,
    section,
    field,
  };
  const useKey = [domain, ownerType, ownerId, role, section, field].join('|');
  media.useSites.set(useKey, useSite);
  return normalizedPath;
}

function bookRelativePath(folder, reference) {
  const value = String(reference ?? '').trim().replaceAll('\\', '/');
  if (!value) return null;
  if (value.startsWith('public/')) return normalizeImagePath(value);
  return normalizeImagePath(`${folder}/${value}`);
}

function collectCarmelaReferences(value, context, registry, currentPath = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectCarmelaReferences(item, context, registry, `${currentPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    const references = Array.isArray(child) ? child : [];
    if (key === 'generatedImageRefs') {
      references.forEach((reference) => {
        const mediaPath = bookRelativePath(context.folder, reference);
        if (!mediaPath) return;
        addUse(registry, mediaPath, {
          ...context,
          role: 'carmela-explanation-preview',
          section: currentPath,
          field: key,
        });
        addUse(registry, mediaPath, {
          ...context,
          role: 'carmela-lightbox',
          section: currentPath,
          field: key,
        });
      });
    } else if (['imageRefs', 'evidenceImageRefs'].includes(key)) {
      references.forEach((reference) => {
        const mediaPath = bookRelativePath(context.folder, reference);
        if (!mediaPath) return;
        addUse(registry, mediaPath, {
          ...context,
          role: 'carmela-page-preview',
          section: currentPath,
          field: key,
        });
        addUse(registry, mediaPath, {
          ...context,
          role: 'carmela-lightbox',
          section: currentPath,
          field: key,
        });
      });
    }
    collectCarmelaReferences(child, context, registry, childPath);
  }
}

async function collectCarmela(registry) {
  const runtime = await readJson(branchInputPaths.carmelaBooks);
  const series = await readJson(branchInputPaths.carmelaSeries);
  const seriesBySlug = new Map(series.books.map((book) => [book.slug, book]));
  const audio = [];
  const books = [];

  for (const book of runtime.books) {
    const sourceBook = seriesBySlug.get(book.slug);
    if (!sourceBook) throw new Error(`Carmela runtime book is missing from series.json: ${book.slug}`);
    const context = {
      domain: 'carmela',
      ownerType: 'book',
      ownerId: book.slug,
      ownerTitle: book.title,
      folder: book.folder,
    };
    addUse(registry, book.cover, {
      ...context,
      role: 'carmela-series-cover',
      section: 'series',
      field: 'cover',
    });
    addUse(registry, book.cover, {
      ...context,
      role: 'carmela-book-cover',
      section: 'detail-hero',
      field: 'cover',
    });

    const companion = await readJson(book.companionPath);
    collectCarmelaReferences(companion, context, registry);

    const asset = await readJson(book.assetPath);
    const availablePageImages = (asset.pageImages ?? []).map((reference) => bookRelativePath(book.folder, reference));
    const audioPath = sourceBook.audio?.path ? normalizeAudioPath(sourceBook.audio.path) : null;
    if (audioPath) audio.push({
      path: audioPath,
      domain: 'carmela',
      ownerId: book.slug,
      ownerTitle: book.title,
      role: 'carmela-book-audio',
    });
    books.push({
      order: book.order,
      slug: book.slug,
      title: book.title,
      folder: book.folder,
      cover: book.cover,
      assetPath: book.assetPath,
      companionPath: book.companionPath,
      availablePageImages,
      audioPath,
    });
  }

  return { books, audio };
}

async function collectWorkCells(registry) {
  const index = await readJson(branchInputPaths.workCellsTopics);
  const correctedTopics = [];

  for (const summary of index.topics) {
    addUse(registry, summary.thumbnailPath, {
      domain: 'work-cells',
      ownerType: 'topic',
      ownerId: summary.slug,
      ownerTitle: summary.displayTitle,
      role: 'work-cells-series-thumbnail',
      section: 'series',
      field: 'thumbnailPath',
    });
    addUse(registry, summary.thumbnailPath, {
      domain: 'work-cells',
      ownerType: 'topic',
      ownerId: summary.slug,
      ownerTitle: summary.displayTitle,
      role: 'work-cells-topic-hero',
      section: 'detail-hero',
      field: 'thumbnailPath',
    });

    const topic = await readJson(summary.detailPath);
    const pageRefs = topic.pageRefs ?? {};
    for (const station of topic.bodyScienceStations ?? []) {
      if (station.imageAsset) {
        addUse(registry, station.imageAsset, {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: summary.slug,
          ownerTitle: summary.displayTitle,
          role: 'work-cells-station-preview',
          section: `station:${station.stationId}`,
          field: 'imageAsset',
        });
        addUse(registry, station.imageAsset, {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: summary.slug,
          ownerTitle: summary.displayTitle,
          role: 'work-cells-lightbox',
          section: `station:${station.stationId}`,
          field: 'imageAsset',
        });
      }
      for (const pageId of station.relatedPageIds ?? []) {
        const page = pageRefs[pageId];
        if (!page?.imagePath) throw new Error(`Missing Work Cells pageRef ${summary.slug}:${pageId}`);
        addUse(registry, page.imagePath, {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: summary.slug,
          ownerTitle: summary.displayTitle,
          role: 'work-cells-manga-preview',
          section: `station:${station.stationId}`,
          field: `relatedPageIds:${pageId}`,
        });
        addUse(registry, page.imagePath, {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: summary.slug,
          ownerTitle: summary.displayTitle,
          role: 'work-cells-lightbox',
          section: `station:${station.stationId}`,
          field: `relatedPageIds:${pageId}`,
        });
      }
    }
    for (const card of topic.parentQuestionCards ?? []) {
      for (const pageId of card.relatedPageIds ?? []) {
        const page = pageRefs[pageId];
        if (!page?.imagePath) throw new Error(`Missing Work Cells question pageRef ${summary.slug}:${pageId}`);
        addUse(registry, page.imagePath, {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: summary.slug,
          ownerTitle: summary.displayTitle,
          role: 'work-cells-manga-preview',
          section: `question:${card.cardId}`,
          field: `relatedPageIds:${pageId}`,
        });
        addUse(registry, page.imagePath, {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: summary.slug,
          ownerTitle: summary.displayTitle,
          role: 'work-cells-lightbox',
          section: `question:${card.cardId}`,
          field: `relatedPageIds:${pageId}`,
        });
      }
    }

    correctedTopics.push({
      order: topic.order,
      topicId: topic.topicId,
      slug: topic.slug,
      displayTitle: topic.displayTitle,
      category: topic.category,
      sourceLabel: topic.source?.sourceLabel ?? summary.sourceLabel,
      detailPath: summary.detailPath,
      stationCount: (topic.bodyScienceStations ?? []).length,
      questionCount: (topic.parentQuestionCards ?? []).length,
      pageRefCount: Object.keys(pageRefs).length,
      stationImageCount: (topic.bodyScienceStations ?? []).filter((station) => station.imageAsset).length,
    });
  }

  correctedTopics.sort((left, right) => left.order - right.order || stableCompare(left.slug, right.slug));
  return {
    schemaVersion: 1,
    sourceOfTruth: branchInputPaths.workCellsTopics,
    topicCount: correctedTopics.length,
    categoryCount: new Set(correctedTopics.map((topic) => topic.category)).size,
    stationCount: correctedTopics.reduce((sum, topic) => sum + topic.stationCount, 0),
    questionCount: correctedTopics.reduce((sum, topic) => sum + topic.questionCount, 0),
    pageRefCount: correctedTopics.reduce((sum, topic) => sum + topic.pageRefCount, 0),
    includesHemorrhagicShock: correctedTopics.some((topic) => topic.slug === 'hemorrhagic-shock'),
    topics: correctedTopics,
  };
}

async function materializeRegistry(registry, availablePaths) {
  const availableSet = new Set(availablePaths);
  const records = [];
  const missing = [];
  for (const media of [...registry.values()].sort((left, right) => stableCompare(left.path, right.path))) {
    let fileState = null;
    try {
      fileState = await hashFile(media.path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      missing.push(media.path);
    }
    records.push({
      path: media.path,
      domains: [...media.domains].sort(stableCompare),
      roles: [...media.roles].sort(stableCompare),
      useSites: [...media.useSites.values()].sort((left, right) => stableCompare(
        [left.domain, left.ownerId, left.role, left.section, left.field].join('|'),
        [right.domain, right.ownerId, right.role, right.section, right.field].join('|'),
      )),
      present: Boolean(fileState),
      bytes: fileState?.bytes ?? null,
      sha256: fileState?.sha256 ?? null,
      metadata: {
        width: null,
        height: null,
        format: path.posix.extname(media.path).slice(1).toLowerCase(),
        mode: null,
        hasAlpha: null,
        orientation: null,
        decoderStatus: 'pending-local-pillow-inventory',
      },
      availableInScannedRoots: availableSet.has(media.path),
    });
  }
  return { records, missing: missing.sort(stableCompare) };
}

export async function generateMediaInventory() {
  const registry = createRegistry();
  const carmela = await collectCarmela(registry);
  const correctedWorkCells = await collectWorkCells(registry);
  const availablePaths = sortedUnique((await Promise.all(mediaScanRoots.map(walkImages))).flat());
  const { records, missing } = await materializeRegistry(registry, availablePaths);
  const referencedPaths = new Set(records.map((record) => record.path));
  const unreferencedAvailable = availablePaths.filter((mediaPath) => !referencedPaths.has(mediaPath));
  const roleCounts = {};
  for (const record of records) {
    for (const role of record.roles) roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  }
  const audio = [];
  for (const item of carmela.audio.sort((left, right) => stableCompare(left.path, right.path))) {
    let fileState = null;
    try {
      fileState = await hashFile(item.path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    audio.push({ ...item, present: Boolean(fileState), ...fileState });
  }

  return {
    inventory: {
      schemaVersion: 1,
      sourceOfTruth: branchInputPaths,
      scanRoots: mediaScanRoots,
      counts: {
        referencedImages: records.length,
        referencedUseSites: records.reduce((sum, record) => sum + record.useSites.length, 0),
        availableImagesInScannedRoots: availablePaths.length,
        unreferencedAvailableImages: unreferencedAvailable.length,
        missingReferencedImages: missing.length,
        audioFiles: audio.length,
        carmelaBooks: carmela.books.length,
        workCellsTopics: correctedWorkCells.topicCount,
      },
      roleCounts: Object.fromEntries(Object.entries(roleCounts).sort(([left], [right]) => stableCompare(left, right))),
      media: records,
      audio,
      unreferencedAvailable,
      missing,
      pendingLocalEnrichment: [
        'width',
        'height',
        'decodedFormat',
        'mode',
        'hasAlpha',
        'orientation',
        'duplicatePixelHash',
      ],
    },
    correctedWorkCells,
  };
}

async function writeOutput(outputPath, value) {
  assertAllowedOutput(rootDir, outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, stableJson(value), 'utf8');
}

async function checkOutput(outputPath, value) {
  const expected = stableJson(value);
  let actual;
  try {
    actual = await readFile(outputPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Generated media inventory is missing: ${repositoryPathFromAbsolute(outputPath)}`);
    throw error;
  }
  if (actual.replaceAll('\r\n', '\n') !== expected) {
    throw new Error(`Generated media inventory is stale: ${repositoryPathFromAbsolute(outputPath)}`);
  }
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const generated = await generateMediaInventory();
  const outputRoot = options.outputDir
    ? assertAllowedOutput(rootDir, path.resolve(rootDir, options.outputDir))
    : rootDir;
  const inventoryPath = options.outputDir
    ? path.join(outputRoot, path.basename(MEDIA_REFERENCE_REPORT_PATH))
    : projectPath(rootDir, MEDIA_REFERENCE_REPORT_PATH);
  const correctedPath = options.outputDir
    ? path.join(outputRoot, path.basename(CORRECTED_WORK_CELLS_INVENTORY_PATH))
    : projectPath(rootDir, CORRECTED_WORK_CELLS_INVENTORY_PATH);

  if (options.mode === 'write' || options.outputDir) {
    await writeOutput(inventoryPath, generated.inventory);
    await writeOutput(correctedPath, generated.correctedWorkCells);
    console.log(`Media inventory written: ${repositoryPathFromAbsolute(inventoryPath)}`);
    console.log(`Corrected Work Cells inventory written: ${repositoryPathFromAbsolute(correctedPath)}`);
  } else if (options.mode === 'check') {
    await checkOutput(inventoryPath, generated.inventory);
    await checkOutput(correctedPath, generated.correctedWorkCells);
    console.log('Media inventory and corrected Work Cells evidence are current.');
  } else {
    process.stdout.write(stableJson(generated));
  }
}

const directExecutionPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const scriptPath = fileURLToPath(import.meta.url);
const sameScript = process.platform === 'win32'
  ? directExecutionPath.toLowerCase() === scriptPath.toLowerCase()
  : directExecutionPath === scriptPath;

if (sameScript) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
