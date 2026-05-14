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
