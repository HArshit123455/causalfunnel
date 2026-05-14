# CausalFunnel Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CausalFunnel take-home: a tracker SDK + Node/Express/Mongo backend + Next.js dashboard with Sessions and Heatmap views, plus a 3-page demo site exercising the tracker.

**Architecture:** npm-workspaces monorepo with four packages (`tracker`, `backend`, `dashboard`, `shared`) plus a `demo/` directory of static HTML. Shared Zod schemas type both client and server. Sessions are derived via MongoDB aggregation — no separate `sessions` collection.

**Tech Stack:** TypeScript end-to-end. Backend: Express, Mongoose, Zod, pino, helmet, cors, express-rate-limit, mongodb-memory-server (tests). Tracker: plain TS bundled to UMD via esbuild. Dashboard: Next.js 14 App Router, Tailwind, shadcn/ui, TanStack Query, recharts, heatmap.js. Tests: Jest + supertest (backend), Vitest + jsdom (tracker), Playwright (dashboard smoke).

**Reference spec:** `docs/superpowers/specs/2026-05-13-causalfunnel-analytics-design.md` — consult it for the rationale behind any decision in this plan.

**Working directory:** `D:\causal`. All paths below are relative to this directory.

---

## File Structure

```
D:\causal\
├─ docs/superpowers/{specs,plans}/...           (already exists)
├─ package.json                                  Root workspaces manifest
├─ turbo.json                                    Turbo pipeline for parallel dev
├─ tsconfig.base.json                            Shared TS config
├─ docker-compose.yml                            Local Mongo
├─ .env.example                                  Documented env vars
├─ .gitignore
├─ README.md
├─ packages/
│  ├─ shared/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ index.ts                             Re-exports
│  │     └─ events.ts                            Zod schemas + types
│  ├─ tracker/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ esbuild.config.mjs                      UMD bundle config
│  │  ├─ vitest.config.ts
│  │  ├─ src/
│  │  │  ├─ index.ts                             Auto-init entry
│  │  │  ├─ session.ts                           Session ID mgmt
│  │  │  ├─ transport.ts                         Batched send + beacon
│  │  │  ├─ capture.ts                           page_view + click handlers
│  │  │  └─ selector.ts                          CSS selector generator
│  │  └─ tests/
│  │     ├─ session.test.ts
│  │     ├─ capture.test.ts
│  │     └─ transport.test.ts
│  ├─ backend/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ jest.config.cjs
│  │  ├─ Dockerfile
│  │  └─ src/
│  │     ├─ index.ts                             Server bootstrap
│  │     ├─ app.ts                               Express app factory
│  │     ├─ db.ts                                Mongoose connection
│  │     ├─ logger.ts                            pino instance
│  │     ├─ errors.ts                            Error envelope helper
│  │     ├─ models/
│  │     │  └─ event.ts                          Mongoose schema
│  │     └─ routes/
│  │        ├─ events.ts                         POST /api/events
│  │        ├─ sessions.ts                       GET /api/sessions, /:id/events
│  │        ├─ heatmap.ts                        GET /api/heatmap, /api/pages
│  │        └─ health.ts                         GET /healthz
│  │  └─ tests/
│  │     ├─ events.test.ts
│  │     ├─ sessions.test.ts
│  │     └─ heatmap.test.ts
│  └─ dashboard/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ next.config.mjs
│     ├─ tailwind.config.ts
│     ├─ postcss.config.mjs
│     ├─ components.json                         shadcn config
│     ├─ playwright.config.ts
│     ├─ app/
│     │  ├─ layout.tsx
│     │  ├─ globals.css
│     │  ├─ providers.tsx                        TanStack Query provider
│     │  ├─ page.tsx                             Redirect to /sessions
│     │  ├─ sessions/
│     │  │  ├─ page.tsx                          Sessions list
│     │  │  └─ [id]/page.tsx                     Session detail
│     │  └─ heatmap/page.tsx                     Heatmap view
│     ├─ components/
│     │  ├─ ui/                                  shadcn primitives
│     │  ├─ session-table.tsx
│     │  ├─ kpi-card.tsx
│     │  ├─ event-timeline.tsx
│     │  ├─ events-by-type-donut.tsx
│     │  └─ heatmap-canvas.tsx
│     ├─ lib/
│     │  ├─ api.ts                               Typed fetch client
│     │  └─ utils.ts                             cn() helper, formatters
│     └─ tests/e2e/
│        └─ smoke.spec.ts
└─ demo/
   ├─ index.html
   ├─ product.html
   └─ cart.html
```

---

## Task 1: Repo scaffold and workspaces

**Files:**
- Create: `D:\causal\package.json`
- Create: `D:\causal\turbo.json`
- Create: `D:\causal\tsconfig.base.json`
- Create: `D:\causal\.gitignore`
- Create: `D:\causal\.env.example`
- Create: `D:\causal\docker-compose.yml`

- [ ] **Step 1: Initialize git and root files**

Run from `D:\causal`:
```powershell
git init
git branch -m main
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.next/
coverage/
*.log
.env
.env.local
.DS_Store
.turbo/
playwright-report/
test-results/
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "causalfunnel-analytics",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev":       { "cache": false, "persistent": true },
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "test":      { "dependsOn": ["^build"] },
    "lint":      {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 6: Create `.env.example`**

```
# Backend
MONGODB_URI=mongodb://localhost:27017/causalfunnel
PORT=4000
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
NODE_ENV=development

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 7: Create `docker-compose.yml`**

```yaml
services:
  mongo:
    image: mongo:7
    container_name: causalfunnel-mongo
    ports: ["27017:27017"]
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:
```

- [ ] **Step 8: Install root deps**

Run from `D:\causal`:
```powershell
npm install
```

Expected: `package-lock.json` created. No errors.

- [ ] **Step 9: Commit**

```powershell
git add .
git commit -m "chore: scaffold monorepo with workspaces and turbo"
```

---

## Task 2: Shared package (Zod schemas + types)

**Files:**
- Create: `D:\causal\packages\shared\package.json`
- Create: `D:\causal\packages\shared\tsconfig.json`
- Create: `D:\causal\packages\shared\src\index.ts`
- Create: `D:\causal\packages\shared\src\events.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@causalfunnel/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build":     "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/shared/src/events.ts`**

```ts
import { z } from 'zod';

export const EVENT_TYPES = ['page_view', 'click'] as const;
export const EventType = z.enum(EVENT_TYPES);

const BaseEvent = z.object({
  sessionId: z.string().uuid(),
  url: z.string().url().max(2048),
  path: z.string().max(2048),
  timestamp: z.coerce.date(),
  userAgent: z.string().max(512).optional().default(''),
  referrer: z.string().max(2048).nullable().optional().default(null),
});

export const PageViewEvent = BaseEvent.extend({
  type: z.literal('page_view'),
  x: z.null().optional().default(null),
  y: z.null().optional().default(null),
  pageX: z.null().optional().default(null),
  pageY: z.null().optional().default(null),
  viewportW: z.null().optional().default(null),
  viewportH: z.null().optional().default(null),
  selector: z.null().optional().default(null),
});

export const ClickEvent = BaseEvent.extend({
  type: z.literal('click'),
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000),
  pageX: z.number().int().min(0).max(200000),
  pageY: z.number().int().min(0).max(200000),
  viewportW: z.number().int().min(0).max(20000),
  viewportH: z.number().int().min(0).max(20000),
  selector: z.string().max(512).nullable().default(null),
});

export const TrackingEvent = z.discriminatedUnion('type', [PageViewEvent, ClickEvent]);
export const TrackingEventBatch = z.union([TrackingEvent, z.array(TrackingEvent).max(100)]);

export type TrackingEventInput = z.input<typeof TrackingEvent>;
export type TrackingEventParsed = z.output<typeof TrackingEvent>;

export const SessionSummary = z.object({
  sessionId: z.string(),
  firstSeen: z.coerce.date(),
  lastSeen: z.coerce.date(),
  eventCount: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const HeatmapPoint = z.object({
  x: z.number(), y: z.number(),
  pageX: z.number(), pageY: z.number(),
  viewportW: z.number(), viewportH: z.number(),
});
export type HeatmapPoint = z.infer<typeof HeatmapPoint>;

export const PageInfo = z.object({
  path: z.string(),
  clickCount: z.number().int().nonnegative(),
});
export type PageInfo = z.infer<typeof PageInfo>;
```

- [ ] **Step 4: Create `packages/shared/src/index.ts`**

```ts
export * from './events.js';
```

- [ ] **Step 5: Install and typecheck**

Run from `D:\causal`:
```powershell
npm install
npm run typecheck -w @causalfunnel/shared
```

Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add packages/shared
git commit -m "feat(shared): add Zod schemas for tracking events"
```

---

## Task 3: Backend scaffold + Mongo connection + healthcheck

**Files:**
- Create: `D:\causal\packages\backend\package.json`
- Create: `D:\causal\packages\backend\tsconfig.json`
- Create: `D:\causal\packages\backend\jest.config.cjs`
- Create: `D:\causal\packages\backend\src\logger.ts`
- Create: `D:\causal\packages\backend\src\db.ts`
- Create: `D:\causal\packages\backend\src\errors.ts`
- Create: `D:\causal\packages\backend\src\app.ts`
- Create: `D:\causal\packages\backend\src\index.ts`
- Create: `D:\causal\packages\backend\src\routes\health.ts`

- [ ] **Step 1: Create `packages/backend/package.json`**

```json
{
  "name": "@causalfunnel/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev":       "tsx watch src/index.ts",
    "build":     "tsc -p tsconfig.json",
    "start":     "node dist/index.js",
    "test":      "NODE_OPTIONS=--experimental-vm-modules jest --runInBand",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint":      "echo skip"
  },
  "dependencies": {
    "@causalfunnel/shared": "*",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.0",
    "helmet": "^7.1.0",
    "mongoose": "^8.5.0",
    "pino": "^9.3.0",
    "pino-http": "^10.2.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "mongodb-memory-server": "^10.0.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "tsx": "^4.16.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/backend/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/backend/jest.config.cjs`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@causalfunnel/shared$': '<rootDir>/../shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: { module: 'ESNext' } }],
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testTimeout: 30000,
};
```

- [ ] **Step 4: Create `src/logger.ts`**

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
});
```

Note: `pino-pretty` is optional dev nicety; remove the transport line if you skip installing it. To keep it simple, drop the transport:

```ts
import pino from 'pino';
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
```

- [ ] **Step 5: Create `src/db.ts`**

```ts
import mongoose from 'mongoose';
import { logger } from './logger.js';

export async function connectDb(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info({ uri: uri.replace(/\/\/.*@/, '//***@') }, 'mongo connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
```

- [ ] **Step 6: Create `src/errors.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export type ErrorCode =
  | 'VALIDATION_FAILED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL';

export function errorEnvelope(code: ErrorCode, message: string, extras: object = {}) {
  return { error: { code, message, ...extras } };
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json(errorEnvelope('NOT_FOUND', 'route not found'));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json(errorEnvelope('VALIDATION_FAILED', 'invalid payload', { issues: err.issues }));
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json(errorEnvelope('INTERNAL', 'internal server error'));
}
```

- [ ] **Step 7: Create `src/routes/health.ts`**

```ts
import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/healthz', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ ok: dbUp, db: dbUp ? 'up' : 'down' });
});
```

- [ ] **Step 8: Create `src/app.ts`**

```ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { notFound, errorHandler } from './errors.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGINS ?? '*').split(','), credentials: false }));
  app.use(express.json({ limit: '256kb' }));

  app.use(healthRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 9: Create `src/index.ts`**

```ts
import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './db.js';
import { logger } from './logger.js';

async function main() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/causalfunnel';
  const port = Number(process.env.PORT ?? 4000);
  await connectDb(uri);
  createApp().listen(port, () => logger.info({ port }, 'backend listening'));
}

main().catch((err) => { logger.fatal({ err }, 'fatal startup error'); process.exit(1); });
```

Note: add `dotenv` to dependencies — update the `package.json` from step 1 to include `"dotenv": "^16.4.0"`.

- [ ] **Step 10: Install and typecheck**

Run from `D:\causal`:
```powershell
npm install
npm run typecheck -w @causalfunnel/backend
```

Expected: no type errors.

- [ ] **Step 11: Smoke test**

Run from `D:\causal`:
```powershell
docker compose up -d mongo
npm run dev -w @causalfunnel/backend
```

In another shell:
```powershell
curl http://localhost:4000/healthz
```

Expected: `{"ok":true,"db":"up"}`. Then stop the dev server (Ctrl+C).

- [ ] **Step 12: Commit**

```powershell
git add packages/backend
git commit -m "feat(backend): express scaffold with mongo connection and healthz"
```

---

## Task 4: Event Mongoose model

**Files:**
- Create: `D:\causal\packages\backend\src\models\event.ts`

- [ ] **Step 1: Write the failing test (no test yet — model is wired via integration tests in Task 5). Skip to implementation.**

This task is a pure structural component; coverage comes from the route tests that exercise it.

- [ ] **Step 2: Create `src/models/event.ts`**

```ts
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const eventSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  type:      { type: String, required: true, enum: ['page_view', 'click'], index: true },
  url:       { type: String, required: true },
  path:      { type: String, required: true, index: true },
  timestamp: { type: Date,   required: true, index: true },
  receivedAt:{ type: Date,   required: true, default: () => new Date() },

  x:         { type: Number, default: null },
  y:         { type: Number, default: null },
  pageX:     { type: Number, default: null },
  pageY:     { type: Number, default: null },
  viewportW: { type: Number, default: null },
  viewportH: { type: Number, default: null },
  selector:  { type: String, default: null },

  userAgent: { type: String, default: '' },
  referrer:  { type: String, default: null },
}, { versionKey: false });

eventSchema.index({ sessionId: 1, timestamp: 1 });
eventSchema.index({ path: 1, type: 1 });
eventSchema.index({ receivedAt: -1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const EventModel: Model<EventDoc> = model<EventDoc>('Event', eventSchema);
```

- [ ] **Step 3: Typecheck**

```powershell
npm run typecheck -w @causalfunnel/backend
```

Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add packages/backend/src/models
git commit -m "feat(backend): add Event mongoose model with indexes"
```

---

## Task 5: `POST /api/events` route (TDD)

**Files:**
- Create: `D:\causal\packages\backend\tests\setup.ts`
- Create: `D:\causal\packages\backend\tests\events.test.ts`
- Create: `D:\causal\packages\backend\src\routes\events.ts`
- Modify: `D:\causal\packages\backend\src\app.ts` (mount new router + rate limit)

- [ ] **Step 1: Create test setup `tests/setup.ts`**

```ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export async function startTestDb(): Promise<string> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = null;
}

export async function clearDb(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const c of Object.values(collections)) await c.deleteMany({});
}
```

- [ ] **Step 2: Write the failing test `tests/events.test.ts`**

```ts
import request from 'supertest';
import { createApp } from '../src/app.js';
import { EventModel } from '../src/models/event.js';
import { startTestDb, stopTestDb, clearDb } from './setup.js';

let app: ReturnType<typeof createApp>;

beforeAll(async () => { await startTestDb(); app = createApp(); });
afterAll(async () => { await stopTestDb(); });
afterEach(async () => { await clearDb(); });

const validClick = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  type: 'click',
  url: 'http://example.com/p',
  path: '/p',
  timestamp: new Date().toISOString(),
  x: 100, y: 200, pageX: 100, pageY: 200,
  viewportW: 1440, viewportH: 900,
  userAgent: 'jest', referrer: null,
};

describe('POST /api/events', () => {
  it('accepts a single valid event and stores it', async () => {
    const res = await request(app).post('/api/events').send(validClick);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true, count: 1 });
    expect(await EventModel.countDocuments()).toBe(1);
  });

  it('accepts an array of events', async () => {
    const res = await request(app).post('/api/events').send([validClick, { ...validClick, type: 'page_view', x: null, y: null, pageX: null, pageY: null, viewportW: null, viewportH: null }]);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true, count: 2 });
    expect(await EventModel.countDocuments()).toBe(2);
  });

  it('rejects malformed payload with 400 VALIDATION_FAILED', async () => {
    const res = await request(app).post('/api/events').send({ type: 'click' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('clamps future timestamps beyond 5 minutes skew to server time', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/api/events').send({ ...validClick, timestamp: future });
    expect(res.status).toBe(202);
    const doc = await EventModel.findOne();
    expect(doc!.timestamp.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

```powershell
npm test -w @causalfunnel/backend
```

Expected: all four tests fail with 404 (route not mounted yet).

- [ ] **Step 4: Create `src/routes/events.ts`**

```ts
import { Router } from 'express';
import { TrackingEvent } from '@causalfunnel/shared';
import { EventModel } from '../models/event.js';

const SKEW_MS = 5 * 60 * 1000;

export const eventsRouter = Router();

eventsRouter.post('/api/events', async (req, res, next) => {
  try {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    const parsed = body.map((e) => TrackingEvent.parse(e));
    const now = Date.now();
    const docs = parsed.map((e) => ({
      ...e,
      timestamp: e.timestamp.getTime() > now + SKEW_MS ? new Date(now) : e.timestamp,
      receivedAt: new Date(),
    }));
    await EventModel.insertMany(docs, { ordered: false });
    res.status(202).json({ ok: true, count: docs.length });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 5: Wire router and add rate limit in `src/app.ts`**

Replace the file with:

```ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { healthRouter } from './routes/health.js';
import { eventsRouter } from './routes/events.js';
import { notFound, errorHandler } from './errors.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGINS ?? '*').split(','), credentials: false }));
  app.use(express.json({ limit: '256kb' }));

  const eventsLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'too many requests' } }),
  });
  app.use('/api/events', eventsLimiter);

  app.use(healthRouter);
  app.use(eventsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```powershell
npm test -w @causalfunnel/backend
```

Expected: all four tests pass.

- [ ] **Step 7: Commit**

```powershell
git add packages/backend
git commit -m "feat(backend): POST /api/events with zod validation and rate limit"
```

---

## Task 6: `GET /api/sessions` and `GET /api/sessions/:id/events` (TDD)

**Files:**
- Create: `D:\causal\packages\backend\tests\sessions.test.ts`
- Create: `D:\causal\packages\backend\src\routes\sessions.ts`
- Modify: `D:\causal\packages\backend\src\app.ts` (mount sessions router)

- [ ] **Step 1: Write the failing test `tests/sessions.test.ts`**

```ts
import request from 'supertest';
import { createApp } from '../src/app.js';
import { EventModel } from '../src/models/event.js';
import { startTestDb, stopTestDb, clearDb } from './setup.js';

let app: ReturnType<typeof createApp>;
beforeAll(async () => { await startTestDb(); app = createApp(); });
afterAll(async () => { await stopTestDb(); });
afterEach(async () => { await clearDb(); });

const sid = (n: number) => `0000000${n}-1111-4111-8111-111111111111`.slice(-36);

async function seed() {
  const base = { url: 'http://x/a', path: '/a', userAgent: 'j', referrer: null };
  const t = (ms: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, 0) + ms);
  await EventModel.insertMany([
    { sessionId: sid(1), type: 'page_view', timestamp: t(0),    receivedAt: t(0),    ...base, path: '/a' },
    { sessionId: sid(1), type: 'click',     timestamp: t(1000), receivedAt: t(1000), x:1,y:2,pageX:1,pageY:2,viewportW:1440,viewportH:900, selector:'a', ...base },
    { sessionId: sid(1), type: 'page_view', timestamp: t(2000), receivedAt: t(2000), ...base, path: '/b', url: 'http://x/b' },
    { sessionId: sid(2), type: 'page_view', timestamp: t(500),  receivedAt: t(500),  ...base, path: '/a' },
  ]);
}

describe('GET /api/sessions', () => {
  it('returns sessions with aggregates sorted by lastSeen desc', async () => {
    await seed();
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.sessions).toHaveLength(2);
    const first = res.body.sessions[0];
    expect(first.sessionId).toBe(sid(1));
    expect(first.eventCount).toBe(3);
    expect(first.pageCount).toBe(2);
    expect(first.durationMs).toBe(2000);
  });

  it('respects limit and offset', async () => {
    await seed();
    const res = await request(app).get('/api/sessions?limit=1&offset=1');
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].sessionId).toBe(sid(2));
  });
});

describe('GET /api/sessions/:id/events', () => {
  it('returns ordered events for the session', async () => {
    await seed();
    const res = await request(app).get(`/api/sessions/${sid(1)}/events`);
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(3);
    expect(res.body.events.map((e: any) => e.type)).toEqual(['page_view', 'click', 'page_view']);
  });

  it('returns 200 with empty array for unknown session', async () => {
    const res = await request(app).get(`/api/sessions/${sid(9)}/events`);
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```powershell
npm test -w @causalfunnel/backend -- sessions
```

Expected: 404s for all session routes.

- [ ] **Step 3: Create `src/routes/sessions.ts`**

```ts
import { Router } from 'express';
import { EventModel } from '../models/event.js';

export const sessionsRouter = Router();

sessionsRouter.get('/api/sessions', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const search = String(req.query.search ?? '').trim();

    const match: Record<string, unknown> = {};
    if (search) match.sessionId = { $regex: search, $options: 'i' };

    const [agg] = await EventModel.aggregate([
      { $match: match },
      { $group: {
          _id: '$sessionId',
          firstSeen: { $min: '$timestamp' },
          lastSeen:  { $max: '$timestamp' },
          eventCount:{ $sum: 1 },
          pages:     { $addToSet: '$path' },
        } },
      { $project: {
          _id: 0,
          sessionId: '$_id',
          firstSeen: 1, lastSeen: 1, eventCount: 1,
          pageCount: { $size: '$pages' },
          durationMs: { $subtract: ['$lastSeen', '$firstSeen'] },
        } },
      { $sort: { lastSeen: -1 } },
      { $facet: {
          sessions: [{ $skip: offset }, { $limit: limit }],
          totalArr: [{ $count: 'n' }],
        } },
    ]);

    const total = agg?.totalArr?.[0]?.n ?? 0;
    res.json({ sessions: agg?.sessions ?? [], total, limit, offset });
  } catch (err) { next(err); }
});

sessionsRouter.get('/api/sessions/:id/events', async (req, res, next) => {
  try {
    const events = await EventModel.find({ sessionId: req.params.id })
      .sort({ timestamp: 1, receivedAt: 1 })
      .lean();
    res.json({ events });
  } catch (err) { next(err); }
});
```

- [ ] **Step 4: Wire router in `src/app.ts`**

Add import and `app.use(sessionsRouter);` right after `app.use(eventsRouter);`:

```ts
import { sessionsRouter } from './routes/sessions.js';
// ...
app.use(eventsRouter);
app.use(sessionsRouter);
```

- [ ] **Step 5: Run tests to confirm they pass**

```powershell
npm test -w @causalfunnel/backend
```

Expected: all session tests pass; existing event tests still pass.

- [ ] **Step 6: Commit**

```powershell
git add packages/backend
git commit -m "feat(backend): sessions list with aggregates and per-session events"
```

---

## Task 7: `GET /api/heatmap` and `GET /api/pages` (TDD)

**Files:**
- Create: `D:\causal\packages\backend\tests\heatmap.test.ts`
- Create: `D:\causal\packages\backend\src\routes\heatmap.ts`
- Modify: `D:\causal\packages\backend\src\app.ts`

- [ ] **Step 1: Write the failing test `tests/heatmap.test.ts`**

```ts
import request from 'supertest';
import { createApp } from '../src/app.js';
import { EventModel } from '../src/models/event.js';
import { startTestDb, stopTestDb, clearDb } from './setup.js';

let app: ReturnType<typeof createApp>;
beforeAll(async () => { await startTestDb(); app = createApp(); });
afterAll(async () => { await stopTestDb(); });
afterEach(async () => { await clearDb(); });

const sid = '11111111-1111-4111-8111-111111111111';
const ua = 'jest';

async function seed() {
  await EventModel.insertMany([
    { sessionId: sid, type: 'page_view', url: 'http://x/a', path: '/a', timestamp: new Date(), receivedAt: new Date(), userAgent: ua, referrer: null },
    { sessionId: sid, type: 'click',     url: 'http://x/a', path: '/a', timestamp: new Date(), receivedAt: new Date(), x:10,y:20,pageX:10,pageY:20,viewportW:1440,viewportH:900, selector:'.btn', userAgent: ua, referrer: null },
    { sessionId: sid, type: 'click',     url: 'http://x/a', path: '/a', timestamp: new Date(), receivedAt: new Date(), x:30,y:40,pageX:30,pageY:40,viewportW:1440,viewportH:900, selector:'.btn', userAgent: ua, referrer: null },
    { sessionId: sid, type: 'click',     url: 'http://x/b', path: '/b', timestamp: new Date(), receivedAt: new Date(), x:5, y:5, pageX:5, pageY:5, viewportW:1440,viewportH:900, selector:'.btn', userAgent: ua, referrer: null },
  ]);
}

describe('GET /api/heatmap', () => {
  it('returns only click points for the specified path', async () => {
    await seed();
    const res = await request(app).get('/api/heatmap?path=/a');
    expect(res.status).toBe(200);
    expect(res.body.points).toHaveLength(2);
    expect(res.body.points).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 10, y: 20 }),
      expect.objectContaining({ x: 30, y: 40 }),
    ]));
  });

  it('400s when path is missing', async () => {
    const res = await request(app).get('/api/heatmap');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/pages', () => {
  it('returns distinct paths with click counts', async () => {
    await seed();
    const res = await request(app).get('/api/pages');
    expect(res.status).toBe(200);
    const byPath = Object.fromEntries(res.body.pages.map((p: any) => [p.path, p.clickCount]));
    expect(byPath).toEqual({ '/a': 2, '/b': 1 });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```powershell
npm test -w @causalfunnel/backend -- heatmap
```

Expected: 404s.

- [ ] **Step 3: Create `src/routes/heatmap.ts`**

```ts
import { Router } from 'express';
import { EventModel } from '../models/event.js';
import { errorEnvelope } from '../errors.js';

const MAX_POINTS = 5000;

export const heatmapRouter = Router();

heatmapRouter.get('/api/heatmap', async (req, res, next) => {
  try {
    const path = typeof req.query.path === 'string' ? req.query.path : '';
    if (!path) return res.status(400).json(errorEnvelope('VALIDATION_FAILED', 'path is required'));

    const total = await EventModel.countDocuments({ path, type: 'click' });
    const ratio = total > MAX_POINTS ? total / MAX_POINTS : 1;

    const pipeline: object[] = [
      { $match: { path, type: 'click' } },
      { $project: { _id: 0, x: 1, y: 1, pageX: 1, pageY: 1, viewportW: 1, viewportH: 1 } },
    ];
    if (ratio > 1) pipeline.push({ $sample: { size: MAX_POINTS } });

    const points = await EventModel.aggregate(pipeline);
    res.json({ points, total, sampled: ratio > 1, max: MAX_POINTS });
  } catch (err) { next(err); }
});

heatmapRouter.get('/api/pages', async (_req, res, next) => {
  try {
    const pages = await EventModel.aggregate([
      { $match: { type: 'click' } },
      { $group: { _id: '$path', clickCount: { $sum: 1 } } },
      { $project: { _id: 0, path: '$_id', clickCount: 1 } },
      { $sort: { clickCount: -1 } },
    ]);
    res.json({ pages });
  } catch (err) { next(err); }
});
```

- [ ] **Step 4: Wire router in `src/app.ts`**

Add:
```ts
import { heatmapRouter } from './routes/heatmap.js';
// ...
app.use(heatmapRouter);
```

- [ ] **Step 5: Run tests to confirm they pass**

```powershell
npm test -w @causalfunnel/backend
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add packages/backend
git commit -m "feat(backend): heatmap points and pages endpoints"
```

---

## Task 8: Tracker — session management (TDD)

**Files:**
- Create: `D:\causal\packages\tracker\package.json`
- Create: `D:\causal\packages\tracker\tsconfig.json`
- Create: `D:\causal\packages\tracker\vitest.config.ts`
- Create: `D:\causal\packages\tracker\src\session.ts`
- Create: `D:\causal\packages\tracker\tests\session.test.ts`

- [ ] **Step 1: Create `packages/tracker/package.json`**

```json
{
  "name": "@causalfunnel/tracker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev":       "node esbuild.config.mjs --watch",
    "build":     "node esbuild.config.mjs",
    "test":      "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@causalfunnel/shared": "*"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "esbuild": "^0.23.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "@vitest/browser": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/tracker/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2020",
    "lib": ["ES2022", "DOM"],
    "types": ["node"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create `packages/tracker/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', globals: false },
});
```

- [ ] **Step 4: Write the failing test `tests/session.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSessionId, INACTIVITY_MS } from '../src/session.js';

describe('session id', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('generates and persists a uuid v4 on first call', () => {
    const id = getSessionId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(localStorage.getItem('cf_session_id')).toBe(id);
  });

  it('reuses persisted id on subsequent calls', () => {
    const id1 = getSessionId();
    const id2 = getSessionId();
    expect(id2).toBe(id1);
  });

  it('rotates id after inactivity window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const id1 = getSessionId();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + INACTIVITY_MS + 1);
    const id2 = getSessionId();
    expect(id2).not.toBe(id1);
  });
});
```

- [ ] **Step 5: Install and run test to confirm it fails**

```powershell
npm install
npm test -w @causalfunnel/tracker
```

Expected: import error — `session.ts` doesn't exist.

- [ ] **Step 6: Create `packages/tracker/src/session.ts`**

```ts
export const INACTIVITY_MS = 30 * 60 * 1000;
const KEY_ID = 'cf_session_id';
const KEY_LAST = 'cf_session_last';

function uuidv4(): string {
  // crypto.randomUUID() is available in modern browsers and jsdom
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  (typeof crypto !== 'undefined' ? crypto : { getRandomValues: (a: Uint8Array) => { for (let i=0;i<a.length;i++) a[i] = Math.floor(Math.random()*256); return a; } as unknown as Crypto }['getRandomValues'])(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

let memoryId: string | null = null;
let memoryLast = 0;

export function getSessionId(): string {
  const store = safeStorage();
  const now = Date.now();
  const lastStr = store ? store.getItem(KEY_LAST) : null;
  const last = lastStr ? Number(lastStr) : memoryLast;
  const existing = store ? store.getItem(KEY_ID) : memoryId;
  const expired = last && now - last > INACTIVITY_MS;
  const id = !existing || expired ? uuidv4() : existing;
  if (store) {
    store.setItem(KEY_ID, id);
    store.setItem(KEY_LAST, String(now));
  } else {
    memoryId = id;
    memoryLast = now;
  }
  return id;
}
```

- [ ] **Step 7: Run tests to confirm they pass**

```powershell
npm test -w @causalfunnel/tracker
```

Expected: all three tests pass.

- [ ] **Step 8: Commit**

```powershell
git add packages/tracker
git commit -m "feat(tracker): session id with localStorage persistence and inactivity reset"
```

---

## Task 9: Tracker — transport (batched send + beacon flush) (TDD)

**Files:**
- Create: `D:\causal\packages\tracker\src\transport.ts`
- Create: `D:\causal\packages\tracker\tests\transport.test.ts`

- [ ] **Step 1: Write the failing test `tests/transport.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTransport } from '../src/transport.js';

describe('transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let beaconMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    beaconMock = vi.fn().mockReturnValue(true);
    (globalThis as any).fetch = fetchMock;
    Object.defineProperty(navigator, 'sendBeacon', { value: beaconMock, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('batches events sent within debounce window into one request', async () => {
    const t = createTransport('http://api/events');
    t.send({ type: 'page_view' } as any);
    t.send({ type: 'click' } as any);
    expect(beaconMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    await Promise.resolve();
    expect(beaconMock).toHaveBeenCalledTimes(1);
    const [, body] = beaconMock.mock.calls[0];
    const parsed = JSON.parse(body instanceof Blob ? await body.text() : body);
    expect(parsed).toHaveLength(2);
  });

  it('flushes pending queue when forced via flush()', async () => {
    const t = createTransport('http://api/events');
    t.send({ type: 'click' } as any);
    t.flush();
    await Promise.resolve();
    expect(beaconMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to fetch when sendBeacon is unavailable', async () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
    const t = createTransport('http://api/events');
    t.send({ type: 'click' } as any);
    t.flush();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```powershell
npm test -w @causalfunnel/tracker -- transport
```

Expected: cannot find module `../src/transport.js`.

- [ ] **Step 3: Create `packages/tracker/src/transport.ts`**

```ts
export interface Transport {
  send(event: object): void;
  flush(): void;
}

const DEBOUNCE_MS = 500;
const MAX_BATCH = 50;

export function createTransport(endpoint: string): Transport {
  let queue: object[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; flush(); }, DEBOUNCE_MS);
  }

  function flush() {
    if (!queue.length) return;
    const batch = queue;
    queue = [];
    const body = JSON.stringify(batch);
    const beacon = typeof navigator !== 'undefined' ? (navigator as Navigator & { sendBeacon?: (url: string, data: Blob | string) => boolean }).sendBeacon : undefined;
    if (typeof beacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = beacon.call(navigator, endpoint, blob);
      if (ok) return;
    }
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => { /* drop */ });
  }

  function send(event: object) {
    queue.push(event);
    if (queue.length >= MAX_BATCH) flush();
    else schedule();
  }

  return { send, flush };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```powershell
npm test -w @causalfunnel/tracker -- transport
```

Expected: all three transport tests pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/tracker
git commit -m "feat(tracker): batched transport with beacon and fetch fallback"
```

---

## Task 10: Tracker — capture (page_view + click) + entry point (TDD)

**Files:**
- Create: `D:\causal\packages\tracker\src\selector.ts`
- Create: `D:\causal\packages\tracker\src\capture.ts`
- Create: `D:\causal\packages\tracker\src\index.ts`
- Create: `D:\causal\packages\tracker\tests\capture.test.ts`
- Create: `D:\causal\packages\tracker\esbuild.config.mjs`

- [ ] **Step 1: Write the failing test `tests/capture.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initCapture } from '../src/capture.js';

describe('capture', () => {
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    send = vi.fn();
    document.body.innerHTML = '<button id="b">Hi</button>';
    history.replaceState(null, '', '/start');
  });

  it('emits a page_view on init', () => {
    initCapture({ send, flush: () => {} } as any);
    expect(send).toHaveBeenCalledTimes(1);
    const evt = send.mock.calls[0][0];
    expect(evt.type).toBe('page_view');
    expect(evt.path).toBe('/start');
    expect(evt.sessionId).toMatch(/-/);
  });

  it('emits a click event with coords and selector', () => {
    initCapture({ send, flush: () => {} } as any);
    const btn = document.getElementById('b')!;
    const evt = new MouseEvent('click', { clientX: 11, clientY: 22, bubbles: true });
    Object.defineProperty(evt, 'pageX', { value: 111 });
    Object.defineProperty(evt, 'pageY', { value: 222 });
    btn.dispatchEvent(evt);
    const click = send.mock.calls.find((c) => c[0].type === 'click')![0];
    expect(click.x).toBe(11);
    expect(click.y).toBe(22);
    expect(click.pageX).toBe(111);
    expect(click.pageY).toBe(222);
    expect(click.selector).toContain('#b');
  });

  it('emits a page_view on history.pushState', () => {
    initCapture({ send, flush: () => {} } as any);
    history.pushState(null, '', '/next');
    const last = send.mock.calls[send.mock.calls.length - 1][0];
    expect(last.type).toBe('page_view');
    expect(last.path).toBe('/next');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```powershell
npm test -w @causalfunnel/tracker -- capture
```

Expected: cannot find module `../src/capture.js`.

- [ ] **Step 3: Create `packages/tracker/src/selector.ts`**

```ts
export function cssPath(el: Element | null): string {
  if (!el) return '';
  const parts: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && cur.nodeType === 1 && depth < 5) {
    let part = cur.tagName.toLowerCase();
    if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
    const cls = (cur.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) part += '.' + cls.join('.');
    parts.unshift(part);
    cur = cur.parentElement;
    depth += 1;
  }
  return parts.join(' > ').slice(0, 512);
}
```

- [ ] **Step 4: Create `packages/tracker/src/capture.ts`**

```ts
import { getSessionId } from './session.js';
import { cssPath } from './selector.js';
import type { Transport } from './transport.js';

interface EventCommon {
  sessionId: string;
  url: string;
  path: string;
  timestamp: string;
  userAgent: string;
  referrer: string | null;
}

function common(): EventCommon {
  return {
    sessionId: getSessionId(),
    url: location.href,
    path: location.pathname,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    referrer: document.referrer || null,
  };
}

function pageView(transport: Transport) {
  transport.send({
    ...common(),
    type: 'page_view',
    x: null, y: null, pageX: null, pageY: null,
    viewportW: null, viewportH: null, selector: null,
  });
}

function patchHistory(onChange: () => void) {
  const _push = history.pushState;
  const _replace = history.replaceState;
  history.pushState = function (...args) { const r = _push.apply(this, args as any); onChange(); return r; };
  history.replaceState = function (...args) { const r = _replace.apply(this, args as any); onChange(); return r; };
  window.addEventListener('popstate', onChange);
}

export function initCapture(transport: Transport): void {
  pageView(transport);
  patchHistory(() => pageView(transport));

  document.addEventListener('click', (e) => {
    const me = e as MouseEvent;
    const target = me.target instanceof Element ? me.target : null;
    transport.send({
      ...common(),
      type: 'click',
      x: Math.round(me.clientX), y: Math.round(me.clientY),
      pageX: Math.round((me as any).pageX ?? me.clientX),
      pageY: Math.round((me as any).pageY ?? me.clientY),
      viewportW: window.innerWidth, viewportH: window.innerHeight,
      selector: cssPath(target),
    });
  }, { capture: true, passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') transport.flush();
  });
  window.addEventListener('pagehide', () => transport.flush());
}
```

- [ ] **Step 5: Create `packages/tracker/src/index.ts`**

```ts
import { createTransport } from './transport.js';
import { initCapture } from './capture.js';

(function autoInit() {
  if (typeof document === 'undefined') return;
  const script = document.currentScript as HTMLScriptElement | null;
  const endpoint = script?.dataset.endpoint
    ?? `${location.origin.replace(/:[0-9]+$/, ':4000')}/api/events`;
  const start = () => initCapture(createTransport(endpoint));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

// also export programmatic init for tests/embedding
export { createTransport } from './transport.js';
export { initCapture } from './capture.js';
export { getSessionId } from './session.js';
```

- [ ] **Step 6: Create `packages/tracker/esbuild.config.mjs`**

```js
import { build, context } from 'esbuild';
import { argv } from 'node:process';

const config = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/tracker.js',
  bundle: true,
  format: 'iife',
  target: ['es2018'],
  minify: true,
  sourcemap: true,
  logLevel: 'info',
};

if (argv.includes('--watch')) {
  const ctx = await context(config);
  await ctx.watch();
} else {
  await build(config);
}
```

- [ ] **Step 7: Run tests to confirm they pass**

```powershell
npm test -w @causalfunnel/tracker
```

Expected: all session + transport + capture tests pass.

- [ ] **Step 8: Build the bundle**

```powershell
npm run build -w @causalfunnel/tracker
```

Expected: `packages/tracker/dist/tracker.js` exists.

- [ ] **Step 9: Commit**

```powershell
git add packages/tracker
git commit -m "feat(tracker): capture page_view and click events, auto-init script"
```

---

## Task 11: Backend serves tracker.js and demo pages

**Files:**
- Modify: `D:\causal\packages\backend\src\app.ts`
- Modify: `D:\causal\packages\backend\package.json` (add devDep `concurrently` if needed — optional, skip)
- Create: `D:\causal\demo\index.html`
- Create: `D:\causal\demo\product.html`
- Create: `D:\causal\demo\cart.html`

- [ ] **Step 1: Modify `src/app.ts` to serve tracker and demo**

Add at the top:
```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
// (existing imports below)
```

Add inside `createApp()` after `app.use(express.json(...))`:
```ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const trackerDir = path.resolve(__dirname, '../../tracker/dist');
const demoDir = path.resolve(__dirname, '../../../demo');
app.use('/tracker.js', express.static(path.join(trackerDir, 'tracker.js')));
app.use('/demo', express.static(demoDir));
```

- [ ] **Step 2: Create `demo/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Demo Shop — Home</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 1rem; color: #1a1a1a; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2rem; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; }
  .card img { width: 100%; aspect-ratio: 4/3; background: #eee; display:block; border-radius:6px; }
  a { color: #2563eb; text-decoration: none; }
</style>
</head>
<body>
  <header><h1>Demo Shop</h1><nav><a href="/demo/cart.html">Cart</a></nav></header>
  <p>This is a demo storefront wired to the CausalFunnel tracker. Click around — events flow to the dashboard.</p>
  <section class="grid">
    <div class="card"><img alt=""><h3>Aurora Lamp</h3><p>$49</p><a href="/demo/product.html?id=1">View</a></div>
    <div class="card"><img alt=""><h3>Glass Kettle</h3><p>$79</p><a href="/demo/product.html?id=2">View</a></div>
    <div class="card"><img alt=""><h3>Wool Throw</h3><p>$95</p><a href="/demo/product.html?id=3">View</a></div>
  </section>
  <script src="/tracker.js" data-endpoint="/api/events"></script>
</body>
</html>
```

- [ ] **Step 3: Create `demo/product.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Demo Shop — Product</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 1rem; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  .img { aspect-ratio: 1; background: #eee; border-radius: 12px; }
  button { padding: .75rem 1rem; border-radius: 6px; border: 1px solid #ccc; background: white; cursor: pointer; }
  button.primary { background: #2563eb; color: white; border-color: #2563eb; margin-left: .5rem; }
</style>
</head>
<body>
  <p><a href="/demo/">← Back</a></p>
  <div class="row">
    <div class="img"></div>
    <div>
      <h1 id="title">Product</h1>
      <p>A lovely demo product for testing the tracker. Click any button below to register a click event.</p>
      <p><strong>$49</strong></p>
      <button id="add">Add to cart</button>
      <button id="buy" class="primary">Buy now</button>
    </div>
  </div>
  <script>
    const id = new URLSearchParams(location.search).get('id') ?? '1';
    document.getElementById('title').textContent = `Product #${id}`;
    document.getElementById('add').addEventListener('click', () => alert('Added!'));
    document.getElementById('buy').addEventListener('click', () => location.href = '/demo/cart.html');
  </script>
  <script src="/tracker.js" data-endpoint="/api/events"></script>
</body>
</html>
```

- [ ] **Step 4: Create `demo/cart.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Demo Shop — Cart</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 1rem; }
  ul { list-style: none; padding: 0; }
  li { border-bottom: 1px solid #eee; padding: .75rem 0; display: flex; justify-content: space-between; }
  button { padding: .75rem 1rem; border-radius: 6px; border: 1px solid #2563eb; background: #2563eb; color:white; cursor:pointer; margin-top:1rem; }
</style>
</head>
<body>
  <p><a href="/demo/">← Back</a></p>
  <h1>Your cart</h1>
  <ul>
    <li>Aurora Lamp <strong>$49</strong></li>
    <li>Glass Kettle <strong>$79</strong></li>
  </ul>
  <p>Total: <strong>$128</strong></p>
  <button id="checkout">Checkout</button>
  <script>
    document.getElementById('checkout').addEventListener('click', () => alert('Thanks!'));
  </script>
  <script src="/tracker.js" data-endpoint="/api/events"></script>
</body>
</html>
```

- [ ] **Step 5: Manual smoke test**

```powershell
docker compose up -d mongo
npm run build -w @causalfunnel/tracker
npm run dev -w @causalfunnel/backend
```

In a browser visit `http://localhost:4000/demo/` — click around. In another shell:
```powershell
curl http://localhost:4000/api/sessions
```

Expected: `{"sessions":[{...}], "total": 1, ...}` with eventCount > 0. Stop the dev server.

- [ ] **Step 6: Commit**

```powershell
git add packages/backend demo
git commit -m "feat(backend): serve tracker bundle and demo storefront pages"
```

---

## Task 12: Dashboard scaffold

**Files:**
- Create: `D:\causal\packages\dashboard\` (Next.js project)

- [ ] **Step 1: Create Next.js app**

Run from `D:\causal\packages\`:
```powershell
npx create-next-app@latest dashboard --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint --use-npm
```

Accept defaults for any prompt not specified. After it finishes, **rename** the resulting package: open `packages/dashboard/package.json` and set `"name": "@causalfunnel/dashboard"`. Remove `"private": true` if you want; doesn't matter inside a workspace.

- [ ] **Step 1b: Enable workspace-package transpile — modify `packages/dashboard/next.config.mjs`**

Replace with:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@causalfunnel/shared'],
};
export default nextConfig;
```

This is required because `@causalfunnel/shared` ships raw TypeScript (its `main` points at `src/index.ts`) and Next must transpile it.

- [ ] **Step 2: Install dashboard deps**

Run from `D:\causal`:
```powershell
npm install -w @causalfunnel/dashboard @tanstack/react-query@^5 @tanstack/react-query-devtools@^5 lucide-react recharts heatmap.js class-variance-authority clsx tailwind-merge
npm install -w @causalfunnel/dashboard -D @types/heatmap.js
```

Add the shared package dependency manually — open `packages/dashboard/package.json` and add to `dependencies`:
```json
"@causalfunnel/shared": "*"
```
Then run `npm install` from root.

- [ ] **Step 3: Initialize shadcn/ui**

```powershell
npx shadcn@latest init -d -y
```
Run inside `D:\causal\packages\dashboard`. Accept defaults (slate base color, CSS variables yes).

Then add the primitives we need:
```powershell
npx shadcn@latest add table button card skeleton input select badge dialog dropdown-menu
```

- [ ] **Step 4: Create `app/providers.tsx`**

```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: true } } }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Wrap layout — modify `app/layout.tsx`**

Replace the body inner with:
```tsx
import { Providers } from './providers';
// ...existing imports

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b px-6 py-3 flex items-center justify-between">
              <div className="font-semibold">CausalFunnel Analytics</div>
              <nav className="flex gap-4 text-sm">
                <a href="/sessions" className="hover:underline">Sessions</a>
                <a href="/heatmap" className="hover:underline">Heatmap</a>
                <a href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/demo/`} className="hover:underline" target="_blank" rel="noreferrer">Demo</a>
              </nav>
            </header>
            <main className="flex-1 p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create `lib/api.ts`** (typed fetch client)

```ts
import type { SessionSummary, HeatmapPoint, PageInfo, TrackingEventParsed } from '@causalfunnel/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  sessions: (opts: { limit?: number; offset?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set('limit', String(opts.limit));
    if (opts.offset !== undefined) qs.set('offset', String(opts.offset));
    if (opts.search) qs.set('search', opts.search);
    return get<{ sessions: SessionSummary[]; total: number; limit: number; offset: number }>(`/api/sessions?${qs}`);
  },
  sessionEvents: (id: string) => get<{ events: (TrackingEventParsed & { receivedAt: string })[] }>(`/api/sessions/${id}/events`),
  pages:   () => get<{ pages: PageInfo[] }>('/api/pages'),
  heatmap: (path: string) => get<{ points: HeatmapPoint[]; total: number; sampled: boolean; max: number }>(`/api/heatmap?path=${encodeURIComponent(path)}`),
};
```

- [ ] **Step 7: Make root redirect to /sessions — replace `app/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
export default function Page() { redirect('/sessions'); }
```

- [ ] **Step 8: Typecheck**

```powershell
npm run build -w @causalfunnel/dashboard
```

Expected: build succeeds. (You may need `NEXT_PUBLIC_API_URL` in `.env.local` to silence runtime warnings during build — not required to compile.)

- [ ] **Step 9: Commit**

```powershell
git add packages/dashboard
git commit -m "feat(dashboard): scaffold Next.js app with shadcn, tanstack query, api client"
```

---

## Task 13: Dashboard — Sessions View

**Files:**
- Create: `D:\causal\packages\dashboard\app\sessions\page.tsx`
- Create: `D:\causal\packages\dashboard\components\session-table.tsx`
- Create: `D:\causal\packages\dashboard\components\kpi-card.tsx`
- Create: `D:\causal\packages\dashboard\lib\format.ts`

- [ ] **Step 1: Create `lib/format.ts`**

```ts
export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function ms(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  const s = Math.round(durationMs / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function relative(date: string | Date): string {
  const t = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(t).toLocaleString();
}
```

- [ ] **Step 2: Create `components/kpi-card.tsx`**

```tsx
import { Card } from '@/components/ui/card';

export function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </Card>
  );
}
```

- [ ] **Step 3: Create `components/session-table.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { SessionSummary } from '@causalfunnel/shared';
import { shortId, ms, relative } from '@/lib/format';

export function SessionTable({ sessions }: { sessions: SessionSummary[] }) {
  if (!sessions.length) {
    return <div className="text-sm text-muted-foreground">No sessions yet. Open <code>/demo/</code> on the backend to generate some.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>First seen</TableHead>
          <TableHead>Last seen</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Pages</TableHead>
          <TableHead className="text-right">Events</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.sessionId} className="cursor-pointer hover:bg-muted/40">
            <TableCell>
              <Link href={`/sessions/${s.sessionId}`} className="font-mono text-xs">
                {shortId(s.sessionId)}
              </Link>
            </TableCell>
            <TableCell className="text-sm">{relative(s.firstSeen)}</TableCell>
            <TableCell className="text-sm">{relative(s.lastSeen)}</TableCell>
            <TableCell className="text-sm">{ms(s.durationMs)}</TableCell>
            <TableCell className="text-right"><Badge variant="secondary">{s.pageCount}</Badge></TableCell>
            <TableCell className="text-right font-medium">{s.eventCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Create `app/sessions/page.tsx`**

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { SessionTable } from '@/components/session-table';
import { KpiCard } from '@/components/kpi-card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function SessionsPage() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', { search, offset, limit }],
    queryFn: () => api.sessions({ search, offset, limit }),
    refetchInterval: 10_000,
  });

  const totalEvents = data?.sessions.reduce((acc, s) => acc + s.eventCount, 0) ?? 0;
  const activeLastHour = data?.sessions.filter((s) => Date.now() - new Date(s.lastSeen).getTime() < 3_600_000).length ?? 0;
  const avg = data?.sessions.length ? Math.round(totalEvents / data.sessions.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total sessions" value={data?.total ?? '—'} />
        <KpiCard label="Events (page)" value={totalEvents} hint="this page only" />
        <KpiCard label="Active last hour" value={activeLastHour} />
        <KpiCard label="Avg events / session" value={avg} />
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by session ID…"
          value={search}
          onChange={(e) => { setOffset(0); setSearch(e.target.value); }}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <>
          <SessionTable sessions={data?.sessions ?? []} />
          <div className="flex justify-between text-sm">
            <button className="underline disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>← Previous</button>
            <button className="underline disabled:opacity-50" disabled={!data || offset + limit >= data.total} onClick={() => setOffset(offset + limit)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Smoke run**

```powershell
npm run dev -w @causalfunnel/dashboard
```

Visit `http://localhost:3000/sessions`. Confirm the table renders (will be empty until backend has data).

- [ ] **Step 6: Commit**

```powershell
git add packages/dashboard
git commit -m "feat(dashboard): sessions list view with KPIs and search"
```

---

## Task 14: Dashboard — Session detail

**Files:**
- Create: `D:\causal\packages\dashboard\app\sessions\[id]\page.tsx`
- Create: `D:\causal\packages\dashboard\components\event-timeline.tsx`
- Create: `D:\causal\packages\dashboard\components\events-by-type-donut.tsx`

- [ ] **Step 1: Create `components/event-timeline.tsx`**

```tsx
'use client';
import Link from 'next/link';
import type { TrackingEventParsed } from '@causalfunnel/shared';

function fmtDelta(prev: Date | null, curr: Date): string {
  if (!prev) return '';
  const ms = curr.getTime() - prev.getTime();
  if (ms < 1000) return `+${ms}ms`;
  return `+${Math.round(ms / 1000)}s`;
}

export function EventTimeline({ events }: { events: TrackingEventParsed[] }) {
  if (!events.length) return <div className="text-sm text-muted-foreground">No events for this session.</div>;
  let prev: Date | null = null;
  return (
    <ol className="relative border-l pl-6 space-y-4">
      {events.map((e, i) => {
        const ts = new Date(e.timestamp);
        const delta = fmtDelta(prev, ts);
        prev = ts;
        const icon = e.type === 'page_view' ? '👁' : '🖱';
        return (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs">{icon}</span>
            <div className="text-sm font-medium">
              {e.type === 'page_view' ? 'Page view' : 'Click'} · <span className="font-mono text-xs text-muted-foreground">{e.path}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {ts.toLocaleTimeString()} {delta ? `(${delta})` : ''}
              {e.type === 'click' && e.selector ? ` · ${e.selector}` : ''}
            </div>
            {e.type === 'page_view' ? (
              <Link className="text-xs underline" href={`/heatmap?path=${encodeURIComponent(e.path)}`}>Open heatmap for this page →</Link>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Create `components/events-by-type-donut.tsx`**

```tsx
'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#2563eb', '#16a34a'];

export function EventsByTypeDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="name">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create `app/sessions/[id]/page.tsx`**

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EventTimeline } from '@/components/event-timeline';
import { EventsByTypeDonut } from '@/components/events-by-type-donut';
import { ms } from '@/lib/format';

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.sessionEvents(id),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const events = data?.events ?? [];
  const first = events[0] ? new Date(events[0].timestamp) : null;
  const last  = events.length ? new Date(events[events.length - 1].timestamp) : null;
  const durationMs = first && last ? last.getTime() - first.getTime() : 0;
  const counts = events.reduce<Record<string, number>>((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc; }, {});
  const donut = [
    { name: 'Page views', value: counts.page_view ?? 0 },
    { name: 'Clicks',     value: counts.click ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-xl font-semibold">Session</h1>
        <code className="text-sm text-muted-foreground">{id}</code>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 md:col-span-2 space-y-1">
          <div className="text-sm">First seen: {first?.toLocaleString() ?? '—'}</div>
          <div className="text-sm">Last seen: {last?.toLocaleString() ?? '—'}</div>
          <div className="text-sm">Duration: {ms(durationMs)}</div>
          <div className="text-sm">Events: <strong>{events.length}</strong></div>
        </Card>
        <Card className="p-4"><EventsByTypeDonut data={donut} /></Card>
      </div>
      <Card className="p-6">
        <EventTimeline events={events} />
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke**

With backend running and demo clicks generated, visit `http://localhost:3000/sessions` and click a row. Confirm timeline renders.

- [ ] **Step 5: Commit**

```powershell
git add packages/dashboard
git commit -m "feat(dashboard): session detail with timeline and event-type donut"
```

---

## Task 15: Dashboard — Heatmap View

**Files:**
- Create: `D:\causal\packages\dashboard\app\heatmap\page.tsx`
- Create: `D:\causal\packages\dashboard\components\heatmap-canvas.tsx`

- [ ] **Step 1: Create `components/heatmap-canvas.tsx`**

```tsx
'use client';
import { useEffect, useRef } from 'react';
import h337 from 'heatmap.js';
import type { HeatmapPoint } from '@causalfunnel/shared';

interface Props {
  points: HeatmapPoint[];
  width: number;
  height: number;
}

export function HeatmapCanvas({ points, width, height }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const instance = h337.create({
      container: ref.current,
      radius: 30, maxOpacity: 0.7, minOpacity: 0.1, blur: 0.85,
    });
    const normalized = points.map((p) => {
      const sx = p.viewportW ? width / p.viewportW : 1;
      const sy = p.viewportH ? height / p.viewportH : 1;
      return { x: Math.round(p.x * sx), y: Math.round(p.y * sy), value: 1 };
    });
    const max = Math.max(5, ...normalized.map(() => 1));
    instance.setData({ max, data: normalized });
  }, [points, width, height]);

  return (
    <div className="relative border rounded-md overflow-hidden" style={{ width, height, background: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(0,0,0,0.03) 12px 13px)' }}>
      <div ref={ref} style={{ width, height }} />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/heatmap/page.tsx`**

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeatmapCanvas } from '@/components/heatmap-canvas';

const SIZES = [
  { label: 'Desktop 1440', w: 1440, h: 900 },
  { label: 'Laptop 1280',  w: 1280, h: 800 },
  { label: 'Tablet 768',   w: 768,  h: 1024 },
  { label: 'Mobile 390',   w: 390,  h: 844 },
];

export default function HeatmapPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialPath = params.get('path') ?? '';
  const [path, setPath] = useState(initialPath);
  const [size, setSize] = useState(SIZES[0]);

  const { data: pagesData } = useQuery({ queryKey: ['pages'], queryFn: () => api.pages() });
  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['heatmap', path],
    queryFn: () => api.heatmap(path),
    enabled: !!path,
  });

  useEffect(() => {
    if (!path && pagesData?.pages[0]) setPath(pagesData.pages[0].path);
  }, [pagesData, path]);

  useEffect(() => {
    const sp = new URLSearchParams(params.toString());
    if (path) sp.set('path', path); else sp.delete('path');
    router.replace(`/heatmap?${sp.toString()}`);
  }, [path]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Page</div>
          <Select value={path} onValueChange={setPath}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Pick a page…" /></SelectTrigger>
            <SelectContent>
              {pagesData?.pages.map((p) => (
                <SelectItem key={p.path} value={p.path}>
                  <span className="font-mono text-xs">{p.path}</span>
                  <span className="ml-2 text-muted-foreground">{p.clickCount} clicks</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Viewport</div>
          <Select value={size.label} onValueChange={(v) => setSize(SIZES.find((s) => s.label === v)!)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_280px] gap-6">
        <Card className="p-4">
          {isLoading ? (
            <Skeleton style={{ width: size.w, height: size.h }} />
          ) : heatmapData?.points.length ? (
            <HeatmapCanvas points={heatmapData.points} width={size.w} height={size.h} />
          ) : (
            <div className="text-sm text-muted-foreground">No clicks recorded for this page yet.</div>
          )}
        </Card>
        <Card className="p-4 space-y-2 h-fit">
          <div className="text-xs uppercase text-muted-foreground">Stats</div>
          <div className="text-sm">Total clicks: <strong>{heatmapData?.total ?? 0}</strong></div>
          {heatmapData?.sampled ? <div className="text-xs text-amber-600">Sampled to {heatmapData.max} points</div> : null}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

With backend + demo generating events, visit `http://localhost:3000/heatmap`. Confirm the page selector lists `/demo/`, `/demo/product.html`, `/demo/cart.html` and the heatmap canvas renders.

- [ ] **Step 4: Commit**

```powershell
git add packages/dashboard
git commit -m "feat(dashboard): heatmap view with page picker and viewport scaling"
```

---

## Task 16: Dockerfile for backend + Playwright smoke test

**Files:**
- Create: `D:\causal\packages\backend\Dockerfile`
- Create: `D:\causal\packages\dashboard\playwright.config.ts`
- Create: `D:\causal\packages\dashboard\tests\e2e\smoke.spec.ts`
- Modify: `D:\causal\packages\dashboard\package.json` (add Playwright)

- [ ] **Step 1: Create `packages/backend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json   packages/shared/package.json
COPY packages/tracker/package.json  packages/tracker/package.json
COPY packages/backend/package.json  packages/backend/package.json
RUN npm install --workspaces --include-workspace-root
COPY packages/shared  packages/shared
COPY packages/tracker packages/tracker
COPY packages/backend packages/backend
COPY demo demo
RUN npm run build -w @causalfunnel/tracker
RUN npm run build -w @causalfunnel/backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/package.json /repo/package-lock.json ./
COPY --from=builder /repo/packages/shared        /app/packages/shared
COPY --from=builder /repo/packages/tracker/dist  /app/packages/tracker/dist
COPY --from=builder /repo/packages/tracker/package.json /app/packages/tracker/package.json
COPY --from=builder /repo/packages/backend/dist  /app/packages/backend/dist
COPY --from=builder /repo/packages/backend/package.json /app/packages/backend/package.json
COPY --from=builder /repo/demo /app/demo
RUN npm install --omit=dev --workspaces --include-workspace-root
EXPOSE 4000
WORKDIR /app/packages/backend
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Install Playwright**

```powershell
npm install -w @causalfunnel/dashboard -D @playwright/test
npx playwright install chromium --with-deps
```
(`--with-deps` may not work on Windows; if it errors, just run `npx playwright install chromium`.)

- [ ] **Step 3: Create `packages/dashboard/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000', headless: true, ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 4: Create `packages/dashboard/tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('sessions page loads', async ({ page }) => {
  await page.goto('/sessions');
  await expect(page.getByText('CausalFunnel Analytics')).toBeVisible();
  await expect(page.locator('text=Total sessions').first()).toBeVisible();
});

test('heatmap page loads', async ({ page }) => {
  await page.goto('/heatmap');
  await expect(page.getByText('Page', { exact: false })).toBeVisible();
});
```

- [ ] **Step 5: Add Playwright script — modify `packages/dashboard/package.json` scripts**

Add:
```json
"e2e": "playwright test"
```

- [ ] **Step 6: Run the smoke test**

Backend should be running. Then:
```powershell
npm run e2e -w @causalfunnel/dashboard
```

Expected: 2 tests pass.

- [ ] **Step 7: Commit**

```powershell
git add packages/backend/Dockerfile packages/dashboard
git commit -m "chore: backend Dockerfile and Playwright dashboard smoke tests"
```

---

## Task 17: README and deployment

**Files:**
- Create: `D:\causal\README.md`
- Create: `D:\causal\packages\backend\render.yaml` (optional but nice)

- [ ] **Step 1: Create `README.md`**

```markdown
# CausalFunnel Analytics

A minimal user-analytics platform: a JS tracker, a Node/Express/Mongo backend, and a Next.js dashboard with Sessions and Heatmap views. Built as a take-home for the CausalFunnel Full Stack Engineer role.

## Live demo

- Dashboard: `https://<your-vercel-url>`
- Demo storefront (instrumented): `https://<your-render-url>/demo/`
- Backend API: `https://<your-render-url>/api`

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
| Frontend   | Next.js 14 (App Router), TanStack Query, Tailwind, shadcn/ui, recharts, heatmap.js |
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
| POST | `/api/events` | Body: single event or array (max 100). Rate-limited 100/min/IP. |
| GET  | `/api/sessions` | Query: `limit`, `offset`, `search`. Returns aggregated sessions. |
| GET  | `/api/sessions/:id/events` | Ordered events for the session. |
| GET  | `/api/heatmap?path=...` | Click points for a page (capped at 5000, sampled if exceeded). |
| GET  | `/api/pages` | Distinct paths with click counts. |
| GET  | `/healthz` | Liveness. |

## Tests

```bash
npm test                     # all packages
npm test -w @causalfunnel/backend
npm test -w @causalfunnel/tracker
npm run e2e -w @causalfunnel/dashboard
```

## Deployment

**MongoDB Atlas** — create a free M0 cluster, allowlist `0.0.0.0/0` for the demo (note in trade-offs below), copy the URI.

**Backend on Render** — connect this repo, set root directory to repo root, select the `packages/backend/Dockerfile`. Env vars: `MONGODB_URI`, `CORS_ORIGINS=https://<your-vercel-url>`.

**Dashboard on Vercel** — set the root directory to `packages/dashboard`. Env var: `NEXT_PUBLIC_API_URL=https://<your-render-url>`. Build command and output dir use Vercel defaults for Next.js.

## Assumptions and trade-offs

- **No dashboard auth.** Out of scope per the assignment. In production, the dashboard would require auth (and likely tenancy keys for the tracker).
- **Polling, not WebSockets.** Sessions list polls every 10s. WebSockets/SSE are listed in "what I'd do next."
- **Session ID rotates after 30 min inactivity.** A common heuristic; configurable in real deployments.
- **CORS is open on `/api/events`.** That's the right call for an analytics endpoint hit from arbitrary sites; the dashboard endpoints are similarly open here purely for the demo. Production would restrict `/api/sessions*` and `/api/heatmap` to the dashboard origin.
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
└─ dashboard/   Next.js 14 dashboard
demo/           3-page mock storefront served by the backend
```
```

- [ ] **Step 2: Optional — `render.yaml` for Render**

```yaml
services:
  - type: web
    name: causalfunnel-backend
    runtime: docker
    dockerfilePath: ./packages/backend/Dockerfile
    dockerContext: ./
    plan: free
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: CORS_ORIGINS
        sync: false
      - key: NODE_ENV
        value: production
```

- [ ] **Step 3: Final commit**

```powershell
git add README.md packages/backend/render.yaml
git commit -m "docs: README with setup, API reference, deployment, and trade-offs"
```

- [ ] **Step 4: Push and create the GitHub repo**

```powershell
gh repo create causalfunnel-analytics --public --source=. --remote=origin --push
```

(Or create the repo manually on GitHub and `git remote add origin ...; git push -u origin main`.)

- [ ] **Step 5: Deploy**

1. **Atlas:** create cluster, user, allowlist; copy URI.
2. **Render:** new web service from this repo, Docker build using `packages/backend/Dockerfile`; set env vars; deploy.
3. **Vercel:** import the repo, set root dir to `packages/dashboard`; set `NEXT_PUBLIC_API_URL`; deploy.
4. Edit README live demo links to the real URLs and commit one more time.

---

## Spec coverage check (self-review)

| Spec section | Implemented by |
|---|---|
| §4 Architecture / monorepo | Tasks 1–2 |
| §5 Data model | Tasks 2, 4 |
| §6 Tracker SDK | Tasks 8–10 |
| §7 Backend API endpoints | Tasks 5, 6, 7 |
| §7 Rate limiting | Task 5 |
| §7 Standardized error envelope | Task 3 (errors.ts) |
| §8 Dashboard /sessions | Task 13 |
| §8 Dashboard /sessions/[id] | Task 14 |
| §8 Dashboard /heatmap | Task 15 |
| §9 Demo pages | Task 11 |
| §10 Deployment (Vercel + Render + Atlas) | Task 16 (Dockerfile), Task 17 |
| §11 Tests (backend / tracker / Playwright) | Tasks 5, 6, 7, 8, 9, 10, 16 |
| §12 README | Task 17 |

No placeholders. Type names consistent across tasks (`SessionSummary`, `HeatmapPoint`, `PageInfo`, `TrackingEventParsed`, transport `{ send, flush }`).
