const STOPWORDS = {
  auto: ["the", "and", "for", "with", "from", "this", "that", "what", "when", "where", "how", "why", "结果", "搜索"],
  zh: ["我们", "你们", "他们", "这个", "那个", "一个", "可以", "进行", "相关", "使用", "什么", "如何", "结果", "搜索", "页面"],
  en: ["the", "a", "an", "and", "or", "is", "are", "of", "to", "in", "for", "with", "on", "by", "as", "at", "from", "this", "that"],
  ja: ["これ", "それ", "ため", "について", "など", "です", "ます", "する", "した", "検索", "結果"],
  ko: ["그리고", "또한", "에서", "으로", "대한", "하는", "검색", "결과", "입니다"],
  es: ["el", "la", "los", "las", "de", "del", "para", "con", "como", "que", "por", "una", "uno", "en"],
  fr: ["le", "la", "les", "de", "des", "pour", "avec", "dans", "que", "une", "un", "et"],
  de: ["der", "die", "das", "und", "mit", "für", "von", "den", "dem", "ein", "eine", "ist"],
  it: ["il", "lo", "la", "gli", "le", "per", "con", "del", "della", "che", "una", "uno"],
  pt: ["o", "a", "os", "as", "de", "do", "da", "para", "com", "que", "uma", "um"],
  ru: ["и", "в", "на", "с", "по", "для", "это", "что", "как", "из", "к", "от"],
  ar: ["في", "من", "على", "إلى", "هذا", "هذه", "مع", "عن", "التي", "الذي"],
  hi: ["और", "के", "का", "की", "में", "से", "पर", "यह", "वह", "जो"],
  tr: ["ve", "ile", "için", "bir", "bu", "şu", "olan", "olarak", "de", "da"],
  vi: ["và", "của", "là", "cho", "trong", "với", "từ", "này", "đó", "các"],
  th: ["และ", "ของ", "ใน", "ที่", "เป็น", "กับ", "จาก", "นี้", "นั้น", "การ"],
  id: ["dan", "yang", "untuk", "dengan", "dari", "pada", "ini", "itu", "dalam", "adalah"],
  nl: ["de", "het", "een", "en", "van", "voor", "met", "in", "op", "dat"],
  pl: ["i", "w", "na", "do", "z", "dla", "to", "jest", "oraz", "jak"],
  sv: ["och", "det", "att", "för", "med", "som", "den", "på", "av", "är"],
  he: ["של", "עם", "על", "זה", "את", "היא", "הוא", "מה", "איך", "גם"]
};

export function extractKeywords(items, options = {}) {
  const topN = options.topN || 40;
  const minLen = options.minLen || 2;
  const stopwords = resolveStopwords("auto");
  const text = items.map((it) => `${it.title} ${it.snippet}`).join(" ");
  const tokens = tokenizeMixed(text, "auto");
  const freq = new Map();

  for (const raw of tokens) {
    const token = normalizeToken(raw);
    if (!token) {
      continue;
    }
    if (token.length < minLen) {
      continue;
    }
    if (stopwords.has(token)) {
      continue;
    }
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term, count]) => ({ term, count, score: count }));
}

function resolveStopwords(language) {
  const selected = STOPWORDS[language] || STOPWORDS.auto;
  return new Set([...STOPWORDS.auto, ...selected].map((w) => w.toLowerCase()));
}

function tokenizeMixed(text, language) {
  if (!text) {
    return [];
  }
  const segmented = segmentByIntl(text, language);
  if (segmented.length) {
    return segmented;
  }
  const cjk = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const kana = text.match(/[\u3040-\u30ff]{2,}/g) || [];
  const hangul = text.match(/[\uac00-\ud7af]{2,}/g) || [];
  const words = text.toLowerCase().match(/[\p{L}][\p{L}\p{N}-]{1,}/gu) || [];
  return [...cjk, ...kana, ...hangul, ...words];
}

function segmentByIntl(text, language) {
  if (typeof Intl === "undefined" || typeof Intl.Segmenter === "undefined") {
    return [];
  }
  const locale = language === "auto" ? "zh" : language;
  try {
    const seg = new Intl.Segmenter(locale, { granularity: "word" });
    const out = [];
    for (const item of seg.segment(text)) {
      const token = String(item.segment || "").trim();
      if (!token) {
        continue;
      }
      if (item.isWordLike === false) {
        continue;
      }
      out.push(token);
    }
    return out;
  } catch (_error) {
    return [];
  }
}

function normalizeToken(token) {
  return token
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .trim();
}
