import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  createScienceTopicViewModel,
  renderScienceTopicAtlas,
} from '../assets/science-companion.js';

const root = path.resolve(import.meta.dirname, '..');
const topicDir = path.join(root, 'public', 'runtime', 'work-cells', 'topics');

async function loadTopics() {
  const files = (await readdir(topicDir)).filter((name) => name.endsWith('.json')).sort();
  return Promise.all(files.map(async (name) => ({
    name,
    topic: JSON.parse(await readFile(path.join(topicDir, name), 'utf8')),
  })));
}

test('P4B view model preserves all Work Cells runtime topics and content counts', async () => {
  const topics = await loadTopics();
  assert.equal(topics.length, 27);

  let stationCount = 0;
  let questionCount = 0;
  const categories = new Set();

  for (const { topic } of topics) {
    const model = createScienceTopicViewModel(topic);
    categories.add(model.identity.category);
    stationCount += model.stations.length;
    questionCount += model.questionGroups.reduce((sum, group) => sum + group.questions.length, 0);
    assert.equal(model.identity.hasAudio, false);
    assert.equal(model.stations.length, 4, topic.slug);
    assert.equal(model.questionGroups.reduce((sum, group) => sum + group.questions.length, 0), 6, topic.slug);
    assert.ok(model.overview.summary, topic.slug);
    assert.ok(model.identity.sourceLabel, topic.slug);
  }

  assert.equal(categories.size, 24);
  assert.equal(stationCount, 108);
  assert.equal(questionCount, 162);
});

test('P4B media registries and groups are deterministic and resolve every group member', async () => {
  const topics = await loadTopics();
  for (const { topic } of topics) {
    const first = createScienceTopicViewModel(topic);
    const second = createScienceTopicViewModel(topic);
    assert.deepEqual(first.mediaRegistry, second.mediaRegistry, topic.slug);
    assert.deepEqual(first.mediaGroups, second.mediaGroups, topic.slug);

    for (const group of Object.values(first.mediaGroups)) {
      assert.equal(new Set(group.mediaIds).size, group.mediaIds.length, group.id);
      for (const mediaId of group.mediaIds) {
        assert.ok(first.mediaRegistry[mediaId], `${topic.slug}:${group.id}:${mediaId}`);
      }
    }

    for (const media of Object.values(first.mediaRegistry)) {
      assert.ok(media.path.startsWith('public/'), `${topic.slug}:${media.path}`);
      assert.ok(media.alt, `${topic.slug}:${media.id}`);
      assert.ok(media.uses.length > 0, `${topic.slug}:${media.id}`);
    }
  }
});

test('P4B science atlas keeps only the hero image active before disclosure intent', async () => {
  const [{ topic }] = await loadTopics();
  const html = renderScienceTopicAtlas(createScienceTopicViewModel(topic), {
    thumbnailPath: 'public/assets/cells-at-work/page-thumbnails/example.webp',
  });
  const activeMarkup = html.replace(/<template\b[\s\S]*?<\/template>/g, '');

  assert.equal((activeMarkup.match(/<img\b[^>]*\ssrc=/g) ?? []).length, 1);
  assert.match(activeMarkup, /data-lightbox-image[^>]*hidden/);
  assert.match(html, /data-media-disclosure/);
  assert.match(html, /data-lightbox-group=/);
});

test('P4B answers and parent hints are hidden, labelled and free of scoring semantics', async () => {
  const [{ topic }] = await loadTopics();
  const html = renderScienceTopicAtlas(createScienceTopicViewModel(topic), {});

  assert.match(html, /data-answer-toggle=/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /class="answer science-answer"[\s\S]*?hidden/);
  assert.match(html, /家长提示/);
  assert.doesNotMatch(html, /答对|答错|得分|完成状态|学习进度|打卡/);
});

test('P4B output does not expose publication or authoring fields', async () => {
  const [{ topic }] = await loadTopics();
  const html = renderScienceTopicAtlas(createScienceTopicViewModel(topic), {});
  for (const forbidden of [
    'manifestStatus',
    'verificationStatus',
    'contentVersion',
    'imagePrompt',
    'licenseBasis',
    'copyrightMode',
  ]) {
    assert.doesNotMatch(html, new RegExp(forbidden, 'i'));
  }
});

test('P4B browser entry loads the science enhancer before the main application', async () => {
  const index = await readFile(path.join(root, 'index.html'), 'utf8');
  const enhancerPosition = index.indexOf('assets/science-companion.js');
  const appPosition = index.indexOf('assets/app.js');

  assert.ok(enhancerPosition >= 0);
  assert.ok(appPosition > enhancerPosition);
  assert.match(index, /assets\/science-companion\.css/);
});
