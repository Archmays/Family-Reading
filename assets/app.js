const SERIES_INDEX = 'public/books/不一样的卡梅拉/series.json';
const FIRST_BATCH = 3;
const app = document.querySelector('#app');
let model = null;

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
  const series = await fetchJson(SERIES_INDEX);
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

  model = { series, books };
}

function header() {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand-link" href="#/" aria-label="返回首页">
          <span class="brand-mark">书</span>
          <span class="brand-text">
            <span class="brand-title">Book Companion Panel / 家庭纸质书阅读辅助面板</span>
            <span class="brand-subtitle">纸质书旁边的内容回顾、问答、背景和音频入口</span>
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
        <a class="ghost-button" href="#/book/${book.slug}/audio">音频</a>
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
      <section class="home-hero" aria-labelledby="home-title">
        <div class="intro-panel">
          <h1 id="home-title">Book Companion Panel / 家庭纸质书阅读辅助面板</h1>
          <p>为家里的纸质绘本阅读准备的辅助面板。孩子读实体书，家长在旁边查看内容回顾、问题卡、背景补充、百科条目和音频入口。</p>
        </div>
        <aside class="family-note" aria-label="使用说明">
          <h2>不一样的卡梅拉 第一季</h2>
          <p>首页只做书籍资料入口。选择一本书后，进入对应的 companion 页面，再按需要打开问答、背景、百科或音频。</p>
        </aside>
      </section>
      <section class="season-section" aria-labelledby="season-title">
        <div class="section-heading">
          <div>
            <h2 id="season-title">不一样的卡梅拉 第一季</h2>
            <p>当前 MVP 收录前三本书。</p>
          </div>
        </div>
        <div class="book-grid">
          ${model.books.map((book) => bookCard(book)).join('')}
        </div>
      </section>
    </main>
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
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function questionGroup(title, cards, kind) {
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
      ${questionGroup('Factual recall', questionCards.factualRecall, 'factual')}
      ${questionGroup('Comprehension', questionCards.comprehension, 'comprehension')}
      ${questionGroup('Open expression', questionCards.openExpression, 'open')}
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
            <p><strong>关联：</strong>${html(entry.anchor)}</p>
            <p>${html(entry.summary)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function audioSection(book) {
  const audio = book.companion.audio;
  const source = sitePath(audio.path);
  const markerNote = audio.markers.length === 0
    ? '<p class="audio-note">当前只接入整本音频；没有可靠的场景时间点证据，因此不显示 marker。</p>'
    : '';

  return `
    <section id="audio" class="content-section" aria-labelledby="audio-title">
      <h2 id="audio-title">音频播放器</h2>
      <div class="audio-panel">
        <h3>${html(audio.title)}</h3>
        <div class="audio-actions">
          <button type="button" data-audio-toggle="book-audio">播放音频</button>
          <span class="audio-note" id="audio-message">可用下方浏览器控件拖动播放位置。</span>
        </div>
        <audio id="book-audio" controls preload="metadata">
          <source src="${source}" type="audio/mpeg">
          当前浏览器不支持音频播放。
        </audio>
        ${markerNote}
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
  return { view: 'home' };
}

function wireCoverFallbacks() {
  document.querySelectorAll('.cover-frame img, .thumb-row img').forEach((image) => {
    image.addEventListener('error', () => {
      image.hidden = true;
      image.closest('.cover-frame')?.classList.add('cover-missing');
    });
  });
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
  const button = document.querySelector('[data-audio-toggle="book-audio"]');
  const message = document.querySelector('#audio-message');
  if (!audio || !button) return;

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

  audio.addEventListener('error', () => {
    button.disabled = true;
    if (message) {
      message.textContent = '音频路径暂时无法访问，页面其余内容仍可使用。';
    }
  });
}

function afterRender(route) {
  wireCoverFallbacks();
  wireAnswers();
  wireAudio();

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
  if (!book) {
    app.innerHTML = errorPage('没有找到这本书的 companion 页面。');
    return;
  }

  app.innerHTML = bookPage(book);
  afterRender(route);
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
