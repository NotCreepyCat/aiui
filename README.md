# AI UI

Minimalist, local-first AI chat PWA. No backend — talks directly to [OpenRouter](https://openrouter.ai) from the browser. Your API key, chats, and settings live only in your browser's IndexedDB.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview   # serve the production build locally
```

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. If the repo is **not** `username.github.io` (i.e. it'll be served at `username.github.io/repo-name`), set `base: '/repo-name/'` in `vite.config.ts`.
3. In the repo settings, set **Pages → Source** to **GitHub Actions**.
4. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically.

## Notes

- Model/provider pricing and lists come live from OpenRouter's public API — no key required to browse them.
- Token counts used for trimming chat history to fit the context window are an approximation (~4 chars/token), not an exact tokenizer count.
- The service worker precaches the app shell for offline opening; requests to OpenRouter always go to the network.
