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
