const BOOK_INDEX = 'public/books/index.json';
const CARMELA_SERIES_SLUG = 'carmela-season-1';
const WORK_CELLS_SERIES_SLUG = 'work-cells';
const FIRST_BATCH = 12;
const app = document.querySelector('#app');
let model = null;
let lightboxItems = [];
let lightboxIndex = 0;

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
        displayTitle: topic.title,
        source: {
          ...topic.source,
          sourceLabel: pageMapTopic?.sourceLabel ?? topic.source?.sourceLabel,
        },
        pageImagePaths,
        thumbnailPath,
        mediaStatus: topic.mediaStatus ?? mediaStatusFor({ pageImagePaths, thumbnailPath }),
      };
    }),
  };
}

function header() {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand-link" href="#/" aria-label="返回首页">
          <span class="brand-mark">书</span>
          <span class="brand-text">
            <span class="brand-title">Book Companion / 家庭阅读助手</span>
          </span>
        </a>
      </div>
    </header>
  `;
}

function bookCard(book, compact = false) {
  const cardActions = compact
    ? ''
    : `
      <div class="card-actions">
        <a class="action-button" href="#/book/${book.slug}">进入辅助页</a>
        <a class="ghost-button" href="#/book/${book.slug}/audio">Audio / 音频</a>
        <a class="ghost-button" href="#/book/${book.slug}/questions">问答</a>
        <a class="ghost-button" href="#/book/${book.slug}/encyclopedia">百科</a>
      </div>
    `;

  return `
    <article class="book-card">
      <div class="cover-frame">
        <img src="${sitePath(book.cover)}" alt="${html(book.title)}封面">
        <span class="cover-fallback">封面图片暂时无法显示</span>
      </div>
      <div class="card-body">
        <h3>${html(book.title)}</h3>
        <ul class="meta-list" aria-label="书籍资料">
          <li>系列：${html(book.seriesTitle)}</li>
          <li>类型：绘本</li>
        </ul>
        ${cardActions}
      </div>
    </article>
  `;
}

function homePage() {
  return `
    ${header()}
    <main>
      <section class="season-section" aria-labelledby="season-title">
        <div class="section-heading">
          <div>
            <h2 id="season-title">不一样的卡梅拉</h2>
          </div>
        </div>
        <div class="book-grid">
          ${model.books.map((book) => bookCard(book)).join('')}
        </div>
      </section>
      ${scienceSeriesSection(model.scienceSeries)}
    </main>
  `;
}

function scienceSeriesSection(scienceSeries) {
  if (!scienceSeries?.manifest?.topics?.length) return '';
  return `
    <section class="season-section" aria-labelledby="science-title">
      <div class="section-heading">
        <div>
          <h2 id="science-title">${html(scienceSeries.manifest.seriesTitle)}</h2>
        </div>
      </div>
      <div class="book-grid">
        ${scienceSeries.manifest.topics.map((topic) => scienceTopicCard(scienceSeries, topic)).join('')}
      </div>
    </section>
  `;
}

function scienceTopicCard(scienceSeries, topic) {
  const sourceLabel = topic.source?.sourceLabel ?? '来源待核对';
  const thumbnail = topic.thumbnailPath;
  return `
    <article class="book-card">
      <div class="cover-frame">
        ${thumbnail ? `<img src="${sitePath(thumbnail)}" alt="${html(topic.displayTitle)}页面缩略图">` : ''}
        <span class="cover-fallback">页面图片暂时无法显示</span>
      </div>
      <div class="card-body">
        <h3>${html(topic.displayTitle)}</h3>
        <ul class="meta-list" aria-label="主题资料">
          <li>类型：科学漫画伴读</li>
          <li>来源：${html(sourceLabel)}</li>
        </ul>
        <div class="card-actions">
          <a class="action-button" href="#/science/${scienceSeries.seriesSlug}/${topic.slug}">进入主题页</a>
        </div>
      </div>
    </article>
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
    <div class="image-lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-label="图片放大查看">
      <div class="lightbox-backdrop" data-lightbox-close></div>
      <div class="lightbox-panel">
        <button class="lightbox-close" type="button" data-lightbox-close aria-label="关闭放大图">关闭</button>
        <button class="lightbox-nav lightbox-prev" type="button" data-lightbox-prev aria-label="上一张">上一张</button>
        <img data-lightbox-image alt="">
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

function SciencePageThumbnails(topic) {
  const imagePaths = topic.pageImagePaths ?? [];
  if (topic.mediaStatus !== 'available' || imagePaths.length === 0) {
    return '<p class="thumbnail-empty">暂无对应页面图</p>';
  }

  return `
    <div class="page-thumbnail-list">
      ${imagePaths.map((imagePath, index) => SciencePageThumbnail(topic, imagePath, index)).join('')}
    </div>
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
              <button class="answer-button" type="button" data-answer-toggle="${answerId}" aria-expanded="false">
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
    <section class="content-section" aria-labelledby="page-check-title">
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
    ${header()}
    <main class="book-layout">
      <aside class="book-side">
        ${bookCard(book, true)}
        <nav class="quick-nav" aria-label="页面模块">
          ${sectionNav.map(([id, label]) => `<a href="#/book/${book.slug}/${id}">${label}</a>`).join('')}
        </nav>
      </aside>
      <div class="book-main">
        <section class="book-title-block">
          <a class="back-link" href="#/">返回首页</a>
          <h1>${html(book.title)}</h1>
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
    </main>
    ${ImageLightbox()}
  `;
}

function scienceTopicPage(scienceSeries, topic) {
  return `
    ${header()}
    <main class="book-layout">
      <aside class="book-side">
        ${scienceTopicCard(scienceSeries, topic)}
        <nav class="quick-nav" aria-label="主题模块">
          <a href="#/science/${scienceSeries.seriesSlug}/${topic.slug}/pages">漫画页图片</a>
          <a href="#/science/${scienceSeries.seriesSlug}/${topic.slug}/source">来源备注</a>
        </nav>
      </aside>
      <div class="book-main">
        <section class="book-title-block">
          <a class="back-link" href="#/">返回首页</a>
          <h1>${html(topic.displayTitle)}</h1>
          <p>${html(topic.category)}</p>
        </section>
        <section id="source" class="content-section" aria-labelledby="source-title">
          <h2 id="source-title">来源备注</h2>
          <p>来源：${html(topic.source?.sourceLabel ?? '来源待核对')}</p>
        </section>
        <section id="pages" class="content-section" aria-labelledby="pages-title">
          <h2 id="pages-title">漫画页图片</h2>
          ${SciencePageThumbnails(topic)}
        </section>
      </div>
    </main>
    ${ImageLightbox()}
  `;
}

function errorPage(message) {
  return `
    ${header()}
    <main class="error-card">
      <h1>页面暂时无法打开</h1>
      <p>${html(message)}</p>
      <a class="action-button" href="#/">返回首页</a>
    </main>
  `;
}

function currentRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'book') {
    return { view: 'book', slug: parts[1], target: parts[2] };
  }
  if (parts[0] === 'science') {
    return { view: 'science', seriesSlug: parts[1], slug: parts[2], target: parts[3] };
  }
  return { view: 'home' };
}

function wireCoverFallbacks() {
  document.querySelectorAll('.cover-frame img, .thumb-row img, .page-thumbnail img').forEach((image) => {
    image.addEventListener('error', () => {
      image.hidden = true;
      image.closest('.cover-frame')?.classList.add('cover-missing');
      image.closest('.page-thumbnail')?.classList.add('thumbnail-missing');
    });
  });
}

function showLightboxItem(lightbox, index) {
  if (lightboxItems.length === 0) return;
  lightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
  const item = lightboxItems[lightboxIndex];
  const image = lightbox.querySelector('[data-lightbox-image]');
  const caption = lightbox.querySelector('[data-lightbox-caption]');
  const previous = lightbox.querySelector('[data-lightbox-prev]');
  const next = lightbox.querySelector('[data-lightbox-next]');

  image.src = item.src;
  image.alt = item.alt;
  caption.textContent = item.alt;
  previous.disabled = lightboxItems.length < 2;
  next.disabled = lightboxItems.length < 2;
}

function wireLightbox() {
  const lightbox = document.querySelector('[data-lightbox]');
  if (!lightbox) return;

  const openButtons = [...document.querySelectorAll('[data-lightbox-src]')];
  const closeButtons = [...lightbox.querySelectorAll('[data-lightbox-close]')];
  const previous = lightbox.querySelector('[data-lightbox-prev]');
  const next = lightbox.querySelector('[data-lightbox-next]');
  const closeButton = lightbox.querySelector('.lightbox-close');

  lightboxItems = openButtons.map((button) => ({
    src: button.dataset.lightboxSrc,
    alt: button.dataset.lightboxAlt || '页面图',
  }));

  openButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      showLightboxItem(lightbox, index);
      lightbox.hidden = false;
      document.body.classList.add('lightbox-open');
      closeButton?.focus();
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      lightbox.hidden = true;
      document.body.classList.remove('lightbox-open');
    });
  });

  previous?.addEventListener('click', () => showLightboxItem(lightbox, lightboxIndex - 1));
  next?.addEventListener('click', () => showLightboxItem(lightbox, lightboxIndex + 1));

  window.onkeydown = (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') {
      lightbox.hidden = true;
      document.body.classList.remove('lightbox-open');
    }
    if (event.key === 'ArrowLeft') showLightboxItem(lightbox, lightboxIndex - 1);
    if (event.key === 'ArrowRight') showLightboxItem(lightbox, lightboxIndex + 1);
  };
}

function wireAnswers() {
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
    });
  });
}

function wireAudio() {
  const audio = document.querySelector('#book-audio');
  const button = document.querySelector('[data-audio-play]');
  const seek = document.querySelector('[data-audio-seek]');
  const currentTime = document.querySelector('[data-audio-current-time]');
  const totalTime = document.querySelector('[data-audio-total-time]');
  const message = document.querySelector('#audio-message');
  if (!audio || !button) return;

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
  });

  audio.addEventListener('play', () => {
    button.textContent = '暂停音频';
  });

  audio.addEventListener('pause', () => {
    button.textContent = '播放音频';
  });

  audio.addEventListener('loadedmetadata', syncDisplay);
  audio.addEventListener('timeupdate', syncDisplay);
  audio.addEventListener('ended', syncDisplay);

  seek?.addEventListener('input', () => {
    const nextTime = Number(seek.value);
    if (Number.isFinite(nextTime)) {
      audio.currentTime = nextTime;
      syncDisplay();
    }
  });

  document.querySelectorAll('[data-audio-marker]').forEach((markerButton) => {
    markerButton.addEventListener('click', () => {
      const nextTime = Number(markerButton.dataset.audioMarker);
      if (Number.isFinite(nextTime)) {
        audio.currentTime = nextTime;
        syncDisplay();
      }
    });
  });

  audio.addEventListener('error', () => {
    button.disabled = true;
    if (seek) seek.disabled = true;
    if (message) {
      message.textContent = '音频路径暂时无法访问，页面其余内容仍可使用。';
    }
  });

  syncDisplay();
}

function afterRender(route) {
  wireCoverFallbacks();
  wireAnswers();
  wireAudio();
  wireLightbox();

  if (route.target) {
    requestAnimationFrame(() => {
      document.getElementById(route.target)?.scrollIntoView({ block: 'start' });
    });
  }
}

function render() {
  const route = currentRoute();
  if (route.view === 'home') {
    app.innerHTML = homePage();
    afterRender(route);
    return;
  }

  const book = model.books.find((item) => item.slug === route.slug);
  if (book) {
    app.innerHTML = bookPage(book);
    afterRender(route);
    return;
  }

  if (route.view === 'science') {
    const scienceSeries = model.scienceSeries;
    const topic = scienceSeries?.seriesSlug === route.seriesSlug
      ? scienceSeries.manifest.topics.find((item) => item.slug === route.slug)
      : null;
    if (topic) {
      app.innerHTML = scienceTopicPage(scienceSeries, topic);
      afterRender(route);
      return;
    }
  }

  app.innerHTML = errorPage('没有找到这本书的 companion 页面。');
}

async function start() {
  try {
    await loadModel();
    render();
    window.addEventListener('hashchange', render);
  } catch (error) {
    app.innerHTML = errorPage(error.message);
  }
}

start();
