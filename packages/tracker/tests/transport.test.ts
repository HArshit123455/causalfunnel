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
