'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { SessionTable } from '@/components/session-table';
import { KpiCard } from '@/components/kpi-card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function SessionsPage() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', { search, offset, limit }],
    queryFn: () => api.sessions({ search, offset, limit }),
    refetchInterval: 10_000,
  });

  const totalEvents = data?.sessions.reduce((acc, s) => acc + s.eventCount, 0) ?? 0;
  const activeLastHour = data?.sessions.filter((s) => Date.now() - new Date(s.lastSeen).getTime() < 3_600_000).length ?? 0;
  const avg = data?.sessions.length ? Math.round(totalEvents / data.sessions.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total sessions" value={data?.total ?? '—'} />
        <KpiCard label="Events (page)" value={totalEvents} hint="this page only" />
        <KpiCard label="Active last hour" value={activeLastHour} />
        <KpiCard label="Avg events / session" value={avg} />
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by session ID…"
          value={search}
          onChange={(e) => { setOffset(0); setSearch(e.target.value); }}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <>
          <SessionTable sessions={data?.sessions ?? []} />
          <div className="flex justify-between text-sm">
            <button className="underline disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>← Previous</button>
            <button className="underline disabled:opacity-50" disabled={!data || offset + limit >= data.total} onClick={() => setOffset(offset + limit)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
