export function detectEngine(url) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("google.")) {
      return "google";
    }
    if (host.includes("bing.com")) {
      return "bing";
    }
    if (host.includes("baidu.com")) {
      return "baidu";
    }
    return null;
  } catch (_error) {
    return null;
  }
}

export function extractQuery(url, engine) {
  const u = new URL(url);
  if (engine === "google" || engine === "bing") {
    return u.searchParams.get("q") || "";
  }
  if (engine === "baidu") {
    return u.searchParams.get("wd") || u.searchParams.get("word") || "";
  }
  return "";
}

export function buildPageUrls(engine, currentUrl, pages = 3) {
  const url = new URL(currentUrl);
  const output = [];

  for (let i = 0; i < pages; i += 1) {
    const next = new URL(url.toString());

    if (engine === "google") {
      next.searchParams.set("start", String(i * 10));
      next.searchParams.set("num", "10");
    } else if (engine === "bing") {
      next.searchParams.set("first", String(i * 10 + 1));
      next.searchParams.set("count", "10");
    } else if (engine === "baidu") {
      next.searchParams.set("pn", String(i * 10));
      next.searchParams.set("rn", "10");
    }

    output.push(next.toString());
  }

  return output;
}
