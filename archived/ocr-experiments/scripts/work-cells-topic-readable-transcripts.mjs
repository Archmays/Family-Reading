import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultInputPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'page-readable-text.json');
const defaultHintsPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr', 'topic-content-hints.json');
const defaultTerminologyPath = path.join(rootDir, 'data-private', 'cells-at-work', 'terminology.zh-Hans.json');
const defaultTranscriptsPath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'topic-readable-transcripts.json');
const defaultOutlinePath = path.join(rootDir, 'data-private', 'cells-at-work', 'ocr-layout', 'topic-story-outline-hints.json');
const forbiddenOutputRoots = new Set(['public', 'dist', 'build', 'docs']);
const leakCheckRoots = ['public', 'dist', 'build', 'docs'];

const titleConcepts = {
  pneumococcus: ['细菌感染', '先天免疫', '吞噬与追击', '肺部防御'],
  'cedar-pollen-allergy': ['过敏反应', '抗原识别', '肥大细胞与炎症介质', '免疫过度反应'],
  influenza: ['病毒感染', '流感与普通感冒区分', '抗原识别', '免疫防御'],
  abrasion: ['皮肤屏障', '伤口防御', '凝血与炎症', '常驻菌与入侵菌区分'],
  'food-poisoning': ['胃肠道防御', '细菌或毒素', '呕吐腹泻风险', '白细胞反应'],
  heatstroke: ['体温调节', '脱水风险', '汗腺与血管反应', '热损伤'],
  'erythroblast-and-bone-marrow-cell': ['造血', '骨髓环境', '红细胞成熟', '细胞分化'],
  'cancer-cell': ['异常细胞识别', '免疫监视', '癌细胞增殖', 'T细胞反应'],
  'blood-circulation': ['血液循环', '血管运输', '氧气与养分输送'],
  'common-cold-syndrome': ['上呼吸道感染', '普通感冒', '病毒与症状', '免疫反应'],
  thymocyte: ['胸腺', 'T细胞成熟', '免疫筛选', '自我与非我识别'],
  'acquired-immunity': ['获得性免疫', '抗原与抗体', '免疫记忆', 'B细胞/T细胞协作'],
  acne: ['皮肤毛囊', '皮脂与炎症', '痤疮杆菌', '青春期变化'],
  'staphylococcus-aureus': ['细菌感染', '皮肤防御', '中性粒细胞', '化脓反应'],
  'dengue-fever': ['病毒感染', '蚊媒传播', '发热与血管反应', '血小板风险'],
  'hemorrhagic-shock': ['失血', '休克', '血压与循环', '凝血修复'],
  'peyers-patches': ['肠道免疫', '派尔斑', '抗原采样', '黏膜免疫'],
  'helicobacter-pylori': ['胃黏膜', '幽门螺杆菌', '胃酸环境', '菌群平衡'],
  'antigenic-variation': ['抗原变异', '免疫逃逸', '抗体识别', '病原体变化'],
  cytokines: ['细胞因子', '免疫信号传递', '炎症调节', '细胞间通信'],
  'gut-microbiota': ['肠道菌群', '共生菌', '消化与免疫', '菌群平衡'],
  'cancer-cell-ii': ['异常细胞识别', '免疫监视', 'T细胞反应', '肿瘤微环境'],
  'bump-on-head': ['局部肿胀', '炎症反应', '组织损伤修复', '血管通透性'],
  'left-shift': ['白细胞左移', '骨髓造血', '感染指标', '未成熟粒细胞'],
  'ips-cells': ['诱导多能干细胞', '细胞重编程', '再生医学', '伦理与安全边界'],
  psoriasis: ['银屑病', '皮肤更新', '慢性炎症', '免疫相关皮肤病'],
  'covid-19': ['新型冠状病毒', '呼吸道感染', '抗原与抗体', '免疫记忆'],
};

const cautionByPattern = [
  { pattern: /癌|肿瘤/u, note: '涉及癌症时避免制造恐惧，需说明漫画拟人化不等于真实诊断。' },
  { pattern: /休克|出血/u, note: '涉及休克或大量失血时需强调现实中应及时就医。' },
  { pattern: /新型冠状病毒|COVID|冠状病毒/u, note: '涉及 COVID-19 时需区分漫画情节、现实防护与最新医学建议。' },
  { pattern: /登革热|流感|病毒|肺炎|感染/u, note: '涉及感染性疾病时避免把病原体拟人行为当成真实机制。' },
  { pattern: /过敏|花粉/u, note: '涉及过敏时需区分轻微症状与需要医疗处理的严重反应。' },
  { pattern: /痤疮|银屑病|皮肤/u, note: '涉及皮肤问题时避免羞辱外貌，强调不能据漫画自行用药。' },
  { pattern: /iPS|诱导多能/u, note: '涉及干细胞时需说明研究应用、风险与伦理边界。' },
  { pattern: /免疫|抗原|抗体|细胞因子|白细胞左移/u, note: '免疫术语较密集，适合先做术语核对再给孩子解释。' },
];

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function relativePath(targetPath) {
  return toPosix(path.relative(rootDir, targetPath));
}

function assertInsideRoot(targetPath, message) {
  const relative = path.relative(rootDir, path.resolve(targetPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(message ?? `Refusing to access path outside project root: ${targetPath}`);
  }
}

function assertPrivateOutputPath(outputPath, label) {
  assertInsideRoot(outputPath);
  const relative = relativePath(outputPath);
  const firstSegment = relative.split('/')[0];
  if (forbiddenOutputRoots.has(firstSegment)) {
    throw new Error(`Refusing to write ${label} into a public/deployable directory: ${relative}`);
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, 'utf8'));
}

async function readJsonIfExists(targetPath) {
  if (!targetPath || !(await pathExists(targetPath))) {
    return null;
  }
  return readJson(targetPath);
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/gu, '');
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0
    ? Number((finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(2))
    : null;
}

function gradeForTopic(pages, averageConfidence, options = {}) {
  const strictQualityGates = Boolean(options.strictQualityGates);
  const pageCount = Math.max(1, pages.length);
  const emptyPageCount = pages.filter((page) => !String(page.normalizedText ?? '').trim()).length;
  const lowConfidencePageCount = pages.filter((page) => Number(page.confidence) < 0.45 || page.readingOrderConfidence === 'low').length;
  const uncertainPageCount = pages.filter((page) => (page.uncertainTerms ?? []).length > 0).length;
  const unusablePageCount = pages.filter((page) => page.usabilityStatus === 'unusable').length;
  const highLatinNoisePageCount = pages.filter((page) => {
    const textQuality = page.textQuality ?? {};
    return Number(textQuality.charCount ?? 0) >= 80
      && Number(textQuality.hanRatio ?? 1) < 0.4
      && Number(textQuality.latinRatio ?? 0) > 0.32;
  }).length;
  const heavyNoisePageCount = pages.filter((page) => {
    const diagnostics = page.cleaningDiagnostics ?? {};
    return Number(diagnostics.droppedLineCount ?? 0) >= 10 || Number(diagnostics.suspiciousLineCount ?? 0) >= 2;
  }).length;
  const lowRatio = lowConfidencePageCount / pageCount;
  const uncertainRatio = uncertainPageCount / pageCount;
  const unusableRatio = unusablePageCount / pageCount;
  const highLatinNoiseRatio = highLatinNoisePageCount / pageCount;
  const reasons = [];

  if (emptyPageCount > 0) {
    reasons.push(`${emptyPageCount} pages have empty normalized text`);
  }
  if (lowConfidencePageCount > 0) {
    reasons.push(`${lowConfidencePageCount} pages have low OCR or reading-order confidence`);
  }
  if (uncertainPageCount > 0) {
    reasons.push(`${uncertainPageCount} pages contain uncertain terms`);
  }
  if (heavyNoisePageCount > 0) {
    reasons.push(`${heavyNoisePageCount} pages have heavy dropped/suspicious OCR noise`);
  }
  if (unusablePageCount > 0) {
    reasons.push(`${unusablePageCount} pages are marked unusable by text-ratio gates`);
  }
  if (highLatinNoisePageCount > 0) {
    reasons.push(`${highLatinNoisePageCount} pages have low Chinese ratio and high Latin noise`);
  }

  if (strictQualityGates && unusableRatio > 0.2) {
    return { qualityGrade: 'D-暂不建议直接使用', reasons };
  }

  if (emptyPageCount > 0 || averageConfidence < 0.42 || lowRatio > 0.72) {
    return { qualityGrade: 'D-暂不建议直接使用', reasons };
  }
  if (strictQualityGates && highLatinNoiseRatio > 0.25) {
    return { qualityGrade: 'C-需人工抽查后使用', reasons };
  }
  if (strictQualityGates && averageConfidence >= 0.54 && lowRatio <= 0.48 && uncertainRatio <= 0.5) {
    return {
      qualityGrade: 'B-可参考需抽查',
      reasons: [...reasons, 'A grade withheld until visual spot-check sample passes'],
    };
  }
  if (averageConfidence >= 0.54 && lowRatio <= 0.48 && uncertainRatio <= 0.5) {
    return { qualityGrade: 'A-可优先使用', reasons };
  }
  if (averageConfidence >= 0.48 && lowRatio <= 0.62) {
    return { qualityGrade: 'B-可参考需抽查', reasons };
  }
  return { qualityGrade: 'C-需人工抽查后使用', reasons };
}

function mergeTermLists(...lists) {
  return uniqueBy(
    lists.flat().filter(Boolean).map((item) => {
      if (typeof item === 'string') {
        return { term: item, count: null, pages: [], source: 'derived' };
      }
      return {
        term: item.term ?? item.keyword ?? item.label ?? item.normalizedTo,
        count: item.count ?? item.occurrenceCount ?? null,
        pages: item.pages ?? [],
        source: item.source ?? 'derived',
        reason: item.reason ?? null,
      };
    }).filter((item) => item.term),
    (item) => item.term,
  );
}

function indexByTopic(items) {
  return new Map((items ?? []).map((item) => [item.topicId, item]));
}

function terminologyForTopic(terminology, topicId, displayTitle) {
  return (terminology?.entries ?? [])
    .filter((entry) => {
      const scopes = entry.topics ?? ['all'];
      return scopes.includes('all') || scopes.includes(topicId) || scopes.includes(displayTitle);
    })
    .map((entry) => ({
      term: entry.preferred ?? entry.label ?? entry.id,
      label: entry.label ?? entry.preferred ?? entry.id,
      source: 'terminology',
    }));
}

function topicGlossaryTerms(topic, terminology, hintTopic) {
  const pageTerms = topic.pages.flatMap((page) => [
    ...(page.glossaryHits ?? []).map((hit) => ({
      term: hit.normalizedTo ?? hit.label,
      source: 'page-glossary-hit',
      pages: [page.pageNumber],
    })),
    ...(page.uncertainTerms ?? []).map((term) => ({
      term: term.term,
      source: 'page-uncertain-term',
      pages: [page.pageNumber],
      reason: term.reason,
    })),
  ]);
  return mergeTermLists(
    hintTopic?.termsNeedingScientificReview ?? [],
    topic.contextHints?.termsNeedingScientificReview ?? [],
    terminologyForTopic(terminology, topic.topicId, topic.displayTitle),
    pageTerms,
  );
}

function qualitySortValue(grade) {
  const strictScores = {
    'A-可优先使用': 4,
    'B-可参考需抽查': 3,
    'C-需人工抽查后使用': 2,
    'D-暂不建议直接使用': 1,
  };
  if (Object.hasOwn(strictScores, grade)) {
    return strictScores[grade];
  }
  return {
    'A-可优先使用': 4,
    'B-可参考需抽查': 3,
    'C-需人工抽查后使用': 2,
    'D-暂不建议直接使用': 1,
  }[grade] ?? 0;
}

function transcriptTopic(topic, options = {}) {
  const pages = (topic.pages ?? []).map((page) => ({
    pageNumber: page.pageNumber,
    imagePath: page.imagePath,
    normalizedText: String(page.normalizedText ?? '').trim(),
    confidence: page.confidence ?? null,
    readingOrderConfidence: page.readingOrderConfidence ?? null,
    glossaryHits: page.glossaryHits ?? [],
    uncertainTerms: page.uncertainTerms ?? [],
    correctionNotes: page.correctionNotes ?? [],
    usabilityStatus: page.usabilityStatus ?? 'unknown',
    usabilityReasons: page.usabilityReasons ?? [],
    textQuality: page.textQuality ?? null,
    cleaningDiagnostics: page.cleaningDiagnostics ?? null,
  }));
  const averageConfidence = average(pages.map((page) => Number(page.confidence)));
  const quality = gradeForTopic(pages, averageConfidence ?? topic.averageConfidence ?? 0, options);
  const transcriptText = pages
    .map((page) => `【p${page.pageNumber}】\n${page.normalizedText}`)
    .filter((section) => section.trim())
    .join('\n\n');

  return {
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    source: topic.source ?? null,
    pageRange: topic.pageRange ?? null,
    pageCount: pages.length,
    pageNumbers: pages.map((page) => page.pageNumber),
    averageConfidence: averageConfidence ?? topic.averageConfidence ?? null,
    qualityGrade: quality.qualityGrade,
    qualityReasons: quality.reasons,
    qualityGateMode: options.strictQualityGates ? 'strict-v2' : 'legacy',
    transcriptText,
    pageTranscripts: pages,
  };
}

function topPageSignals(topic, limit = 8) {
  return topic.pages
    .map((page) => ({
      pageNumber: page.pageNumber,
      confidence: page.confidence ?? null,
      readingOrderConfidence: page.readingOrderConfidence ?? null,
      glossaryHitCount: (page.glossaryHits ?? []).length,
      uncertainTermCount: (page.uncertainTerms ?? []).length,
    }))
    .sort((a, b) => b.glossaryHitCount - a.glossaryHitCount || b.uncertainTermCount - a.uncertainTermCount || a.pageNumber - b.pageNumber)
    .slice(0, limit);
}

function parentCautions({ title, concepts, qualityGrade, glossaryCheckTerms }) {
  const haystack = `${title} ${concepts.join(' ')} ${glossaryCheckTerms.map((item) => item.term).join(' ')}`;
  const cautions = cautionByPattern
    .filter((entry) => entry.pattern.test(haystack))
    .map((entry) => entry.note);
  if (qualityGrade !== 'A-可优先使用') {
    cautions.push('转写质量不是最高档，生成面向孩子的解释前应先抽查关键页。');
  }
  if (glossaryCheckTerms.length > 0) {
    cautions.push('术语表相关词需要核对中文常用名、原书译名与儿童解释口径。');
  }
  return [...new Set(cautions)].slice(0, 6);
}

function likelyEvents(title, cells, structures) {
  const cellText = cells.map((item) => item.term).slice(0, 3).join('、') || '相关免疫细胞';
  const structureText = structures.map((item) => item.term).slice(0, 3).join('、') || '相关身体结构或病原体';
  return `围绕「${title}」的身体异常、入侵者或生理变化展开；${cellText}可能识别、追踪或处理${structureText}，情节大概率服务于该主题的防御/调节机制说明。`;
}

function plotNodes(title, concepts, cells, structures, pageNumbers) {
  const firstPage = pageNumbers[0] ?? null;
  const lastPage = pageNumbers.at(-1) ?? null;
  const cellText = cells.map((item) => item.term).slice(0, 2).join('、') || '相关细胞';
  const structureText = structures.map((item) => item.term).slice(0, 2).join('、') || '主题相关对象';
  const conceptText = concepts.slice(0, 2).join('、') || title;
  return [
    { node: '开端', hint: `p${firstPage ?? '?'}附近可能引入「${title}」相关的异常信号、身体场景或病原体线索。` },
    { node: '响应', hint: `${cellText}可能开始识别、报告或介入${structureText}。` },
    { node: '推进', hint: `中段可能通过追击、对抗、运输、训练或信号传递来表现${conceptText}。` },
    { node: '收束', hint: `p${lastPage ?? '?'}附近可能进入结果、恢复、失败风险或知识补充。` },
  ];
}

function outlineTopic({ transcriptTopicData, sourceTopic, hintTopic, terminology }) {
  const glossaryCheckTerms = topicGlossaryTerms(sourceTopic, terminology, hintTopic);
  const mainCells = mergeTermLists(hintTopic?.possibleCells ?? []);
  const pathogensOrStructures = mergeTermLists(hintTopic?.possiblePathogensOrStructures ?? []);
  const frequentKeywords = mergeTermLists(hintTopic?.frequentKeywords ?? [], sourceTopic.contextHints?.frequentKeywords ?? []);
  const concepts = uniqueBy([
    ...(titleConcepts[sourceTopic.topicId] ?? []),
    ...frequentKeywords.map((item) => item.term).slice(0, 6),
    ...glossaryCheckTerms.map((item) => item.term).slice(0, 4),
  ], (item) => item).slice(0, 12);
  const cautions = parentCautions({
    title: sourceTopic.displayTitle,
    concepts,
    qualityGrade: transcriptTopicData.qualityGrade,
    glossaryCheckTerms,
  });
  const manualReviewReasons = [
    ...transcriptTopicData.qualityReasons,
    ...(transcriptTopicData.qualityGrade === 'A-可优先使用' ? [] : ['topic transcript quality needs spot check']),
  ];
  const suitabilityScore = qualitySortValue(transcriptTopicData.qualityGrade) * 2
    + Math.min(4, concepts.length)
    + Math.min(2, mainCells.length + pathogensOrStructures.length)
    - Math.min(3, cautions.length);

  return {
    topicId: sourceTopic.topicId,
    displayTitle: sourceTopic.displayTitle,
    source: sourceTopic.source ?? null,
    pageRange: sourceTopic.pageRange ?? null,
    pageCount: transcriptTopicData.pageCount,
    pageNumbers: transcriptTopicData.pageNumbers,
    transcriptQualityGrade: transcriptTopicData.qualityGrade,
    averageConfidence: transcriptTopicData.averageConfidence,
    whatMayHaveHappened: likelyEvents(sourceTopic.displayTitle, mainCells, pathogensOrStructures),
    mainCells,
    mainPathogensOrBodyStructures: pathogensOrStructures,
    keyScienceConcepts: concepts,
    possiblePlotNodes: plotNodes(sourceTopic.displayTitle, concepts, mainCells, pathogensOrStructures, transcriptTopicData.pageNumbers),
    parentCautionPoints: cautions,
    glossaryCheckTerms,
    evidenceSignals: {
      topKeywordTerms: frequentKeywords.slice(0, 10),
      pageSignals: topPageSignals(sourceTopic),
    },
    bodyScienceStationSuitability: {
      status: suitabilityScore >= 7 && transcriptTopicData.qualityGrade !== 'D-暂不建议直接使用'
        ? 'suitable-after-spot-check'
        : 'hold-for-manual-review',
      score: suitabilityScore,
      reason: suitabilityScore >= 7
        ? 'topic has usable transcript quality and enough science terms for later content generation'
        : 'topic needs transcript/terminology review before content generation',
    },
    manualReviewReasons: [...new Set(manualReviewReasons)],
    noFullDialogueCopied: true,
  };
}

async function collectFiles(dir) {
  if (!(await pathExists(dir))) {
    return [];
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function snippetForLeakCheck(text) {
  const compact = compactText(text);
  return compact.length >= 60 ? compact.slice(0, 60) : null;
}

async function checkPublicLeakage(transcripts) {
  const snippets = transcripts.topics
    .map((topic) => snippetForLeakCheck(topic.transcriptText))
    .filter(Boolean)
    .slice(0, 120);
  const matches = [];

  for (const root of leakCheckRoots) {
    const rootPath = path.join(rootDir, root);
    for (const file of await collectFiles(rootPath)) {
      const ext = path.extname(file).toLowerCase();
      if (!['.json', '.js', '.html', '.md', '.txt'].includes(ext)) {
        continue;
      }
      const text = await readFile(file, 'utf8').catch(() => '');
      const compact = compactText(text);
      const snippet = snippets.find((item) => compact.includes(item));
      if (snippet) {
        matches.push({ path: relativePath(file), snippet });
      }
    }
  }

  return {
    checkedRoots: leakCheckRoots.map((item) => `${item}/`),
    completeNormalizedTextInPublicDirectory: matches.length > 0,
    matches,
  };
}

function buildTranscripts({ input, inputPath, transcriptsPath, stage = '6D-4', strictQualityGates = false }) {
  const topics = (input.topics ?? []).map((topic) => transcriptTopic(topic, { strictQualityGates }));
  const qualityByTopic = topics.map((topic) => ({
    topicId: topic.topicId,
    displayTitle: topic.displayTitle,
    qualityGrade: topic.qualityGrade,
    averageConfidence: topic.averageConfidence,
    pageCount: topic.pageCount,
    qualityReasons: topic.qualityReasons,
  }));

  return {
    schemaVersion: 1,
    stage,
    generatedAt: new Date().toISOString(),
    seriesId: input.seriesId ?? 'cells-at-work',
    inputPaths: {
      pageReadableTextPath: relativePath(inputPath),
    },
    outputPolicy: {
      privateOutputPath: relativePath(transcriptsPath),
      containsFullNormalizedText: true,
      publicOutputWritten: false,
      fullNormalizedTextPubliclyAccessible: false,
      sourceOcrModified: false,
      frontendModified: false,
      manifestModified: false,
      pageMapModified: false,
      terminologyModified: false,
      bodyScienceStationGenerated: false,
      forbiddenPublicDirectories: [...forbiddenOutputRoots].map((item) => `${item}/`),
    },
    transcriptPolicy: {
      groupedBy: 'topic',
      sourceTextField: 'topics[].pages[].normalizedText',
      preservesPageBreaks: true,
      intendedUse: 'private readable transcript draft for human review and later content planning',
      qualityGateMode: strictQualityGates ? 'strict-v2' : 'legacy',
    },
    topics,
    summary: {
      topicCount: topics.length,
      pageCount: topics.reduce((sum, topic) => sum + topic.pageCount, 0),
      qualityByTopic,
    },
  };
}

function buildOutline({ input, transcripts, hints, terminology, inputPath, hintsPath, terminologyPath, outlinePath, publicLeakCheck, stage = '6D-4-outline-hints' }) {
  const hintByTopic = indexByTopic(hints?.topics);
  const transcriptByTopic = indexByTopic(transcripts.topics);
  const topics = (input.topics ?? []).map((topic) => outlineTopic({
    transcriptTopicData: transcriptByTopic.get(topic.topicId),
    sourceTopic: topic,
    hintTopic: hintByTopic.get(topic.topicId),
    terminology,
  }));
  const recommendedBodyScienceStationTopics = topics
    .filter((topic) => topic.bodyScienceStationSuitability.status === 'suitable-after-spot-check')
    .sort((a, b) => b.bodyScienceStationSuitability.score - a.bodyScienceStationSuitability.score || b.averageConfidence - a.averageConfidence)
    .slice(0, 10)
    .map((topic) => ({
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      transcriptQualityGrade: topic.transcriptQualityGrade,
      score: topic.bodyScienceStationSuitability.score,
      keyScienceConcepts: topic.keyScienceConcepts.slice(0, 5),
    }));
  const manualReviewTopics = topics
    .filter((topic) => topic.transcriptQualityGrade !== 'A-可优先使用' || topic.manualReviewReasons.length > 0)
    .map((topic) => ({
      topicId: topic.topicId,
      displayTitle: topic.displayTitle,
      transcriptQualityGrade: topic.transcriptQualityGrade,
      reasons: topic.manualReviewReasons,
    }));

  return {
    schemaVersion: 1,
    stage,
    generatedAt: new Date().toISOString(),
    seriesId: input.seriesId ?? 'cells-at-work',
    inputPaths: {
      pageReadableTextPath: relativePath(inputPath),
      topicContentHintsPath: hintsPath ? relativePath(hintsPath) : null,
      terminologyPath: terminologyPath ? relativePath(terminologyPath) : null,
      topicReadableTranscriptsPath: transcripts.outputPolicy.privateOutputPath,
    },
    outputPolicy: {
      privateOutputPath: relativePath(outlinePath),
      containsFullNormalizedText: false,
      containsRawOcrText: false,
      publicOutputWritten: false,
      fullNormalizedTextPubliclyAccessible: publicLeakCheck.completeNormalizedTextInPublicDirectory,
      sourceOcrModified: false,
      frontendModified: false,
      manifestModified: false,
      pageMapModified: false,
      terminologyModified: false,
      bodyScienceStationGenerated: false,
      forbiddenPublicDirectories: [...forbiddenOutputRoots].map((item) => `${item}/`),
    },
    outlinePolicy: {
      doesNotCopyFullDialogue: true,
      doesNotGenerateBodyScienceStationCopy: true,
      derivedFrom: [
        'topic title',
        'page-level OCR confidence metadata',
        'glossary hits and uncertain term metadata',
        'existing topic-content-hints keyword metadata',
      ],
    },
    topics,
    summary: {
      topicCount: topics.length,
      completeNormalizedTextInPublicDirectory: publicLeakCheck.completeNormalizedTextInPublicDirectory,
      publicLeakCheck,
      qualityByTopic: transcripts.summary.qualityByTopic,
      recommendedBodyScienceStationTopics,
      manualReviewTopics,
    },
  };
}

export async function runWorkCellsTopicReadableTranscripts(options = {}) {
  const inputPath = path.resolve(rootDir, options.inputPath ?? defaultInputPath);
  const hintsPath = path.resolve(rootDir, options.hintsPath ?? defaultHintsPath);
  const terminologyPath = path.resolve(rootDir, options.terminologyPath ?? defaultTerminologyPath);
  const transcriptsPath = path.resolve(rootDir, options.transcriptsPath ?? defaultTranscriptsPath);
  const outlinePath = path.resolve(rootDir, options.outlinePath ?? defaultOutlinePath);

  for (const inputFile of [inputPath, hintsPath, terminologyPath]) {
    assertInsideRoot(inputFile, `Input must stay inside project root: ${inputFile}`);
  }
  assertPrivateOutputPath(transcriptsPath, 'topic readable transcripts');
  assertPrivateOutputPath(outlinePath, 'topic story outline hints');

  if (!(await pathExists(inputPath))) {
    throw new Error(`Required 6D-4 input not found: ${relativePath(inputPath)}`);
  }

  const [input, hints, terminology] = await Promise.all([
    readJson(inputPath),
    readJsonIfExists(hintsPath),
    readJsonIfExists(terminologyPath),
  ]);
  const transcripts = buildTranscripts({
    input,
    inputPath,
    transcriptsPath,
    stage: options.stage,
    strictQualityGates: options.strictQualityGates,
  });
  const publicLeakCheck = await checkPublicLeakage(transcripts);
  transcripts.outputPolicy.fullNormalizedTextPubliclyAccessible = publicLeakCheck.completeNormalizedTextInPublicDirectory;
  transcripts.outputPolicy.publicOutputWritten = false;
  transcripts.summary.publicLeakCheck = publicLeakCheck;

  const outline = buildOutline({
    input,
    transcripts,
    hints,
    terminology,
    inputPath,
    hintsPath: hints ? hintsPath : null,
    terminologyPath: terminology ? terminologyPath : null,
    outlinePath,
    publicLeakCheck,
    stage: options.outlineStage,
  });

  await mkdir(path.dirname(transcriptsPath), { recursive: true });
  await mkdir(path.dirname(outlinePath), { recursive: true });
  await writeFile(transcriptsPath, `${JSON.stringify(transcripts, null, 2)}\n`, 'utf8');
  await writeFile(outlinePath, `${JSON.stringify(outline, null, 2)}\n`, 'utf8');
  return { transcripts, outline };
}

function parseCliArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--input') {
      options.inputPath = args[++index];
    } else if (arg === '--hints') {
      options.hintsPath = args[++index];
    } else if (arg === '--terminology') {
      options.terminologyPath = args[++index];
    } else if (arg === '--transcripts-output') {
      options.transcriptsPath = args[++index];
    } else if (arg === '--outline-output') {
      options.outlinePath = args[++index];
    } else if (arg === '--stage') {
      options.stage = args[++index];
    } else if (arg === '--outline-stage') {
      options.outlineStage = args[++index];
    } else if (arg === '--strict-quality-gates') {
      options.strictQualityGates = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/work-cells-topic-readable-transcripts.mjs [options]

Options:
  --input <file>               Default: data-private/cells-at-work/ocr-layout/page-readable-text.json
  --hints <file>               Default: data-private/cells-at-work/ocr/topic-content-hints.json
  --terminology <file>         Default: data-private/cells-at-work/terminology.zh-Hans.json
  --transcripts-output <file>  Default: data-private/cells-at-work/ocr-layout/topic-readable-transcripts.json
  --outline-output <file>      Default: data-private/cells-at-work/ocr-layout/topic-story-outline-hints.json
  --stage <label>              Default: 6D-4
  --outline-stage <label>      Default: 6D-4-outline-hints
  --strict-quality-gates       Cap A grades unless a visual spot-check workflow supplies evidence

Writes private 6D-4 topic transcript drafts and dialogue-free outline hints.`);
}

function formatTop(items, formatter, limit = 10) {
  const shown = items.slice(0, limit).map(formatter);
  if (items.length > limit) {
    shown.push(`... +${items.length - limit}`);
  }
  return shown.length > 0 ? shown.join('\n') : '- none';
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runWorkCellsTopicReadableTranscripts(options);
    console.log(`Topic readable transcripts: ${result.transcripts.outputPolicy.privateOutputPath}`);
    console.log(`Topic story outline hints: ${result.outline.outputPolicy.privateOutputPath}`);
    console.log('Transcript quality by topic:');
    console.log(formatTop(
      result.transcripts.summary.qualityByTopic,
      (item) => `- ${item.displayTitle}: ${item.qualityGrade} (${item.averageConfidence})`,
      40,
    ));
    console.log('Recommended for body science station generation:');
    console.log(formatTop(
      result.outline.summary.recommendedBodyScienceStationTopics,
      (item) => `- ${item.displayTitle}: ${item.transcriptQualityGrade}, ${item.keyScienceConcepts.slice(0, 3).join(' / ')}`,
      12,
    ));
    console.log(`Manual review topics: ${result.outline.summary.manualReviewTopics.length}`);
    console.log(`Complete normalized text in public/dist/build/docs: ${result.outline.summary.completeNormalizedTextInPublicDirectory ? 'yes' : 'no'}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
