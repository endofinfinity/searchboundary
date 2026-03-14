import { detectEngine, extractQuery, buildPageUrls } from "./shared/engine.js";
import { parseGooglePage, parseBingPage, parseBaiduPage } from "./parser/index.js";
import { extractKeywords } from "./keywords/extract.js";
import { extractKeywordsByDocumentWithLLM } from "./keywords/llm.js";
import { fetchDocumentCorpus } from "./keywords/document.js";
import { mergeSettings } from "./shared/settings.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_SCHEMA = "v3";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ANALYZE_SEARCH") {
    handleAnalyzeRequest(message.payload)
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: formatError(error)
        });
    });
    return true;
  }
  return false;
});

async function handleAnalyzeRequest(payload) {
  const settings = await getSettings();
  const engine = detectEngine(payload?.url || "");
  if (!engine) {
    throw new Error("Unsupported search engine.");
  }

  const query = (payload?.query || extractQuery(payload.url, engine) || new URL(payload.url).pathname).trim();
  if (!query) {
    throw new Error("Search query not found.");
  }

  const cacheKey = buildCacheKey(
    engine,
    query,
    settings.keywordMode,
    settings.llmModel,
    settings.keywordsPerDoc,
    settings.searchPages,
    settings.keywordLimit
  );
  const cached = await getCache(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return {
      keywords: cached.keywords,
      pagesFetched: 0,
      fromCache: true,
      modeUsed: cached.modeUsed || settings.keywordMode,
      docsUsed: cached.docsUsed || 0,
      docsAttempted: cached.docsAttempted || 0,
      keywordsPerDoc: cached.keywordsPerDoc || normalizeKeywordsPerDoc(settings.keywordsPerDoc),
      pagesConfigured: cached.pagesConfigured || normalizeSearchPages(settings.searchPages),
      keywordLimit: cached.keywordLimit || normalizeKeywordLimit(settings.keywordLimit),
      callSource: cached.callSource || inferCallSource(cached.modeUsed, settings.llmProvider),
      panelLanguage: normalizePanelLanguage(settings.panelLanguage || settings.language)
    };
  }

  const pagesConfigured = normalizeSearchPages(settings.searchPages);
  const pageUrls = buildPageUrls(engine, payload.url, pagesConfigured);
  const prefetched = Array.isArray(payload?.prefetchedPages) ? payload.prefetchedPages.filter(Boolean) : [];
  const pages = prefetched.length ? prefetched : await fetchPages(pageUrls);
  const parsedItems = pages.flatMap((page) => parsePage(engine, page));
  const domItems = Array.isArray(payload?.pageItems) ? payload.pageItems : [];
  const items = mergeItems(parsedItems, domItems);
  const keywordsPerDoc = normalizeKeywordsPerDoc(settings.keywordsPerDoc);

  const documents = await fetchDocumentCorpus(items, {
    maxDocs: items.length,
    maxCharsPerDoc: 2800,
    timeoutMs: 9000,
    concurrency: 6
  });
  const effectiveDocs = documents.length ? documents : buildDocsFromItems(items);
  const { keywords, modeUsed } = await buildKeywords(items, effectiveDocs, settings, engine);
  const callSource = inferCallSource(modeUsed, settings.llmProvider);

  await setCache(cacheKey, {
    createdAt: Date.now(),
    keywords,
    modeUsed,
    docsUsed: effectiveDocs.length,
    docsAttempted: items.length,
    keywordsPerDoc,
    pagesConfigured,
    keywordLimit: normalizeKeywordLimit(settings.keywordLimit),
    callSource
  });

  return {
    keywords,
    pagesFetched: pages.length,
    fromCache: false,
    modeUsed,
    docsUsed: effectiveDocs.length,
    docsAttempted: items.length,
    keywordsPerDoc,
    pagesConfigured,
    keywordLimit: normalizeKeywordLimit(settings.keywordLimit),
    callSource,
    panelLanguage: normalizePanelLanguage(settings.panelLanguage || settings.language)
  };
}

function parsePage(engine, html) {
  if (engine === "google") {
    return parseGooglePage(html);
  }
  if (engine === "bing") {
    return parseBingPage(html);
  }
  if (engine === "baidu") {
    return parseBaiduPage(html);
  }
  return [];
}

async function fetchPages(urls) {
  const responses = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          return null;
        }
        return await res.text();
      } catch (_error) {
        return null;
      }
    })
  );

  return responses.filter(Boolean);
}

function buildCacheKey(
  engine,
  query,
  mode = "local",
  model = "",
  keywordsPerDoc = 5,
  searchPages = 5,
  keywordLimit = 40
) {
  return `kwcloud:${CACHE_SCHEMA}:${engine}:${String(query || "").toLowerCase()}:${mode}:${model}:kpd${keywordsPerDoc}:p${normalizeSearchPages(searchPages)}:k${normalizeKeywordLimit(keywordLimit)}`;
}

function getCache(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key] || null));
  });
}

function setCache(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["kwcloud_settings"], (result) => {
      resolve(mergeSettings(result.kwcloud_settings));
    });
  });
}

async function buildKeywords(items, documents, settings, engine) {
  const minLen = settings.minLen || 2;
  const perDoc = normalizeKeywordsPerDoc(settings.keywordsPerDoc);
  const keywordLimit = normalizeKeywordLimit(settings.keywordLimit);
  const localKeywords = extractLocalKeywordsByDocument(documents, perDoc, minLen);

  if (settings.keywordMode === "local") {
    return { keywords: finalizeKeywords(aggregateKeywords(localKeywords, items, engine), keywordLimit), modeUsed: "local" };
  }

  try {
    const llmByDoc = await extractKeywordsByDocumentWithLLM(documents, settings);
    const hasAny = llmByDoc.byDoc.some((it) => it.terms.length > 0);
    if (!hasAny) {
      throw new Error("LLM returned empty per-document keywords.");
    }
    return { keywords: finalizeKeywords(aggregateKeywords(llmByDoc.byDoc, items, engine), keywordLimit), modeUsed: "llm" };
  } catch (_error) {
    return { keywords: finalizeKeywords(aggregateKeywords(localKeywords, items, engine), keywordLimit), modeUsed: "fallback_local" };
  }
}

function extractLocalKeywordsByDocument(documents, perDoc, minLen) {
  return documents.map((doc) => {
    const list = extractKeywords(
      [{ title: "", snippet: doc.text || "" }],
      { topN: perDoc, minLen }
    );
    return {
      url: doc.url,
      terms: list.map((it) => it.term).slice(0, perDoc)
    };
  });
}

function aggregateKeywords(byDoc, items, engine) {
  const map = new Map();
  for (const doc of byDoc) {
    const seenInDoc = new Set();
    for (const termRaw of doc.terms || []) {
      const term = String(termRaw || "").replace(/\s+/g, " ").trim();
      if (!term) {
        continue;
      }
      const key = term.toLowerCase();
      if (seenInDoc.has(key)) {
        continue;
      }
      seenInDoc.add(key);
      if (!map.has(key)) {
        map.set(key, { term, count: 0, score: 0, url: doc.url || pickKeywordUrl(term, items, engine) });
      }
      const current = map.get(key);
      current.count += 1;
      current.score += 1;
      if (!current.url) {
        current.url = doc.url || pickKeywordUrl(term, items, engine);
      }
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}

function normalizeKeywordsPerDoc(value) {
  return Number(value) === 10 ? 10 : 5;
}

function normalizeSearchPages(value) {
  const n = Number(value);
  if (n === 1 || n === 10) {
    return n;
  }
  return 5;
}

function finalizeKeywords(keywords, limit) {
  return [...keywords]
    .sort((a, b) => {
      if ((b.count || 0) !== (a.count || 0)) {
        return (b.count || 0) - (a.count || 0);
      }
      return (b.score || 0) - (a.score || 0);
    })
    .slice(0, normalizeKeywordLimit(limit));
}

function normalizeKeywordLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 40;
  }
  return Math.max(10, Math.min(200, Math.floor(n)));
}

function mergeItems(parsedItems, domItems) {
  const all = [...(parsedItems || []), ...(domItems || [])];
  const seen = new Set();
  const out = [];
  for (const item of all) {
    const title = String(item?.title || "").replace(/\s+/g, " ").trim();
    const url = String(item?.url || "").trim();
    const snippet = String(item?.snippet || "").replace(/\s+/g, " ").trim();
    if (!title || !url) {
      continue;
    }
    const key = `${title}|${url}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({ title, url, snippet });
  }
  return out;
}

function buildDocsFromItems(items) {
  return (items || []).map((it) => ({
    url: it.url,
    text: `${it.title || ""} ${it.snippet || ""}`.trim()
  })).filter((it) => it.text.length > 10);
}

function normalizePanelLanguage(value) {
  const allowed = new Set([
    "zh", "en", "ja", "ko", "es", "fr", "de", "it", "pt", "ru",
    "ar", "hi", "tr", "vi", "th", "id", "nl", "pl", "sv", "he"
  ]);
  return allowed.has(value) ? value : "zh";
}

function inferCallSource(modeUsed, provider) {
  if (modeUsed === "llm") {
    return provider === "ollama" ? "本地" : "云端API";
  }
  return "本地";
}

function pickKeywordUrl(term, items, engine) {
  const t = normalizeMatchText(term);
  let best = null;

  for (const it of items) {
    const source = normalizeMatchText(`${it.title || ""} ${it.snippet || ""}`);
    if (!source || !it.url) {
      continue;
    }
    let score = 0;
    if (source.includes(t)) {
      score += 8;
    }
    const termParts = t.split(/\s+/).filter(Boolean);
    for (const part of termParts) {
      if (part.length > 1 && source.includes(part)) {
        score += 2;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { url: it.url, score };
    }
  }

  if (best?.url) {
    return best.url;
  }
  return buildSearchFallbackUrl(engine, term);
}

function normalizeMatchText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchFallbackUrl(engine, term) {
  if (engine === "google") {
    return `https://www.google.com/search?q=${encodeURIComponent(term)}`;
  }
  if (engine === "bing") {
    return `https://www.bing.com/search?q=${encodeURIComponent(term)}`;
  }
  return `https://www.baidu.com/s?wd=${encodeURIComponent(term)}`;
}

function formatError(error) {
  if (!error) {
    return "Failed to analyze search results.";
  }
  const message = error.message || String(error);
  const stackLine = error.stack?.split("\n")?.[1]?.trim() || "";
  return stackLine ? `${message} | ${stackLine}` : message;
}
