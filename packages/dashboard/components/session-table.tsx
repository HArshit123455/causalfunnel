'use client';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { SessionSummary } from '@causalfunnel/shared';
import { shortId, ms, relative } from '@/lib/format';

export function SessionTable({ sessions }: { sessions: SessionSummary[] }) {
  if (!sessions.length) {
    return <div className="text-sm text-muted-foreground">No sessions yet. Open <code>/demo/</code> on the backend to generate some.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>First seen</TableHead>
          <TableHead>Last seen</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Pages</TableHead>
          <TableHead className="text-right">Events</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.sessionId} className="cursor-pointer hover:bg-muted/40">
            <TableCell>
              <Link href={`/sessions/${s.sessionId}`} className="font-mono text-xs">
                {shortId(s.sessionId)}
              </Link>
            </TableCell>
            <TableCell className="text-sm">{relative(s.firstSeen)}</TableCell>
            <TableCell className="text-sm">{relative(s.lastSeen)}</TableCell>
            <TableCell className="text-sm">{ms(s.durationMs)}</TableCell>
            <TableCell className="text-right"><Badge variant="secondary">{s.pageCount}</Badge></TableCell>
            <TableCell className="text-right font-medium">{s.eventCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
