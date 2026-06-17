import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ocrIndexPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr', 'topic-ocr-index.json');
const pageMapPath = path.join(rootDir, 'data', 'cells-at-work', 'page-map.json');
const reportPath = path.join(rootDir, 'reports', 'cells-at-work', 'ocr-quality-report.md');
const hintsPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr', 'topic-content-hints.json');
const forbiddenOutputRoots = new Set(['public', 'dist', 'build', 'docs']);
const mangaLayoutCaveat = {
  sourceLayout: 'manga_mixed_vertical_and_horizontal_text',
  readingOrder: 'mostly_vertical_top_to_bottom_right_to_left_with_some_horizontal_left_to_right',
  currentOcrLimitation: 'The existing OCR index was generated from whole-page manga images and does not reconstruct speech-bubble order, panel order, or vertical reading order.',
  qualityInterpretation: 'Quality bands are relative statistical signals only; they do not confirm that the OCR transcript is readable or ordered correctly.',
  downstreamUse: 'Use extracted terms and page numbers as weak hints only. Check source page images before writing any body-science content.',
};

const topicKeywordExtras = {
  'pneumococcus': ['肺炎链球菌', '肺炎球菌', '肺炎鏈球菌', '肺炎'],
  'cedar-pollen-allergy': ['杉树花粉', '杉花粉', '花粉过敏', '花粉', '过敏', '過敏'],
  'influenza': ['流行性感冒', '流感', '感冒', '病毒'],
  'abrasion': ['擦伤', '擦傷', '伤口', '傷口', '血小板'],
  'food-poisoning': ['食物中毒', '肠炎', '肠道', '细菌', '毒素'],
  'heatstroke': ['中暑', '热中症', '熱中症', '脱水', '水分'],
  'erythroblast-and-bone-marrow-cell': ['红细胞母细胞', '红血球母细胞', '紅血球母細胞', '骨髓球', '骨髓细胞', '骨髓'],
  'cancer-cell': ['癌细胞', '癌細胞', '癌'],
  'blood-circulation': ['血液循环', '血液循環', '血液', '循环', '循環'],
  'common-cold-syndrome': ['感冒症候群', '感冒综合征', '感冒', '病毒'],
  'thymocyte': ['胸腺细胞', '胸腺細胞', '胸腺', 'T细胞', 'T細胞'],
  'acquired-immunity': ['获得性免疫', '獲得免疫', '适应性免疫', '抗原', '抗体'],
  'acne': ['痤疮', '青春痘', '粉刺', '皮脂', '毛孔'],
  'staphylococcus-aureus': ['金黄色葡萄球菌', '金黃色葡萄球菌', '葡萄球菌', '细菌'],
  'dengue-fever': ['登革热', '登革熱', '蚊', '病毒'],
  'hemorrhagic-shock': ['出血性休克', '出血', '休克', '血压', '血壓'],
  'peyers-patches': ['派尔斑', '派爾氏斑', '派氏集合淋巴结', '淋巴结', '肠道'],
  'helicobacter-pylori': ['幽门螺杆菌', '幽門螺旋桿菌', '螺杆菌', '胃'],
  'antigenic-variation': ['抗原变异', '抗原變異', '抗原', '变异', '變異'],
  'cytokines': ['细胞因子', '細胞因子', '细胞激素', '免疫信号'],
  'gut-microbiota': ['肠道菌群', '腸道菌群', '菌群', '乳酸菌', '有益菌', '有害菌'],
  'cancer-cell-ii': ['癌细胞Ⅱ', '癌细胞II', '癌細胞Ⅱ', '癌细胞', '癌細胞', '癌'],
  'bump-on-head': ['撞出肿包', '头上的肿包', '肿包', '炎症', '损伤'],
  'left-shift': ['白细胞左移', '左方移动', '左移', '白细胞', '嗜中性球'],
  'ips-cells': ['iPS细胞', 'iPS 細胞', '诱导多能干细胞', '誘導多能幹細胞'],
  'psoriasis': ['银屑病', '乾癣', '牛皮癣', '皮肤', '角质'],
  'covid-19': ['新型冠状病毒', '新型冠狀病毒', '冠状病毒', 'COVID', 'SARS-CoV-2', '病毒'],
};

const cellTerms = [
  term('红血球/红细胞', ['红血球', '紅血球', '红细胞', '紅細胞']),
  term('白血球/白细胞', ['白血球', '白血球', '白细胞', '白細胞']),
  term('血小板', ['血小板']),
  term('巨噬细胞', ['巨噬细胞', '巨噬細胞', '巨噬']),
  term('单核细胞', ['单核细胞', '單核細胞', '单核球', '單核球']),
  term('中性粒细胞/嗜中性球', ['中性粒细胞', '中性粒細胞', '嗜中性球', '嗜中性粒细胞']),
  term('嗜酸性粒细胞', ['嗜酸性粒细胞', '嗜酸性粒細胞', '嗜酸性球']),
  term('嗜碱性粒细胞', ['嗜碱性粒细胞', '嗜鹼性粒細胞', '嗜碱性球', '嗜鹼性球']),
  term('肥大细胞', ['肥大细胞', '肥大細胞']),
  term('树突细胞', ['树突细胞', '樹突細胞']),
  term('T细胞', ['T细胞', 'T細胞', 'T 细胞', 'T 細胞']),
  term('B细胞', ['B细胞', 'B細胞', 'B 细胞', 'B 細胞']),
  term('杀手T细胞', ['杀手T细胞', '殺手T細胞', '杀手 T 细胞', '殺手 T 細胞']),
  term('辅助性T细胞', ['辅助性T细胞', '輔助性T細胞', '辅助性 T 细胞', '輔助性 T 細胞']),
  term('调节性T细胞', ['调节性T细胞', '調節性T細胞']),
  term('记忆细胞', ['记忆细胞', '記憶細胞']),
  term('NK细胞', ['NK细胞', 'NK 細胞', 'NK 细胞']),
  term('胸腺细胞', ['胸腺细胞', '胸腺細胞']),
  term('红细胞母细胞', ['红细胞母细胞', '紅細胞母細胞', '红血球母细胞', '紅血球母細胞']),
  term('骨髓细胞/骨髓球', ['骨髓细胞', '骨髓細胞', '骨髓球']),
  term('癌细胞', ['癌细胞', '癌細胞']),
  term('iPS细胞', ['iPS细胞', 'iPS 細胞', 'iPS 细胞']),
  term('角质细胞', ['角质细胞', '角質細胞']),
  term('血管内皮细胞', ['血管内皮细胞', '血管內皮細胞', '内皮细胞', '內皮細胞']),
];

const pathogenAndStructureTerms = [
  term('肺炎链球菌/肺炎球菌', ['肺炎链球菌', '肺炎鏈球菌', '肺炎球菌']),
  term('杉花粉', ['杉花粉', '杉树花粉', '杉樹花粉']),
  term('流感病毒', ['流感病毒', '流行性感冒病毒']),
  term('金黄色葡萄球菌', ['金黄色葡萄球菌', '金黃色葡萄球菌', '葡萄球菌']),
  term('登革热病毒', ['登革热病毒', '登革熱病毒', '登革热', '登革熱']),
  term('幽门螺杆菌', ['幽门螺杆菌', '幽門螺旋桿菌', '螺杆菌', '螺旋桿菌']),
  term('新型冠状病毒', ['新型冠状病毒', '新型冠狀病毒', '冠状病毒', '冠狀病毒', 'COVID', 'SARS-CoV-2']),
  term('乳酸菌', ['乳酸菌']),
  term('有益菌', ['有益菌', '好菌']),
  term('有害菌', ['有害菌', '坏菌', '壞菌']),
  term('病毒', ['病毒']),
  term('细菌', ['细菌', '細菌']),
  term('抗原', ['抗原']),
  term('抗体', ['抗体', '抗體']),
  term('血管', ['血管', '毛细血管', '毛細血管']),
  term('血液', ['血液']),
  term('肺部结构', ['肺泡', '肺部', '呼吸道']),
  term('皮肤', ['皮肤', '皮膚', '表皮']),
  term('毛孔', ['毛孔']),
  term('骨髓', ['骨髓']),
  term('胸腺', ['胸腺']),
  term('淋巴结', ['淋巴结', '淋巴結']),
  term('派尔斑', ['派尔斑', '派爾氏斑', '派氏集合淋巴结', '派氏集合淋巴結']),
  term('胃部结构', ['胃黏膜', '胃粘膜', '胃酸']),
  term('肠道', ['肠道', '腸道', '小肠', '小腸', '大肠', '大腸']),
  term('汗腺', ['汗腺']),
  term('伤口', ['伤口', '傷口']),
  term('头部', ['头部', '頭部']),
];

const scienceReviewTerms = [
  review('肺炎链球菌', ['肺炎链球菌', '肺炎球菌', '肺炎鏈球菌'], '确认展示名与医学常用名'),
  review('杉花粉过敏', ['杉花粉过敏', '杉树花粉过敏', '花粉过敏', '杉花粉過敏'], '确认儿童解释口径'),
  review('流感/流行性感冒', ['流感', '流行性感冒'], '区分流感与普通感冒'),
  review('食物中毒', ['食物中毒'], '避免把病因解释得过窄'),
  review('中暑/热中症', ['中暑', '热中症', '熱中症'], '确认预防与急救表述'),
  review('红细胞母细胞', ['红细胞母细胞', '红血球母细胞', '紅血球母細胞'], '确认血细胞发育术语'),
  review('骨髓球/骨髓细胞', ['骨髓球', '骨髓细胞', '骨髓細胞'], '确认与红细胞母细胞的关系'),
  review('癌细胞', ['癌细胞', '癌細胞'], '保持与癌细胞Ⅱ分开'),
  review('感冒症候群', ['感冒症候群', '感冒综合征'], '确认面向家庭阅读的展示名'),
  review('胸腺细胞', ['胸腺细胞', '胸腺細胞'], '确认免疫细胞发育解释'),
  review('获得性免疫/适应性免疫', ['获得性免疫', '獲得免疫', '适应性免疫'], '确认大陆常用术语'),
  review('痤疮/青春痘', ['痤疮', '青春痘', '粉刺'], '区分医学名与俗称'),
  review('金黄色葡萄球菌', ['金黄色葡萄球菌', '金黃色葡萄球菌'], '确认不简化为不准确俗称'),
  review('登革热', ['登革热', '登革熱'], '确认公共卫生解释边界'),
  review('出血性休克', ['出血性休克', '休克'], '避免急救内容误导'),
  review('派尔斑', ['派尔斑', '派爾氏斑', '派氏集合淋巴结', '派氏集合淋巴結'], '确认大陆常用表达'),
  review('幽门螺杆菌', ['幽门螺杆菌', '幽門螺旋桿菌'], '确认名称与胃部健康说明'),
  review('抗原变异', ['抗原变异', '抗原變異'], '确认免疫逃逸解释'),
  review('细胞因子', ['细胞因子', '細胞因子', '细胞激素'], '确认免疫信号术语'),
  review('肠道菌群', ['肠道菌群', '腸道菌群', '菌群'], '避免只讲好菌/坏菌'),
  review('白细胞左移', ['白细胞左移', '左方移动', '左移'], '确认医学解释'),
  review('诱导多能干细胞/iPS细胞', ['诱导多能干细胞', '誘導多能幹細胞', 'iPS细胞', 'iPS 細胞'], '确认再生医学术语'),
  review('银屑病/牛皮癣', ['银屑病', '牛皮癣', '乾癣'], '确认正式名与俗称边界'),
  review('新型冠状病毒/COVID-19', ['新型冠状病毒', '新型冠狀病毒', 'COVID', 'SARS-CoV-2'], '确认公共卫生表述'),
];

const stopTokens = new Set([
  '一个', '一些', '一下', '这个', '那个', '这里', '那里', '我们', '你们', '他们', '她们', '什么', '怎么',
  '没有', '可以', '因为', '所以', '但是', '然后', '现在', '就是', '已经', '不是', '还是', '时候',
  '一一',
]);

const allowedLatinTerms = new Set(['COVID', 'SARS', 'CoV', 'DNA', 'RNA', 'iPS', 'NK', 'IgE', 'MHC']);
const weirdSymbolPattern = /[�﹁﹂﹃﹄﹌﹣﹚﹒‥′ˍˋˊ`~^=<>\\|{}€¢™]/gu;
const rareNoisePattern = /[蠹齷齲鬟曩躉韡鰈鱷翋籲攫孿燮霆譚韆龕驫鸞靐]/gu;
const hanPattern = /\p{Script=Han}/u;
const nonWhitespacePattern = /\S/gu;
const cjkOrLatinTokenPattern = /^[\p{Script=Han}A-Za-z0-9]+$/u;

function term(label, forms) {
  return { label, forms };
}

function review(label, forms, reason) {
  return { label, forms, reason };
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relativePath(targetPath) {
  return toPosix(path.relative(rootDir, targetPath));
}

function assertOutputPath(targetPath) {
  const relative = path.relative(rootDir, path.resolve(targetPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project root: ${targetPath}`);
  }
  const firstSegment = toPosix(relative).split('/')[0];
  if (forbiddenOutputRoots.has(firstSegment)) {
    throw new Error(`Refusing to write OCR-derived output into ${firstSegment}/`);
  }
}

async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, 'utf8'));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function countForm(text, form) {
  if (!form) {
    return 0;
  }
  const normalizedText = String(text).replace(/\s+/gu, '');
  const normalizedForm = String(form).replace(/\s+/gu, '');
  return countMatches(normalizedText, new RegExp(escapeRegex(normalizedForm), 'giu'));
}

function countTerm(text, forms) {
  return forms.reduce((sum, form) => sum + countForm(text, form), 0);
}

function pagesWithTerm(pages, forms) {
  return pages
    .filter((page) => countTerm(page.ocrText ?? '', forms) > 0)
    .map((page) => page.pageNumber);
}

function compactPages(pages, limit = 14) {
  const unique = [...new Set(pages)].sort((a, b) => a - b);
  return unique.length > limit
    ? [...unique.slice(0, limit), `+${unique.length - limit}`]
    : unique;
}

function analyzeNoise(text) {
  const nonWhitespace = countMatches(text, nonWhitespacePattern);
  const han = [...text].filter((char) => hanPattern.test(char)).length;
  const ascii = countMatches(text, /[A-Za-z0-9]/gu);
  const weird = countMatches(text, weirdSymbolPattern);
  const rare = countMatches(text, rareNoisePattern);
  const symbols = Math.max(0, nonWhitespace - han - ascii);
  return {
    nonWhitespace,
    han,
    ascii,
    symbols,
    weird,
    rare,
    noiseRatio: nonWhitespace > 0 ? Number(((symbols + weird + rare) / nonWhitespace).toFixed(3)) : 1,
  };
}

function pageIssue(page) {
  const text = page.ocrText ?? '';
  const charCount = text.length;
  const noise = analyzeNoise(text);
  const confidence = Number.isFinite(page.confidence) ? page.confidence : null;
  const reasons = [];
  let score = 0;

  if (page.ocrStatus !== 'ok') {
    reasons.push(`OCR状态=${page.ocrStatus}`);
    score += 100;
  }
  if (charCount === 0 || !text.trim()) {
    reasons.push('空文本');
    score += 80;
  }
  if (confidence !== null && confidence < 45) {
    reasons.push(`低置信度${confidence.toFixed(2)}`);
    score += (45 - confidence) * 4 + 28;
  }
  if (charCount > 0 && charCount < 220) {
    reasons.push(`短文本${charCount}字`);
    score += 16;
  }
  if (noise.noiseRatio >= 0.42) {
    reasons.push(`异常符号比例${Math.round(noise.noiseRatio * 100)}%`);
    score += 18;
  }
  if (noise.rare >= 18) {
    reasons.push(`生僻噪声字${noise.rare}个`);
    score += 12;
  }

  return {
    pageNumber: page.pageNumber,
    confidence,
    charCount,
    noiseRatio: noise.noiseRatio,
    reasons,
    score: Number(score.toFixed(2)),
  };
}

function isLikelySuspect(issue) {
  return issue.reasons.length > 0 && (issue.score >= 24 || issue.confidence === null || issue.confidence < 45);
}

function extractTerms(topic, dictionary, limit = 14) {
  const pages = topic.pages ?? [];
  const text = pages.map((page) => page.ocrText ?? '').join('\n');
  return dictionary
    .map((entry) => ({
      term: entry.label,
      count: countTerm(text, entry.forms),
      pages: compactPages(pagesWithTerm(pages, entry.forms)),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'zh-Hans-CN'))
    .slice(0, limit);
}

function cleanToken(rawToken) {
  return rawToken
    .replace(/^[\s"'“”‘’.,，。！？!?、；;:：()[\]{}<>《》【】]+/u, '')
    .replace(/[\s"'“”‘’.,，。！？!?、；;:：()[\]{}<>《》【】]+$/u, '');
}

function extractFrequentTokens(topic, knownTerms, limit = 18) {
  const tokenMap = new Map();
  const pages = topic.pages ?? [];

  for (const page of pages) {
    for (const raw of String(page.ocrText ?? '').split(/\s+/u)) {
      const token = cleanToken(raw);
      if (
        token.length < 2
        || token.length > 10
        || stopTokens.has(token)
        || !cjkOrLatinTokenPattern.test(token)
        || ![...token].some((char) => hanPattern.test(char))
        || /[A-Za-z0-9]/u.test(token)
        || new Set([...token]).size === 1
        || countMatches(token, rareNoisePattern) > 0
        || countMatches(token, weirdSymbolPattern) > 0
      ) {
        continue;
      }
      const current = tokenMap.get(token) ?? { keyword: token, count: 0, pageSet: new Set() };
      current.count += 1;
      current.pageSet.add(page.pageNumber);
      tokenMap.set(token, current);
    }
  }

  const known = knownTerms.map((entry) => ({
    keyword: entry.term,
    count: entry.count,
    pages: entry.pages,
    source: 'known-term',
  }));

  const tokens = [...tokenMap.values()]
    .filter((entry) => entry.count >= 3)
    .map((entry) => ({
      keyword: entry.keyword,
      count: entry.count,
      pages: compactPages([...entry.pageSet], 10),
      source: 'ocr-token',
    }));

  const byKeyword = new Map();
  for (const entry of [...known, ...tokens]) {
    const existing = byKeyword.get(entry.keyword);
    if (!existing || entry.count > existing.count) {
      byKeyword.set(entry.keyword, entry);
    }
  }

  return [...byKeyword.values()]
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'zh-Hans-CN'))
    .slice(0, limit);
}

function extractSuspectedErrors(topic, limit = 10) {
  const errorMap = new Map();
  const pages = topic.pages ?? [];

  for (const page of pages) {
    const tokens = String(page.ocrText ?? '').split(/\s+/u).map(cleanToken).filter(Boolean);
    for (const token of tokens) {
      let reason = null;
      if (token.includes('�')) {
        reason = '替换符';
      } else if (/^[A-Za-z]{4,}$/u.test(token) && !allowedLatinTerms.has(token)) {
        reason = '连续拉丁字母';
      } else if (countMatches(token, weirdSymbolPattern) > 0) {
        reason = '异常符号';
      } else if (countMatches(token, rareNoisePattern) > 0) {
        reason = '生僻噪声字';
      }

      if (!reason || token.length > 14) {
        continue;
      }

      const key = `${reason}:${token}`;
      const current = errorMap.get(key) ?? { token, reason, count: 0, pageSet: new Set() };
      current.count += 1;
      current.pageSet.add(page.pageNumber);
      errorMap.set(key, current);
    }
  }

  return [...errorMap.values()]
    .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token, 'zh-Hans-CN'))
    .slice(0, limit)
    .map((entry) => ({
      token: entry.token,
      count: entry.count,
      pages: compactPages([...entry.pageSet], 10),
      reason: entry.reason,
    }));
}

function findDraftManifest() {
  const booksDir = path.join(rootDir, 'public', 'books');
  if (!existsSync(booksDir)) {
    return null;
  }
  for (const entry of readdirSync(booksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = path.join(booksDir, entry.name, 'draft-manifest.json');
    if (!existsSync(candidate)) {
      continue;
    }
    const manifest = JSON.parse(readFileSync(candidate, 'utf8'));
    if (manifest.seriesSlug === 'cells-at-work' || manifest.pageMapPath === 'data/cells-at-work/page-map.json') {
      return { path: candidate, manifest };
    }
  }
  return null;
}

async function loadManifestByTopic() {
  const found = findDraftManifest();
  if (!found) {
    return { manifestPath: null, byTitle: new Map() };
  }
  const byTitle = new Map();
  for (const topic of found.manifest.topics ?? []) {
    const title = topic.displayTitle ?? topic.title;
    if (title) {
      byTitle.set(title, topic);
    }
  }
  return { manifestPath: found.path, byTitle };
}

function topicKeywords(topic, manifestTopic) {
  const values = new Set([
    topic.displayTitle,
    manifestTopic?.displayTitle,
    manifestTopic?.title,
    ...(manifestTopic?.originalTitleReferences ?? []),
    ...(topicKeywordExtras[topic.topicId] ?? []),
  ].filter(Boolean));
  return [...values];
}

function keywordCoverage(topic, manifestTopic) {
  const pages = topic.pages ?? [];
  const text = pages.map((page) => page.ocrText ?? '').join('\n');
  const requiredKeywords = topicKeywords(topic, manifestTopic);
  const foundKeywords = requiredKeywords.filter((keyword) => countForm(text, keyword) > 0);
  return {
    requiredKeywords,
    foundKeywords,
    containsAnyKeyTopicTerm: foundKeywords.length > 0,
  };
}

function reviewTermsForTopic(topic) {
  const text = (topic.pages ?? []).map((page) => page.ocrText ?? '').join('\n');
  const found = scienceReviewTerms
    .map((entry) => ({
      term: entry.label,
      count: countTerm(text, entry.forms),
      pages: compactPages(pagesWithTerm(topic.pages ?? [], entry.forms), 12),
      reason: entry.reason,
      source: 'ocr-term',
    }))
    .filter((entry) => entry.count > 0);

  if (!found.some((entry) => entry.term.includes(topic.displayTitle))) {
    const topicReview = scienceReviewTerms.find((entry) => entry.forms.includes(topic.displayTitle));
    if (topicReview) {
      found.push({
        term: topicReview.label,
        count: countTerm(text, topicReview.forms),
        pages: compactPages(pagesWithTerm(topic.pages ?? [], topicReview.forms), 12),
        reason: topicReview.reason,
        source: 'topic-title',
      });
    }
  }

  return found
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'zh-Hans-CN'))
    .slice(0, 12);
}

function summarizeTopic(topic, manifestTopic) {
  const pages = topic.pages ?? [];
  const totalChars = pages.reduce((sum, page) => sum + String(page.ocrText ?? '').length, 0);
  const emptyPages = pages.filter((page) => page.ocrStatus === 'empty' || !String(page.ocrText ?? '').trim());
  const failedPages = pages.filter((page) => page.ocrStatus === 'failed');
  const confidenceValues = pages.map((page) => page.confidence).filter(Number.isFinite);
  const averageConfidence = confidenceValues.length > 0
    ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
    : null;
  const lowConfidencePages = pages.filter((page) => Number.isFinite(page.confidence) && page.confidence < 45);
  const suspectIssues = pages
    .map(pageIssue)
    .filter(isLikelySuspect)
    .sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber);
  const coverage = keywordCoverage(topic, manifestTopic);

  let qualityBand = '可用，建议抽查';
  if (
    failedPages.length > 0
    || emptyPages.length > 0
    || lowConfidencePages.length >= 4
    || suspectIssues.length / Math.max(1, pages.length) >= 0.18
    || averageConfidence < 50
  ) {
    qualityBand = '需要人工复查';
  } else if (
    averageConfidence !== null
    && averageConfidence >= 52.5
    && lowConfidencePages.length === 0
    && suspectIssues.length <= 1
  ) {
    qualityBand = '较好';
  }

  return {
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: topic.source,
    pageRange: topic.pageRange,
    ocrPageCount: pages.length,
    totalChars,
    emptyPageCount: emptyPages.length,
    failedPageCount: failedPages.length,
    averageConfidence,
    lowConfidencePageCount: lowConfidencePages.length,
    suspectedIssuePageCount: suspectIssues.length,
    suspectedIssuePages: suspectIssues.map((issue) => ({
      pageNumber: issue.pageNumber,
      confidence: issue.confidence,
      charCount: issue.charCount,
      noiseRatio: issue.noiseRatio,
      reasons: issue.reasons,
    })),
    topicKeywordCoverage: coverage,
    qualityBand,
  };
}

function createHintsTopic(topic, summary) {
  const possibleCells = extractTerms(topic, cellTerms);
  const possiblePathogensOrStructures = extractTerms(topic, pathogenAndStructureTerms);
  const knownTerms = [...possibleCells, ...possiblePathogensOrStructures];
  return {
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: topic.source,
    pageRange: topic.pageRange,
    ocrPageCount: summary.ocrPageCount,
    layoutRisk: 'high_manga_vertical_mixed_text',
    possibleCells,
    possiblePathogensOrStructures,
    frequentKeywords: extractFrequentTokens(topic, knownTerms),
    termsNeedingScientificReview: reviewTermsForTopic(topic),
    suspectedOcrErrors: extractSuspectedErrors(topic),
    topicKeywordCoverage: summary.topicKeywordCoverage,
  };
}

function formatList(items) {
  return items.length > 0 ? items.join('、') : '无';
}

function formatPages(issues, limit = 10) {
  if (issues.length === 0) {
    return '无';
  }
  const shown = issues.slice(0, limit).map((issue) => {
    const confidence = issue.confidence === null ? 'n/a' : issue.confidence.toFixed(2);
    return `p${issue.pageNumber}(conf ${confidence}: ${issue.reasons.join('；')})`;
  });
  if (issues.length > limit) {
    shown.push(`另${issues.length - limit}页`);
  }
  return shown.join('；');
}

function reportMarkdown({ ocrIndex, pageMap, manifestPath, summaries, aggregateReviewTerms }) {
  const good = summaries.filter((item) => item.qualityBand === '较好');
  const review = summaries.filter((item) => item.qualityBand === '需要人工复查');
  const sampling = summaries.filter((item) => item.qualityBand === '可用，建议抽查');
  const totalPages = summaries.reduce((sum, item) => sum + item.ocrPageCount, 0);
  const totalChars = summaries.reduce((sum, item) => sum + item.totalChars, 0);
  const emptyPages = summaries.reduce((sum, item) => sum + item.emptyPageCount, 0);
  const failedPages = summaries.reduce((sum, item) => sum + item.failedPageCount, 0);

  const lines = [];
  lines.push('# 工作细胞 OCR 质量报告');
  lines.push('');
  lines.push(`生成时间：${new Date().toISOString()}`);
  lines.push(`OCR 数据源：\`${relativePath(ocrIndexPath)}\``);
  lines.push(`页图映射：\`${relativePath(pageMapPath)}\``);
  if (manifestPath) {
    lines.push(`参考主题清单：\`${relativePath(manifestPath)}\``);
  }
  lines.push('');
  lines.push('## 输出边界');
  lines.push('');
  lines.push('- 本报告只记录统计、页码、短词条和质量判断，不复制完整 OCR 文本。');
  lines.push('- 完整 OCR 文本仍只保留在 `data-private/cells-at-work/ocr/topic-ocr-index.json`。');
  lines.push('- 本阶段未生成身体科学小站正文，未覆盖术语表，未向 `public/`、`dist/`、`build/`、`docs/` 写入完整 OCR 文本。');
  lines.push('');
  lines.push('## 漫画版式限制');
  lines.push('');
  lines.push('- 《工作细胞》页面大多是竖排文字，阅读顺序通常是从上到下、再从右到左；少部分文字横排，从左到右、再从上到下。');
  lines.push('- 当前 OCR 数据来自整页识别，未重建分镜顺序、气泡顺序、竖排阅读顺序，也未按竖排文字专门切块。');
  lines.push('- 因此，本报告里的“较好 / 可用 / 需复查”只表示统计指标的相对质量，不等同于 OCR 文本已经可以直接阅读或直接用于正文生成。');
  lines.push('- `topic-content-hints.json` 中的词条和页码只能作为后续内容生成的弱线索；生成任何身体科学小站正文前，都应回看页图并人工确认。');
  lines.push('');
  lines.push('## 总览');
  lines.push('');
  lines.push(`- 主题数：${summaries.length}`);
  lines.push(`- OCR 页数：${totalPages}`);
  lines.push(`- 总字符数：${totalChars}`);
  lines.push(`- 空文本页面数：${emptyPages}`);
  lines.push(`- 失败页面数：${failedPages}`);
  lines.push(`- 统计指标较好主题（仍需版式抽查）：${formatList(good.map((item) => item.displayTitle))}`);
  lines.push(`- 可用但建议抽查主题：${formatList(sampling.map((item) => item.displayTitle))}`);
  lines.push(`- 需要人工复查主题：${formatList(review.map((item) => item.displayTitle))}`);
  lines.push('');
  lines.push('## 可能需要核对的术语');
  lines.push('');
  for (const entry of aggregateReviewTerms.slice(0, 40)) {
    lines.push(`- ${entry.term}：${entry.reason}（命中主题：${formatList([...entry.topicTitles])}）`);
  }
  lines.push('');
  lines.push('## 逐主题统计');
  lines.push('');
  lines.push('| 主题 | 页数 | 总字符数 | 空文本页 | 失败页 | 平均置信度 | 低置信页 | 可疑页 | 关键主题词 | 质量判断 |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |');
  for (const item of summaries) {
    const found = item.topicKeywordCoverage.foundKeywords;
    lines.push(`| ${item.displayTitle} | ${item.ocrPageCount} | ${item.totalChars} | ${item.emptyPageCount} | ${item.failedPageCount} | ${item.averageConfidence ?? 'n/a'} | ${item.lowConfidencePageCount} | ${item.suspectedIssuePageCount} | ${found.length > 0 ? formatList(found.slice(0, 6)) : '未命中'} | ${item.qualityBand} |`);
  }
  lines.push('');
  lines.push('## 可疑页面明细');
  lines.push('');
  for (const item of summaries) {
    lines.push(`### ${item.displayTitle}`);
    lines.push('');
    lines.push(`- 来源：${item.source ?? '未知'}；范围：${item.pageRange}`);
    lines.push(`- 可能识别错误较多的页面：${formatPages(item.suspectedIssuePages)}`);
    lines.push(`- 关键主题词命中：${formatList(item.topicKeywordCoverage.foundKeywords)}`);
    if (!item.topicKeywordCoverage.containsAnyKeyTopicTerm) {
      lines.push(`- 复查建议：未命中预期主题词（候选：${formatList(item.topicKeywordCoverage.requiredKeywords.slice(0, 8))}），应人工确认 OCR 是否漏识别主题核心词。`);
    } else if (item.qualityBand === '需要人工复查') {
      lines.push('- 复查建议：优先查看低置信度或异常符号集中的页。');
    } else {
      lines.push('- 复查建议：可按后续内容生成需要抽查关键页。');
    }
    lines.push('');
  }
  lines.push('## 口径说明');
  lines.push('');
  lines.push('- 低置信页：Tesseract 平均置信度低于 45 的页面。');
  lines.push('- 可疑页：低置信度、空文本、失败、短文本、异常符号比例偏高或生僻噪声字集中的页面。');
  lines.push('- 关键主题词：主题标题、参考标题和该主题的必要宽松词；用于发现 OCR 是否遗漏核心主题，不等同于科学核对结论。');
  lines.push('- 漫画竖排/混排会让整页 OCR 的文字顺序和词组拼接失真；这类风险无法只靠失败页数或平均置信度排除。');
  lines.push('- `topic-content-hints.json` 是后续内容生成的辅助索引，只包含短词条、次数和页码线索。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function aggregateReviewTerms(hintsTopics) {
  const byTerm = new Map();
  for (const topic of hintsTopics) {
    for (const entry of topic.termsNeedingScientificReview) {
      const current = byTerm.get(entry.term) ?? {
        term: entry.term,
        reason: entry.reason,
        count: 0,
        topicTitles: new Set(),
      };
      current.count += entry.count;
      current.topicTitles.add(topic.displayTitle);
      byTerm.set(entry.term, current);
    }
  }
  return [...byTerm.values()]
    .sort((a, b) => b.topicTitles.size - a.topicTitles.size || b.count - a.count || a.term.localeCompare(b.term, 'zh-Hans-CN'));
}

async function main() {
  assertOutputPath(reportPath);
  assertOutputPath(hintsPath);

  const [ocrIndex, pageMap, manifestData] = await Promise.all([
    readJson(ocrIndexPath),
    readJson(pageMapPath),
    loadManifestByTopic(),
  ]);

  const summaries = [];
  const hintsTopics = [];

  for (const topic of ocrIndex.topics ?? []) {
    const manifestTopic = manifestData.byTitle.get(topic.displayTitle);
    const summary = summarizeTopic(topic, manifestTopic);
    summaries.push(summary);
    hintsTopics.push(createHintsTopic(topic, summary));
  }

  const aggregateTerms = aggregateReviewTerms(hintsTopics);
  const hints = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceOcrIndexPath: relativePath(ocrIndexPath),
    pageMapPath: relativePath(pageMapPath),
    reportPath: relativePath(reportPath),
    outputPolicy: {
      containsFullOcrText: false,
      publicOutputWritten: false,
      forbiddenPublicDirectories: ['public/', 'dist/', 'build/', 'docs/'],
    },
    layoutCaveat: mangaLayoutCaveat,
    topicCount: hintsTopics.length,
    topics: hintsTopics,
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await mkdir(path.dirname(hintsPath), { recursive: true });
  await writeFile(reportPath, reportMarkdown({
    ocrIndex,
    pageMap,
    manifestPath: manifestData.manifestPath,
    summaries,
    aggregateReviewTerms: aggregateTerms,
  }), 'utf8');
  await writeFile(hintsPath, `${JSON.stringify(hints, null, 2)}\n`, 'utf8');

  console.log(`OCR quality report: ${relativePath(reportPath)}`);
  console.log(`Topic content hints: ${relativePath(hintsPath)}`);
  console.log(`Good topics: ${summaries.filter((item) => item.qualityBand === '较好').map((item) => item.displayTitle).join('、') || '无'}`);
  console.log(`Needs manual review: ${summaries.filter((item) => item.qualityBand === '需要人工复查').map((item) => item.displayTitle).join('、') || '无'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
