# CausalFunnel Analytics — Design Spec

**Date:** 2026-05-13
**Context:** Take-home assignment for Full Stack Engineer role at CausalFunnel.
**Submission target:** Strong submission (3–5 days). Hosted, public GitHub repo, README with setup + tech stack + assumptions.

---

## 1. Goal

Build a small full-stack application that tracks user interactions on a webpage and displays them in a dashboard. Meet every requirement in the assignment cleanly, add modest polish (charts, dark mode, hosted demo, tests) to stand out without scope-creep.

## 2. Requirements (from the assignment)

1. **Tracker (client JS):** records `page_view` and `click`; each event carries `session_id`, type, page URL, timestamp; clicks carry `x/y`; sends to backend.
2. **Backend (Node.js):** ingest events, list sessions with counts, fetch events for a session, fetch click data for a page.
3. **Database:** MongoDB.
4. **Dashboard (React/Next.js):** Sessions View (list + drill-down to ordered events), Heatmap View (pick page → see click positions).
5. **Deliverables:** Public GitHub repo, README (setup, stack, assumptions), hosting preferred.

## 3. Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Language | TypeScript end-to-end |
| Backend | Node.js + Express + Mongoose |
| Database | MongoDB Atlas (free M0) |
| Repo layout | Monorepo with npm workspaces (Option A) |
| Heatmap library | `heatmap.js` (true gradient heatmap) |
| Dashboard auth | None — open dashboard; noted in README |
| Demo page | Mock 3-page e-commerce site |
| Hosting | Vercel (dashboard) + Render (backend) + Atlas (DB) |

## 4. Architecture

```
                    ┌──────────────────────┐
  demo/*.html  ◀───▶│  packages/backend    │◀───▶ MongoDB Atlas
  + tracker.js      │  Express + Mongoose  │
                    │  TypeScript          │
                    └──────────▲───────────┘
                               │ HTTPS/JSON
                               │
                    ┌──────────┴───────────┐
                    │  packages/dashboard  │
                    │  Next.js 14 (App)    │
                    │  TanStack Query      │
                    └──────────────────────┘
```

**Repo layout:**

```
causalfunnel-analytics/
├─ packages/
│  ├─ tracker/          # TS → tracker.js (UMD), no framework deps
│  ├─ backend/          # Express + Mongoose + Zod, TS
│  ├─ dashboard/        # Next.js 14 App Router, TS, Tailwind, shadcn/ui
│  └─ shared/           # Zod schemas + TS types shared by tracker + backend
├─ demo/                # static HTML pages served by backend at /demo/*
├─ docker-compose.yml   # local mongo for development
├─ turbo.json           # npm workspaces + turbo for parallel dev
├─ .env.example
└─ README.md
```

## 5. Data model

### `events` collection (Mongoose schema)

```ts
{
  _id: ObjectId,
  sessionId: string,        // UUID v4 from localStorage['cf_session_id']
  type: 'page_view' | 'click',
  url: string,              // full window.location.href
  path: string,             // window.location.pathname (used for heatmap grouping)
  timestamp: Date,          // client-supplied; server rejects if > 5min skew
  receivedAt: Date,         // server-side, source of truth for ordering ties
  // click-only (null for page_view)
  x: number | null,         // clientX (viewport-relative)
  y: number | null,         // clientY
  pageX: number | null,     // pageX (document-relative — survives scroll)
  pageY: number | null,
  viewportW: number | null,
  viewportH: number | null,
  selector: string | null,  // best-effort CSS selector for clicked element
  // context
  userAgent: string,
  referrer: string | null,
}
```

**No separate `sessions` collection.** Sessions are derived via aggregation; this keeps writes single-document and avoids dual-write consistency issues.

**Indexes:**
- `{ sessionId: 1, timestamp: 1 }` — session timeline queries
- `{ path: 1, type: 1 }` — heatmap by page
- `{ receivedAt: -1 }` — recent sessions list

### Shared Zod schemas (`packages/shared/src/events.ts`)

Single source of truth for the event shape. The tracker imports the schema to type its `send` function; the backend imports the same schema to validate incoming payloads. Eliminates client/server drift.

## 6. Tracker SDK (`packages/tracker`)

**Build target:** UMD bundle `tracker.js`, ~3–5 KB minified. No React, no framework. esbuild for the bundle.

**Embedding:**

```html
<script src="https://api.example.com/tracker.js"
        data-endpoint="https://api.example.com/api/events"></script>
```

Auto-initializes on load. No init call required.

**Session ID:**
- Read `localStorage['cf_session_id']`; if absent, generate UUID v4 and persist.
- Inactivity reset: if `localStorage['cf_session_last']` is older than 30 min, rotate the session ID. Updates on every event.
- Falls back to in-memory ID if localStorage is unavailable.

**Captured events:**
- `page_view` on initial load and on `history.pushState` / `popstate` (SPA-aware).
- `click` via single `document.addEventListener('click', ..., { capture: true, passive: true })`. Captures `clientX/Y`, `pageX/Y`, viewport size, and a best-effort CSS selector.

**Transport:**
- Batch events with a 500 ms debounce.
- `navigator.sendBeacon` when available; `fetch({ keepalive: true })` fallback.
- Flush remaining queue on `visibilitychange === 'hidden'` and `pagehide` so trailing clicks aren't lost.
- On failure: retry once with exponential backoff, then drop (no IndexedDB persistence — out of scope for MVP, documented as future work).

**No PII** beyond what the spec asks for. Selectors are structural; no innerText capture.

## 7. Backend API (`packages/backend`)

**Stack:** Express, Mongoose, Zod (via `/shared`), `cors`, `helmet`, `express-rate-limit`, `pino` (structured logs).

**Endpoints:**

| Method | Path | Purpose | Notes |
|---|---|---|---|
| `POST` | `/api/events` | Ingest event(s) | Accepts single object or array. Validates against shared Zod schema. CORS open. Rate-limited 100 req/IP/min. |
| `GET` | `/api/sessions` | List sessions w/ aggregates | Query: `?limit=20&offset=0&search=`. Returns `{ sessionId, firstSeen, lastSeen, eventCount, pageCount, durationMs }[]` + `total`. |
| `GET` | `/api/sessions/:id/events` | Ordered events for a session | Returns events sorted by `timestamp` asc, `receivedAt` asc tiebreaker. |
| `GET` | `/api/heatmap?path=...` | Click points for a page | Returns `{ x, y, pageX, pageY, viewportW, viewportH }[]`. Capped at 5000 points (downsamples if exceeded). |
| `GET` | `/api/pages` | Distinct paths seen | Powers the heatmap page selector. Returns `{ path, clickCount }[]`. |
| `GET` | `/healthz` | Liveness check | Returns `{ ok: true, db: 'up' \| 'down' }`. |
| `GET` | `/tracker.js` | Serve compiled tracker | Built artifact from `packages/tracker/dist`. |
| `GET` | `/demo/*` | Serve demo HTML | Static file middleware. |

**Aggregation example — `/api/sessions`:**

```ts
db.events.aggregate([
  { $group: {
      _id: '$sessionId',
      firstSeen: { $min: '$timestamp' },
      lastSeen:  { $max: '$timestamp' },
      eventCount:{ $sum: 1 },
      pages:     { $addToSet: '$path' },
  }},
  { $project: {
      sessionId: '$_id',
      firstSeen: 1, lastSeen: 1, eventCount: 1,
      pageCount: { $size: '$pages' },
      durationMs:{ $subtract: ['$lastSeen', '$firstSeen'] },
      _id: 0,
  }},
  { $sort: { lastSeen: -1 } },
  { $skip: offset }, { $limit: limit },
]);
```

**Validation:** Zod schema rejects malformed payloads with `400` + `{ error: { code, message, issues } }`. Timestamps more than 5 min in the future are clamped to server time (clock skew tolerance).

**Errors:** Standardized envelope `{ error: { code, message } }`. Codes: `VALIDATION_FAILED`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`.

## 8. Dashboard (`packages/dashboard`)

**Stack:** Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui primitives, TanStack Query, recharts (tiny charts), heatmap.js.

**Routes:**

- `/` — redirects to `/sessions`.
- `/sessions` — Sessions View
  - Table: `Session ID` (truncated + copy button), `First seen`, `Last seen`, `Duration`, `Events`, `Pages`.
  - Server-side pagination, search by session ID, sort by `Last seen` desc default.
  - Row click → `/sessions/[id]`.
  - Top strip: 4 KPI cards (Total sessions / Total events / Active in last 1h / Avg events per session).
  - Sparkline: events-over-time, last 24h.
  - Auto-refresh every 10 s via TanStack Query polling.
- `/sessions/[id]` — Session detail
  - Summary card: session ID, first/last seen, duration, event count, page count.
  - Donut: events by type.
  - Vertical timeline: each event shows icon, type, URL, relative time, delta from previous event. Click on a `page_view` row offers "Open heatmap for this page".
- `/heatmap` — Heatmap View
  - Page selector (populated from `/api/pages`, sorted by click volume).
  - Viewport-width selector (defaults to 1440 px) — affects canvas size and click point normalization.
  - heatmap.js canvas overlaid on a neutral grid background.
  - Side panel: total clicks, unique sessions, top-10 click zones (rough x/y buckets).

**Empty states:** every view has an empty state with the script-tag snippet to start tracking.

**Theme:** dark mode toggle (system default), shadcn theme variables.

**Data fetching:** TanStack Query with `staleTime: 5s`, refetch on window focus. No SSR fetching needed — dashboard is behind the API and can render client-side. Pages export `'use client'` where needed.

## 9. Demo pages (`/demo`)

Three static HTML pages, plain styling, intentionally simple:

- `demo/index.html` — Home: hero + grid of 3 mock product cards.
- `demo/product.html?id=1` — Product detail: image, name, price, description, Add to Cart, Buy Now.
- `demo/cart.html` — Cart: list of mock items, Checkout button.

All three include `<script src="/tracker.js" data-endpoint="/api/events"></script>` so traffic flows directly to the same backend. A walk through home → product → cart → checkout generates a realistic multi-page session with clicks at varied locations — exercises both Sessions and Heatmap views.

## 10. Deployment

| Component | Host | Notes |
|---|---|---|
| Dashboard | Vercel | `NEXT_PUBLIC_API_URL` env var. Auto-deploy on push to `main`. |
| Backend | Render free web service | Sleeps after 15 min inactivity — first request cold-starts (~30s). Documented in README. Dockerfile provided. Env: `MONGODB_URI`, `CORS_ORIGINS`, `PORT`, `NODE_ENV`. |
| Database | MongoDB Atlas M0 (free) | Single region. IP allowlist `0.0.0.0/0` for the demo (documented). |

## 11. Tests

Pragmatic coverage — enough to show test discipline without consuming a day:

- **Backend** (Jest + supertest + `mongodb-memory-server`): 6–8 tests
  - `POST /api/events` accepts valid payload; rejects malformed with 400.
  - Batch ingest (array body) works.
  - `GET /api/sessions` returns correct aggregates for seeded events.
  - `GET /api/sessions/:id/events` returns events in chronological order.
  - `GET /api/heatmap` filters by path and returns only clicks.
  - Rate limit triggers 429 past threshold.
- **Tracker** (Vitest + jsdom): 5 tests
  - Generates and persists `sessionId` on first call.
  - Reuses persisted `sessionId` across reloads.
  - Captures `page_view` on `pushState`.
  - Captures `click` with correct coordinates.
  - Flushes batched events on `visibilitychange=hidden`.
- **Dashboard** (Playwright): 1 smoke test
  - `/sessions` renders; clicking a row navigates to `/sessions/[id]`.

## 12. README structure

1. One-paragraph elevator pitch.
2. Live demo links (dashboard URL, demo page URL).
3. Architecture diagram (PNG; tracker → backend → Mongo → dashboard).
4. Tech stack table.
5. Local setup (`git clone`, `docker compose up mongo`, `npm install`, `npm run dev`).
6. Environment variables table.
7. API reference (endpoint table from §7).
8. Assumptions & trade-offs:
   - No auth on dashboard — out of scope per spec.
   - Session ID stored in `localStorage`; 30-min inactivity reset.
   - Polling instead of WebSockets for live updates.
   - No event-persistence retry beyond one in-memory retry.
   - CORS open on `/api/events` by design (it's an analytics endpoint).
   - `mongodb-memory-server` for test isolation rather than a shared test DB.
9. What I'd do next (real-time via WebSockets/SSE, sampling, IndexedDB-backed offline queue, role-based dashboard auth, GDPR consent flow, data retention policies).

## 13. Out of scope (explicit non-goals)

- User authentication (mentioned in README assumptions).
- Real-time dashboard updates via WebSockets (polling is acceptable for MVP; called out as future work).
- Multi-tenant data partitioning (single-tenant by design).
- Offline event queueing via IndexedDB.
- Mobile app SDKs.
- Anonymization / IP hashing / GDPR consent banner.

## 14. Build order (informs implementation plan)

1. Monorepo scaffold + shared types.
2. Backend: schema, `POST /api/events`, tests.
3. Tracker: build, sessionId, page_view + click, batched send.
4. Demo pages.
5. Backend: aggregation endpoints + tests.
6. Dashboard: layout + Sessions View.
7. Dashboard: Session detail.
8. Dashboard: Heatmap View.
9. Deploy backend → Render, dashboard → Vercel, DB → Atlas.
10. README + smoke test + final polish.
