export const PROVIDER_PRESETS = {
  ollama: {
    label: "Ollama（本地免费）",
    endpoint: "http://127.0.0.1:11434/v1/chat/completions",
    model: "qwen2.5:7b-instruct"
  },
  openai: {
    label: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini"
  },
  openrouter: {
    label: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4o-mini"
  },
  deepseek: {
    label: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat"
  },
  groq: {
    label: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile"
  },
  xai: {
    label: "xAI",
    endpoint: "https://api.x.ai/v1/chat/completions",
    model: "grok-3-mini"
  },
  together: {
    label: "Together AI",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo"
  },
  fireworks: {
    label: "Fireworks",
    endpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    model: "accounts/fireworks/models/llama-v3p1-70b-instruct"
  },
  siliconflow: {
    label: "SiliconFlow",
    endpoint: "https://api.siliconflow.cn/v1/chat/completions",
    model: "Qwen/Qwen2.5-72B-Instruct"
  },
  moonshot: {
    label: "Moonshot",
    endpoint: "https://api.moonshot.cn/v1/chat/completions",
    model: "moonshot-v1-8k"
  },
  openai_compatible: {
    label: "OpenAI 兼容 API（自填）",
    endpoint: "",
    model: ""
  }
};
