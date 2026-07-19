import { wireImageLightbox } from './a11y.js';

const BOOK_INDEX = 'public/books/index.json';
const CARMELA_SERIES_SLUG = 'carmela-season-1';
const WORK_CELLS_SERIES_SLUG = 'work-cells';
const FIRST_BATCH = 12;
const app = document.querySelector('#app');
const main = document.querySelector('#main-content');
const breadcrumb = document.querySelector('#breadcrumb');
const routeAnnouncer = document.querySelector('#route-announcer');
const skipLink = document.querySelector('.skip-link');
let model = null;
let currentPageKey = '';
let cleanupView = () => {};

const sectionNav = [
  ['overview', '书籍总览'],
  ['review', '内容回顾'],
  ['scenes', '场景 / 页码'],
  ['questions', '问答卡片'],
  ['background', '背景补充'],
  ['encyclopedia', '剧情相关百科'],
  ['audio', '音频播放器'],
  ['parents', '家长使用提示'],
];
const scienceSectionNav = [
  ['science-overview', '主题导读'],
  ['science-station', '身体科学小站'],
  ['science-questions', '亲子问题卡'],
  ['source', '来源备注'],
];

function sitePath(resourcePath) {
  return encodeURI(resourcePath.replace(/^\.?\//, ''));
}

function html(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function fetchJson(resourcePath) {
  const response = await fetch(sitePath(resourcePath));
  if (!response.ok) {
    throw new Error(`Cannot load ${resourcePath}`);
  }
  return response.json();
}

async function loadModel() {
  const index = await fetchJson(BOOK_INDEX);
  const carmelaEntry = index.series.find((item) => item.seriesSlug === CARMELA_SERIES_SLUG);
  const workCellsEntry = index.series.find((item) => item.seriesSlug === WORK_CELLS_SERIES_SLUG);
  const series = await fetchJson(carmelaEntry.manifestPath);
  const books = await Promise.all(
    series.books.slice(0, FIRST_BATCH).map(async (book) => {
      const [assets, companion] = await Promise.all([
        fetchJson(`${book.folder}/${book.assetFile}`),
        fetchJson(`${book.folder}/${book.companionFile}`),
      ]);

      return {
        ...book,
        seriesTitle: series.seriesTitle,
        assets,
        companion,
        cover: `${book.folder}/${assets.pageImages[0]}`,
        previewPages: assets.pageImages.slice(0, 4).map((page) => `${book.folder}/${page}`),
      };
    }),
  );

  let scienceSeries = null;
  if (workCellsEntry) {
    const manifest = await fetchJson(workCellsEntry.manifestPath);
    const pageMap = manifest.pageMapPath ? await fetchJson(manifest.pageMapPath) : null;
    scienceSeries = {
      ...workCellsEntry,
      manifest: mergeScienceManifest(manifest, pageMap),
    };
  }

  model = { series, books, scienceSeries };
}

function mediaStatusFor(topic) {
  return Array.isArray(topic?.pageImagePaths) && topic.pageImagePaths.length > 0 && topic.thumbnailPath
    ? 'available'
    : 'missing';
}

function mergeScienceManifest(manifest, pageMap) {
  const pageMapByOrder = new Map((pageMap?.topics ?? []).map((topic) => [topic.order, topic]));
  return {
    ...manifest,
    topics: manifest.topics.map((topic) => {
      const pageMapTopic = pageMapByOrder.get(topic.order);
      const pageImagePaths = topic.pageImagePaths ?? pageMapTopic?.pageImagePaths ?? [];
      const thumbnailPath = topic.thumbnailPath ?? pageMapTopic?.thumbnailPath ?? null;
      return {
        ...topic,
        topicId: topic.topicId ?? pageMapTopic?.topicId,
        displayTitle: topic.displayTitle ?? topic.title,
        source: {
          ...topic.source,
          sourceLabel: pageMapTopic?.sourceLabel ?? topic.source?.sourceLabel,
        },
        imageCount: topic.imageCount ?? pageMapTopic?.imageCount,
        pageImagePaths,
        thumbnailPath,
        mediaStatus: topic.mediaStatus ?? mediaStatusFor({ pageImagePaths, thumbnailPath }),
      };
    }),
  };
}

function bookCard(book, compact = false) {
  const orderLabel = String(book.order ?? '').padStart(2, '0');
  const audioAvailable = Boolean(book.audio?.path);
  const returnSection = `book-${book.order}`;
  const returnAttributes = `data-return-series="${CARMELA_SERIES_SLUG}" data-return-section="${returnSection}"`;
  const cardActions = compact
    ? ''
    : `
      <div class="card-actions">
        <a class="action-button" href="#/book/${book.slug}" ${returnAttributes}>打开伴读资料</a>
        <div class="secondary-actions" aria-label="${html(book.title)}快捷入口">
          <a href="#/book/${book.slug}/questions" ${returnAttributes}>问题卡</a>
          ${audioAvailable ? `<a href="#/book/${book.slug}/audio" ${returnAttributes}>听音频</a>` : ''}
        </div>
      </div>
    `;
  const title = compact
    ? `<p class="card-title">${html(book.title)}</p>`
    : `<h2>${html(book.title)}</h2>`;

  return `
    <article class="book-card${compact ? ' book-card-compact' : ''}">
      <div class="cover-frame">
        <img src="${sitePath(book.cover)}" alt="${html(book.title)}封面" loading="lazy">
        <span class="cover-fallback">封面图片暂时无法显示</span>
      </div>
      <div class="card-body">
        ${compact ? '' : `<p class="card-index"><span aria-hidden="true">册</span> ${html(orderLabel)}</p>`}
        ${title}
        <p class="card-meta">
          <span>绘本伴读</span>
          <span class="availability-label" data-available="${audioAvailable}">
            ${audioAvailable ? '含音频' : '文字资料'}
          </span>
        </p>
        ${cardActions}
      </div>
    </article>
  `;
}

function seriesEntryCard({ title, description, href, typeLabel, coverImage, actionLabel, domain }) {
  return `
    <article class="series-entry-card series-entry-card--${html(domain)}">
      <a class="series-entry-link" href="${href}" aria-label="进入${html(title)}">
        <div class="series-entry-cover${coverImage ? '' : ' cover-missing'}">
          ${coverImage ? `<img src="${sitePath(coverImage)}" alt="${html(title)}入口图" loading="lazy">` : ''}
          <span class="cover-fallback">入口图片暂时无法显示</span>
        </div>
        <div class="series-entry-body">
          <span class="series-entry-type">${html(typeLabel)}</span>
          <h2>${html(title)}</h2>
          <p>${html(description)}</p>
          <span class="action-button">${html(actionLabel)}</span>
        </div>
      </a>
    </article>
  `;
}

function homePage() {
  const carmelaCover = model.books[0]?.cover ?? '';
  const workCellsCover = model.scienceSeries?.manifest?.topics?.[0]?.thumbnailPath ?? '';
  return `
    <section class="series-entry-section" aria-labelledby="home-title">
      <div class="section-heading section-heading--home">
        <p class="eyebrow">纸质书旁边的温暖伴读</p>
        <div>
          <h1 id="home-title" data-route-heading tabindex="-1">选择阅读主题</h1>
          <p>先选择正在阅读的系列，再按需要打开故事回顾、问题卡或科学补充。</p>
        </div>
      </div>
      <div class="series-entry-grid">
        ${seriesEntryCard({
          title: '不一样的卡梅拉',
          description: '从绘本书架选择书目，回顾故事、聊一聊问题，也可以听配套音频。',
          href: `#/series/${CARMELA_SERIES_SLUG}`,
          typeLabel: '绘本伴读',
          coverImage: carmelaCover,
          actionLabel: '走进绘本书架',
          domain: 'carmela',
        })}
        ${seriesEntryCard({
          title: model.scienceSeries?.manifest?.seriesTitle ?? '工作细胞',
          description: '从科学主题馆按类别找到导读、身体科学小站与亲子问题卡。',
          href: `#/series/${WORK_CELLS_SERIES_SLUG}`,
          typeLabel: '科学主题伴读',
          coverImage: workCellsCover,
          actionLabel: '走进科学主题馆',
          domain: 'science',
        })}
      </div>
      <p class="usage-tip"><span aria-hidden="true">↗</span> 先读纸质书，再按需要查看辅助资料。</p>
    </section>
  `;
}

function carmelaSeriesPage() {
  return `
    <section class="season-section season-section--carmela" aria-labelledby="season-title">
      <div class="section-heading">
        <p class="eyebrow">绘本书架 · 第一季</p>
        <div>
          <h1 id="season-title" data-route-heading tabindex="-1">不一样的卡梅拉</h1>
          <p>按册序选择手边的纸质书，再打开对应的伴读资料。</p>
        </div>
      </div>
      ${model.books.length
        ? `<ol class="book-grid" aria-label="不一样的卡梅拉书目">
            ${model.books.map((book) => `<li id="book-${book.order}">${bookCard(book)}</li>`).join('')}
          </ol>`
        : `<section class="empty-state" aria-labelledby="carmela-empty-title">
            <h2 id="carmela-empty-title">暂时没有可显示的书目</h2>
            <p>可以稍后重试，或先返回首页选择其他主题。</p>
          </section>`}
    </section>
  `;
}

function groupScienceTopics(topics) {
  const groups = new Map();
  topics.forEach((topic) => {
    const category = topic.category || '其他科学主题';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(topic);
  });
  return [...groups.entries()];
}

function scienceSeriesSection(scienceSeries) {
  const topics = scienceSeries?.manifest?.topics ?? [];
  const groups = groupScienceTopics(topics);
  if (!topics.length) {
    return `
      <section class="season-section season-section--science" aria-labelledby="science-title">
        <div class="section-heading">
          <p class="eyebrow">科学主题馆</p>
          <div>
            <h1 id="science-title" data-route-heading tabindex="-1">工作细胞</h1>
            <p>按身体与健康主题查找纸质漫画旁的补充资料。</p>
          </div>
        </div>
        <section class="empty-state" aria-labelledby="science-empty-title">
          <h2 id="science-empty-title">暂时没有可显示的科学主题</h2>
          <p>可以稍后重试，或先返回首页选择其他主题。</p>
        </section>
      </section>
    `;
  }

  return `
    <section class="season-section season-section--science" aria-labelledby="science-title">
      <div class="section-heading">
        <p class="eyebrow">科学主题馆</p>
        <div>
          <h1 id="science-title" data-route-heading tabindex="-1">${html(scienceSeries.manifest.seriesTitle)}</h1>
          <p>按主题类别找到纸质漫画旁的科学导读，主题顺序与现有资料一致。</p>
        </div>
      </div>
      <nav class="category-navigation" aria-label="科学主题类别">
        <details class="category-nav" data-category-nav open>
          <summary>
            <span>快速到达</span>
            <strong>浏览 ${groups.length} 个主题类别</strong>
          </summary>
          <div>
            ${groups.map(([category], index) => (
              `<a href="#/series/${scienceSeries.seriesSlug}/category-${index + 1}">${html(category)}</a>`
            )).join('')}
          </div>
        </details>
      </nav>
      <div class="topic-category-list">
        ${groups.map(([category, categoryTopics], index) => `
          <section id="category-${index + 1}" class="topic-category" aria-labelledby="category-${index + 1}-title">
            <header class="topic-category-heading">
              <p>${String(index + 1).padStart(2, '0')}</p>
              <h2 id="category-${index + 1}-title" tabindex="-1">${html(category)}</h2>
              <span>${categoryTopics.length} 个主题</span>
            </header>
            <div class="topic-grid">
              ${categoryTopics.map((topic) => scienceTopicCard(
                scienceSeries,
                topic,
                `category-${index + 1}`,
              )).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    </section>
  `;
}

function scienceTopicCard(scienceSeries, topic, returnSection = '') {
  const sourceLabel = topic.source?.sourceLabel ?? '来源信息暂缺';
  const thumbnail = topic.thumbnailPath;
  const returnAttributes = returnSection
    ? `data-return-series="${scienceSeries.seriesSlug}" data-return-section="${returnSection}"`
    : '';
  return `
    <article class="topic-card">
      <div class="topic-thumbnail${thumbnail ? '' : ' thumbnail-missing'}">
        ${thumbnail ? `<img src="${sitePath(thumbnail)}" alt="${html(topic.displayTitle)}页面缩略图" loading="lazy">` : ''}
        <span class="cover-fallback">主题图片暂时无法显示</span>
      </div>
      <div class="topic-card-body">
        <p class="topic-category-label">${html(topic.category || '科学主题')}</p>
        <h3>${html(topic.displayTitle)}</h3>
        <p class="topic-source">来源：${html(sourceLabel)}</p>
        <a class="topic-link" href="#/science/${scienceSeries.seriesSlug}/${topic.slug}" ${returnAttributes}>
          打开科学伴读 <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  `;
}

function scienceSeriesPage(scienceSeries) {
  return `
    ${scienceSeriesSection(scienceSeries)}
  `;
}

function pageLabel(imageRef, prefix = '页面') {
  const pageNumber = String(imageRef).match(/(?:page-)?(\d{3})\.(?:png|webp)$/)?.[1]?.replace(/^0+/, '') || '';
  return pageNumber ? `${prefix} ${pageNumber}` : prefix;
}

function PageThumbnail(book, imageRef, index = 0, labelPrefix = '页面') {
  const label = pageLabel(imageRef, labelPrefix);
  const src = sitePath(`${book.folder}/${imageRef}`);
  return `
    <button
      class="page-thumbnail"
      type="button"
      data-lightbox-src="${src}"
      data-lightbox-alt="${html(`${book.title} ${label}`)}"
      aria-label="放大查看${html(label)}"
    >
      <img src="${src}" alt="${html(book.title)}${html(label)}" loading="lazy">
      <span>${html(label)}</span>
    </button>
  `;
}

function EvidencePageThumbnails(book, imageRefs, emptyText = '暂无对应页面图', labelPrefix = '证据页面') {
  if (!Array.isArray(imageRefs) || imageRefs.length === 0) {
    return `<p class="thumbnail-empty">${html(emptyText)}</p>`;
  }

  return `
    <div class="page-thumbnail-list">
      ${imageRefs.map((imageRef, index) => PageThumbnail(book, imageRef, index, labelPrefix)).join('')}
    </div>
  `;
}

function ExplanationImages(book, item) {
  const generatedImageRefs = item.generatedImageRefs ?? [];
  const promptRefs = [
    ...(item.imagePromptRefs ?? []),
    item.generatedImagePromptId,
  ].filter(Boolean);
  const promptNote = promptRefs.length > 0
    ? `<p class="thumbnail-empty">待补充解释图：${promptRefs.map((ref) => html(ref)).join('、')}</p>`
    : '<p class="thumbnail-empty">待补充解释图</p>';

  return `
    <div class="visual-group explanation-group">
      <h4>解释图</h4>
      ${generatedImageRefs.length > 0
        ? EvidencePageThumbnails(book, generatedImageRefs, '解释图待生成', '解释图')
        : promptNote}
    </div>
    <div class="visual-group evidence-group">
      <h4>绘本页面证据</h4>
      ${EvidencePageThumbnails(book, item.imageRefs, '暂无页面图', '绘本页面')}
    </div>
  `;
}

function ImageLightbox() {
  return `
    <div class="image-lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-labelledby="lightbox-title" tabindex="-1">
      <div class="lightbox-backdrop" aria-hidden="true"></div>
      <div class="lightbox-panel" role="document">
        <h2 id="lightbox-title" class="lightbox-title">页面图片放大查看</h2>
        <button class="lightbox-close" type="button" data-lightbox-close data-lightbox-close-button aria-label="关闭放大图">关闭</button>
        <button class="lightbox-nav lightbox-prev" type="button" data-lightbox-prev aria-label="上一张">上一张</button>
        <img data-lightbox-image src="assets/favicon.svg" alt="">
        <button class="lightbox-nav lightbox-next" type="button" data-lightbox-next aria-label="下一张">下一张</button>
        <p class="lightbox-caption" data-lightbox-caption></p>
      </div>
    </div>
  `;
}

function SciencePageThumbnail(topic, imagePath, index = 0) {
  const label = pageLabel(imagePath, '漫画页');
  const src = sitePath(imagePath);
  return `
    <button
      class="page-thumbnail"
      type="button"
      data-lightbox-src="${src}"
      data-lightbox-alt="${html(`${topic.displayTitle} ${label}`)}"
      aria-label="放大查看${html(label)}"
    >
      <img src="${src}" alt="${html(topic.displayTitle)}${html(label)}" loading="lazy">
      <span>${html(label)}</span>
    </button>
  `;
}

function sciencePageImagePath(topic, page) {
  if (page?.sourcePath) return page.sourcePath;
  return (topic.pageImagePaths ?? []).find((imagePath) => imagePath.includes(page?.pageId)) ?? null;
}

function isHighScienceStationPage(page) {
  return /^\s*高(?:\b|[:：])/.test(String(page?.bodyScienceStationUse ?? ''));
}

function plainList(items, emptyText = '暂无') {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="thumbnail-empty">${html(emptyText)}</p>`;
  }
  return `<ul class="plain-list">${items.map((item) => `<li>${html(item)}</li>`).join('')}</ul>`;
}

function uniqueItems(items) {
  return [...new Set((items ?? []).filter(Boolean))];
}

function groupSciencePagesByRole(pages) {
  const groups = new Map();
  for (const page of pages) {
    const key = page.pageRole || page.pageId;
    if (!groups.has(key)) {
      groups.set(key, {
        pageRole: key,
        pages: [],
        bodyScienceStationUse: [],
        biologyConcepts: [],
        encyclopediaTags: [],
        parentPromptIdeas: [],
        sensitiveContentNote: [],
      });
    }

    const group = groups.get(key);
    group.pages.push(page);
    group.bodyScienceStationUse.push(page.bodyScienceStationUse);
    group.biologyConcepts.push(...(page.biologyConcepts ?? []));
    group.encyclopediaTags.push(...(page.encyclopediaTags ?? []));
    group.parentPromptIdeas.push(...(page.parentPromptIdeas ?? []));
    group.sensitiveContentNote.push(page.sensitiveContentNote);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    bodyScienceStationUse: uniqueItems(group.bodyScienceStationUse),
    biologyConcepts: uniqueItems(group.biologyConcepts),
    encyclopediaTags: uniqueItems(group.encyclopediaTags),
    parentPromptIdeas: uniqueItems(group.parentPromptIdeas),
    sensitiveContentNote: uniqueItems(group.sensitiveContentNote),
  }));
}

function isScienceStationKnowledgeGroup(group) {
  const title = String(group.pageRole ?? '');
  if (title.includes('主题开场') || title.includes('标题')) return false;
  return group.biologyConcepts.length > 0 || group.encyclopediaTags.length > 0;
}

function scienceStationExplanation(group) {
  const concepts = group.biologyConcepts.slice(0, 4).join('、');
  const tags = group.encyclopediaTags.slice(0, 4).join('、');
  const focus = group.bodyScienceStationUse
    .map((item) => item.replace(/^高：|^中高：|^中：/, ''))
    .join(' ');
  return [
    focus,
    concepts ? `可以把这里理解为一个关于“${concepts}”的小知识点。` : '',
    tags ? `阅读时重点观察这些词或现象：${tags}。` : '',
  ].filter(Boolean).join(' ');
}

function answerForScienceQuestion(group, question) {
  const concepts = group.biologyConcepts.slice(0, 3).join('、') || '身体里的细胞协作';
  const tags = group.encyclopediaTags.slice(0, 3).join('、') || concepts;
  if (question.includes('哪里') || question.includes('画面')) {
    return `可以先看这一组漫画页面里的角色动作、环境变化和提示词，再把它们和“${tags}”联系起来。`;
  }
  if (question.includes('为什么')) {
    return `因为这里表现的是“${concepts}”相关过程。漫画把身体反应画得夸张，真实身体里通常是细胞和信号一步步协作。`;
  }
  return `这一组页面可以引导孩子从“发生了什么”说到“身体正在怎样处理”。重点答案围绕：${concepts}。`;
}

function tagList(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `
    <div class="focus-tags">
      ${items.map((item) => `<span>${html(item)}</span>`).join('')}
    </div>
  `;
}

function ScienceAnnotationThumbnail(topic, page) {
  const imagePath = sciencePageImagePath(topic, page);
  if (!imagePath) return '';
  return `
    <div class="annotation-thumb">
      ${SciencePageThumbnail(topic, imagePath)}
    </div>
  `;
}

function ScienceAnnotationThumbnails(topic, pages) {
  const thumbnails = pages
    .map((page) => {
      const imagePath = sciencePageImagePath(topic, page);
      return imagePath ? SciencePageThumbnail(topic, imagePath) : '';
    })
    .filter(Boolean)
    .join('');

  if (!thumbnails) return '';
  return `<div class="page-thumbnail-list annotation-thumb-list">${thumbnails}</div>`;
}

function sciencePagesById(topic, pageIds) {
  const pageById = new Map((topic.pageAnnotations ?? []).map((page) => [page.pageId, page]));
  return (pageIds ?? []).map((pageId) => pageById.get(pageId)).filter(Boolean);
}

function ScienceRelatedPageRefs(topic, pageIds) {
  const pages = sciencePagesById(topic, pageIds);
  if (pages.length > 0) {
    return ScienceAnnotationThumbnails(topic, pages);
  }
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    return '<p class="thumbnail-empty">暂无关联页码</p>';
  }
  return `<p class="page-range">${pageIds.map((pageId) => html(pageId)).join('、')}</p>`;
}

function ScienceExplanationImagePlaceholder(topic, group) {
  return `
    <div class="science-illustration-placeholder">
      <p>解释图待补充</p>
      <small>现有文字伴读内容仍可正常使用。</small>
    </div>
  `;
}

function ScienceStationIllustration(station) {
  if (station.imageAsset) {
    const src = sitePath(station.imageAsset);
    return `
      <button
        class="science-station-image"
        type="button"
        data-lightbox-src="${src}"
        data-lightbox-alt="${html(station.imageAlt || station.title)}"
        aria-label="放大查看${html(station.title)}解释图"
      >
        <img src="${src}" alt="${html(station.imageAlt || station.title)}" loading="lazy">
      </button>
    `;
  }
  return `
    <div class="science-illustration-placeholder">
      <p>解释图占位区</p>
      <small>现有文字伴读内容仍可正常使用。</small>
    </div>
  `;
}

function isWorkCellsV2Topic(topic) {
  return topic?.contentVersion === 'work-cells-v2';
}

function scienceV2InProgressSection(sectionId, title) {
  return `
    <section id="${sectionId}" class="content-section" aria-labelledby="${sectionId}-title">
      <h2 id="${sectionId}-title">${html(title)}</h2>
      <p class="thumbnail-empty">V2 内容制作中。当前只展示已经验收的 V2 正式内容。</p>
    </section>
  `;
}

function scienceOverviewSection(topic) {
  const overview = isWorkCellsV2Topic(topic) ? topic.topicOverview : null;
  return `
    <section id="science-overview" class="content-section" aria-labelledby="science-overview-title">
      <h2 id="science-overview-title">主题导读</h2>
      <p>${html(overview?.summary ?? topic.topicSummary ?? '主题摘要待补充。')}</p>
      <h3>核心生物概念</h3>
      ${plainList(overview?.keyBiologyConcepts ?? topic.keyBiologyConcepts)}
    </section>
  `;
}

function scienceStationSection(topic) {
  if (!isWorkCellsV2Topic(topic)) {
    return scienceV2InProgressSection('science-station', '身体科学小站');
  }

  if (Array.isArray(topic.bodyScienceStations) && topic.bodyScienceStations.length > 0) {
    return `
      <section id="science-station" class="content-section" aria-labelledby="science-station-title">
        <h2 id="science-station-title">身体科学小站</h2>
        <p>${html(topic.recommendedBodyScienceStationFocus ?? '身体科学小站重点待补充。')}</p>
        <div class="annotation-grid science-station-grid">
          ${topic.bodyScienceStations.map((station) => `
            <article class="annotation-card science-station-card">
              <h3>${html(station.title)}</h3>
              <p class="core-question">${html(station.coreQuestion)}</p>
              ${ScienceStationIllustration(station)}
              <p>${html(station.explanation)}</p>
              ${tagList(uniqueItems([...(station.biologyConcepts ?? []), ...(station.encyclopediaTags ?? [])]))}
              <div class="related-pages">
                <h4>关联漫画页面</h4>
                ${ScienceRelatedPageRefs(topic, station.relatedPageIds)}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  const groups = groupSciencePagesByRole(
    (topic.pageAnnotations ?? []).filter((page) => (
      isHighScienceStationPage(page)
      || (Array.isArray(page.encyclopediaTags) && page.encyclopediaTags.length > 0)
    )),
  ).filter(isScienceStationKnowledgeGroup);
  return `
    <section id="science-station" class="content-section" aria-labelledby="science-station-title">
      <h2 id="science-station-title">身体科学小站</h2>
      <p>${html(topic.recommendedBodyScienceStationFocus ?? '身体科学小站重点待补充。')}</p>
      <div class="annotation-grid">
        ${groups.map((group) => `
          <article class="annotation-card">
            <h3>${html(group.pageRole)}</h3>
            ${ScienceExplanationImagePlaceholder(topic, group)}
            <p>${html(scienceStationExplanation(group))}</p>
            ${tagList(uniqueItems([...group.biologyConcepts, ...group.encyclopediaTags]))}
            <div class="related-pages">
              <h4>剧情相关页面</h4>
              ${ScienceAnnotationThumbnails(topic, group.pages)}
            </div>
          </article>
        `).join('') || '<p class="thumbnail-empty">暂无高优先级候选页</p>'}
      </div>
    </section>
  `;
}

function scienceParentQuestionsSection(topic) {
  if (!isWorkCellsV2Topic(topic)) {
    return scienceV2InProgressSection('science-questions', '亲子问题卡');
  }

  if (Array.isArray(topic.parentQuestionCards) && topic.parentQuestionCards.length > 0) {
    return `
      <section id="science-questions" class="content-section" aria-labelledby="science-questions-title">
        <h2 id="science-questions-title">亲子问题卡</h2>
        <div class="annotation-grid compact-grid">
          ${topic.parentQuestionCards.map((card) => `
            <article class="annotation-card">
              <p class="small-tag">${html(card.category)}</p>
              <h3>${html(card.title)}</h3>
              <div class="question-answer-list">
                <section>
                  <h4>问题</h4>
                  <p>${html(card.question)}</p>
                  <h4>答案</h4>
                  <p>${html(card.answer)}</p>
                  <h4>家长提示</h4>
                  <p>${html(card.parentHint)}</p>
                </section>
              </div>
              ${tagList(card.biologyConcepts)}
              <div class="related-pages">
                <h4>相应漫画页面</h4>
                ${ScienceRelatedPageRefs(topic, card.relatedPageIds)}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  const groups = groupSciencePagesByRole(
    (topic.pageAnnotations ?? []).filter((page) => Array.isArray(page.parentPromptIdeas) && page.parentPromptIdeas.length > 0),
  ).filter((group) => !String(group.pageRole ?? '').includes('主题开场'));
  return `
    <section id="science-questions" class="content-section" aria-labelledby="science-questions-title">
      <h2 id="science-questions-title">亲子问题卡</h2>
      <div class="annotation-grid compact-grid">
        ${groups.map((group) => `
          <article class="annotation-card">
            <h3>${html(group.pageRole)}</h3>
            <div class="question-answer-list">
              ${group.parentPromptIdeas.map((question) => `
                <section>
                  <h4>问题</h4>
                  <p>${html(question)}</p>
                  <h4>答案</h4>
                  <p>${html(answerForScienceQuestion(group, question))}</p>
                </section>
              `).join('')}
            </div>
            <div class="related-pages">
              <h4>相应漫画页面</h4>
              ${ScienceAnnotationThumbnails(topic, group.pages)}
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function scienceParentGuidanceSection(topic) {
  const parentNote = topic.parentReadingNote || topic.parentNote || topic.sensitiveContentGuidance;
  if (!parentNote) return '';
  return `
    <section id="science-parent-guidance" class="content-section parent-guidance-section" aria-labelledby="science-parent-guidance-title">
      <h2 id="science-parent-guidance-title">家长共读提示</h2>
      <p>${html(parentNote)}</p>
    </section>
  `;
}

function overviewSection(book) {
  const { overview } = book.companion;
  return `
    <section id="overview" class="content-section" aria-labelledby="overview-title">
      <h2 id="overview-title">书籍总览</h2>
      <p>${html(overview.oneLine)}</p>
      <div class="two-column">
        <div>
          <h3>主要角色</h3>
          <ul class="plain-list">${overview.mainCharacters.map((item) => `<li>${html(item)}</li>`).join('')}</ul>
        </div>
        <div>
          <h3>重要地点</h3>
          <ul class="plain-list">${overview.importantPlaces.map((item) => `<li>${html(item)}</li>`).join('')}</ul>
        </div>
      </div>
      <h3>关键冲突</h3>
      <p>${html(overview.keyConflict)}</p>
      <div class="focus-tags" aria-label="情绪线索">
        ${overview.emotionalArc.map((item) => `<span>${html(item)}</span>`).join('')}
      </div>
    </section>
  `;
}

function reviewSection(book) {
  const { storyReview } = book.companion;
  return `
    <section id="review" class="content-section" aria-labelledby="review-title">
      <h2 id="review-title">内容回顾</h2>
      <p>${html(storyReview.shortReview)}</p>
      <ol class="plain-list">
        ${storyReview.mainPlot.map((item) => `<li>${html(item)}</li>`).join('')}
      </ol>
    </section>
  `;
}

function scenesSection(book) {
  return `
    <section id="scenes" class="content-section" aria-labelledby="scenes-title">
      <h2 id="scenes-title">场景 / 页码</h2>
      <div class="scene-list">
        ${book.companion.scenes.map((scene) => `
          <article class="scene-card">
            <header>
              <h3>${html(scene.title)}</h3>
              <span class="page-range">页码：${html(scene.pageRange)}</span>
            </header>
            <p>${html(scene.summary)}</p>
            <div class="focus-tags">
              ${scene.discussionFocus.map((item) => `<span>${html(item)}</span>`).join('')}
            </div>
            ${EvidencePageThumbnails(book, scene.imageRefs, '暂无页面图', '场景页面')}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function questionGroup(book, title, cards, kind) {
  return `
    <div class="qa-type">
      <h3>${html(title)}</h3>
      <div class="qa-grid">
        ${cards.map((card, index) => {
          const answerId = `${kind}-${index}`;
          const isOpen = kind === 'open';
          return `
            <article class="qa-card">
              <p class="small-tag">${isOpen ? '开放表达' : '参考答案默认隐藏'}</p>
              <h4>${html(card.prompt)}</h4>
              <p class="page-range">页码：${html(card.pageRange)}</p>
              ${isOpen ? '<p class="open-note">开放表达，没有标准答案。</p>' : ''}
              <button
                class="answer-button"
                type="button"
                data-answer-toggle="${answerId}"
                aria-controls="${answerId}"
                aria-expanded="false"
              >
                ${isOpen ? '显示讨论提示' : '显示参考答案'}
              </button>
              <div id="${answerId}" class="answer" hidden>
                <ul class="plain-list">
                  ${card.talkingPoints.map((item) => `<li>${html(item)}</li>`).join('')}
                </ul>
                <div class="answer-evidence">
                  <h5>答案依据页面</h5>
                  ${EvidencePageThumbnails(book, card.evidenceImageRefs, '暂无对应页面图', '答案依据页面')}
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function questionsSection(book) {
  const { questionCards } = book.companion;
  return `
    <section id="questions" class="content-section" aria-labelledby="questions-title">
      <h2 id="questions-title">问答卡片</h2>
      ${questionGroup(book, 'Factual recall', questionCards.factualRecall, 'factual')}
      ${questionGroup(book, 'Comprehension', questionCards.comprehension, 'comprehension')}
      ${questionGroup(book, 'Open expression', questionCards.openExpression, 'open')}
    </section>
  `;
}

function backgroundSection(book) {
  return `
    <section id="background" class="content-section" aria-labelledby="background-title">
      <h2 id="background-title">背景补充</h2>
      <div class="note-grid">
        ${book.companion.backgroundNotes.map((note) => `
          <article class="note-card">
            <header>
              <h3>${html(note.title)}</h3>
              <span class="page-range">页码：${html(note.pageRange)}</span>
            </header>
            <p>${html(note.note)}</p>
            ${ExplanationImages(book, note)}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function encyclopediaSection(book) {
  return `
    <section id="encyclopedia" class="content-section" aria-labelledby="encyclopedia-title">
      <h2 id="encyclopedia-title">剧情相关百科</h2>
      <div class="encyclopedia-grid">
        ${book.companion.encyclopediaEntries.map((entry) => `
          <article class="mini-card">
            <header>
              <h3>${html(entry.title)}</h3>
              <span class="page-range">页码：${html(entry.pageRange)}</span>
            </header>
            <dl class="entry-facts">
              <div>
                <dt>故事中出现在哪里</dt>
                <dd>${html(entry.storyAppearance ?? entry.anchor)}</dd>
              </div>
              <div>
                <dt>它是什么</dt>
                <dd>${html(entry.whatItIs ?? entry.summary)}</dd>
              </div>
              <div>
                <dt>为什么和故事有关</dt>
                <dd>${html(entry.whyItMatters ?? entry.summary)}</dd>
              </div>
              <div>
                <dt>一起讨论</dt>
                <dd>${html(entry.discussionQuestion ?? '一起找找对应页面里的细节。')}</dd>
              </div>
            </dl>
            <p>${html(entry.summary)}</p>
            ${ExplanationImages(book, entry)}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function formatClock(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const whole = Math.floor(value);
  const minutes = Math.floor(whole / 60);
  const seconds = String(whole % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function markerList(markers) {
  const reliableMarkers = Array.isArray(markers)
    ? markers.filter((marker) => Number.isFinite(Number(marker?.time)) && marker?.label)
    : [];

  if (reliableMarkers.length === 0) {
    return '<p class="audio-note">当前只接入整本音频；没有可靠的场景时间点证据，因此不显示 marker。</p>';
  }

  return `
    <ol class="audio-marker-list" aria-label="音频 marker">
      ${reliableMarkers.map((marker) => `
        <li>
          <button type="button" data-audio-marker="${Number(marker.time)}">
            <span>${html(formatClock(Number(marker.time)))}</span>
            ${html(marker.label)}
          </button>
        </li>
      `).join('')}
    </ol>
  `;
}

function audioSection(book) {
  const audio = book.companion.audio;

  if (!audio?.path) {
    return `
      <section id="audio" class="content-section" aria-labelledby="audio-title">
        <h2 id="audio-title">音频播放器</h2>
        <div class="audio-panel audio-panel-empty">
          <h3>${html(book.title)}</h3>
          <p class="audio-note">音频暂未接入。页面其余阅读辅助内容仍可使用。</p>
        </div>
      </section>
    `;
  }

  const source = sitePath(audio.path);

  return `
    <section id="audio" class="content-section" aria-labelledby="audio-title">
      <h2 id="audio-title">音频播放器</h2>
      <div class="audio-panel">
        <h3>${html(audio.title)}</h3>
        <p class="audio-note">点播辅助音频；不会保存任何播放记录。</p>
        <div class="audio-controls">
          <button class="audio-main-button" type="button" data-audio-play aria-controls="book-audio">播放音频</button>
          <div class="audio-time" aria-label="当前时间和总时长">
            <span data-audio-current-time>0:00</span>
            <span>/</span>
            <span data-audio-total-time>0:00</span>
          </div>
        </div>
        <input
          class="audio-seek"
          type="range"
          min="0"
          max="0"
          value="0"
          step="0.1"
          data-audio-seek
          aria-label="音频进度条"
          disabled
        >
        <p class="audio-note" id="audio-message">拖动进度条可调整播放位置。</p>
        <audio id="book-audio" controls preload="metadata">
          <source src="${source}" type="audio/mpeg">
          当前浏览器不支持音频播放。
        </audio>
        ${markerList(audio.markers)}
      </div>
    </section>
  `;
}

function parentsSection(book) {
  const { parentGuide } = book.companion;
  return `
    <section id="parents" class="content-section" aria-labelledby="parents-title">
      <h2 id="parents-title">家长使用提示</h2>
      <p>${html(parentGuide.readingUse)}</p>
      <div class="two-column">
        <div>
          <h3>建议使用流程</h3>
          <ol class="plain-list">${parentGuide.suggestedFlow.map((item) => `<li>${html(item)}</li>`).join('')}</ol>
        </div>
        <div>
          <h3>需要留意的讲法</h3>
          <ul class="plain-list">${parentGuide.sensitivePoints.map((item) => `<li>${html(item)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>
  `;
}

function pageCheckSection(book) {
  return `
    <section class="content-section page-check-section" aria-labelledby="page-check-title">
      <details class="page-check">
        <summary id="page-check-title">折叠式页面图片核对区</summary>
        <div class="thumb-row">
          ${book.previewPages.map((page, index) => `
            <img src="${sitePath(page)}" alt="${html(book.title)}页面图片 ${index + 1}">
          `).join('')}
        </div>
      </details>
    </section>
  `;
}

function bookPage(book) {
  return `
    <div class="book-layout companion-view">
      <aside class="book-side">
        ${bookCard(book, true)}
        <nav class="quick-nav" aria-label="页面模块">
          ${sectionNav.map(([id, label]) => `<a href="#/book/${book.slug}/${id}">${label}</a>`).join('')}
        </nav>
      </aside>
      <div class="book-main">
        <section class="book-title-block">
          <a class="back-link" href="#/series/${CARMELA_SERIES_SLUG}">返回不一样的卡梅拉</a>
          <h1 data-route-heading tabindex="-1">${html(book.title)}</h1>
          <p>${html(book.companion.overview.oneLine)}</p>
        </section>
        ${overviewSection(book)}
        ${reviewSection(book)}
        ${scenesSection(book)}
        ${questionsSection(book)}
        ${backgroundSection(book)}
        ${encyclopediaSection(book)}
        ${audioSection(book)}
        ${parentsSection(book)}
        ${pageCheckSection(book)}
      </div>
    </div>
    ${ImageLightbox()}
  `;
}

function scienceTopicSummaryCard(topic) {
  const thumbnail = topic.thumbnailPath;
  return `
    <article class="topic-summary-card">
      <div class="topic-thumbnail${thumbnail ? '' : ' thumbnail-missing'}">
        ${thumbnail ? `<img src="${sitePath(thumbnail)}" alt="${html(topic.displayTitle)}页面缩略图" loading="lazy">` : ''}
        <span class="cover-fallback">主题图片暂时无法显示</span>
      </div>
      <div>
        <p class="topic-category-label">${html(topic.category || '科学主题')}</p>
        <p class="card-title">${html(topic.displayTitle)}</p>
        <p class="topic-source">来源：${html(topic.source?.sourceLabel ?? '来源信息暂缺')}</p>
      </div>
    </article>
  `;
}

function scienceTopicPage(scienceSeries, topic) {
  return `
    <div class="book-layout companion-view companion-view--science">
      <aside class="book-side">
        ${scienceTopicSummaryCard(topic)}
        <nav class="quick-nav" aria-label="主题模块">
          ${scienceSectionNav.map(([id, label]) => (
            `<a href="#/science/${scienceSeries.seriesSlug}/${topic.slug}/${id}">${label}</a>`
          )).join('')}
        </nav>
      </aside>
      <div class="book-main">
        <section class="book-title-block">
          <a class="back-link" href="#/series/${scienceSeries.seriesSlug}">返回工作细胞</a>
          <h1 data-route-heading tabindex="-1">${html(topic.displayTitle)}</h1>
          <p>${html(topic.category)}</p>
        </section>
        ${scienceOverviewSection(topic)}
        ${scienceStationSection(topic)}
        ${scienceParentQuestionsSection(topic)}
        ${scienceParentGuidanceSection(topic)}
        <section id="source" class="content-section" aria-labelledby="source-title">
          <h2 id="source-title">来源备注</h2>
          <p>来源：${html(topic.source?.sourceLabel ?? '来源信息暂缺')}</p>
          ${plainList(topic.sourceNotes)}
        </section>
      </div>
    </div>
    ${ImageLightbox()}
  `;
}

function errorPage(message, returnHref = '#/', returnLabel = '返回首页') {
  return `
    <section class="error-state" aria-labelledby="route-error-title">
      <p class="state-kicker">方向标暂时没有指向这里</p>
      <h1 id="route-error-title" data-route-heading tabindex="-1">没有找到这个伴读入口</h1>
      <p>${html(message)}</p>
      <a class="action-button" href="${html(returnHref)}">${html(returnLabel)}</a>
    </section>
  `;
}

function currentRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) {
    return { view: 'home' };
  }
  if (parts[0] === 'series') {
    return { view: 'series', seriesSlug: parts[1], target: parts[2], extra: parts.slice(3) };
  }
  if (parts[0] === 'book') {
    return { view: 'book', slug: parts[1], target: parts[2], extra: parts.slice(3) };
  }
  if (parts[0] === 'science') {
    return {
      view: 'science',
      seriesSlug: parts[1],
      slug: parts[2],
      target: parts[3],
      extra: parts.slice(4),
    };
  }
  return { view: 'invalid' };
}

function wireCoverFallbacks(signal) {
  document.querySelectorAll(
    '.series-entry-cover img, .cover-frame img, .topic-thumbnail img, .thumb-row img, .page-thumbnail img, .science-station-image img',
  ).forEach((image) => {
    const showFallback = () => {
      image.hidden = true;
      image.closest('.series-entry-cover')?.classList.add('cover-missing');
      image.closest('.cover-frame')?.classList.add('cover-missing');
      image.closest('.topic-thumbnail')?.classList.add('thumbnail-missing');
      image.closest('.page-thumbnail')?.classList.add('thumbnail-missing');
      image.closest('.science-station-image')?.classList.add('thumbnail-missing');
    };
    image.addEventListener('error', showFallback, { once: true, signal });
    if (image.complete && image.naturalWidth === 0) showFallback();
  });
}

function wireLightbox() {
  const lightbox = document.querySelector('[data-lightbox]');
  const openButtons = [...document.querySelectorAll('[data-lightbox-src]')];
  return wireImageLightbox(lightbox, openButtons);
}

function wireAnswers(signal) {
  document.querySelectorAll('[data-answer-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const answer = document.getElementById(button.dataset.answerToggle);
      if (!answer) return;
      const willShow = answer.hidden;
      answer.hidden = !willShow;
      button.setAttribute('aria-expanded', String(willShow));
      button.textContent = willShow
        ? button.textContent.replace('显示', '隐藏')
        : button.textContent.replace('隐藏', '显示');
    }, { signal });
  });
}

function wireAudio(signal) {
  const audio = document.querySelector('#book-audio');
  const button = document.querySelector('[data-audio-play]');
  const seek = document.querySelector('[data-audio-seek]');
  const currentTime = document.querySelector('[data-audio-current-time]');
  const totalTime = document.querySelector('[data-audio-total-time]');
  const message = document.querySelector('#audio-message');
  if (!audio || !button) return () => {};

  function audioTotal() {
    const value = Reflect.get(audio, ['dur', 'ation'].join(''));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function syncDisplay() {
    const total = audioTotal();
    if (currentTime) currentTime.textContent = formatClock(audio.currentTime);
    if (totalTime) totalTime.textContent = total ? formatClock(total) : '0:00';
    if (seek) {
      seek.max = String(total || 0);
      seek.value = String(Math.min(audio.currentTime, total || 0));
      seek.disabled = total === 0;
    }
  }

  button.addEventListener('click', async () => {
    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      if (message) {
        message.textContent = '浏览器暂时阻止了快捷按钮，请使用下方原生音频控件播放或暂停。';
      }
    }
  }, { signal });

  audio.addEventListener('play', () => {
    button.textContent = '暂停音频';
  }, { signal });

  audio.addEventListener('pause', () => {
    button.textContent = '播放音频';
  }, { signal });

  audio.addEventListener('loadedmetadata', syncDisplay, { signal });
  audio.addEventListener('timeupdate', syncDisplay, { signal });
  audio.addEventListener('ended', syncDisplay, { signal });

  seek?.addEventListener('input', () => {
    const nextTime = Number(seek.value);
    if (Number.isFinite(nextTime)) {
      audio.currentTime = nextTime;
      syncDisplay();
    }
  }, { signal });

  document.querySelectorAll('[data-audio-marker]').forEach((markerButton) => {
    markerButton.addEventListener('click', () => {
      const nextTime = Number(markerButton.dataset.audioMarker);
      if (Number.isFinite(nextTime)) {
        audio.currentTime = nextTime;
        syncDisplay();
      }
    }, { signal });
  });

  audio.addEventListener('error', () => {
    button.disabled = true;
    if (seek) seek.disabled = true;
    if (message) {
      message.textContent = '音频路径暂时无法访问，页面其余内容仍可使用。';
    }
  }, { signal });

  syncDisplay();
  return () => audio.pause();
}

function wireReturnContext(signal) {
  document.querySelectorAll('[data-return-series][data-return-section]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return;
      }
      const { returnSeries, returnSection } = link.dataset;
      history.replaceState(history.state, '', `#/series/${returnSeries}/${returnSection}`);
    }, { signal });
  });
}

function wireCategoryNavigation(signal) {
  const categoryNavigation = document.querySelector('[data-category-nav]');
  if (!categoryNavigation) return;
  const compactNavigation = matchMedia('(max-width: 680px)');
  const syncOpenState = () => {
    categoryNavigation.open = !compactNavigation.matches;
  };
  syncOpenState();
  compactNavigation.addEventListener('change', syncOpenState, { signal });
}

function afterRender() {
  const controller = new AbortController();
  const { signal } = controller;
  wireCoverFallbacks(signal);
  wireAnswers(signal);
  wireReturnContext(signal);
  wireCategoryNavigation(signal);
  const cleanupAudio = wireAudio(signal);
  const cleanupLightbox = wireLightbox();
  return () => {
    controller.abort();
    cleanupAudio();
    cleanupLightbox();
  };
}

function invalidRoute(message, returnHref = '#/', returnLabel = '返回首页') {
  return {
    valid: false,
    view: 'error',
    pageKey: `error:${location.hash}`,
    title: '页面未找到',
    breadcrumbs: [{ label: '首页', href: '#/' }, { label: '页面未找到' }],
    markup: errorPage(message, returnHref, returnLabel),
  };
}

function resolveRoute(route) {
  if (route.view === 'home') {
    return {
      valid: true,
      view: 'home',
      pageKey: 'home',
      title: '选择阅读主题',
      breadcrumbs: [],
      markup: homePage(),
    };
  }

  if (route.view === 'series') {
    if (!route.seriesSlug || route.extra.length) {
      return invalidRoute('这个系列入口不完整，请从首页重新选择。');
    }
    if (route.seriesSlug === CARMELA_SERIES_SLUG) {
      const bookNumber = Number(route.target?.match(/^book-(\d+)$/)?.[1] ?? 0);
      const canonicalBookTarget = bookNumber
        ? `book-${bookNumber}`
        : '';
      const bookTargetExists = model.books.some((book) => book.order === bookNumber);
      if (
        route.target
        && (
          !bookNumber
          || route.target !== canonicalBookTarget
          || !bookTargetExists
        )
      ) {
        return invalidRoute(
          '这个绘本书架中没有对应的分区。',
          `#/series/${CARMELA_SERIES_SLUG}`,
          '返回绘本书架',
        );
      }
      return {
        valid: true,
        view: 'series',
        domain: 'carmela',
        target: route.target,
        pageKey: `series:${CARMELA_SERIES_SLUG}`,
        title: '不一样的卡梅拉',
        breadcrumbs: [{ label: '首页', href: '#/' }, { label: '不一样的卡梅拉' }],
        markup: carmelaSeriesPage(),
      };
    }
    if (route.seriesSlug === WORK_CELLS_SERIES_SLUG) {
      const groupCount = groupScienceTopics(model.scienceSeries?.manifest?.topics ?? []).length;
      const categoryNumber = Number(route.target?.match(/^category-(\d+)$/)?.[1] ?? 0);
      const canonicalCategoryTarget = categoryNumber
        ? `category-${categoryNumber}`
        : '';
      if (
        route.target
        && (
          !categoryNumber
          || route.target !== canonicalCategoryTarget
          || categoryNumber > groupCount
        )
      ) {
        return invalidRoute(
          '这个科学主题类别不存在。',
          `#/series/${WORK_CELLS_SERIES_SLUG}`,
          '返回科学主题馆',
        );
      }
      return {
        valid: true,
        view: 'series',
        domain: 'science',
        target: route.target,
        pageKey: `series:${WORK_CELLS_SERIES_SLUG}`,
        title: model.scienceSeries?.manifest?.seriesTitle ?? '工作细胞',
        breadcrumbs: [{ label: '首页', href: '#/' }, { label: '工作细胞' }],
        markup: scienceSeriesPage(model.scienceSeries),
      };
    }
    return invalidRoute('没有找到这个阅读系列。');
  }

  if (route.view === 'book') {
    if (!route.slug || route.extra.length) {
      return invalidRoute('这个绘本伴读入口不完整，请从绘本书架重新选择。');
    }
    const book = model.books.find((item) => item.slug === route.slug);
    if (!book) {
      return invalidRoute(
        '没有找到这本书的伴读资料。',
        `#/series/${CARMELA_SERIES_SLUG}`,
        '返回绘本书架',
      );
    }
    if (route.target && !sectionNav.some(([id]) => id === route.target)) {
      return invalidRoute(
        '这本书的伴读资料中没有对应的内容段落。',
        `#/book/${book.slug}`,
        `返回《${book.title}》`,
      );
    }
    return {
      valid: true,
      view: 'book',
      domain: 'carmela',
      target: route.target,
      pageKey: `book:${book.slug}`,
      title: book.title,
      breadcrumbs: [
        { label: '首页', href: '#/' },
        { label: '不一样的卡梅拉', href: `#/series/${CARMELA_SERIES_SLUG}` },
        { label: book.title },
      ],
      markup: bookPage(book),
    };
  }

  if (route.view === 'science') {
    if (!route.seriesSlug || !route.slug || route.extra.length) {
      return invalidRoute('这个科学伴读入口不完整，请从科学主题馆重新选择。');
    }
    if (route.seriesSlug !== WORK_CELLS_SERIES_SLUG) {
      return invalidRoute('没有找到这个科学伴读系列。');
    }
    const scienceSeries = model.scienceSeries;
    const topic = scienceSeries?.manifest?.topics?.find((item) => item.slug === route.slug);
    if (!topic) {
      return invalidRoute(
        '没有找到这个科学主题的伴读资料。',
        `#/series/${WORK_CELLS_SERIES_SLUG}`,
        '返回科学主题馆',
      );
    }
    if (route.target && !scienceSectionNav.some(([id]) => id === route.target)) {
      return invalidRoute(
        '这个科学主题中没有对应的内容段落。',
        `#/science/${WORK_CELLS_SERIES_SLUG}/${topic.slug}`,
        `返回“${topic.displayTitle}”`,
      );
    }
    return {
      valid: true,
      view: 'science',
      domain: 'science',
      target: route.target,
      pageKey: `science:${scienceSeries.seriesSlug}:${topic.slug}`,
      title: topic.displayTitle,
      breadcrumbs: [
        { label: '首页', href: '#/' },
        { label: '工作细胞', href: `#/series/${WORK_CELLS_SERIES_SLUG}` },
        { label: topic.displayTitle },
      ],
      markup: scienceTopicPage(scienceSeries, topic),
    };
  }

  return invalidRoute('这个地址没有对应的伴读入口。');
}

function updateBreadcrumb(items) {
  if (!items.length) {
    breadcrumb.hidden = true;
    breadcrumb.replaceChildren();
    return;
  }
  breadcrumb.hidden = false;
  breadcrumb.innerHTML = `
    <ol>
      ${items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        return `<li>${
          isCurrent
            ? `<span aria-current="page">${html(item.label)}</span>`
            : `<a href="${html(item.href)}">${html(item.label)}</a>`
        }</li>`;
      }).join('')}
    </ol>
  `;
}

function focusRoute(route) {
  requestAnimationFrame(() => {
    let focusTarget = null;
    if (route.target) {
      const section = document.getElementById(route.target);
      focusTarget = section?.matches('h1, h2, h3')
        ? section
        : section?.querySelector('h1, h2, h3') ?? section;
    } else {
      focusTarget = document.querySelector('[data-route-heading]');
    }

    if (focusTarget) {
      if (!focusTarget.hasAttribute('tabindex')) {
        focusTarget.setAttribute('tabindex', '-1');
      }
      focusTarget.focus({ preventScroll: true });
      if (route.target) {
        focusTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }

    routeAnnouncer.textContent = '';
    requestAnimationFrame(() => {
      routeAnnouncer.textContent = route.target && focusTarget
        ? `已到达：${focusTarget.textContent.trim()}`
        : `已打开：${route.title}`;
    });
  });
}

function render() {
  const route = resolveRoute(currentRoute());
  document.title = `${route.title} | 温暖伴读图册`;
  updateBreadcrumb(route.breadcrumbs);

  if (route.valid && route.pageKey === currentPageKey) {
    document.querySelector('[data-lightbox]:not([hidden]) [data-lightbox-close-button]')?.click();
    focusRoute(route);
    return;
  }

  cleanupView();
  cleanupView = () => {};
  currentPageKey = route.pageKey;
  main.dataset.view = route.view;
  if (route.domain) {
    main.dataset.domain = route.domain;
  } else {
    delete main.dataset.domain;
  }
  app.innerHTML = route.markup;
  app.setAttribute('aria-busy', 'false');
  cleanupView = afterRender();
  focusRoute(route);
}

let routerStarted = false;

function showLoadError() {
  cleanupView();
  cleanupView = () => {};
  currentPageKey = 'load-error';
  document.title = '资料载入失败 | 温暖伴读图册';
  updateBreadcrumb([{ label: '首页', href: '#/' }, { label: '资料载入失败' }]);
  main.dataset.view = 'error';
  delete main.dataset.domain;
  app.setAttribute('aria-busy', 'false');
  app.innerHTML = `
    <section class="error-state" aria-labelledby="load-error-title">
      <p class="state-kicker">书架暂时没有准备好</p>
      <h1 id="load-error-title" data-route-heading tabindex="-1">伴读资料载入失败</h1>
      <p>请检查网络连接后重试。页面不会显示内部文件位置。</p>
      <div class="state-actions">
        <button class="action-button" type="button" data-retry>重新载入</button>
        <a class="ghost-button" href="#/">返回首页</a>
      </div>
    </section>
  `;
  document.querySelector('[data-retry]')?.addEventListener('click', () => start());
  focusRoute({ title: '伴读资料载入失败' });
}

async function start() {
  app.setAttribute('aria-busy', 'true');
  try {
    await loadModel();
    if (!routerStarted) {
      window.addEventListener('hashchange', render);
      routerStarted = true;
    }
    render();
  } catch {
    showLoadError();
  }
}

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

skipLink?.addEventListener('click', (event) => {
  event.preventDefault();
  const skipTarget = document.querySelector('[data-route-heading]') ?? main;
  skipTarget.focus({ preventScroll: true });
  skipTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
});

start();
