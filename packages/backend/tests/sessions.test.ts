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
