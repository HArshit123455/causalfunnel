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
