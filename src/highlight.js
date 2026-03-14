const PARAM_KEY = "__kwcloud";
const BAR_ID = "__kwcloud_bar";
const MARK_CLASS = "__kwcloud_mark";
const ACTIVE_CLASS = "__kwcloud_mark_active";

let state = {
  term: "",
  marks: [],
  index: 0,
  indicator: null
};

initHighlight();

function initHighlight() {
  const term = readTermFromHash();
  if (!term || isSearchResultPage()) {
    return;
  }

  waitForBody().then(() => {
    state.term = term;
    state.marks = highlightAll(term);
    state.index = 0;
    showSearchBar(term);
    if (state.marks.length > 0) {
      activate(0);
    } else {
      updateIndicator();
    }
  });
}

function readTermFromHash() {
  const hash = window.location.hash || "";
  if (!hash.includes(PARAM_KEY)) {
    return "";
  }
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw.replace(/&/g, "&"));
  const term = params.get(PARAM_KEY) || "";
  try {
    return decodeURIComponent(term).trim();
  } catch (_error) {
    return term.trim();
  }
}

function isSearchResultPage() {
  const host = window.location.hostname;
  const path = window.location.pathname;
  if (host.includes("google.") && path.startsWith("/search")) {
    return true;
  }
  if (host.includes("bing.com") && path.startsWith("/search")) {
    return true;
  }
  if (host.includes("baidu.com") && path.startsWith("/s")) {
    return true;
  }
  return false;
}

function waitForBody() {
  if (document.body) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (document.body) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}

function highlightAll(term) {
  injectMarkStyle();
  const escaped = escapeRegExp(term);
  if (!escaped) {
    return [];
  }
  const regex = new RegExp(escaped, "ig");
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      const tag = parent.tagName;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest(`#${BAR_ID}`)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  const marks = [];
  nodes.forEach((node) => {
    const text = node.nodeValue || "";
    regex.lastIndex = 0;
    if (!regex.test(text)) {
      return;
    }
    regex.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > last) {
        frag.appendChild(document.createTextNode(text.slice(last, start)));
      }
      const mark = document.createElement("mark");
      mark.className = MARK_CLASS;
      mark.textContent = text.slice(start, end);
      frag.appendChild(mark);
      marks.push(mark);
      last = end;
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    node.parentNode?.replaceChild(frag, node);
  });

  return marks;
}

function showSearchBar(term) {
  if (document.getElementById(BAR_ID)) {
    return;
  }
  const bar = document.createElement("div");
  bar.id = BAR_ID;
  bar.style.cssText = [
    "position:fixed",
    "top:12px",
    "right:12px",
    "z-index:2147483647",
    "background:#fff",
    "border:1px solid #d1d5db",
    "box-shadow:0 8px 24px rgba(0,0,0,.12)",
    "border-radius:10px",
    "padding:8px",
    "display:flex",
    "gap:6px",
    "align-items:center",
    "font:12px/1.2 sans-serif"
  ].join(";");

  const input = document.createElement("input");
  input.value = term;
  input.style.cssText = "width:180px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;";
  input.title = "关键词（可复制）";
  input.onchange = () => {
    clearMarks();
    state.term = input.value.trim();
    state.marks = highlightAll(state.term);
    state.index = 0;
    if (state.marks.length > 0) {
      activate(0);
    } else {
      updateIndicator();
    }
  };

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "上一个";
  prevBtn.style.cssText = buttonStyle();
  prevBtn.onclick = () => activate(state.index - 1);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "下一个";
  nextBtn.style.cssText = buttonStyle();
  nextBtn.onclick = () => activate(state.index + 1);

  const indicator = document.createElement("span");
  indicator.style.cssText = "min-width:42px;text-align:center;color:#374151;font-weight:600;";
  state.indicator = indicator;

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "复制";
  copyBtn.style.cssText = buttonStyle();
  copyBtn.onclick = async () => {
    const value = input.value.trim();
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      copyBtn.textContent = "已复制";
      setTimeout(() => {
        copyBtn.textContent = "复制";
      }, 1000);
    } catch (_error) {
      input.select();
      document.execCommand("copy");
    }
  };

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "关闭";
  closeBtn.style.cssText = buttonStyle();
  closeBtn.onclick = () => {
    clearMarks();
    bar.remove();
  };

  bar.append(input, prevBtn, nextBtn, indicator, copyBtn, closeBtn);
  document.body.appendChild(bar);
  updateIndicator();
}

function activate(nextIndex) {
  if (!state.marks.length) {
    updateIndicator();
    return;
  }
  const total = state.marks.length;
  state.index = ((nextIndex % total) + total) % total;
  state.marks.forEach((el) => el.classList.remove(ACTIVE_CLASS));
  const current = state.marks[state.index];
  current.classList.add(ACTIVE_CLASS);
  current.scrollIntoView({ behavior: "smooth", block: "center" });
  updateIndicator();
}

function updateIndicator() {
  if (!state.indicator) {
    return;
  }
  const total = state.marks.length;
  if (!total) {
    state.indicator.textContent = "0/0";
    return;
  }
  state.indicator.textContent = `${state.index + 1}/${total}`;
}

function clearMarks() {
  document.querySelectorAll(`.${MARK_CLASS}`).forEach((mark) => {
    const text = document.createTextNode(mark.textContent || "");
    mark.replaceWith(text);
  });
  state.marks = [];
  state.index = 0;
}

function buttonStyle() {
  return "padding:6px 8px;border:1px solid #d1d5db;background:#fafafa;border-radius:6px;cursor:pointer;";
}

function injectMarkStyle() {
  if (document.getElementById("__kwcloud_style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "__kwcloud_style";
  style.textContent = `
    .${MARK_CLASS} { background: #fde68a; color: #111827; border-radius: 2px; padding: 0 2px; }
    .${MARK_CLASS}.${ACTIVE_CLASS} { background: #f59e0b; color: #111827; }
  `;
  document.head.appendChild(style);
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
