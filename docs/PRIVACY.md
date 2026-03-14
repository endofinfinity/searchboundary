# Privacy Notes for SearchBoundary

## What the extension processes

- The extension reads search-result metadata (title/snippet/url) from Google, Bing, and Baidu result pages.
- The extension may fetch linked result pages to extract document text for keyword analysis.
- User settings (provider, endpoint, model, API key, panel language, limits) are stored in `chrome.storage.local`.

## Cloud mode vs local mode

- Local mode: keyword extraction runs locally in the extension.
- Cloud mode: extracted document text and prompts are sent to the user-selected API endpoint for keyword extraction.

## What is not collected by default

- No built-in telemetry, analytics, or tracking endpoint is used by this project.
- No account/login system is included.

## User responsibility before publishing

- In Chrome Web Store privacy disclosures, clearly state that page content may be processed and may be transmitted to a third-party LLM endpoint when cloud mode is enabled.
- Explain data purpose: keyword extraction and visualization.
- Explain where data is stored locally (`chrome.storage.local`) and that users can remove extension data by uninstalling or clearing extension storage.
