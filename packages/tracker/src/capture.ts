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
