const PANEL_ID = "kw-cloud-sidebar-panel";
let currentLang = "zh";
let lastAnalysisKey = "";
let watchStarted = false;
let userClosedPanel = false;
let analysisSerial = 0;

init();
startRouteWatcher();

async function init() {
  const engine = detectEngine(window.location.href);
  const query = extractQuery(window.location.href, engine);
  const pageKey = `${engine || "none"}|${query || ""}|${window.location.pathname}|${window.location.search}`;
  const panelExists = Boolean(document.getElementById(PANEL_ID));
  if (pageKey === lastAnalysisKey && panelExists) {
    return;
  }

  const startedAt = performance.now();
  if (!engine) {
    return;
  }

  if (!query) {
    return;
  }
  const runId = ++analysisSerial;
  lastAnalysisKey = pageKey;

  const panel = mountPanel("zh");
  panel.style.display = "";
  renderLoading(panel);

  try {
    const prefetchedPages = engine === "baidu" ? await prefetchBaiduPages(window.location.href) : [];
    const pageItems = collectSearchItemsFromDom(engine);
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_SEARCH",
      payload: {
        url: window.location.href,
        query,
        prefetchedPages,
        pageItems
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Analyze failed.");
    }
    if (runId !== analysisSerial) {
      return;
    }
    currentLang = normalizeUiLang(response.payload?.panelLanguage || "zh");
    refreshStaticTexts(panel, currentLang);

    const elapsedMs = Math.max(0, Math.round(performance.now() - startedAt));
    await renderWordCloud(panel, response.payload.keywords, response.payload, elapsedMs);
  } catch (error) {
    renderError(panel, error?.message || "加载失败，请刷新重试。");
  }
}

function mountPanel(lang) {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    return existing;
  }
  const t = i18n(lang);

  const panel = document.createElement("aside");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="kw-card">
      <div class="kw-head">
        <h3 data-role="title">${t.title}</h3>
        <div class="kw-actions">
          <button class="kw-refresh" type="button">${t.refresh}</button>
          <button class="kw-close" type="button" aria-label="${t.close}">${t.close}</button>
        </div>
      </div>
      <div class="kw-subtitle" data-role="subtitle">${t.subtitle}</div>
      <div class="kw-cloud" data-role="cloud"></div>
      <div class="kw-meta" data-role="meta"></div>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector(".kw-refresh")?.addEventListener("click", () => {
    userClosedPanel = false;
    lastAnalysisKey = "";
    panel.remove();
    init();
  });
  panel.querySelector(".kw-close")?.addEventListener("click", () => {
    userClosedPanel = true;
    panel.remove();
  });

  return panel;
}

function startRouteWatcher() {
  if (watchStarted) {
    return;
  }
  watchStarted = true;
  let previousUrl = window.location.href;
  let previousQuery = extractQuery(previousUrl, detectEngine(previousUrl));

  setInterval(() => {
    const currentUrl = window.location.href;
    const engine = detectEngine(currentUrl);
    const query = extractQuery(currentUrl, engine);
    const panel = document.getElementById(PANEL_ID);

    if (!engine || !query) {
      previousUrl = currentUrl;
      previousQuery = query;
      return;
    }

    const urlChanged = currentUrl !== previousUrl;
    const queryChanged = query !== previousQuery;

    if (urlChanged || queryChanged) {
      userClosedPanel = false;
      previousUrl = currentUrl;
      previousQuery = query;
      lastAnalysisKey = "";
      init();
      return;
    }

    if (!panel && !userClosedPanel) {
      init();
    }
  }, 900);
}

function renderLoading(panel) {
  const cloud = panel.querySelector('[data-role="cloud"]');
  const meta = panel.querySelector('[data-role="meta"]');
  const t = i18n(currentLang);
  if (cloud) {
    cloud.innerHTML = `<div class="kw-loading">${t.loading}</div>`;
  }
  if (meta) {
    meta.textContent = "";
  }
}

async function renderWordCloud(panel, keywords, payload, elapsedMs = 0) {
  const cloud = panel.querySelector('[data-role="cloud"]');
  const meta = panel.querySelector('[data-role="meta"]');
  const t = i18n(currentLang);
  if (!cloud) {
    return;
  }

  if (!keywords?.length) {
    cloud.innerHTML = `<div class="kw-empty">${t.noKeywords}</div>`;
    return;
  }

  const max = keywords[0].count || 1;
  const min = keywords[keywords.length - 1].count || 1;
  const spread = Math.max(1, max - min);

  renderLooseCloud(cloud, keywords, min, spread);

  if (meta) {
    const docsUsed = Number(payload?.docsUsed || 0);
    const docsAttempted = Number(payload?.docsAttempted || 0);
    const seconds = (elapsedMs / 1000).toFixed(2);
    const callSource = payload?.callSource || "本地";
    meta.textContent = `${t.call}${mapCallSource(callSource, t)} | ${t.docs}${docsUsed}/${docsAttempted} | ${t.elapsed}${seconds}s`;
  }
}

function renderError(panel, message) {
  const cloud = panel.querySelector('[data-role="cloud"]');
  const t = i18n(currentLang);
  if (cloud) {
    cloud.innerHTML = `<div class="kw-error">${escapeHtml(message)}</div>`;
  }
  const meta = panel.querySelector('[data-role="meta"]');
  if (meta) {
    meta.textContent = t.reloadHint;
  }
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLooseCloud(container, keywords, min, spread) {
  container.innerHTML = "";
  container.classList.add("kw-cloud-flow");

  keywords.forEach((kw, index) => {
    const weight = (kw.count - min) / spread;
    const size = Math.round(12 + weight * 12);
    const hue = (index * 31) % 360;
    const jitterY = Math.floor(Math.random() * 9) - 4;
    const jitterX = Math.floor(Math.random() * 7) - 3;
    const rotate = index % 14 === 0 ? -3 : index % 17 === 0 ? 3 : 0;
    const text = trimDisplayTerm(kw.term);

    const tag = document.createElement("span");
    tag.className = "kw-tag";
    tag.style.fontSize = `${size}px`;
    tag.style.color = `hsl(${hue} 68% 33%)`;
    tag.style.transform = `translate(${jitterX}px, ${jitterY}px) rotate(${rotate}deg)`;
    tag.style.transformOrigin = "center center";
    tag.style.margin = `${4 + Math.floor(Math.random() * 8)}px ${6 + Math.floor(Math.random() * 10)}px`;

    const link = document.createElement("a");
    link.className = "kw-tag-link";
    link.textContent = text;
    link.href = buildKeywordJumpUrl(kw.url);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (!kw.url) {
      link.addEventListener("click", (e) => e.preventDefault());
      link.classList.add("is-disabled");
    }

    tag.appendChild(link);
    container.appendChild(tag);
  });
}

function normalizeUiLang(lang) {
  const allowed = new Set([
    "zh", "en", "ja", "ko", "es", "fr", "de", "it", "pt", "ru",
    "ar", "hi", "tr", "vi", "th", "id", "nl", "pl", "sv", "he"
  ]);
  return allowed.has(lang) ? lang : "zh";
}

function refreshStaticTexts(panel, lang) {
  const t = i18n(lang);
  const title = panel.querySelector('[data-role="title"]');
  const subtitle = panel.querySelector('[data-role="subtitle"]');
  const refreshBtn = panel.querySelector(".kw-refresh");
  const closeBtn = panel.querySelector(".kw-close");
  if (title) title.textContent = t.title;
  if (subtitle) subtitle.textContent = t.subtitle;
  if (refreshBtn) refreshBtn.textContent = t.refresh;
  if (closeBtn) {
    closeBtn.textContent = t.close;
    closeBtn.setAttribute("aria-label", t.close);
  }
}

function mapCallSource(callSource, t) {
  return callSource === "云端API" ? t.cloud : t.local;
}

function i18n(lang) {
  const L = normalizeUiLang(lang);
  const dict = {
    zh: { title: "关键词云图", refresh: "刷新", close: "关闭", subtitle: "按设置分析搜索结果", loading: "正在提取关键词...", noKeywords: "未提取到关键词", call: "调用：", docs: "正文 ", elapsed: "耗时 ", cloud: "云端API", local: "本地", reloadHint: "如果报错未变化，请到 chrome://extensions 点击该扩展“重新加载”。" },
    en: { title: "Keyword Cloud", refresh: "Refresh", close: "Close", subtitle: "Analyze search results by settings", loading: "Extracting keywords...", noKeywords: "No keywords found", call: "Call: ", docs: "Docs ", elapsed: "Elapsed ", cloud: "Cloud API", local: "Local", reloadHint: "If unchanged, reload this extension at chrome://extensions." },
    ja: { title: "キーワードクラウド", refresh: "更新", close: "閉じる", subtitle: "設定に基づいて検索結果を分析", loading: "キーワードを抽出中...", noKeywords: "キーワードが見つかりません", call: "呼び出し: ", docs: "文書 ", elapsed: "所要時間 ", cloud: "クラウドAPI", local: "ローカル", reloadHint: "変化がない場合は chrome://extensions で再読み込みしてください。" },
    ko: { title: "키워드 클라우드", refresh: "새로고침", close: "닫기", subtitle: "설정에 따라 검색 결과 분석", loading: "키워드 추출 중...", noKeywords: "키워드를 찾지 못했습니다", call: "호출: ", docs: "문서 ", elapsed: "소요시간 ", cloud: "클라우드API", local: "로컬", reloadHint: "변경이 없으면 chrome://extensions에서 확장을 다시 로드하세요." },
    es: { title: "Nube de Palabras", refresh: "Actualizar", close: "Cerrar", subtitle: "Analizar resultados según la configuración", loading: "Extrayendo palabras clave...", noKeywords: "No se encontraron palabras clave", call: "Llamada: ", docs: "Docs ", elapsed: "Tiempo ", cloud: "API en la nube", local: "Local", reloadHint: "Si no cambia, recarga la extensión en chrome://extensions." }
  };
  return dict[L] || dict.en;
}

function detectEngine(url) {
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

function extractQuery(url, engine) {
  const u = new URL(url);
  if (engine === "google" || engine === "bing") {
    return u.searchParams.get("q") || "";
  }
  if (engine === "baidu") {
    return u.searchParams.get("wd") || u.searchParams.get("word") || "";
  }
  return "";
}

function trimDisplayTerm(term) {
  const t = String(term || "").trim();
  if (!t) {
    return "";
  }
  const hasCjk = /[\u4e00-\u9fff]/.test(t);
  if (hasCjk && t.length > 10) {
    return `${t.slice(0, 10)}…`;
  }
  if (!hasCjk && t.length > 18) {
    return `${t.slice(0, 18)}…`;
  }
  return t;
}

function buildKeywordJumpUrl(url) {
  if (!url) {
    return "#";
  }
  try {
    const u = new URL(url);
    return u.toString();
  } catch (_error) {
    return url;
  }
}

async function prefetchBaiduPages(currentUrl) {
  const pages = await getConfiguredPages();
  const urls = buildPageUrlsForEngine("baidu", currentUrl, pages);
  const htmls = await Promise.all(
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
  return htmls.filter(Boolean);
}

function buildPageUrlsForEngine(engine, currentUrl, pages) {
  const url = new URL(currentUrl);
  const out = [];
  for (let i = 0; i < pages; i += 1) {
    const next = new URL(url.toString());
    if (engine === "baidu") {
      next.searchParams.set("pn", String(i * 10));
      next.searchParams.set("rn", "10");
    }
    out.push(next.toString());
  }
  return out;
}

function getConfiguredPages() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["kwcloud_settings"], (result) => {
      const n = Number(result?.kwcloud_settings?.searchPages);
      if (n === 1 || n === 10) {
        resolve(n);
        return;
      }
      resolve(5);
    });
  });
}

function collectSearchItemsFromDom(engine) {
  if (engine === "bing") {
    return collectBySelectors("#b_results .b_algo", "h2", ".b_caption p");
  }
  if (engine === "baidu") {
    return collectBySelectors("#content_left .result, #content_left .c-container", "h3", ".c-abstract, .c-span-last");
  }
  if (engine === "google") {
    return collectBySelectors("#search .g, #search .MjjYud", "h3", ".VwiC3b");
  }
  return [];
}

function collectBySelectors(itemSelector, titleSelector, snippetSelector) {
  const nodes = document.querySelectorAll(itemSelector);
  const out = [];
  const seen = new Set();
  nodes.forEach((node) => {
    const title = (node.querySelector(titleSelector)?.textContent || "").replace(/\s+/g, " ").trim();
    const snippet = (node.querySelector(snippetSelector)?.textContent || "").replace(/\s+/g, " ").trim();
    const href =
      node.querySelector("a[href]")?.getAttribute("href") ||
      node.querySelector("h2 a[href], h3 a[href]")?.getAttribute("href") ||
      "";
    const url = normalizeResultUrlFromDom(href);
    if (!title || !url) {
      return;
    }
    const key = `${title}|${url}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push({ title, snippet, url });
  });
  return out;
}

function normalizeResultUrlFromDom(url) {
  const u = String(url || "").trim();
  if (!u) {
    return "";
  }
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  if (u.startsWith("/url?")) {
    try {
      const parsed = new URL(`https://www.google.com${u}`);
      return parsed.searchParams.get("q") || "";
    } catch (_error) {
      return "";
    }
  }
  if (u.startsWith("/")) {
    const host = window.location.origin;
    return `${host}${u}`;
  }
  return u;
}
