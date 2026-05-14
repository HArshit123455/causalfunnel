import type { SessionSummary, HeatmapPoint, PageInfo, TrackingEventParsed } from '@causalfunnel/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  sessions: (opts: { limit?: number; offset?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set('limit', String(opts.limit));
    if (opts.offset !== undefined) qs.set('offset', String(opts.offset));
    if (opts.search) qs.set('search', opts.search);
    return get<{ sessions: SessionSummary[]; total: number; limit: number; offset: number }>(`/api/sessions?${qs}`);
  },
  sessionEvents: (id: string) => get<{ events: (TrackingEventParsed & { receivedAt: string })[] }>(`/api/sessions/${id}/events`),
  pages:   () => get<{ pages: PageInfo[] }>('/api/pages'),
  heatmap: (path: string) => get<{ points: HeatmapPoint[]; total: number; sampled: boolean; max: number }>(`/api/heatmap?path=${encodeURIComponent(path)}`),
};
