# CausalFunnel Analytics

A minimal user-analytics platform: a JS tracker, a Node/Express/Mongo backend, and a Next.js dashboard with Sessions and Heatmap views. Built as a take-home for the CausalFunnel Full Stack Engineer role.

## Live demo

- Dashboard: `https://<your-vercel-url>`
- Demo storefront (instrumented): `https://<your-render-url>/demo/`
- Backend API: `https://<your-render-url>/api`

> Update these links once deployed.

## Architecture

```
┌────────────────┐   POST /api/events    ┌──────────────────┐
│ demo pages +   │ ────────────────────▶ │ Express API      │
│ tracker.js     │                       │ + Mongoose       │
└────────────────┘                       └──────┬───────────┘
                                                │
                                                ▼
                                          MongoDB Atlas
                                                ▲
                                                │ GET /api/...
┌──────────────────────┐                        │
│ Next.js dashboard    │ ───────────────────────┘
└──────────────────────┘
```

## Tech stack

| Layer      | Stack |
|---|---|
| Tracker    | TypeScript → UMD bundle via esbuild, no framework |
| Backend    | Node 20, Express, Mongoose, Zod, pino, helmet |
| Frontend   | Next.js 16 (App Router), TanStack Query v5, Tailwind, shadcn/ui, recharts, heatmap.js |
| Database   | MongoDB 7 (Atlas in prod, local via docker-compose) |
| Tests      | Jest + supertest (backend), Vitest + jsdom (tracker), Playwright (dashboard smoke) |
| Hosting    | Vercel (dashboard), Render (backend), Atlas (DB) |

## Local setup

```bash
git clone https://github.com/<you>/causalfunnel-analytics.git
cd causalfunnel-analytics
cp .env.example .env

docker compose up -d mongo
npm install
npm run build -w @causalfunnel/tracker   # builds dist/tracker.js
npm run dev                              # runs backend + dashboard in parallel
```

- Dashboard: http://localhost:3000
- Backend: http://localhost:4000
- Demo storefront: http://localhost:4000/demo/

> On Windows, `npm test` works in PowerShell, cmd, or Git Bash (handled via `cross-env`).

## Environment variables

| Var                  | Where    | Purpose |
|---|---|---|
| `MONGODB_URI`        | backend  | Mongo connection string |
| `PORT`               | backend  | HTTP port (default 4000) |
| `CORS_ORIGINS`       | backend  | Comma-separated allowed origins |
| `NEXT_PUBLIC_API_URL`| dashboard| Backend base URL the FE talks to |

## API reference

| Method | Path | Notes |
|---|---|---|
| POST | `/api/events` | Body: single event or array (max 100). Rate-limited 100/min/IP. Accepts both `application/json` and `text/plain` (sendBeacon compatibility). |
| GET  | `/api/sessions` | Query: `limit`, `offset`, `search`. Returns aggregated sessions. |
| GET  | `/api/sessions/:id/events` | Ordered events for the session. |
| GET  | `/api/heatmap?path=...` | Click points for a page (capped at 5000, sampled if exceeded). |
| GET  | `/api/pages` | Distinct paths with click counts. |
| GET  | `/healthz` | Liveness — returns `{ ok, db: 'up'|'down' }`. |
| GET  | `/tracker.js` | Compiled UMD tracker bundle. |
| GET  | `/demo/*` | Demo storefront pages. |

## Tests

```bash
npm test                                  # all packages
npm test -w @causalfunnel/backend         # 11 backend tests (Jest + in-memory mongo)
npm test -w @causalfunnel/tracker         # 9 tracker tests (Vitest + jsdom)
npm run e2e -w @causalfunnel/dashboard    # Playwright smoke (needs running stack)
```

Backend tests run against an in-memory MongoDB via `mongodb-memory-server` — no live DB required.

## Deployment

**MongoDB Atlas** — Create a free M0 cluster, add a database user, allowlist `0.0.0.0/0` for the demo (note in trade-offs below), copy the connection URI.

**Backend on Render** — New web service from this repo; build via `packages/backend/Dockerfile`; root context is the repo root. Env vars: `MONGODB_URI`, `CORS_ORIGINS=https://<your-vercel-url>`, `NODE_ENV=production`. A `render.yaml` is included for reference.

**Dashboard on Vercel** — Import the repo; set root directory to `packages/dashboard`; env var `NEXT_PUBLIC_API_URL=https://<your-render-url>`. Build command and output directory use Vercel's Next.js defaults.

## Assumptions and trade-offs

- **No dashboard auth.** Out of scope per the assignment. In production the dashboard would require auth (and likely tenancy keys for the tracker).
- **Polling, not WebSockets.** Sessions list polls every 10s. WebSockets/SSE are listed in "what I'd do next."
- **Session ID rotates after 30 min inactivity.** A common heuristic; configurable in real deployments.
- **CORS is open on `/api/events`.** That's the right call for an analytics endpoint hit from arbitrary sites; the dashboard endpoints are similarly open here purely for the demo. Production would restrict `/api/sessions*` and `/api/heatmap` to the dashboard origin.
- **Express body parser accepts `text/plain`** so `navigator.sendBeacon` can ship JSON without a custom Content-Type (saves a CORS preflight).
- **Atlas allowlist `0.0.0.0/0`.** Convenience for the demo. Production would use Atlas private peering or a static-IP Render plan.
- **Heatmap points capped at 5000** server-side via `$sample`. Keeps the canvas responsive and the payload reasonable.
- **No event-loss safety net.** If the user closes the tab before the 500ms debounce or beacon flush, those events are lost. In production I'd back the queue with IndexedDB.
- **No PII.** Selectors are structural; no innerText is captured. Tracker stores only the session UUID in localStorage.
- **Render free tier sleeps** after 15 min idle — first request after a sleep cold-starts (~30s). Listed for transparency.

## What I'd do next

- Real-time updates via WebSockets/SSE.
- IndexedDB-backed offline queue in the tracker with retry on reconnect.
- Sampling and aggregation pipeline on the backend (raw events → rolled-up sessions table) for query speed at scale.
- Role-based dashboard auth with per-project tenancy keys for the tracker.
- GDPR/consent banner integration on the demo site.
- Data retention policy + TTL index on `receivedAt`.

## Repo layout

```
packages/
├─ shared/      Zod schemas + shared types
├─ tracker/     The JS tracker (builds to dist/tracker.js)
├─ backend/     Express + Mongoose API
└─ dashboard/   Next.js 16 dashboard
demo/           3-page mock storefront served by the backend
```
