import { DEFAULT_SETTINGS, mergeSettings } from "../shared/settings.js";
import { PROVIDER_PRESETS } from "../shared/providers.js";

const UI_COPY = {
  zh: {
    page_title: "关键词云设置",
    page_hint: "可选 LLM 分析（优先）或本地词频。支持自定义 OpenAI 兼容接口，也支持本地免费 Ollama。",
    keyword_mode: "关键词模式",
    keyword_mode_llm_first: "LLM 优先（失败自动回退本地）",
    keyword_mode_local: "仅本地算法",
    llm_provider: "LLM 提供方",
    panel_language: "面板语言",
    endpoint: "Endpoint",
    endpoint_placeholder: "https://api.openai.com/v1/chat/completions",
    endpoint_hint: "选择预设厂商时会自动填充 endpoint；仅在私有网关/兼容接口时手动填写。",
    model: "Model",
    model_placeholder: "gpt-4o-mini / qwen2.5:7b-instruct",
    api_key: "API Key（Ollama 可留空）",
    api_key_placeholder: "sk-...",
    keywords_per_doc: "单篇文章关键词数量",
    keywords_per_doc_5: "5 个",
    keywords_per_doc_10: "10 个",
    search_pages: "抓取页数",
    search_pages_1: "1 页",
    search_pages_5: "5 页",
    search_pages_10: "10 页",
    keyword_limit: "关键词上限",
    min_len: "最小词长",
    save: "保存设置",
    saved: "已保存。刷新搜索页后生效。"
  },
  en: {
    page_title: "Keyword Cloud Settings",
    page_hint: "Choose LLM-first extraction or local keyword extraction. Supports custom OpenAI-compatible APIs and free local Ollama.",
    keyword_mode: "Keyword Mode",
    keyword_mode_llm_first: "LLM first (fallback to local)",
    keyword_mode_local: "Local only",
    llm_provider: "LLM Provider",
    panel_language: "Panel Language",
    endpoint: "Endpoint",
    endpoint_placeholder: "https://api.openai.com/v1/chat/completions",
    endpoint_hint: "Preset providers auto-fill the endpoint. Only edit it for private gateways or compatible proxy APIs.",
    model: "Model",
    model_placeholder: "gpt-4o-mini / qwen2.5:7b-instruct",
    api_key: "API Key (optional for Ollama)",
    api_key_placeholder: "sk-...",
    keywords_per_doc: "Keywords per document",
    keywords_per_doc_5: "5 keywords",
    keywords_per_doc_10: "10 keywords",
    search_pages: "Search pages to fetch",
    search_pages_1: "1 page",
    search_pages_5: "5 pages",
    search_pages_10: "10 pages",
    keyword_limit: "Keyword limit",
    min_len: "Minimum token length",
    save: "Save Settings",
    saved: "Saved. Refresh search pages to apply."
  },
  ja: {
    page_title: "キーワードクラウド設定",
    page_hint: "LLM優先またはローカル抽出を選べます。OpenAI互換APIと無料のローカル Ollama に対応しています。",
    keyword_mode: "キーワードモード",
    keyword_mode_llm_first: "LLM優先（失敗時はローカルへフォールバック）",
    keyword_mode_local: "ローカルのみ",
    llm_provider: "LLM プロバイダー",
    panel_language: "パネル言語",
    endpoint: "Endpoint",
    endpoint_placeholder: "https://api.openai.com/v1/chat/completions",
    endpoint_hint: "プリセットを選ぶと endpoint は自動入力されます。非公開ゲートウェイや互換APIのときだけ手動入力してください。",
    model: "Model",
    model_placeholder: "gpt-4o-mini / qwen2.5:7b-instruct",
    api_key: "API Key（Ollama は空欄可）",
    api_key_placeholder: "sk-...",
    keywords_per_doc: "記事ごとのキーワード数",
    keywords_per_doc_5: "5 個",
    keywords_per_doc_10: "10 個",
    search_pages: "取得ページ数",
    search_pages_1: "1 ページ",
    search_pages_5: "5 ページ",
    search_pages_10: "10 ページ",
    keyword_limit: "キーワード上限",
    min_len: "最小語長",
    save: "設定を保存",
    saved: "保存しました。検索ページを更新すると反映されます。"
  },
  ko: {
    page_title: "키워드 클라우드 설정",
    page_hint: "LLM 우선 분석 또는 로컬 추출을 선택할 수 있습니다. OpenAI 호환 API와 무료 로컬 Ollama를 지원합니다.",
    keyword_mode: "키워드 모드",
    keyword_mode_llm_first: "LLM 우선 (실패 시 로컬로 대체)",
    keyword_mode_local: "로컬만 사용",
    llm_provider: "LLM 공급자",
    panel_language: "패널 언어",
    endpoint: "Endpoint",
    endpoint_placeholder: "https://api.openai.com/v1/chat/completions",
    endpoint_hint: "사전 설정 공급자를 선택하면 endpoint가 자동 입력됩니다. 개인 게이트웨이 또는 호환 API에서만 직접 수정하세요.",
    model: "Model",
    model_placeholder: "gpt-4o-mini / qwen2.5:7b-instruct",
    api_key: "API Key (Ollama는 비워도 됨)",
    api_key_placeholder: "sk-...",
    keywords_per_doc: "문서당 키워드 수",
    keywords_per_doc_5: "5개",
    keywords_per_doc_10: "10개",
    search_pages: "가져올 검색 페이지 수",
    search_pages_1: "1페이지",
    search_pages_5: "5페이지",
    search_pages_10: "10페이지",
    keyword_limit: "키워드 상한",
    min_len: "최소 토큰 길이",
    save: "설정 저장",
    saved: "저장되었습니다. 검색 페이지를 새로고침하면 적용됩니다."
  },
  es: {
    page_title: "Configuracion de nube de palabras",
    page_hint: "Puedes elegir analisis con prioridad LLM o extraccion local. Compatible con APIs OpenAI y con Ollama local gratuito.",
    keyword_mode: "Modo de palabras clave",
    keyword_mode_llm_first: "LLM primero (con respaldo local)",
    keyword_mode_local: "Solo local",
    llm_provider: "Proveedor LLM",
    panel_language: "Idioma del panel",
    endpoint: "Endpoint",
    endpoint_placeholder: "https://api.openai.com/v1/chat/completions",
    endpoint_hint: "Los proveedores predefinidos rellenan el endpoint automaticamente. Solo cambialo si usas un gateway privado o API compatible.",
    model: "Model",
    model_placeholder: "gpt-4o-mini / qwen2.5:7b-instruct",
    api_key: "API Key (opcional para Ollama)",
    api_key_placeholder: "sk-...",
    keywords_per_doc: "Palabras clave por documento",
    keywords_per_doc_5: "5 palabras",
    keywords_per_doc_10: "10 palabras",
    search_pages: "Paginas de busqueda",
    search_pages_1: "1 pagina",
    search_pages_5: "5 paginas",
    search_pages_10: "10 paginas",
    keyword_limit: "Limite de palabras clave",
    min_len: "Longitud minima del token",
    save: "Guardar configuracion",
    saved: "Guardado. Recarga las paginas de busqueda para aplicar."
  }
};

const ELS = {
  keywordMode: document.getElementById("keywordMode"),
  llmProvider: document.getElementById("llmProvider"),
  panelLanguage: document.getElementById("panelLanguage"),
  llmEndpoint: document.getElementById("llmEndpoint"),
  llmModel: document.getElementById("llmModel"),
  llmApiKey: document.getElementById("llmApiKey"),
  keywordsPerDoc: document.getElementById("keywordsPerDoc"),
  searchPages: document.getElementById("searchPages"),
  keywordLimit: document.getElementById("keywordLimit"),
  minLen: document.getElementById("minLen"),
  save: document.getElementById("save"),
  status: document.getElementById("status")
};

init();

function init() {
  loadSettings();
  ELS.llmProvider.addEventListener("change", onProviderChanged);
  ELS.panelLanguage.addEventListener("change", onPanelLanguageChanged);
  ELS.save.addEventListener("click", saveSettings);
}

function onProviderChanged() {
  const provider = ELS.llmProvider.value;
  const preset = PROVIDER_PRESETS[provider];
  if (!preset) {
    return;
  }
  if (provider === "openai_compatible") {
    return;
  }
  ELS.llmEndpoint.value = preset.endpoint;
  if (!ELS.llmModel.value || ELS.llmModel.value === DEFAULT_SETTINGS.llmModel) {
    ELS.llmModel.value = preset.model;
  }
}

function loadSettings() {
  chrome.storage.local.get(["kwcloud_settings"], (result) => {
    const s = mergeSettings(result.kwcloud_settings);
    ELS.keywordMode.value = s.keywordMode;
    ELS.llmProvider.value = PROVIDER_PRESETS[s.llmProvider] ? s.llmProvider : "openai_compatible";
    ELS.panelLanguage.value = s.panelLanguage || s.language || "zh";
    ELS.llmEndpoint.value = s.llmEndpoint;
    ELS.llmModel.value = s.llmModel;
    ELS.llmApiKey.value = s.llmApiKey;
    ELS.keywordsPerDoc.value = String(s.keywordsPerDoc === 10 ? 10 : 5);
    ELS.searchPages.value = String(s.searchPages === 1 || s.searchPages === 10 ? s.searchPages : 5);
    ELS.keywordLimit.value = String(Math.max(10, Math.min(200, Number(s.keywordLimit || 40))));
    ELS.minLen.value = String(s.minLen);
    applyTranslations(ELS.panelLanguage.value);
    if (!ELS.llmEndpoint.value) {
      onProviderChanged();
    }
  });
}

function onPanelLanguageChanged() {
  applyTranslations(ELS.panelLanguage.value || "en");
}

function saveSettings() {
  const data = mergeSettings({
    keywordMode: ELS.keywordMode.value,
    llmProvider: ELS.llmProvider.value,
    panelLanguage: ELS.panelLanguage.value || "zh",
    llmEndpoint: ELS.llmEndpoint.value.trim(),
    llmModel: ELS.llmModel.value.trim(),
    llmApiKey: ELS.llmApiKey.value.trim(),
    keywordsPerDoc: Number(ELS.keywordsPerDoc.value) === 10 ? 10 : 5,
    searchPages: Number(ELS.searchPages.value) === 1 ? 1 : Number(ELS.searchPages.value) === 10 ? 10 : 5,
    keywordLimit: Math.max(10, Math.min(200, Number(ELS.keywordLimit.value || DEFAULT_SETTINGS.keywordLimit))),
    minLen: Math.max(1, Math.min(6, Number(ELS.minLen.value || DEFAULT_SETTINGS.minLen)))
  });

  chrome.storage.local.set({ kwcloud_settings: data }, () => {
    const copy = getCopy(data.panelLanguage);
    ELS.status.textContent = copy.saved;
    setTimeout(() => {
      ELS.status.textContent = "";
    }, 1800);
  });
}

function applyTranslations(lang) {
  const copy = getCopy(lang);
  document.documentElement.lang = normalizeUiLang(lang);

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key && copy[key]) {
      node.textContent = copy[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (key && copy[key]) {
      node.setAttribute("placeholder", copy[key]);
    }
  });

  if (copy.page_title) {
    document.title = copy.page_title;
  }
}

function getCopy(lang) {
  return UI_COPY[normalizeUiLang(lang)] || UI_COPY.en;
}

function normalizeUiLang(value) {
  const raw = String(value || "en").toLowerCase();
  if (raw.startsWith("zh")) return "zh";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("es")) return "es";
  return "en";
}
