export const DEFAULT_SETTINGS = {
  keywordMode: "llm_first",
  llmProvider: "ollama",
  llmEndpoint: "http://127.0.0.1:11434/v1/chat/completions",
  llmModel: "qwen2.5:7b-instruct",
  llmApiKey: "",
  panelLanguage: "zh",
  searchPages: 5,
  keywordsPerDoc: 5,
  keywordLimit: 40,
  minLen: 2
};

export function mergeSettings(raw = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...raw
  };
}
