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
