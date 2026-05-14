export function cssPath(el: Element | null): string {
  if (!el) return '';
  const parts: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && cur.nodeType === 1 && depth < 5) {
    let part = cur.tagName.toLowerCase();
    if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
    const cls = (cur.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) part += '.' + cls.join('.');
    parts.unshift(part);
    cur = cur.parentElement;
    depth += 1;
  }
  return parts.join(' > ').slice(0, 512);
}
