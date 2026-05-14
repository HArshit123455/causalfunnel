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
      const ok = beacon.call(navigator, endpoint, body);
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
