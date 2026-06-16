import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
const firstThreeTitles = requiredTitles.slice(0, 3);
const requiredUiText = [
  'Book Companion Panel / 家庭纸质书阅读辅助面板',
  '不一样的卡梅拉 第一季',
  '类型：绘本',
  '进入辅助页',
  '音频',
  '问答',
  '百科',
  '书籍总览',
  '内容回顾',
  '场景 / 页码',
  '问答卡片',
  '背景补充',
  '剧情相关百科',
  '音频播放器',
  '家长使用提示',
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
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function appText() {
  return ['index.html', path.join('assets', 'app.js'), path.join('assets', 'styles.css')]
    .map((file) => readFileSync(path.join(rootDir, file), 'utf8'))
    .join('\n');
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
});

test('first three books have companion data and usable media paths', () => {
  const series = readJson(seriesPath);

  for (const title of firstThreeTitles) {
    const book = series.books.find((item) => item.title === title);
    assert.ok(book, `${title} should be listed`);

    const folder = path.join(rootDir, ...book.folder.split('/'));
    const assets = readJson(path.join(folder, book.assetFile));
    const companion = readJson(path.join(folder, book.companionFile));
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

test('app files do not introduce blocked product fields', () => {
  const text = appText();
  for (const term of blockedTerms) {
    assert.equal(text.includes(term), false, `${term} should not appear in app files`);
  }
});
