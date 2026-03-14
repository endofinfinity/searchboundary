import { PROVIDER_PRESETS } from "../shared/providers.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function stripCodeFence(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseKeywordPayload(text, limit) {
  const parsed = safeJsonParse(stripCodeFence(text));
  if (!parsed) {
    return [];
  }

  const list = Array.isArray(parsed) ? parsed : parsed.keywords;
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => sanitizeTerm(String(item.term || item.keyword || "").trim()))
    .filter(Boolean)
    .slice(0, limit);
}

function sanitizeTerm(term) {
  return term
    .replace(/[，。；、|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(term) {
  return term
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isReasonableTerm(term) {
  if (!term) {
    return false;
  }
  const hasCjkLike = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(term);
  if (hasCjkLike) {
    return term.length >= 2 && term.length <= 12;
  }
  const words = term.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 3 && term.length <= 24;
}

function buildHeaders(settings) {
  const headers = { "Content-Type": "application/json" };
  if (settings.llmApiKey) {
    headers.Authorization = `Bearer ${settings.llmApiKey}`;
  }
  return headers;
}

function buildMessages(document, perDoc, minLen) {
  return [
    {
      role: "system",
      content: "You extract concise topic keywords from webpage content. Return strict JSON only."
    },
    {
      role: "user",
      content: [
        "请从下面网页正文提炼关键词。",
        "要求：",
        `1) 只输出 JSON，不要解释。`,
        `2) 只输出 ${perDoc} 个关键词。`,
        "3) 关键词要短，中文2-6字，英文1-2个词。",
        `4) 关键词长度至少 ${minLen}。`,
        "5) 过滤导航词、营销词、站点通用词。",
        '6) 输出格式: {"keywords":[{"term":"xxx"}]}',
        `URL: ${document.url}`,
        "正文：",
        document.text
      ].join("\n")
    }
  ];
}

async function requestDocKeywords(document, settings, perDoc, minLen) {
  const resolved = resolveProviderConfig(settings);
  const endpoint = resolved.endpoint;
  const model = resolved.model;
  if (!endpoint || !model) {
    throw new Error("LLM settings incomplete: endpoint/model missing.");
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: buildHeaders(settings),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: buildMessages(document, perDoc, minLen)
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return parseKeywordPayload(content, perDoc);
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const cur = idx;
      idx += 1;
      if (cur >= tasks.length) {
        return;
      }
      results[cur] = await tasks[cur]();
    }
  });
  await Promise.all(workers);
  return results;
}

export async function extractKeywordsByDocumentWithLLM(documents, settings) {
  const perDoc = Number(settings.keywordsPerDoc) === 10 ? 10 : 5;
  const minLen = settings.minLen || 2;

  const tasks = documents.map((doc) => async () => {
    try {
      const terms = await requestDocKeywords(doc, settings, perDoc, minLen);
      return { url: doc.url, terms };
    } catch (_error) {
      return { url: doc.url, terms: [] };
    }
  });

  const raw = await runWithConcurrency(tasks, 2);
  const cleaned = raw.map((entry) => {
    const uniq = [];
    const seen = new Set();
    for (const term of entry.terms) {
      if (!isReasonableTerm(term)) {
        continue;
      }
      const key = normalizeKey(term);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      uniq.push(term);
      if (uniq.length >= perDoc) {
        break;
      }
    }
    return { url: entry.url, terms: uniq };
  });

  return { byDoc: cleaned, perDoc };
}

function resolveProviderConfig(settings) {
  const provider = settings.llmProvider || "openai_compatible";
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.openai_compatible;
  return {
    endpoint: settings.llmEndpoint || preset.endpoint,
    model: settings.llmModel || preset.model
  };
}
