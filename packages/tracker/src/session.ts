export const INACTIVITY_MS = 30 * 60 * 1000;
const KEY_ID = 'cf_session_id';
const KEY_LAST = 'cf_session_last';

function fillRandom(bytes: Uint8Array): void {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
}

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  fillRandom(bytes);
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
