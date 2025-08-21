# Stock Dashboard (React + Tailwind + Bun)

A simple stock dashboard that fetches live quotes and displays them in a responsive Tailwind table. Built with React and served by Bun with a small API proxy.

Core features:
- Fetches and displays stocks in a table (symbol, price, change %).
- Responsive Tailwind styling.
- Loading and error states.
- Search and sortable columns.

Optional enhancements can be added (charts, etc.).

## Setup

1) Install dependencies:

```bash
bun install
```

2) Configure environment:

Create a `.env` file (or set env var when deploying) with your TwelveData API key. Falls back to the public `demo` key if not provided.

```bash
# .env
API_KEY=your_twelvedata_api_key
```

3) Start development server:

```bash
bun dev
```

This serves the app at the URL Bun prints (e.g., http://localhost:3000) and enables HMR.

4) Production run:

```bash
bun start
```

5) Build static assets (if needed):

```bash
bun run build.ts
```

## API
The Bun server exposes a proxy endpoint to avoid exposing your API key in the browser and to handle CORS:

- GET `/api/stocks?symbols=AAPL,MSFT,GOOGL` returns an array of `{ symbol, price, change_percent, updated }`.

It uses TwelveData under the hood with `process.env.API_KEY || 'demo'`.

## Deployment

### Vercel (recommended)
This repo includes `vercel.json` and serverless functions in `api/`. Frontend is built to `dist` and deployed as static assets; API lives under `/api/*`.

Steps:
1) Install Vercel CLI and login: `npm i -g vercel && vercel login`
2) Set env var: `vercel env add API_KEY` (paste your TwelveData key). You can also set it in the dashboard.
3) Deploy: `vercel --prod`

Vercel will run `bun install && bun run build.ts` and serve `dist/` as the site with SPA fallback, plus `/api/stocks` and `/api/series` serverless endpoints.

### Other hosts
- Netlify/Render/Fly: You can run `bun start` for a long-lived server instead of serverless; or deploy static files and move APIs to provider functions.
- GitHub Pages: Not suitable for serverless API unless you switch to demo-only client-side fetches or host the API separately.

## What’s included beyond core requirements
- Loading spinner while fetching data.
- Error handling and user message when API fails.
- Search filter and sortable columns.
