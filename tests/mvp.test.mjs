import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seriesPath = path.join(rootDir, 'public', 'books', '不一样的卡梅拉', 'series.json');
const requiredTitles = [
  '我想去看海',
  '我想有颗星星',
  '我想有个弟弟',
  '我去找回太阳',
  '我爱小黑猫',
  '我能打败怪兽',
  '我要找到朗朗',
  '我不要被吃掉',
  '我好喜欢她',
  '我要救出贝里奥',
  '我不是胆小鬼',
  '我爱平底锅',
];
const publishedTitles = requiredTitles.slice(0, 10);
const expectedAudio = new Map([
  ['我想去看海', {
    source: 'source/不一样的卡梅拉/01-我想去看海.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-01.mp3',
  }],
  ['我想有颗星星', {
    source: 'source/不一样的卡梅拉/02-我想有颗星星.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-02.mp3',
  }],
  ['我想有个弟弟', {
    source: 'source/不一样的卡梅拉/03-我想有个弟弟.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-03.mp3',
  }],
  ['我去找回太阳', {
    source: 'source/不一样的卡梅拉/04-我去找回太阳.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-04.mp3',
  }],
  ['我爱小黑猫', {
    source: 'source/不一样的卡梅拉/05-我爱小黑猫.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-05.mp3',
  }],
  ['我能打败怪兽', {
    source: 'source/不一样的卡梅拉/06-我能打败怪兽.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-06.mp3',
  }],
  ['我要找到朗朗', {
    source: 'source/不一样的卡梅拉/07-我要找到朗朗.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-07.mp3',
  }],
  ['我不要被吃掉', {
    source: 'source/不一样的卡梅拉/08-我不要被吃掉.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-08.mp3',
  }],
  ['我好喜欢她', {
    source: 'source/不一样的卡梅拉/09-我好喜欢她.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-09.mp3',
  }],
  ['我要救出贝里奥', {
    source: 'source/不一样的卡梅拉/10-我要救出贝里奥.mp3',
    publicPath: 'public/audio/carmela-s1/carmela-s1-10.mp3',
  }],
]);
const requiredUiText = [
  'Book Companion / 家庭阅读助手',
  '不一样的卡梅拉',
  '类型：绘本',
  '进入辅助页',
  'Audio / 音频',
  '问答',
  '百科',
  '书籍总览',
  '内容回顾',
  '场景 / 页码',
  '问答卡片',
  '背景补充',
  '剧情相关百科',
  '音频播放器',
  'data-audio-play',
  'data-audio-seek',
  'data-audio-current-time',
  'data-audio-total-time',
  'preload="metadata"',
  '音频暂未接入',
  '音频路径暂时无法访问',
  '家长使用提示',
  'PageThumbnail',
  'ImageLightbox',
  'EvidencePageThumbnails',
  '暂无页面图',
  '暂无对应页面图',
  '解释图',
  '绘本页面证据',
  '待补充解释图',
  '故事中出现在哪里',
  '它是什么',
  '为什么和故事有关',
  '一起讨论',
];
const blockedTerms = [
  'progress',
  'currentChapter',
  'lastRead',
  'completed',
  'streak',
  'duration',
  'checkIn',
  'readingStatus',
  'readingProgress',
  'continueReading',
];
const removedHomeText = [
  'Book Companion Panel / 家庭纸质书阅读辅助面板',
  '为家里的纸质绘本阅读准备的辅助面板。孩子读实体书，家长在旁边查看内容回顾、问题卡、背景补充、百科条目和音频入口。',
  '不一样的卡梅拉 第一季',
  '首页只做书籍资料入口。选择一本书后，进入对应的 companion 页面，再按需要打开问答、背景、百科或音频。',
];
const childAddressBlockedPhrases = [
  '可以告诉孩子',
  '家长可以说',
  '你可以这样讲给孩子听',
  '适合告诉孩子的是',
  'parent can tell',
  'parent can tell the child',
  'tell your child',
  'explain to the child',
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function appText() {
  return ['index.html', path.join('assets', 'app.js'), path.join('assets', 'styles.css')]
    .map((file) => readFileSync(path.join(rootDir, file), 'utf8'))
    .join('\n');
}

function publishedBookRecords() {
  const series = readJson(seriesPath);
  return publishedTitles.map((title) => {
    const book = series.books.find((item) => item.title === title);
    assert.ok(book, `${title} should be listed`);
    const folder = path.join(rootDir, ...book.folder.split('/'));
    return {
      book,
      title,
      folder,
      assets: readJson(path.join(folder, book.assetFile)),
      companion: readJson(path.join(folder, book.companionFile)),
    };
  });
}

function assertImageRefsExist(folder, imageRefs, context) {
  assert.ok(Array.isArray(imageRefs), `${context} should have image refs`);
  assert.equal(imageRefs.length > 0, true, `${context} should have at least one image ref`);
  for (const imageRef of imageRefs) {
    assert.match(imageRef, /^pages\/\d{3}\.png$/, `${context} should use page image refs`);
    assert.equal(existsSync(path.join(folder, ...imageRef.split('/'))), true, `${context} image should exist`);
  }
}

function assertGeneratedRefsExist(folder, item, context) {
  const generatedImageRefs = item.generatedImageRefs ?? [];

  assert.equal(generatedImageRefs.length > 0, true, `${context} should have generated images`);

  for (const imageRef of generatedImageRefs) {
    assert.match(imageRef, /^generated\/[a-z0-9-]+\.png$/, `${context} should use generated image refs`);
    assert.equal(existsSync(path.join(folder, ...imageRef.split('/'))), true, `${context} generated image should exist`);
  }
}

function assertVisualWorkflow(folder, item, promptDoc, context) {
  const imageRefs = item.imageRefs ?? item.pageImageRefs ?? [];
  const generatedImageRefs = item.generatedImageRefs ?? [];
  const promptId = item.generatedImagePromptId;
  const hasPageImages = Array.isArray(imageRefs) && imageRefs.length > 0;
  const hasGeneratedImages = Array.isArray(generatedImageRefs) && generatedImageRefs.length > 0;

  if (hasPageImages) {
    assertImageRefsExist(folder, imageRefs, `${context} page images`);
  }

  if (hasGeneratedImages) {
    assertGeneratedRefsExist(folder, item, context);
    assert.equal(item.needsGeneratedImage, false, `${context} should not be marked as missing generated art`);
    assert.equal(typeof promptId, 'string', `${context} should link to the reusable image prompt`);
    assert.match(promptDoc, new RegExp(`prompt-id: ${promptId}\\b`), `${context} prompt id should be documented`);
    return;
  }

  assert.equal(item.needsGeneratedImage, true, `${context} without generated art should be marked for image generation`);
  assert.equal(typeof promptId, 'string', `${context} should include a prompt id`);
  assert.match(promptDoc, new RegExp(`prompt-id: ${promptId}\\b`), `${context} prompt id should be documented`);
  assert.match(promptDoc, new RegExp(`建议保存文件名：[^\\n]+\\.png[\\s\\S]*prompt-id: ${promptId}\\b`), `${context} should document a suggested PNG filename`);
}

test('global series index uses the final 12 book titles', () => {
  const series = readJson(seriesPath);
  assert.deepEqual(
    series.books.map((book) => book.title),
    requiredTitles,
  );
});

test('static app files and required visible labels exist', () => {
  for (const file of ['index.html', path.join('assets', 'app.js'), path.join('assets', 'styles.css')]) {
    assert.equal(existsSync(path.join(rootDir, file)), true, `${file} should exist`);
  }

  const text = appText();
  for (const label of requiredUiText) {
    assert.match(text, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${label} should be present`);
  }

  for (const removed of removedHomeText) {
    assert.equal(text.includes(removed), false, `${removed} should be removed from the app UI`);
  }
});

test('published books have companion data and usable media paths', () => {
  for (const { title, folder, assets, companion } of publishedBookRecords()) {
    const coverPath = path.join(folder, assets.pageImages[0]);
    const audioPath = path.join(rootDir, ...companion.audio.path.split('/'));

    assert.equal(existsSync(coverPath), true, `${title} cover image should exist`);
    assert.equal(existsSync(audioPath), true, `${title} audio should exist`);
    assert.equal(companion.overview.oneLine.length > 0, true, `${title} should have overview`);
    assert.equal(companion.storyReview.shortReview.length > 0, true, `${title} should have review`);
    assert.equal(companion.scenes.every((scene) => scene.pageRange), true, `${title} scenes should have page ranges`);
    assert.equal(companion.questionCards.factualRecall.length > 0, true, `${title} should have factual questions`);
    assert.equal(companion.questionCards.comprehension.length > 0, true, `${title} should have comprehension questions`);
    assert.equal(companion.questionCards.openExpression.length > 0, true, `${title} should have open questions`);
    assert.equal(companion.backgroundNotes.length > 0, true, `${title} should have background notes`);
    assert.equal(companion.encyclopediaEntries.length > 0, true, `${title} should have encyclopedia entries`);
    assert.equal(companion.parentGuide.suggestedFlow.length > 0, true, `${title} should have parent tips`);
    assert.deepEqual(companion.audio.markers, [], `${title} should not force audio markers`);
  }
});

test('published books publish audio through ASCII GitHub Pages paths', () => {
  const series = readJson(seriesPath);

  for (const { book, title, companion } of publishedBookRecords()) {
    const audio = expectedAudio.get(title);
    assert.ok(audio, `${title} should have expected audio mapping`);

    assert.equal(companion.audio.path, audio.publicPath, `${title} companion should use public audio path`);
    assert.equal(book.audio.path, audio.publicPath, `${title} series index should use public audio path`);
    assert.equal(companion.audio.sourcePath, audio.source, `${title} companion should document source mapping`);
    assert.equal(book.audio.sourcePath, audio.source, `${title} series index should document source mapping`);
    assert.match(companion.audio.path, /^public\/audio\/carmela-s1\/carmela-s1-\d{2}\.mp3$/, `${title} should use ASCII audio slug`);
    assert.match(companion.audio.sourcePath, /^source\/不一样的卡梅拉\/\d{2}-.+\.mp3$/, `${title} should document the original local source path`);

    const publicPath = path.join(rootDir, ...audio.publicPath.split('/'));
    assert.equal(existsSync(publicPath), true, `${title} public audio copy should exist`);
    assert.equal(statSync(publicPath).size > 0, true, `${title} public audio copy should not be empty`);
  }

  assert.equal(series.books.slice(0, 10).every((book) => book.audio?.path?.startsWith('public/audio/')), true);
});

test('Carmela audio onboarding doc exists and documents future books', () => {
  const docPath = path.join(rootDir, 'docs', 'how-to-add-carmela-audio.md');
  assert.equal(existsSync(docPath), true, 'audio onboarding doc should exist');
  const doc = readFileSync(docPath, 'utf8');

  for (const phrase of [
    '第 5-12 本',
    'source/不一样的卡梅拉',
    'public/audio/carmela-s1',
    'ASCII',
    'preload="metadata"',
    '不要添加播放历史',
    '不要编造 marker',
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `doc should include ${phrase}`);
  }
});

test('scene and question cards include existing page image references', () => {
  for (const { title, folder, companion } of publishedBookRecords()) {
    for (const scene of companion.scenes) {
      assert.ok(Array.isArray(scene.pageRefs), `${title} ${scene.id} should have page refs`);
      assertImageRefsExist(folder, scene.imageRefs, `${title} ${scene.id}`);
    }

    for (const groupName of ['factualRecall', 'comprehension', 'openExpression']) {
      for (const card of companion.questionCards[groupName]) {
        assert.ok(Array.isArray(card.evidencePageRefs), `${title} ${card.prompt} should have evidence page refs`);
        assertImageRefsExist(folder, card.evidenceImageRefs, `${title} ${card.prompt}`);
      }
    }
  }
});

test('background and encyclopedia copy is child-facing and prompt requests are documented', () => {
  const promptPath = path.join(rootDir, 'docs', 'image-prompts', 'carmela-needed-images.md');
  assert.equal(existsSync(promptPath), true, 'missing image prompt document should exist');
  const promptDoc = readFileSync(promptPath, 'utf8');

  for (const { title, companion } of publishedBookRecords()) {
    for (const item of [...companion.backgroundNotes, ...companion.encyclopediaEntries]) {
      const text = `${item.note ?? ''} ${item.summary ?? ''}`;
      for (const phrase of childAddressBlockedPhrases) {
        assert.equal(text.includes(phrase), false, `${title} ${item.title} should not contain ${phrase}`);
      }
    }
  }

  assert.match(promptDoc, /【ChatGPT image】/, 'prompt document should use ChatGPT image format');
  assert.match(promptDoc, /```md[\s\S]*【ChatGPT image】[\s\S]*```/, 'each prompt should be in a copyable Markdown code block');
});

test('background and encyclopedia entries have page evidence, explanation art, or prompt workflow', () => {
  const promptDoc = readFileSync(path.join(rootDir, 'docs', 'image-prompts', 'carmela-needed-images.md'), 'utf8');

  for (const { title, folder, companion } of publishedBookRecords()) {
    for (const item of companion.backgroundNotes) {
      assertVisualWorkflow(folder, item, promptDoc, `${title} background ${item.title}`);
    }

    for (const item of companion.encyclopediaEntries) {
      assertVisualWorkflow(folder, item, promptDoc, `${title} encyclopedia ${item.title}`);
      assert.equal(typeof item.storyAppearance, 'string', `${title} encyclopedia ${item.title} should say where it appears`);
      assert.equal(typeof item.whatItIs, 'string', `${title} encyclopedia ${item.title} should say what it is`);
      assert.equal(typeof item.whyItMatters, 'string', `${title} encyclopedia ${item.title} should say why it matters here`);
      assert.equal(typeof item.discussionQuestion, 'string', `${title} encyclopedia ${item.title} should include a discussion question`);
    }
  }
});

test('app files do not introduce blocked product fields', () => {
  const text = appText();
  for (const term of blockedTerms) {
    assert.equal(text.includes(term), false, `${term} should not appear in app files`);
  }
});

test('GitHub Pages deployment files and publishing rules are configured', () => {
  const packageJson = readJson(path.join(rootDir, 'package.json'));
  const buildScript = readFileSync(path.join(rootDir, 'scripts', 'build.mjs'), 'utf8');
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'pages.yml');
  const readmePath = path.join(rootDir, 'README.md');
  const deploymentDocPath = path.join(rootDir, 'docs', 'github-pages-deployment.md');

  assert.equal(packageJson.scripts?.build, 'node scripts/build.mjs', 'build command should be configured');
  assert.match(buildScript, /\bdist\b/, 'build script should declare dist as the output directory');
  assert.match(buildScript, /\bpublic\b/, 'build script should publish public app assets');
  assert.match(buildScript, /\bassets\b/, 'build script should publish app assets');
  assert.match(buildScript, /\bocr\b/, 'build script should explicitly exclude OCR intermediate files');
  assert.match(buildScript, /\bsource\b/, 'build script should explicitly keep source material out of dist');
  assert.match(buildScript, /publishedBookCount\s*=\s*10/, 'build script should publish only the current first ten books');
  assert.match(buildScript, /series\.books\.slice\(0,\s*publishedBookCount\)/, 'build script should avoid publishing unused book folders');

  assert.equal(existsSync(workflowPath), true, 'GitHub Pages workflow should exist');
  const workflow = readFileSync(workflowPath, 'utf8');
  for (const phrase of [
    'actions/configure-pages',
    'actions/upload-pages-artifact',
    'actions/deploy-pages',
    'npm run build',
    'path: dist',
  ]) {
    assert.match(workflow, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `workflow should include ${phrase}`);
  }

  for (const docPath of [readmePath, deploymentDocPath]) {
    assert.equal(existsSync(docPath), true, `${path.basename(docPath)} should exist`);
    const doc = readFileSync(docPath, 'utf8');
    for (const phrase of [
      'GitHub Pages',
      'npm run build',
      'dist',
      'Actions',
      'source/',
      'OCR',
      'Book Companion / 家庭阅读助手',
      '不一样的卡梅拉',
    ]) {
      assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${path.basename(docPath)} should include ${phrase}`);
    }
  }
});
