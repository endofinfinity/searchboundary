function stripNoise(text) {
  return text
    .replace(/\b(cookie|privacy|terms|登录|注册|订阅|广告|版权所有)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToText(html) {
  return stripNoise(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

function truncateText(text, maxChars) {
  if (!text) {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}...`;
}

function uniqueUrls(items, maxDocs) {
  const urls = [];
  const seen = new Set();
  for (const item of items) {
    const url = String(item.url || "").trim();
    if (!url || seen.has(url)) {
      continue;
    }
    if (!/^https?:\/\//i.test(url)) {
      continue;
    }
    seen.add(url);
    urls.push(url);
    if (Number.isFinite(maxDocs) && maxDocs > 0 && urls.length >= maxDocs) {
      break;
    }
  }
  return urls;
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= tasks.length) {
        return;
      }
      results[current] = await tasks[current]();
    }
  });

  await Promise.all(workers);
  return results;
}

export async function fetchDocumentCorpus(items, options = {}) {
  const maxDocs = Number.isFinite(options.maxDocs) ? options.maxDocs : Infinity;
  const maxCharsPerDoc = options.maxCharsPerDoc || 2800;
  const timeoutMs = options.timeoutMs || 8000;
  const concurrency = options.concurrency || 6;

  const urls = uniqueUrls(items, maxDocs);
  const tasks = urls.map((url) => async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "omit",
          signal: controller.signal
        });
        if (!res.ok) {
          return null;
        }
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          return null;
        }
        const html = await res.text();
        const text = truncateText(htmlToText(html), maxCharsPerDoc);
        if (!text || text.length < 180) {
          return null;
        }
        return {
          url,
          text
        };
      } catch (_error) {
        return null;
      } finally {
        clearTimeout(timer);
      }
    });
  const docs = await runWithConcurrency(tasks, concurrency);

  return docs.filter(Boolean);
}
