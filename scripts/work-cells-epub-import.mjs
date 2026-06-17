import { readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const textDecoder = new TextDecoder('utf8');
const validationPendingText = '尚未完成 EPUB 实际验证';
const publicForbiddenInputDirs = new Set(['public', 'dist', 'build', 'docs']);
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);

const defaultInputDirectories = [
  'source-private/cells-at-work',
  'source-private/工作细胞',
  'private/cells-at-work',
  'private/工作细胞',
  'local-epubs/cells-at-work',
  'local-epubs/工作细胞',
  'source/工作细胞',
];

const defaultOptions = {
  rootDir,
  manifestPath: path.join(rootDir, 'public', 'books', '工作细胞', 'draft-manifest.json'),
  rawOutputPath: path.join(rootDir, 'docs', 'work-cells-epub-raw-directory.json'),
  diffOutputPath: path.join(rootDir, 'docs', 'work-cells-epub-diff-report.md'),
  pageMapOutputPath: path.join(rootDir, 'docs', 'work-cells-epub-page-map.json'),
  publicOutputBaseDirectory: path.join(rootDir, 'public', 'books', '工作细胞'),
  extractImages: false,
};

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function pad(value, size) {
  return String(value).padStart(size, '0');
}

function xmlDecode(value = '') {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function stripTags(value = '') {
  return xmlDecode(value.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAttributes(attributeText = '') {
  const attributes = {};
  const attributePattern = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of attributeText.matchAll(attributePattern)) {
    attributes[match[1]] = xmlDecode(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

function findOpeningTags(xml, localName) {
  const pattern = new RegExp(`<(?:[\\w.-]+:)?${localName}\\b([^>]*)>`, 'gi');
  return [...xml.matchAll(pattern)].map((match) => ({
    raw: match[0],
    attributes: parseAttributes(match[1] ?? ''),
  }));
}

function findFirstOpeningTag(xml, localName) {
  return findOpeningTags(xml, localName)[0] ?? null;
}

function findSection(xml, localName) {
  const pattern = new RegExp(`<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${localName}>`, 'i');
  return xml.match(pattern)?.[1] ?? '';
}

function findText(xml, localName) {
  const pattern = new RegExp(`<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${localName}>`, 'i');
  return stripTags(xml.match(pattern)?.[1] ?? '');
}

function normalizeZipPath(zipPath) {
  return path.posix.normalize(zipPath.replaceAll('\\', '/')).replace(/^\/+/, '');
}

function stripHrefFragment(href) {
  return href.split('#')[0];
}

function resolveZipHref(baseDirectory, href) {
  return normalizeZipPath(path.posix.join(baseDirectory, stripHrefFragment(href)));
}

function inferVolumeNumber(fileName) {
  const match = fileName.match(/(?:vol\.?\s*|第?\s*)?(\d+)\s*卷/i)
    ?? fileName.match(/(?:vol(?:ume)?\.?[-_\s]*)(\d+)/i);
  return match ? Number(match[1]) : null;
}

function safeFilePart(value, fallback) {
  const cleaned = String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

function assertInside(basePath, targetPath, message) {
  const relative = path.relative(path.resolve(basePath), path.resolve(targetPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(message ?? `Refusing to write outside ${basePath}: ${targetPath}`);
  }
}

function assertPrivateInputDirectory(inputDir, projectRoot) {
  assertInside(projectRoot, inputDir, `EPUB input must stay inside the project root: ${inputDir}`);
  const relative = toPosix(path.relative(projectRoot, inputDir));
  const firstSegment = relative.split('/')[0];
  if (publicForbiddenInputDirs.has(firstSegment)) {
    throw new Error(`Refusing to read full EPUB files from a public/deployable directory: ${relative}`);
  }
}

function assertPublicImageOutputDirectory(outputDir, projectRoot) {
  assertInside(projectRoot, outputDir, `Public image output must stay inside the project root: ${outputDir}`);
  const relative = toPosix(path.relative(projectRoot, outputDir));
  if (relative !== 'public' && !relative.startsWith('public/')) {
    throw new Error(`Converted page images must be written under public/: ${relative}`);
  }
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function listEpubFiles(inputDir) {
  if (!(await pathExists(inputDir))) {
    return [];
  }

  const results = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }

      if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.epub') {
        results.push(fullPath);
      }
    }
  }

  await visit(inputDir);
  return results.sort((a, b) => a.localeCompare(b, 'zh-Hans'));
}

async function chooseInputDirectory(projectRoot, explicitInputDir) {
  if (explicitInputDir) {
    return path.resolve(projectRoot, explicitInputDir);
  }

  for (const candidate of defaultInputDirectories) {
    const candidatePath = path.join(projectRoot, candidate);
    if ((await listEpubFiles(candidatePath)).length > 0) {
      return candidatePath;
    }
  }

  for (const candidate of defaultInputDirectories) {
    const candidatePath = path.join(projectRoot, candidate);
    if (await pathExists(candidatePath)) {
      return candidatePath;
    }
  }

  return path.join(projectRoot, defaultInputDirectories[0]);
}

function readZip(buffer) {
  const endSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const minimumEndOffset = Math.max(0, buffer.length - 22 - 0xffff);
  let endOffset = -1;

  for (let index = buffer.length - 22; index >= minimumEndOffset; index -= 1) {
    if (buffer.readUInt32LE(index) === endSignature) {
      endOffset = index;
      break;
    }
  }

  if (endOffset < 0) {
    throw new Error('Invalid EPUB ZIP: missing end of central directory');
  }

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  let cursor = centralDirectoryOffset;
  const entries = [];
  const entriesByName = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== centralSignature) {
      throw new Error('Invalid EPUB ZIP: bad central directory entry');
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const name = normalizeZipPath(buffer.toString('utf8', cursor + 46, cursor + 46 + fileNameLength));
    const entry = {
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    };
    entries.push(entry);
    entriesByName.set(name, entry);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  function readEntryBuffer(name) {
    const entry = entriesByName.get(normalizeZipPath(name));
    if (!entry) {
      throw new Error(`EPUB entry not found: ${name}`);
    }

    if (buffer.readUInt32LE(entry.localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Invalid EPUB ZIP: bad local header for ${name}`);
    }

    const fileNameLength = buffer.readUInt16LE(entry.localHeaderOffset + 26);
    const extraLength = buffer.readUInt16LE(entry.localHeaderOffset + 28);
    const dataOffset = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);

    if (entry.compressionMethod === 0) {
      return Buffer.from(compressed);
    }

    if (entry.compressionMethod === 8) {
      return inflateRawSync(compressed);
    }

    throw new Error(`Unsupported EPUB ZIP compression method ${entry.compressionMethod} for ${name}`);
  }

  function readEntryText(name) {
    return textDecoder.decode(readEntryBuffer(name));
  }

  return { entries, entriesByName, readEntryBuffer, readEntryText };
}

function parseContainer(containerXml) {
  const rootfile = findOpeningTags(containerXml, 'rootfile')[0];
  const opfPath = rootfile?.attributes['full-path'];
  if (!opfPath) {
    throw new Error('EPUB container.xml does not declare an OPF rootfile');
  }
  return normalizeZipPath(opfPath);
}

function parseOpf(opfXml, opfPath) {
  const opfDirectory = path.posix.dirname(opfPath);
  const packageAttributes = findFirstOpeningTag(opfXml, 'package')?.attributes ?? {};
  const metadataXml = findSection(opfXml, 'metadata');
  const manifestXml = findSection(opfXml, 'manifest');
  const spineXml = findSection(opfXml, 'spine');
  const spineAttributes = findFirstOpeningTag(opfXml, 'spine')?.attributes ?? {};

  const manifestItems = findOpeningTags(manifestXml, 'item').map((tag, index) => {
    const href = tag.attributes.href ?? '';
    return {
      order: index + 1,
      id: tag.attributes.id ?? '',
      href,
      path: href ? resolveZipHref(opfDirectory, href) : '',
      mediaType: tag.attributes['media-type'] ?? '',
      properties: tag.attributes.properties ?? '',
    };
  });

  const manifestById = new Map(manifestItems.map((item) => [item.id, item]));
  const manifestByPath = new Map(manifestItems.map((item) => [item.path, item]));

  const spineOrder = findOpeningTags(spineXml, 'itemref').map((tag, index) => {
    const manifestItem = manifestById.get(tag.attributes.idref ?? '');
    return {
      order: index + 1,
      idref: tag.attributes.idref ?? '',
      linear: tag.attributes.linear ?? 'yes',
      href: manifestItem?.href ?? null,
      path: manifestItem?.path ?? null,
      mediaType: manifestItem?.mediaType ?? null,
    };
  });

  return {
    path: opfPath,
    version: packageAttributes.version ?? null,
    uniqueIdentifier: packageAttributes['unique-identifier'] ?? null,
    metadata: {
      title: findText(metadataXml, 'title'),
      creator: findText(metadataXml, 'creator'),
      language: findText(metadataXml, 'language'),
      publisher: findText(metadataXml, 'publisher'),
      date: findText(metadataXml, 'date'),
    },
    manifestItems,
    manifestById,
    manifestByPath,
    spineAttributes,
    spineOrder,
  };
}

function parseNavXhtml(navXml, navPath) {
  const navDirectory = path.posix.dirname(navPath);
  const anchors = [...navXml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  return anchors.map((match, index) => {
    const attributes = parseAttributes(match[1] ?? '');
    const href = attributes.href ?? '';
    return {
      order: index + 1,
      title: stripTags(match[2] ?? ''),
      href,
      path: href ? resolveZipHref(navDirectory, href) : null,
    };
  });
}

function parseNcx(ncxXml, ncxPath) {
  const ncxDirectory = path.posix.dirname(ncxPath);
  const points = [...ncxXml.matchAll(/<navPoint\b[^>]*>([\s\S]*?)<\/navPoint>/gi)];
  return points.map((match, index) => {
    const body = match[1] ?? '';
    const contentTag = findOpeningTags(body, 'content')[0];
    const src = contentTag?.attributes.src ?? '';
    return {
      order: index + 1,
      title: findText(body, 'text'),
      href: src,
      path: src ? resolveZipHref(ncxDirectory, src) : null,
    };
  });
}

function isHtmlManifestItem(item) {
  return /x?html/i.test(item.mediaType ?? '') || /\.(xhtml|html?)$/i.test(item.href ?? '');
}

function isImageManifestItem(item) {
  return (item.mediaType ?? '').startsWith('image/') || imageExtensions.has(path.posix.extname(item.path ?? '').toLowerCase());
}

function imageReferencesFromDocument(documentXml) {
  const refs = [];
  for (const tag of findOpeningTags(documentXml, 'img')) {
    if (tag.attributes.src) {
      refs.push(tag.attributes.src);
    }
  }

  for (const tag of findOpeningTags(documentXml, 'image')) {
    const href = tag.attributes.href ?? tag.attributes['xlink:href'];
    if (href) {
      refs.push(href);
    }
  }

  return refs;
}

function parseToc(zip, opf) {
  const navItem = opf.manifestItems.find((item) => item.properties.split(/\s+/).includes('nav'));
  if (navItem && zip.entriesByName.has(navItem.path)) {
    return {
      type: 'nav',
      path: navItem.path,
      items: parseNavXhtml(zip.readEntryText(navItem.path), navItem.path),
    };
  }

  const ncxItem = opf.manifestById.get(opf.spineAttributes.toc) ?? opf.manifestItems.find((item) => /\.ncx$/i.test(item.href ?? ''));
  if (ncxItem && zip.entriesByName.has(ncxItem.path)) {
    return {
      type: 'ncx',
      path: ncxItem.path,
      items: parseNcx(zip.readEntryText(ncxItem.path), ncxItem.path),
    };
  }

  return { type: 'none', path: null, items: [] };
}

export async function parseEpubFile(epubPath, options = {}) {
  const projectRoot = path.resolve(options.rootDir ?? rootDir);
  assertInside(projectRoot, epubPath, `EPUB path must stay inside the project root: ${epubPath}`);

  const buffer = await readFile(epubPath);
  const epubStat = await stat(epubPath);
  const zip = readZip(buffer);
  const opfPath = parseContainer(zip.readEntryText('META-INF/container.xml'));
  const opf = parseOpf(zip.readEntryText(opfPath), opfPath);
  const toc = parseToc(zip, opf);
  const navTitleByPath = new Map(toc.items.filter((item) => item.path).map((item) => [stripHrefFragment(item.path), item.title]));
  const imageManifestOrder = opf.manifestItems.filter(isImageManifestItem).map((item, index) => ({
    order: index + 1,
    id: item.id,
    href: item.href,
    path: item.path,
    mediaType: item.mediaType,
  }));

  const chapterResourceOrder = [];
  const seenImages = new Set();
  const imageResourceOrder = [];

  for (const spineItem of opf.spineOrder) {
    const manifestItem = opf.manifestById.get(spineItem.idref);
    if (!manifestItem || !isHtmlManifestItem(manifestItem) || !zip.entriesByName.has(manifestItem.path)) {
      continue;
    }

    const documentXml = zip.readEntryText(manifestItem.path);
    const documentDirectory = path.posix.dirname(manifestItem.path);
    const imageResources = imageReferencesFromDocument(documentXml).map((href, index) => {
      const imagePath = resolveZipHref(documentDirectory, href);
      const imageManifestItem = opf.manifestByPath.get(imagePath);
      const resource = {
        order: index + 1,
        href,
        path: imagePath,
        manifestId: imageManifestItem?.id ?? null,
        mediaType: imageManifestItem?.mediaType ?? null,
      };

      if (!seenImages.has(imagePath)) {
        seenImages.add(imagePath);
        imageResourceOrder.push({
          order: imageResourceOrder.length + 1,
          path: imagePath,
          manifestId: resource.manifestId,
          mediaType: resource.mediaType,
          sourceDocumentPath: manifestItem.path,
        });
      }

      return resource;
    });

    chapterResourceOrder.push({
      order: chapterResourceOrder.length + 1,
      spineOrder: spineItem.order,
      idref: spineItem.idref,
      title: findText(documentXml, 'title') || navTitleByPath.get(manifestItem.path) || null,
      href: manifestItem.href,
      path: manifestItem.path,
      imageResources,
    });
  }

  const manifestItems = opf.manifestItems.map(({ order, id, href, path: itemPath, mediaType, properties }) => ({
    order,
    id,
    href,
    path: itemPath,
    mediaType,
    properties,
  }));

  return {
    fileName: path.basename(epubPath),
    relativePath: toPosix(path.relative(projectRoot, epubPath)),
    sizeBytes: epubStat.size,
    inferredVolume: inferVolumeNumber(path.basename(epubPath)),
    opf: {
      path: opf.path,
      version: opf.version,
      uniqueIdentifier: opf.uniqueIdentifier,
      metadata: opf.metadata,
      manifestItemCount: manifestItems.length,
      manifestItems,
      imageManifestOrder,
    },
    spineOrder: opf.spineOrder,
    toc,
    chapterResourceOrder,
    imageResourceOrder,
  };
}

async function loadReferenceManifestAsync(manifestPath) {
  if (!(await pathExists(manifestPath))) {
    return {
      path: manifestPath,
      exists: false,
      topics: [],
      topicCount: 0,
    };
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const topics = (manifest.topics ?? []).map((topic, index) => {
    const topicId = safeFilePart(topic.topicId ?? topic.slug, `topic-${pad(index + 1, 2)}`);
    const explicitSourceParts = Array.isArray(topic.epubSourceParts) && topic.epubSourceParts.length > 0
      ? topic.epubSourceParts
      : topic.sourceParts;
    const sourceParts = Array.isArray(explicitSourceParts) && explicitSourceParts.length > 0
      ? explicitSourceParts
      : [{
          sourcePartId: `v${pad(topic.source?.volume ?? index + 1, 2)}-pending`,
          volume: topic.source?.volume ?? null,
          label: topic.source?.sourceLabel ?? topic.source?.chapterLabel ?? null,
          status: 'page_range_pending',
        }];

    return {
      order: topic.order ?? index + 1,
      title: topic.title,
      topicId,
      slug: topic.slug ?? topicId,
      source: topic.source ?? null,
      sourceParts,
      mergeGroup: topic.mergeGroup ?? null,
      mergedFrom: topic.mergedFrom ?? [],
    };
  });

  return {
    path: manifestPath,
    exists: true,
    seriesTitle: manifest.seriesTitle ?? null,
    verificationStatus: manifest.verificationStatus ?? null,
    topics,
    topicCount: topics.length,
  };
}

function selectBookForSourcePart(sourcePart, parsedBooks) {
  if (sourcePart.volume != null) {
    return parsedBooks.find((book) => book.inferredVolume === Number(sourcePart.volume)) ?? null;
  }

  return parsedBooks.length === 1 ? parsedBooks[0] : null;
}

function titleReviewStatus(book, reference) {
  const epubTitle = book.opf.metadata.title ?? '';
  const referenceSeriesTitle = reference.seriesTitle ?? '';
  if (!epubTitle || !referenceSeriesTitle) {
    return {
      status: 'needs_manual_review',
      reason: 'missing_epub_or_reference_title',
      epubTitle,
      referenceSeriesTitle,
    };
  }

  if (epubTitle.includes(referenceSeriesTitle) || referenceSeriesTitle.includes(epubTitle)) {
    return {
      status: 'confirmed',
      reason: 'epub_title_contains_reference_title',
      epubTitle,
      referenceSeriesTitle,
    };
  }

  return {
    status: 'needs_manual_review',
    reason: 'epub_title_differs_from_draft_manifest',
    epubTitle,
    referenceSeriesTitle,
  };
}

function imagePathsForSourcePart(sourcePart, book) {
  if (Array.isArray(sourcePart.imageResourcePaths) && sourcePart.imageResourcePaths.length > 0) {
    return sourcePart.imageResourcePaths.map(normalizeZipPath);
  }

  if (Number.isInteger(sourcePart.imageIndexStart) && Number.isInteger(sourcePart.imageIndexEnd)) {
    const start = Math.max(1, sourcePart.imageIndexStart);
    const end = Math.min(book.imageResourceOrder.length, sourcePart.imageIndexEnd);
    return book.imageResourceOrder.slice(start - 1, end).map((image) => image.path);
  }

  if (Number.isInteger(sourcePart.spineIndexStart) && Number.isInteger(sourcePart.spineIndexEnd)) {
    const start = Math.max(1, sourcePart.spineIndexStart);
    const end = Math.min(book.chapterResourceOrder.length, sourcePart.spineIndexEnd);
    return book.chapterResourceOrder
      .slice(start - 1, end)
      .flatMap((chapter) => chapter.imageResources.map((image) => image.path));
  }

  return [];
}

async function extractTopicImages({ rootDir: projectRoot, parsedBooks, reference, publicOutputBaseDirectory }) {
  assertPublicImageOutputDirectory(publicOutputBaseDirectory, projectRoot);
  const extractedImages = [];
  const pendingSourceParts = [];
  const zipCache = new Map();

  function zipForBook(book) {
    const cached = zipCache.get(book.relativePath);
    if (cached) {
      return cached;
    }

    const zip = readZip(readFileSync(path.join(projectRoot, ...book.relativePath.split('/'))));
    zipCache.set(book.relativePath, zip);
    return zip;
  }

  for (const topic of reference.topics) {
    for (const [sourcePartIndex, sourcePart] of topic.sourceParts.entries()) {
      const book = selectBookForSourcePart(sourcePart, parsedBooks);
      const sourcePartId = safeFilePart(sourcePart.sourcePartId, `part${pad(sourcePartIndex + 1, 2)}`);
      if (!book) {
        pendingSourceParts.push({ topicId: topic.topicId, sourcePartId, reason: 'matching_volume_not_found' });
        continue;
      }

      const imagePaths = imagePathsForSourcePart(sourcePart, book);
      if (imagePaths.length === 0) {
        pendingSourceParts.push({ topicId: topic.topicId, sourcePartId, reason: 'image_range_not_mapped' });
        continue;
      }

      const zip = zipForBook(book);
      for (const [imageIndex, imagePath] of imagePaths.entries()) {
        if (!zip.entriesByName.has(imagePath)) {
          pendingSourceParts.push({ topicId: topic.topicId, sourcePartId, imagePath, reason: 'image_entry_not_found' });
          continue;
        }

        const extension = path.posix.extname(imagePath).toLowerCase() || '.jpg';
        const fileName = `${sourcePartId}-page${pad(imageIndex + 1, 3)}${extension}`;
        const targetPath = path.join(publicOutputBaseDirectory, topic.topicId, 'pages', fileName);
        assertInside(publicOutputBaseDirectory, targetPath);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, zip.readEntryBuffer(imagePath));
        extractedImages.push({
          topicId: topic.topicId,
          sourcePartId,
          sourceVolume: book.inferredVolume,
          sourceImagePath: imagePath,
          relativePublicPath: toPosix(path.relative(projectRoot, targetPath)),
        });
      }
    }
  }

  return { extractedImages, pendingSourceParts };
}

function buildPageMap({ projectRoot, inputDir, parsedBooks, reference, extractedImages, publicOutputBaseDirectory }) {
  const extractedByTopicPart = new Map();
  for (const image of extractedImages) {
    const key = `${image.topicId}:${image.sourcePartId}`;
    const current = extractedByTopicPart.get(key) ?? [];
    current.push(image.relativePublicPath);
    extractedByTopicPart.set(key, current);
  }

  const topics = reference.topics.map((topic) => {
    const sourceParts = topic.sourceParts.map((sourcePart, index) => {
      const sourcePartId = safeFilePart(sourcePart.sourcePartId, `part${pad(index + 1, 2)}`);
      const book = selectBookForSourcePart(sourcePart, parsedBooks);
      const imagePaths = book ? imagePathsForSourcePart(sourcePart, book) : [];
      const status = book && imagePaths.length > 0 ? 'mapped' : 'needs_manual_review';
      return {
        sourcePartId,
        status,
        reason: status === 'mapped' ? 'image_resources_mapped' : 'page_range_or_image_resources_not_mapped',
        volume: sourcePart.volume ?? null,
        label: sourcePart.label ?? sourcePart.sourceLabel ?? null,
        sourceBook: book?.relativePath ?? null,
        imageCount: imagePaths.length,
        imageResourcePaths: imagePaths,
        extractedPublicPaths: extractedByTopicPart.get(`${topic.topicId}:${sourcePartId}`) ?? [],
      };
    });

    return {
      topicId: topic.topicId,
      title: topic.title,
      sourceLabel: topic.source?.sourceLabel ?? null,
      status: sourceParts.every((part) => part.status === 'mapped') ? 'mapped' : 'needs_manual_review',
      sourceParts,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inputDirectory: toPosix(path.relative(projectRoot, inputDir)),
    publicImageBaseDirectory: `${toPosix(path.relative(projectRoot, publicOutputBaseDirectory))}/`,
    titleReviews: parsedBooks.map((book) => ({
      fileName: book.fileName,
      relativePath: book.relativePath,
      volume: book.inferredVolume,
      ...titleReviewStatus(book, reference),
    })),
    topics,
  };
}

function buildRawDirectory({
  projectRoot,
  inputDir,
  epubFiles,
  parsedBooks,
  reference,
  extractedImages,
  pendingSourceParts,
  rawOutputPath,
  diffOutputPath,
  pageMapOutputPath,
  publicOutputBaseDirectory,
  pageMap,
}) {
  const foundEpubs = parsedBooks.length > 0;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: {
      foundEpubs,
      validationStatus: foundEpubs ? 'EPUB parsed' : validationPendingText,
      imageExtractionStatus: extractedImages.length > 0 ? 'extracted' : 'not_extracted',
    },
    input: {
      selectedInputDirectory: toPosix(path.relative(projectRoot, inputDir)),
      checkedPrivateInputDirectories: defaultInputDirectories,
      epubFiles: epubFiles.map((filePath) => toPosix(path.relative(projectRoot, filePath))),
    },
    outputPolicy: {
      rawDirectoryJson: toPosix(path.relative(projectRoot, rawOutputPath)),
      diffReport: toPosix(path.relative(projectRoot, diffOutputPath)),
      pageMap: toPosix(path.relative(projectRoot, pageMapOutputPath)),
      publicImageBaseDirectory: `${toPosix(path.relative(projectRoot, publicOutputBaseDirectory))}/`,
      fullEpubForbiddenPublicDirectories: ['public/', 'dist/', 'build/', 'docs/'],
    },
    reference,
    books: parsedBooks,
    pageMapSummary: {
      titleReviewNeedsManualCount: pageMap.titleReviews.filter((item) => item.status === 'needs_manual_review').length,
      mappedTopicCount: pageMap.topics.filter((topic) => topic.status === 'mapped').length,
      needsManualTopicCount: pageMap.topics.filter((topic) => topic.status === 'needs_manual_review').length,
    },
    extractedImages,
    pendingSourceParts,
  };
}

function diffReport({ rawDirectory, reference, parsedBooks, pendingSourceParts, pageMap }) {
  const lines = [
    '# 工作细胞 EPUB 目录差异报告',
    '',
    `生成时间：${rawDirectory.generatedAt}`,
    '',
    '## 状态',
    '',
    `- 发现 EPUB：${rawDirectory.status.foundEpubs ? '是' : '否'}`,
    `- EPUB 实际验证：${rawDirectory.status.validationStatus}`,
    `- 私有输入目录：\`${rawDirectory.input.selectedInputDirectory}\``,
    `- 用户参考主题数：${reference.topicCount}`,
    `- 图片提取状态：${rawDirectory.status.imageExtractionStatus}`,
    `- page-map：\`${rawDirectory.outputPolicy.pageMap}\``,
    '',
  ];

  if (!rawDirectory.status.foundEpubs) {
    lines.push(
      `当前结论：${validationPendingText}。脚本框架已运行，等待把完整 EPUB 放入私有输入目录后再验证 OPF、spine、nav/toc、章节资源和图片资源顺序。`,
      '',
    );
  }

  lines.push('## EPUB 目录摘要', '');

  if (parsedBooks.length === 0) {
    lines.push('- 未发现可解析 EPUB。', '');
  } else {
    for (const book of parsedBooks) {
      lines.push(
        `- \`${book.relativePath}\`：OPF \`${book.opf.path}\`，spine ${book.spineOrder.length} 项，${book.toc.type} 目录 ${book.toc.items.length} 项，图片阅读顺序 ${book.imageResourceOrder.length} 项。`,
      );
    }
    lines.push('');
  }

  lines.push('## 用户参考表 vs EPUB 目录', '');

  const titleReviewsNeedingManual = pageMap.titleReviews.filter((item) => item.status === 'needs_manual_review');
  if (titleReviewsNeedingManual.length > 0) {
    lines.push(`- EPUB 题名需要人工确认：${titleReviewsNeedingManual.length}`);
    for (const item of titleReviewsNeedingManual) {
      lines.push(`  - ${item.fileName}: needs_manual_review (${item.reason}); EPUB title="${item.epubTitle}", draft manifest="${item.referenceSeriesTitle}"`);
    }
  } else if (parsedBooks.length > 0) {
    lines.push('- EPUB 题名与 draft manifest 可直接确认。');
  }

  lines.push(`- 已映射主题：${pageMap.topics.filter((topic) => topic.status === 'mapped').length}`);
  lines.push(`- 需要人工确认主题：${pageMap.topics.filter((topic) => topic.status === 'needs_manual_review').length}`);
  lines.push('');

  const tocTitles = parsedBooks.flatMap((book) => book.toc.items.map((item) => item.title).filter(Boolean));
  if (tocTitles.length === 0 && parsedBooks.length > 0) {
    lines.push('- EPUB 已解析，但 nav/toc 没有可比对的章节标题；用户参考主题仍需人工绑定到 spine 或图片页范围。');
  } else if (tocTitles.length > 0) {
    const missingTopics = reference.topics.filter((topic) => !tocTitles.some((title) => title.includes(topic.title) || topic.title.includes(title)));
    lines.push(`- EPUB nav/toc 标题数：${tocTitles.length}`);
    lines.push(`- 用户参考主题未在 nav/toc 直接匹配：${missingTopics.length}`);
    for (const topic of missingTopics.slice(0, 30)) {
      lines.push(`  - ${topic.title}`);
    }
  }

  if (pendingSourceParts.length > 0) {
    lines.push('', '## 等待人工补充的 sourceParts', '');
    for (const item of pendingSourceParts.slice(0, 60)) {
      lines.push(`- ${item.topicId} / ${item.sourcePartId}：${item.reason}`);
    }
    if (pendingSourceParts.length > 60) {
      lines.push(`- 其余 ${pendingSourceParts.length - 60} 项见原始目录 JSON。`);
    }
  }

  lines.push(
    '',
    '## 图片输出规范',
    '',
    '- 公开漫画页图片：`public/books/工作细胞/<topicId>/pages/<sourcePartId>-pageNNN.<ext>`',
    '- 预留缩略图：`public/books/工作细胞/<topicId>/thumbs/<sourcePartId>-pageNNN.<ext>`',
    '- 预留裁切图：`public/books/工作细胞/<topicId>/crops/<sourcePartId>-cropNNN.<ext>`',
    '- 完整 EPUB 只允许保留在私有输入目录，不得复制到 `public/`、`dist/`、`build/` 或 `docs/`。',
    '',
  );

  return `${lines.join('\n')}\n`;
}

async function findPublicEpubLeaks(projectRoot) {
  const leaks = [];
  for (const directoryName of publicForbiddenInputDirs) {
    const directory = path.join(projectRoot, directoryName);
    if (!(await pathExists(directory))) {
      continue;
    }

    const files = await listEpubFiles(directory);
    leaks.push(...files.map((filePath) => toPosix(path.relative(projectRoot, filePath))));
  }
  return leaks;
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function runWorkCellsEpubImport(options = {}) {
  const projectRoot = path.resolve(options.rootDir ?? defaultOptions.rootDir);
  const inputDir = await chooseInputDirectory(projectRoot, options.inputDir);
  const manifestPath = path.resolve(
    projectRoot,
    options.manifestPath ?? path.join(projectRoot, 'public', 'books', '工作细胞', 'draft-manifest.json'),
  );
  const rawOutputPath = path.resolve(
    projectRoot,
    options.rawOutputPath ?? path.join(projectRoot, 'docs', 'work-cells-epub-raw-directory.json'),
  );
  const diffOutputPath = path.resolve(
    projectRoot,
    options.diffOutputPath ?? path.join(projectRoot, 'docs', 'work-cells-epub-diff-report.md'),
  );
  const pageMapOutputPath = path.resolve(
    projectRoot,
    options.pageMapOutputPath ?? path.join(projectRoot, 'docs', 'work-cells-epub-page-map.json'),
  );
  const publicOutputBaseDirectory = path.resolve(
    projectRoot,
    options.publicOutputBaseDirectory ?? path.join(projectRoot, 'public', 'books', '工作细胞'),
  );
  const extractImages = Boolean(options.extractImages);

  assertPrivateInputDirectory(inputDir, projectRoot);
  assertInside(projectRoot, rawOutputPath);
  assertInside(projectRoot, diffOutputPath);
  assertInside(projectRoot, pageMapOutputPath);

  const reference = await loadReferenceManifestAsync(manifestPath);
  const epubFiles = await listEpubFiles(inputDir);
  const parsedBooks = [];
  for (const epubFile of epubFiles) {
    parsedBooks.push(await parseEpubFile(epubFile, { rootDir: projectRoot }));
  }

  let extractedImages = [];
  let pendingSourceParts = [];
  if (extractImages && parsedBooks.length > 0) {
    const extraction = await extractTopicImages({
      rootDir: projectRoot,
      parsedBooks,
      reference,
      publicOutputBaseDirectory,
    });
    extractedImages = extraction.extractedImages;
    pendingSourceParts = extraction.pendingSourceParts;
  } else {
    pendingSourceParts = reference.topics.flatMap((topic) => topic.sourceParts.map((sourcePart) => ({
      topicId: topic.topicId,
      sourcePartId: safeFilePart(sourcePart.sourcePartId, 'part01'),
      reason: parsedBooks.length === 0 ? 'epub_not_found' : 'image_extraction_not_requested_or_page_range_pending',
    })));
  }

  const pageMap = buildPageMap({
    projectRoot,
    inputDir,
    parsedBooks,
    reference,
    extractedImages,
    publicOutputBaseDirectory,
  });
  const rawDirectory = buildRawDirectory({
    projectRoot,
    inputDir,
    epubFiles,
    parsedBooks,
    reference,
    extractedImages,
    pendingSourceParts,
    rawOutputPath,
    diffOutputPath,
    pageMapOutputPath,
    publicOutputBaseDirectory,
    pageMap,
  });
  const publicEpubLeaks = await findPublicEpubLeaks(projectRoot);
  rawDirectory.publicEpubLeakCheck = {
    checkedDirectories: [...publicForbiddenInputDirs].map((item) => `${item}/`),
    leaks: publicEpubLeaks,
  };

  await writeJson(rawOutputPath, rawDirectory);
  await writeJson(pageMapOutputPath, pageMap);
  await mkdir(path.dirname(diffOutputPath), { recursive: true });
  await writeFile(diffOutputPath, diffReport({ rawDirectory, reference, parsedBooks, pendingSourceParts, pageMap }), 'utf8');

  return {
    foundEpubs: parsedBooks.length > 0,
    validationStatus: parsedBooks.length > 0 ? 'EPUB parsed' : validationPendingText,
    parsedBookCount: parsedBooks.length,
    extractedImages,
    pendingSourceParts,
    rawOutputPath,
    diffOutputPath,
    pageMapOutputPath,
    publicEpubLeaks,
  };
}

function parseCliArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--extract-images') {
      options.extractImages = true;
    } else if (arg === '--input') {
      options.inputDir = args[++index];
    } else if (arg === '--manifest') {
      options.manifestPath = args[++index];
    } else if (arg === '--raw-output') {
      options.rawOutputPath = args[++index];
    } else if (arg === '--diff-output') {
      options.diffOutputPath = args[++index];
    } else if (arg === '--page-map-output') {
      options.pageMapOutputPath = args[++index];
    } else if (arg === '--public-output') {
      options.publicOutputBaseDirectory = args[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/work-cells-epub-import.mjs [options]

Options:
  --input <dir>          Private EPUB directory. Default auto-detects source-private/private/local-epubs/source.
  --manifest <file>      User reference manifest JSON. Default: public/books/工作细胞/draft-manifest.json
  --raw-output <file>    Raw EPUB directory JSON output. Default: docs/work-cells-epub-raw-directory.json
  --diff-output <file>   User reference vs EPUB directory report. Default: docs/work-cells-epub-diff-report.md
  --page-map-output <file> Page map JSON output. Default: docs/work-cells-epub-page-map.json
  --public-output <dir>  Public converted image base. Default: public/books/工作细胞
  --extract-images       Copy mapped EPUB page images into topicId pages directories.

Image extraction requires topic.epubSourceParts entries in the manifest, for example:
  { "sourcePartId": "v01-ch01", "volume": 1, "imageResourcePaths": ["OEBPS/Images/00000010.jpg"] }
`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const cliOptions = parseCliArgs(process.argv.slice(2));
    if (cliOptions.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runWorkCellsEpubImport(cliOptions);
    console.log(`EPUB files parsed: ${result.parsedBookCount}`);
    console.log(`Raw directory JSON: ${toPosix(path.relative(rootDir, result.rawOutputPath))}`);
    console.log(`Diff report: ${toPosix(path.relative(rootDir, result.diffOutputPath))}`);
    console.log(`Page map JSON: ${toPosix(path.relative(rootDir, result.pageMapOutputPath))}`);
    if (!result.foundEpubs) {
      console.log(validationPendingText);
    }
    if (result.publicEpubLeaks.length > 0) {
      console.error(`Full EPUB files found in public/deployable directories: ${result.publicEpubLeaks.join(', ')}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
