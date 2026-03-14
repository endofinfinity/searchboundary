function cleanText(input) {
  return decodeHtmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtmlEntities(input) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function capture(block, pattern) {
  const match = block.match(pattern);
  return match ? cleanText(match[1]) : "";
}

function uniqueItems(items) {
  const seen = new Set();
  return items.filter((it) => {
    const key = `${it.title}|${it.snippet}`;
    if (!it.title && !it.snippet) {
      return false;
    }
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function extractFirstHref(block) {
  const match = block.match(/<a[^>]+href="([^"]+)"/i);
  return match ? decodeHtmlEntities(match[1]) : "";
}

function normalizeResultUrl(rawUrl, engine) {
  if (!rawUrl) {
    return "";
  }
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }

  if (engine === "google" && rawUrl.startsWith("/url?")) {
    try {
      const u = new URL(`https://www.google.com${rawUrl}`);
      return u.searchParams.get("q") || "";
    } catch (_error) {
      return "";
    }
  }

  if (engine === "baidu" && rawUrl.startsWith("/link?")) {
    return `https://www.baidu.com${rawUrl}`;
  }

  if (rawUrl.startsWith("/")) {
    if (engine === "google") {
      return `https://www.google.com${rawUrl}`;
    }
    if (engine === "bing") {
      return `https://www.bing.com${rawUrl}`;
    }
    if (engine === "baidu") {
      return `https://www.baidu.com${rawUrl}`;
    }
  }

  return rawUrl;
}

export function parseGooglePage(html) {
  const blocks = html.match(/<div class="(?:MjjYud|g)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi) || [];
  const items = blocks.map((block) => ({
    url: normalizeResultUrl(extractFirstHref(block), "google"),
    title: capture(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i),
    snippet: capture(block, /<div[^>]+(?:VwiC3b|lEBKkf)[^>]*>([\s\S]*?)<\/div>/i)
  }));
  return uniqueItems(items);
}

export function parseBingPage(html) {
  const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/gi) || [];
  const items = blocks.map((block) => ({
    url: normalizeResultUrl(extractFirstHref(block), "bing"),
    title: capture(block, /<h2[^>]*>([\s\S]*?)<\/h2>/i),
    snippet: capture(block, /<p[^>]*>([\s\S]*?)<\/p>/i)
  }));
  return uniqueItems(items);
}

export function parseBaiduPage(html) {
  const blocks = html.match(/<div class="(?:result|c-container)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi) || [];
  const items = blocks.map((block) => ({
    url: normalizeResultUrl(extractFirstHref(block), "baidu"),
    title: capture(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i),
    snippet: capture(block, /<(?:div|span)[^>]+(?:c-abstract|content-right_8Zs40|c-span-last)[^>]*>([\s\S]*?)<\/(?:div|span)>/i)
  }));
  return uniqueItems(items);
}
