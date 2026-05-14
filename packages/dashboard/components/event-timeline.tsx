'use client';
import Link from 'next/link';
import type { TrackingEventParsed } from '@causalfunnel/shared';

function fmtDelta(prev: Date | null, curr: Date): string {
  if (!prev) return '';
  const ms = curr.getTime() - prev.getTime();
  if (ms < 1000) return `+${ms}ms`;
  return `+${Math.round(ms / 1000)}s`;
}

export function EventTimeline({ events }: { events: TrackingEventParsed[] }) {
  if (!events.length) return <div className="text-sm text-muted-foreground">No events for this session.</div>;
  let prev: Date | null = null;
  return (
    <ol className="relative border-l pl-6 space-y-4">
      {events.map((e, i) => {
        const ts = new Date(e.timestamp);
        const delta = fmtDelta(prev, ts);
        prev = ts;
        const icon = e.type === 'page_view' ? '👁' : '🖱';
        return (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs">{icon}</span>
            <div className="text-sm font-medium">
              {e.type === 'page_view' ? 'Page view' : 'Click'} · <span className="font-mono text-xs text-muted-foreground">{e.path}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {ts.toLocaleTimeString()} {delta ? `(${delta})` : ''}
              {e.type === 'click' && e.selector ? ` · ${e.selector}` : ''}
            </div>
            {e.type === 'page_view' ? (
              <Link className="text-xs underline" href={`/heatmap?path=${encodeURIComponent(e.path)}`}>Open heatmap for this page →</Link>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
