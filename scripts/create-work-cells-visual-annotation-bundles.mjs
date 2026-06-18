import { constants } from 'node:fs';
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'reports', 'cells-at-work', 'visual-annotation-bundles');
const pageMapPath = path.join(rootDir, 'data', 'cells-at-work', 'page-map.json');
const manualTopicRangesPath = path.join(rootDir, 'data', 'cells-at-work', 'manual-topic-ranges.json');
const draftManifestPath = path.join(rootDir, 'public', 'books', '工作细胞', 'draft-manifest.json');
const fallbackDraftManifestPath = path.join(rootDir, 'public', 'books', '宸ヤ綔缁嗚優', 'draft-manifest.json');
const maxBatchPages = 120;
const minTargetBatchPages = 80;
const zipNamePrefix = 'work-cells-visual-annotation-batch-';
const forbiddenInputPathParts = new Set([
  'ocr',
  'topic-readable-transcripts',
  'topic-story-outline-hints',
]);

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function assertInsideRoot(targetPath, message) {
  const relative = path.relative(rootDir, path.resolve(targetPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(message ?? `Refusing path outside project root: ${targetPath}`);
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function zipPath(...parts) {
  return parts.join('/').replaceAll('\\', '/');
}

function pageNumberFromImagePath(imagePath) {
  const match = imagePath.match(/_page-(\d{3})\.webp$/);
  return match ? Number(match[1]) : null;
}

function assertSafeImagePath(imagePath) {
  const parts = imagePath.split(/[\\/]+/).map((part) => part.toLowerCase());
  for (const forbiddenPart of forbiddenInputPathParts) {
    if (parts.includes(forbiddenPart.toLowerCase())) {
      throw new Error(`Refusing forbidden input path: ${imagePath}`);
    }
  }
}

function manifestPathForTopic(manifest, index) {
  const topic = manifest.topics?.[index];
  return {
    displayTitle: topic?.displayTitle ?? topic?.title ?? null,
    title: topic?.title ?? null,
    source: topic?.source ?? null,
    pageImagePaths: topic?.pageImagePaths ?? topic?.publicAssets?.pageImages ?? [],
  };
}

function assertMetadata(pageMap, manualTopicRanges, manifest) {
  if (pageMap.validation?.topicCount !== 27 || pageMap.topics?.length !== 27) {
    throw new Error(`Expected 27 page-map topics, found ${pageMap.topics?.length ?? 0}`);
  }

  if (manualTopicRanges.validation?.topicCount !== 27 || manualTopicRanges.topics?.length !== 27) {
    throw new Error(`Expected 27 manual topic ranges, found ${manualTopicRanges.topics?.length ?? 0}`);
  }

  if (manifest.topics?.length !== 27) {
    throw new Error(`Expected 27 draft manifest topics, found ${manifest.topics?.length ?? 0}`);
  }

  if (pageMap.validation?.mergeRuleCheck?.ok !== true) {
    throw new Error('Page-map merge-rule validation is not marked ok.');
  }

  if (pageMap.validation?.mergeRuleCheck?.cancerCellTopicsAreSeparate !== true) {
    throw new Error('Cancer cell topics are not marked separate in page-map validation.');
  }

  if (pageMap.validation?.mergeRuleCheck?.covid19SourceLabelIsChapter29 !== true) {
    throw new Error('COVID-19 topic is not marked as chapter 29 in page-map validation.');
  }

  for (const [index, topic] of pageMap.topics.entries()) {
    const manualTopic = manualTopicRanges.topics[index];
    const manifestTopic = manifestPathForTopic(manifest, index);

    if (topic.topicId !== manualTopic.topicId) {
      throw new Error(`Topic order mismatch at ${index + 1}: page-map ${topic.topicId}, manual ${manualTopic.topicId}`);
    }

    if (topic.order !== manualTopic.order) {
      throw new Error(`Topic order number mismatch for ${topic.topicId}.`);
    }

    if (topic.pageImagePaths.length !== topic.imageCount) {
      throw new Error(`${topic.topicId} has ${topic.pageImagePaths.length} images but imageCount is ${topic.imageCount}.`);
    }

    if (manifestTopic.pageImagePaths.length !== topic.pageImagePaths.length) {
      throw new Error(`${topic.topicId} manifest image count does not match page-map.`);
    }

    for (const [imageIndex, imagePath] of topic.pageImagePaths.entries()) {
      assertSafeImagePath(imagePath);
      const fileName = path.basename(imagePath);
      const pageNumber = pageNumberFromImagePath(imagePath);
      const expectedName = `${topic.topicId}__${topic.volumeId}_page-${String(topic.startPage + imageIndex).padStart(3, '0')}.webp`;

      if (fileName !== expectedName) {
        throw new Error(`Unexpected image filename for ${topic.topicId}: ${fileName}, expected ${expectedName}`);
      }

      if (pageNumber !== topic.startPage + imageIndex) {
        throw new Error(`Unexpected page number for ${topic.topicId}: ${fileName}`);
      }

      if (manifestTopic.pageImagePaths[imageIndex] !== imagePath) {
        throw new Error(`${topic.topicId} manifest image order differs from page-map at image ${imageIndex + 1}.`);
      }
    }
  }
}

async function assertImagesExist(topics) {
  for (const topic of topics) {
    for (const imagePath of topic.pageImagePaths) {
      const absolutePath = path.join(rootDir, ...imagePath.split('/'));
      assertInsideRoot(absolutePath);
      if (!(await pathExists(absolutePath))) {
        throw new Error(`Missing image: ${imagePath}`);
      }
    }
  }
}

function partitionTopics(topics) {
  const memo = new Map();

  function batchPenalty(pageCount) {
    if (pageCount >= minTargetBatchPages && pageCount <= maxBatchPages) {
      return 0;
    }
    return ((minTargetBatchPages - pageCount) ** 2) + 1000;
  }

  function solve(startIndex) {
    if (startIndex === topics.length) {
      return { penalty: 0, batches: [] };
    }

    if (memo.has(startIndex)) {
      return memo.get(startIndex);
    }

    let pageCount = 0;
    let best = null;

    for (let endIndex = startIndex; endIndex < topics.length; endIndex += 1) {
      pageCount += topics[endIndex].imageCount;
      if (pageCount > maxBatchPages) {
        break;
      }

      const rest = solve(endIndex + 1);
      const candidate = {
        penalty: batchPenalty(pageCount) + rest.penalty + 1,
        batches: [
          {
            index: 0,
            pageCount,
            topics: topics.slice(startIndex, endIndex + 1),
          },
          ...rest.batches,
        ],
      };

      if (
        best === null
        || candidate.penalty < best.penalty
        || (candidate.penalty === best.penalty && candidate.batches.length < best.batches.length)
      ) {
        best = candidate;
      }
    }

    memo.set(startIndex, best);
    return best;
  }

  return solve(0).batches.map((batch, index) => ({
    ...batch,
    index: index + 1,
  }));
}

function annotationSchema() {
  return {
    schemaVersion: 1,
    purpose: 'ChatGPT visual annotation for Work Cells manga page images. This schema is for image-based review, not OCR repair.',
    requiredTopicFields: [
      'topicId',
      'displayTitle',
      'topicSummary',
      'pageAnnotations',
      'notesForCodex',
    ],
    requiredPageAnnotationFields: [
      'pageId',
      'pageRole',
      'plotBeat',
      'visibleTextNotes',
      'importantVisibleTerms',
      'biologyConcepts',
      'encyclopediaTags',
      'parentPromptIdeas',
      'bodyScienceStationUse',
      'sensitiveContentNote',
      'notesForCodex',
    ],
    topicTemplate: {
      topicId: '',
      displayTitle: '',
      topicSummary: '',
      pageAnnotations: [
        {
          pageId: '',
          pageRole: '',
          plotBeat: '',
          visibleTextNotes: '',
          importantVisibleTerms: [],
          biologyConcepts: [],
          encyclopediaTags: [],
          parentPromptIdeas: [],
          bodyScienceStationUse: '',
          sensitiveContentNote: '',
          notesForCodex: '',
        },
      ],
      notesForCodex: '',
    },
  };
}

function topicForReview(topic) {
  return {
    order: topic.order,
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    sourceLabel: topic.sourceLabel,
    volumeId: topic.volumeId,
    range: topic.range,
    startPage: topic.startPage,
    endPage: topic.endPage,
    imageCount: topic.imageCount,
    images: topic.pageImagePaths.map((imagePath) => ({
      pageId: path.basename(imagePath, '.webp'),
      sourcePath: imagePath,
      zipPath: zipPath('images', topic.topicId, path.basename(imagePath)),
    })),
  };
}

function reviewTopics(batch) {
  return {
    schemaVersion: 1,
    batchNumber: batch.index,
    purpose: 'ChatGPT visual annotation image batch',
    policies: {
      containsFullEpub: false,
      containsOcrFullText: false,
      containsOcrReorderedText: false,
      intendedUse: 'Visual annotation by ChatGPT, not OCR repair.',
    },
    topicCount: batch.topics.length,
    imageCount: batch.pageCount,
    topics: batch.topics.map(topicForReview),
  };
}

function reviewIndex(batch) {
  const topicRows = batch.topics.map((topic) => (
    `| ${topic.order} | ${topic.topicId} | ${topic.displayTitle} | ${topic.volumeId} / ${topic.sourceLabel} | ${topic.range} | ${topic.imageCount} |`
  )).join('\n');

  return `# 工作细胞 ChatGPT 视觉标注图片包 ${String(batch.index).padStart(2, '0')}

本包用于 ChatGPT 视觉标注，而不是 OCR 修复。请直接依据漫画页图片进行视觉理解、剧情节点标注、科学概念标注、百科关联标注、身体科学小站素材判断和亲子问题素材判断。

## 包内容

- images/
- review-index.md
- review-topics.json
- annotation-schema.json

## 明确不包含

- 不包含完整 EPUB。
- 不包含 OCR 全文。
- 不包含 OCR 重排文本。
- 不包含 topic-readable-transcripts。
- 不包含 topic-story-outline-hints。

## 文件命名规则

图片文件名使用 \`topicId__vXX_page-YYY.webp\`，例如 \`pneumococcus__v01_page-006.webp\`。每个主题单独放在 \`images/<topicId>/\` 文件夹中；图片顺序按 \`data/cells-at-work/page-map.json\` 排列。

## 特别规则

- 癌细胞保持为一个主题。
- 出血性休克保持为一个主题。
- 癌细胞Ⅱ保持为一个主题。
- 不要把癌细胞和癌细胞Ⅱ合并。
- 新型冠状病毒保持为第 6 卷第 29 话；不要生成第 30 话，也不要写成第 29-30 话。

## 本包主题

| 顺序 | topicId | 标题 | 来源卷话 | 页面范围 | 图片数量 |
| --- | --- | --- | --- | --- | ---: |
${topicRows}

## 批次统计

- 主题数量：${batch.topics.length}
- 图片页数：${batch.pageCount}
- 页数规则：尽量控制在 ${minTargetBatchPages}-${maxBatchPages} 页；本批未拆分任何主题。
`;
}

function createTextEntry(name, value) {
  return {
    name,
    data: Buffer.from(value, 'utf8'),
  };
}

function createDirectoryEntry(name) {
  return {
    name: name.endsWith('/') ? name : `${name}/`,
    data: Buffer.alloc(0),
  };
}

async function createImageEntry(topic, imagePath) {
  const sourcePath = path.join(rootDir, ...imagePath.split('/'));
  const data = await readFile(sourcePath);
  return {
    name: zipPath('images', topic.topicId, path.basename(imagePath)),
    data,
  };
}

function writeZip(entries) {
  const fileParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(day, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    fileParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(day, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const endHeader = Buffer.alloc(22);
  endHeader.writeUInt32LE(0x06054b50, 0);
  endHeader.writeUInt16LE(0, 4);
  endHeader.writeUInt16LE(0, 6);
  endHeader.writeUInt16LE(entries.length, 8);
  endHeader.writeUInt16LE(entries.length, 10);
  endHeader.writeUInt32LE(centralDirectory.length, 12);
  endHeader.writeUInt32LE(centralOffset, 16);
  endHeader.writeUInt16LE(0, 20);

  return Buffer.concat([...fileParts, centralDirectory, endHeader]);
}

async function createBatchZip(batch) {
  const entries = [
    createDirectoryEntry('images/'),
    createTextEntry('review-index.md', reviewIndex(batch)),
    createTextEntry('review-topics.json', `${JSON.stringify(reviewTopics(batch), null, 2)}\n`),
    createTextEntry('annotation-schema.json', `${JSON.stringify(annotationSchema(), null, 2)}\n`),
  ];

  for (const topic of batch.topics) {
    entries.push(createDirectoryEntry(zipPath('images', topic.topicId)));
    for (const imagePath of topic.pageImagePaths) {
      entries.push(await createImageEntry(topic, imagePath));
    }
  }

  const zipBuffer = writeZip(entries);
  const zipPathOnDisk = path.join(outputDir, `${zipNamePrefix}${String(batch.index).padStart(2, '0')}.zip`);
  await writeFile(zipPathOnDisk, zipBuffer);
  const zipStats = await stat(zipPathOnDisk);

  return {
    batchNumber: batch.index,
    zipPath: toPosix(path.relative(rootDir, zipPathOnDisk)),
    sizeBytes: zipStats.size,
    pageCount: batch.pageCount,
    topics: batch.topics.map((topic) => ({
      topicId: topic.topicId,
      imageCount: topic.imageCount,
    })),
  };
}

async function main() {
  assertInsideRoot(outputDir, 'Refusing to write visual annotation bundles outside project root.');

  const pageMap = await readJson(pageMapPath);
  const manualTopicRanges = await readJson(manualTopicRangesPath);
  const manifestPath = (await pathExists(draftManifestPath)) ? draftManifestPath : fallbackDraftManifestPath;
  const manifest = await readJson(manifestPath);

  assertMetadata(pageMap, manualTopicRanges, manifest);
  await assertImagesExist(pageMap.topics);

  const batches = partitionTopics(pageMap.topics);
  const totalPages = pageMap.topics.reduce((sum, topic) => sum + topic.imageCount, 0);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const zipFiles = [];
  for (const batch of batches) {
    zipFiles.push(await createBatchZip(batch));
  }

  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceFiles: [
      toPosix(path.relative(rootDir, pageMapPath)),
      toPosix(path.relative(rootDir, manualTopicRangesPath)),
      toPosix(path.relative(rootDir, manifestPath)),
    ],
    outputDirectory: toPosix(path.relative(rootDir, outputDir)),
    zipCount: zipFiles.length,
    topicCount: pageMap.topics.length,
    totalImagePages: totalPages,
    pageMapTotalImagePages: totalPages,
    coversAll27Topics: pageMap.topics.length === 27,
    containsFullEpub: false,
    containsOcrFullText: false,
    containsOcrReorderedText: false,
    batchRule: {
      targetMinimumPages: minTargetBatchPages,
      maximumPages: maxBatchPages,
      note: 'Topics are never split; exact 80-120 page coverage is not possible with the current topic counts.',
    },
    zipFiles,
  };

  const summaryPath = path.join(outputDir, 'bundle-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

await main();
