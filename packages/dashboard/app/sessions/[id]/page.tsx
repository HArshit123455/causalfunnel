'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EventTimeline } from '@/components/event-timeline';
import { EventsByTypeDonut } from '@/components/events-by-type-donut';
import { ms } from '@/lib/format';

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.sessionEvents(id),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const events = data?.events ?? [];
  const first = events[0] ? new Date(events[0].timestamp) : null;
  const last  = events.length ? new Date(events[events.length - 1].timestamp) : null;
  const durationMs = first && last ? last.getTime() - first.getTime() : 0;
  const counts = events.reduce<Record<string, number>>((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc; }, {});
  const donut = [
    { name: 'Page views', value: counts.page_view ?? 0 },
    { name: 'Clicks',     value: counts.click ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-xl font-semibold">Session</h1>
        <code className="text-sm text-muted-foreground">{id}</code>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 md:col-span-2 space-y-1">
          <div className="text-sm">First seen: {first?.toLocaleString() ?? '—'}</div>
          <div className="text-sm">Last seen: {last?.toLocaleString() ?? '—'}</div>
          <div className="text-sm">Duration: {ms(durationMs)}</div>
          <div className="text-sm">Events: <strong>{events.length}</strong></div>
        </Card>
        <Card className="p-4"><EventsByTypeDonut data={donut} /></Card>
      </div>
      <Card className="p-6">
        <EventTimeline events={events} />
      </Card>
    </div>
  );
}
