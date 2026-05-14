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

export { createTransport } from './transport.js';
export { initCapture } from './capture.js';
export { getSessionId } from './session.js';
