const QUESTION_GROUPS = [
  {
    key: 'factual',
    sourceKey: 'factualRecall',
    label: '事实回忆',
    purpose: '先找回画面里明确发生的事。',
    openEnded: false,
  },
  {
    key: 'comprehension',
    sourceKey: 'comprehension',
    label: '理解故事',
    purpose: '顺着角色的选择，聊清故事里的原因和变化。',
    openEnded: false,
  },
  {
    key: 'open',
    sourceKey: 'openExpression',
    label: '开放表达',
    purpose: '把故事和自己的想法、感受或创作连起来。',
    openEnded: true,
  },
];

function text(value) {
  return typeof value === 'string' ? value : '';
}

function list(value) {
  return Array.isArray(value) ? value.map((item) => item) : [];
}

function textList(value) {
  return list(value).map((item) => text(item)).filter(Boolean);
}

function safeId(value) {
  return text(value).replace(/[^a-z0-9-]/gi, '-') || 'carmela-book';
}

function mediaEntry(item = {}) {
  return {
    pageImages: textList(item.imageRefs),
    explanationImages: textList(item.generatedImageRefs),
  };
}

function sceneEntry(scene = {}, index) {
  return {
    sequence: index + 1,
    id: text(scene.id),
    title: text(scene.title),
    pageRange: text(scene.pageRange),
    summary: text(scene.summary),
    discussionFocus: textList(scene.discussionFocus),
    pageImages: textList(scene.imageRefs),
  };
}

function questionEntry(card = {}, index, group, slug) {
  const idBase = `${safeId(slug)}-${group.key}-${index + 1}`;
  return {
    sequence: index + 1,
    id: `question-${idBase}`,
    answerId: `answer-${idBase}`,
    toggleId: `answer-toggle-${idBase}`,
    prompt: text(card.prompt),
    pageRange: text(card.pageRange),
    talkingPoints: textList(card.talkingPoints),
    evidenceImages: textList(card.evidenceImageRefs),
    openEnded: group.openEnded,
  };
}

function discoveryEntry(item = {}, index) {
  return {
    sequence: index + 1,
    title: text(item.title),
    pageRange: text(item.pageRange),
    note: text(item.note),
    ...mediaEntry(item),
  };
}

function encyclopediaEntry(item = {}, index) {
  return {
    sequence: index + 1,
    title: text(item.title),
    pageRange: text(item.pageRange),
    summary: text(item.summary),
    facts: [
      ['故事中出现在哪里', text(item.storyAppearance) || text(item.anchor)],
      ['它是什么', text(item.whatItIs)],
      ['为什么和故事有关', text(item.whyItMatters)],
      ['一起讨论', text(item.discussionQuestion)],
    ].map(([label, value]) => ({ label, value })),
    ...mediaEntry(item),
  };
}

export function createCarmelaCompanionViewModel(book = {}) {
  const companion = book.companion ?? {};
  const overview = companion.overview ?? {};
  const storyReview = companion.storyReview ?? {};
  const questionCards = companion.questionCards ?? {};
  const parentGuide = companion.parentGuide ?? {};
  const companionAudio = companion.audio ?? {};

  return {
    identity: {
      order: Number.isFinite(Number(book.order)) ? Number(book.order) : 0,
      title: text(book.title),
      slug: text(book.slug),
      seriesTitle: text(book.seriesTitle),
      cover: text(book.cover),
      mediaBase: text(book.folder),
    },
    summary: text(overview.oneLine),
    facts: {
      characters: textList(overview.mainCharacters),
      places: textList(overview.importantPlaces),
      relationships: textList(overview.characterRelationships),
      conflict: text(overview.keyConflict),
      emotionalArc: textList(overview.emotionalArc),
    },
    storyReview: {
      introduction: text(storyReview.shortReview),
      beats: textList(storyReview.mainPlot),
    },
    scenes: list(companion.scenes).map(sceneEntry),
    questionGroups: QUESTION_GROUPS.map((group) => ({
      key: group.key,
      label: group.label,
      purpose: group.purpose,
      openEnded: group.openEnded,
      questions: list(questionCards[group.sourceKey]).map((card, index) => (
        questionEntry(card, index, group, book.slug)
      )),
    })),
    background: list(companion.backgroundNotes).map(discoveryEntry),
    encyclopedia: list(companion.encyclopediaEntries).map(encyclopediaEntry),
    audio: {
      title: text(companionAudio.title) || text(book.audio?.title) || text(book.title),
      path: text(companionAudio.path) || text(book.audio?.path),
      markers: list(companionAudio.markers)
        .map((marker) => ({
          time: marker?.time === '' || marker?.time == null ? Number.NaN : Number(marker.time),
          label: text(marker?.label),
        }))
        .filter((marker) => Number.isFinite(marker.time) && marker.time >= 0 && marker.label),
    },
    parentGuide: {
      readingUse: text(parentGuide.readingUse),
      suggestedFlow: textList(parentGuide.suggestedFlow),
      sensitivePoints: textList(parentGuide.sensitivePoints),
    },
  };
}
