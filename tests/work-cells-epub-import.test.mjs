import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { deflateRawSync } from 'node:zlib';

import {
  parseEpubFile,
  runWorkCellsEpubImport,
} from '../scripts/work-cells-epub-import.mjs';

function dosDateTime(date = new Date('2026-01-01T00:00:00Z')) {
  const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const dosDate = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { dosTime, dosDate };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function writeZip(filePath, entries) {
  const fileParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const source = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
    const method = entry.store ? 0 : 8;
    const compressed = method === 0 ? source : deflateRawSync(source);
    const crc = crc32(source);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    fileParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  await writeFile(filePath, Buffer.concat([...fileParts, centralDirectory, end]));
}

async function makeTempProject() {
  return mkdtemp(path.join(tmpdir(), 'work-cells-epub-import-'));
}

async function writeSampleEpub(epubPath) {
  await writeZip(epubPath, [
    { name: 'mimetype', content: 'application/epub+zip', store: true },
    {
      name: 'META-INF/container.xml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    },
    {
      name: 'OEBPS/content.opf',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Cells Sample</dc:title>
    <dc:creator>Akane Shimizu</dc:creator>
    <dc:language>zh</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="Text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter-a" href="Text/chapter-a.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter-b" href="Text/chapter-b.xhtml" media-type="application/xhtml+xml"/>
    <item id="img-a" href="Images/a.jpg" media-type="image/jpeg"/>
    <item id="img-b" href="Images/b.jpg" media-type="image/jpeg"/>
  </manifest>
  <spine>
    <itemref idref="chapter-a"/>
    <itemref idref="chapter-b"/>
  </spine>
</package>`,
    },
    {
      name: 'OEBPS/Text/nav.xhtml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body><nav epub:type="toc"><ol>
  <li><a href="chapter-a.xhtml">Chapter A</a></li>
  <li><a href="chapter-b.xhtml">Chapter B</a></li>
</ol></nav></body></html>`,
    },
    {
      name: 'OEBPS/Text/chapter-a.xhtml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter A</title></head>
<body><img src="../Images/a.jpg" alt="page a"/></body></html>`,
    },
    {
      name: 'OEBPS/Text/chapter-b.xhtml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter B</title></head>
<body><img src="../Images/b.jpg" alt="page b"/></body></html>`,
    },
    { name: 'OEBPS/Images/a.jpg', content: Buffer.from('image-a') },
    { name: 'OEBPS/Images/b.jpg', content: Buffer.from('image-b') },
  ]);
}

function sampleManifest() {
  return {
    schemaVersion: 1,
    seriesTitle: '工作细胞',
    topics: [
      {
        order: 1,
        title: 'Merged Topic',
        slug: 'merged-topic',
        source: { volume: 1, sourceLabel: '第1卷 第1-2话' },
        epubSourceParts: [
          {
            sourcePartId: 'v01-ch01',
            volume: 1,
            label: '第1卷 第1话',
            imageResourcePaths: ['OEBPS/Images/a.jpg'],
          },
          {
            sourcePartId: 'v01-ch02',
            volume: 1,
            label: '第1卷 第2话',
            imageResourcePaths: ['OEBPS/Images/b.jpg'],
          },
        ],
      },
    ],
  };
}

test('parseEpubFile reads OPF, spine, nav, chapter resources, and image order', async () => {
  const tempDir = await makeTempProject();
  try {
    const epubPath = path.join(tempDir, 'cells.epub');
    await writeSampleEpub(epubPath);

    const parsed = await parseEpubFile(epubPath, { rootDir: tempDir });

    assert.equal(parsed.opf.path, 'OEBPS/content.opf');
    assert.equal(parsed.opf.metadata.title, 'Cells Sample');
    assert.deepEqual(parsed.spineOrder.map((item) => item.idref), ['chapter-a', 'chapter-b']);
    assert.deepEqual(parsed.toc.items.map((item) => item.title), ['Chapter A', 'Chapter B']);
    assert.deepEqual(
      parsed.chapterResourceOrder.map((item) => [item.title, item.imageResources[0].path]),
      [
        ['Chapter A', 'OEBPS/Images/a.jpg'],
        ['Chapter B', 'OEBPS/Images/b.jpg'],
      ],
    );
    assert.deepEqual(parsed.imageResourceOrder.map((item) => item.path), ['OEBPS/Images/a.jpg', 'OEBPS/Images/b.jpg']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runWorkCellsEpubImport reports unfinished validation when no EPUB exists', async () => {
  const tempDir = await makeTempProject();
  try {
    const inputDir = path.join(tempDir, 'source-private', 'cells-at-work');
    const outDir = path.join(tempDir, 'docs');
    const manifestPath = path.join(tempDir, 'draft-manifest.json');
    await mkdir(inputDir, { recursive: true });
    await writeFile(manifestPath, JSON.stringify(sampleManifest(), null, 2));

    const result = await runWorkCellsEpubImport({
      rootDir: tempDir,
      inputDir,
      manifestPath,
      rawOutputPath: path.join(outDir, 'raw.json'),
      diffOutputPath: path.join(outDir, 'diff.md'),
      publicOutputBaseDirectory: path.join(tempDir, 'public', 'books', '工作细胞'),
      extractImages: false,
    });

    assert.equal(result.foundEpubs, false);
    assert.equal(result.validationStatus, '尚未完成 EPUB 实际验证');

    const raw = JSON.parse(await readFile(path.join(outDir, 'raw.json'), 'utf8'));
    const diff = await readFile(path.join(outDir, 'diff.md'), 'utf8');
    assert.equal(raw.status.validationStatus, '尚未完成 EPUB 实际验证');
    assert.match(diff, /尚未完成 EPUB 实际验证/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runWorkCellsEpubImport extracts stable topic image files from multiple source parts', async () => {
  const tempDir = await makeTempProject();
  try {
    const inputDir = path.join(tempDir, 'source-private', 'cells-at-work');
    const docsDir = path.join(tempDir, 'docs');
    const manifestPath = path.join(tempDir, 'draft-manifest.json');
    await mkdir(inputDir, { recursive: true });
    await writeSampleEpub(path.join(inputDir, 'cells-volume-1.epub'));
    await writeFile(manifestPath, JSON.stringify(sampleManifest(), null, 2));

    const result = await runWorkCellsEpubImport({
      rootDir: tempDir,
      inputDir,
      manifestPath,
      rawOutputPath: path.join(docsDir, 'raw.json'),
      diffOutputPath: path.join(docsDir, 'diff.md'),
      publicOutputBaseDirectory: path.join(tempDir, 'public', 'books', '工作细胞'),
      extractImages: true,
    });

    assert.equal(result.foundEpubs, true);
    assert.equal(result.validationStatus, 'EPUB parsed');
    assert.deepEqual(result.extractedImages.map((item) => item.relativePublicPath), [
      'public/books/工作细胞/merged-topic/pages/v01-ch01-page001.jpg',
      'public/books/工作细胞/merged-topic/pages/v01-ch02-page001.jpg',
    ]);

    assert.equal(
      await readFile(path.join(tempDir, 'public', 'books', '工作细胞', 'merged-topic', 'pages', 'v01-ch01-page001.jpg'), 'utf8'),
      'image-a',
    );
    assert.equal(
      await readFile(path.join(tempDir, 'public', 'books', '工作细胞', 'merged-topic', 'pages', 'v01-ch02-page001.jpg'), 'utf8'),
      'image-b',
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('runWorkCellsEpubImport writes a page map and flags EPUB title mismatches for manual review', async () => {
  const tempDir = await makeTempProject();
  try {
    const inputDir = path.join(tempDir, 'source-private', 'cells-at-work');
    const docsDir = path.join(tempDir, 'docs');
    const manifestPath = path.join(tempDir, 'draft-manifest.json');
    await mkdir(inputDir, { recursive: true });
    await writeSampleEpub(path.join(inputDir, 'cells-volume-1.epub'));
    await writeFile(manifestPath, JSON.stringify({
      ...sampleManifest(),
      seriesTitle: 'Manually Curated Work Cells Title',
    }, null, 2));

    const result = await runWorkCellsEpubImport({
      rootDir: tempDir,
      inputDir,
      manifestPath,
      rawOutputPath: path.join(docsDir, 'raw.json'),
      diffOutputPath: path.join(docsDir, 'diff.md'),
      pageMapOutputPath: path.join(docsDir, 'page-map.json'),
      publicOutputBaseDirectory: path.join(tempDir, 'public', 'books', '工作细胞'),
      extractImages: false,
    });

    assert.equal(path.basename(result.pageMapOutputPath), 'page-map.json');
    const pageMap = JSON.parse(await readFile(path.join(docsDir, 'page-map.json'), 'utf8'));
    const raw = JSON.parse(await readFile(path.join(docsDir, 'raw.json'), 'utf8'));
    const diff = await readFile(path.join(docsDir, 'diff.md'), 'utf8');

    assert.equal(pageMap.titleReviews[0].status, 'needs_manual_review');
    assert.equal(pageMap.titleReviews[0].epubTitle, 'Cells Sample');
    assert.equal(pageMap.titleReviews[0].referenceSeriesTitle, 'Manually Curated Work Cells Title');
    assert.equal(pageMap.topics[0].status, 'mapped');
    assert.deepEqual(pageMap.topics[0].sourceParts.map((part) => part.imageCount), [1, 1]);
    assert.equal(raw.outputPolicy.pageMap, 'docs/page-map.json');
    assert.match(diff, /needs_manual_review/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
