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

export function canonicalMediaPath(value) {
  const candidate = text(value).trim().replace(/\\/g, '/').normalize('NFC');
  if (
    !candidate
    || candidate.startsWith('/')
    || /^[a-z][a-z\d+.-]*:/i.test(candidate)
  ) {
    return '';
  }

  const segments = [];
  for (const segment of candidate.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return '';
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function mediaIdForPath(bookSlug, path) {
  const basename = path.split('/').at(-1)?.replace(/\.[^.]+$/, '') ?? 'asset';
  return `media-${safeId(bookSlug)}-${safeId(basename)}-${stableHash(path)}`;
}

function pageNumberFromPath(path) {
  const match = path.match(/(?:^|\/)pages\/0*(\d+)(?:\.[^./]+)$/i);
  if (!match) return undefined;
  const pageNumber = Number(match[1]);
  return Number.isSafeInteger(pageNumber) ? pageNumber : undefined;
}

function joinMediaPath(mediaBase, path) {
  const base = text(mediaBase).replace(/\\/g, '/').replace(/\/+$/, '');
  return base ? `${base}/${path}` : path;
}

function createMediaCatalog(book = {}) {
  const mediaRegistry = {};
  const mediaGroups = {};
  const mediaIdByPath = new Map();
  const bookSlug = text(book.slug);
  const bookTitle = text(book.title);
  const mediaBase = text(book.folder);

  function registerGroup({ id, label, kind, section, ownerId, paths }) {
    const mediaIds = [];
    const groupMediaIds = new Set();

    textList(paths).forEach((sourcePath, index) => {
      const path = canonicalMediaPath(sourcePath);
      if (!path) return;

      let mediaId = mediaIdByPath.get(path);
      if (!mediaId) {
        mediaId = mediaIdForPath(bookSlug, path);
        const pageNumber = kind === 'page' ? pageNumberFromPath(path) : undefined;
        const mediaLabel = pageNumber == null
          ? `${label} · 第 ${index + 1} 张`
          : `绘本第 ${pageNumber} 页`;
        const alt = pageNumber == null
          ? `${bookTitle}：${mediaLabel}`
          : `${bookTitle}绘本第 ${pageNumber} 页`;

        mediaIdByPath.set(path, mediaId);
        mediaRegistry[mediaId] = {
          id: mediaId,
          path,
          absolutePath: joinMediaPath(mediaBase, path),
          kind,
          label: mediaLabel,
          alt,
          ...(pageNumber == null ? {} : { pageNumber }),
          uses: [],
        };
      }

      mediaRegistry[mediaId].uses.push({
        section,
        itemId: ownerId,
        groupId: id,
        position: index + 1,
      });

      if (!groupMediaIds.has(mediaId)) {
        groupMediaIds.add(mediaId);
        mediaIds.push(mediaId);
      }
    });

    mediaGroups[id] = {
      id,
      label,
      mediaIds,
      kind,
      section,
      ownerId,
    };
    return id;
  }

  return { mediaRegistry, mediaGroups, registerGroup };
}

function sceneEntry(scene = {}, index, bookSlug, registerGroup) {
  const ownerId = text(scene.id) || `scene-${safeId(bookSlug)}-${index + 1}`;
  const mediaGroupId = `media-group-${safeId(bookSlug)}-scene-${safeId(ownerId)}`;
  return {
    sequence: index + 1,
    id: text(scene.id),
    title: text(scene.title),
    pageRange: text(scene.pageRange),
    summary: text(scene.summary),
    discussionFocus: textList(scene.discussionFocus),
    mediaGroupId: registerGroup({
      id: mediaGroupId,
      label: `${text(scene.title) || `故事场景 ${index + 1}`} · 页面线索`,
      kind: 'page',
      section: 'scenes',
      ownerId,
      paths: scene.imageRefs,
    }),
  };
}

function questionEntry(card = {}, index, group, slug, registerGroup) {
  const idBase = `${safeId(slug)}-${group.key}-${index + 1}`;
  const id = `question-${idBase}`;
  const mediaGroupId = `media-group-${idBase}`;
  return {
    sequence: index + 1,
    id,
    answerId: `answer-${idBase}`,
    toggleId: `answer-toggle-${idBase}`,
    prompt: text(card.prompt),
    pageRange: text(card.pageRange),
    talkingPoints: textList(card.talkingPoints),
    mediaGroupId: registerGroup({
      id: mediaGroupId,
      label: `${group.label}第 ${index + 1} 题 · 页面线索`,
      kind: 'page',
      section: 'questions',
      ownerId: id,
      paths: card.evidenceImageRefs,
    }),
    openEnded: group.openEnded,
  };
}

function discoveryEntry(item = {}, index, bookSlug, registerGroup) {
  const ownerId = `background-${safeId(bookSlug)}-${index + 1}`;
  const groupBase = `media-group-${ownerId}`;
  const title = text(item.title) || `背景发现 ${index + 1}`;
  return {
    sequence: index + 1,
    title: text(item.title),
    pageRange: text(item.pageRange),
    note: text(item.note),
    pageMediaGroupId: registerGroup({
      id: `${groupBase}-page`,
      label: `${title} · 绘本页面`,
      kind: 'page',
      section: 'background',
      ownerId,
      paths: item.imageRefs,
    }),
    explanationMediaGroupId: registerGroup({
      id: `${groupBase}-explanation`,
      label: `${title} · 延伸图解`,
      kind: 'explanation',
      section: 'background',
      ownerId,
      paths: item.generatedImageRefs,
    }),
  };
}

function encyclopediaEntry(item = {}, index, bookSlug, registerGroup) {
  const ownerId = `encyclopedia-${safeId(bookSlug)}-${index + 1}`;
  const groupBase = `media-group-${ownerId}`;
  const title = text(item.title) || `剧情百科 ${index + 1}`;
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
    pageMediaGroupId: registerGroup({
      id: `${groupBase}-page`,
      label: `${title} · 绘本页面`,
      kind: 'page',
      section: 'encyclopedia',
      ownerId,
      paths: item.imageRefs,
    }),
    explanationMediaGroupId: registerGroup({
      id: `${groupBase}-explanation`,
      label: `${title} · 延伸图解`,
      kind: 'explanation',
      section: 'encyclopedia',
      ownerId,
      paths: item.generatedImageRefs,
    }),
  };
}

export function createCarmelaCompanionViewModel(book = {}) {
  const companion = book.companion ?? {};
  const overview = companion.overview ?? {};
  const storyReview = companion.storyReview ?? {};
  const questionCards = companion.questionCards ?? {};
  const parentGuide = companion.parentGuide ?? {};
  const companionAudio = companion.audio ?? {};
  const { mediaRegistry, mediaGroups, registerGroup } = createMediaCatalog(book);

  const scenes = list(companion.scenes).map((scene, index) => (
    sceneEntry(scene, index, book.slug, registerGroup)
  ));
  const questionGroups = QUESTION_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    purpose: group.purpose,
    openEnded: group.openEnded,
    questions: list(questionCards[group.sourceKey]).map((card, index) => (
      questionEntry(card, index, group, book.slug, registerGroup)
    )),
  }));
  const background = list(companion.backgroundNotes).map((item, index) => (
    discoveryEntry(item, index, book.slug, registerGroup)
  ));
  const encyclopedia = list(companion.encyclopediaEntries).map((item, index) => (
    encyclopediaEntry(item, index, book.slug, registerGroup)
  ));

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
    scenes,
    questionGroups,
    background,
    encyclopedia,
    mediaRegistry,
    mediaGroups,
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
