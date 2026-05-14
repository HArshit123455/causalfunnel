'use client';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HeatmapCanvas } from '@/components/heatmap-canvas';

const SIZES = [
  { label: 'Desktop 1440', w: 1440, h: 900 },
  { label: 'Laptop 1280',  w: 1280, h: 800 },
  { label: 'Tablet 768',   w: 768,  h: 1024 },
  { label: 'Mobile 390',   w: 390,  h: 844 },
];

function HeatmapInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialPath = params.get('path') ?? '';
  const [path, setPath] = useState(initialPath);
  const [size, setSize] = useState(SIZES[0]);

  const { data: pagesData } = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.pages(),
  });
  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['heatmap', path],
    queryFn: () => api.heatmap(path),
    enabled: !!path,
  });

  useEffect(() => {
    if (!path && pagesData?.pages[0]) setPath(pagesData.pages[0].path);
  }, [pagesData, path]);

  useEffect(() => {
    const sp = new URLSearchParams(params.toString());
    if (path) sp.set('path', path);
    else sp.delete('path');
    router.replace(`/heatmap?${sp.toString()}`);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Page</div>
          <Select value={path} onValueChange={(v) => { if (v !== null) setPath(v); }}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pick a page…" />
            </SelectTrigger>
            <SelectContent>
              {pagesData?.pages.map((p) => (
                <SelectItem key={p.path} value={p.path}>
                  <span className="font-mono text-xs">{p.path}</span>
                  <span className="ml-2 text-muted-foreground">{p.clickCount} clicks</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Viewport</div>
          <Select
            value={size.label}
            onValueChange={(v) => { if (v !== null) setSize(SIZES.find((s) => s.label === v)!); }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s.label} value={s.label}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_280px] gap-6">
        <Card className="p-4">
          {isLoading ? (
            <Skeleton style={{ width: size.w, height: size.h }} />
          ) : heatmapData?.points.length ? (
            <HeatmapCanvas points={heatmapData.points} width={size.w} height={size.h} />
          ) : (
            <div className="text-sm text-muted-foreground">
              No clicks recorded for this page yet.
            </div>
          )}
        </Card>
        <Card className="p-4 space-y-2 h-fit">
          <div className="text-xs uppercase text-muted-foreground">Stats</div>
          <div className="text-sm">
            Total clicks: <strong>{heatmapData?.total ?? 0}</strong>
          </div>
          {heatmapData?.sampled ? (
            <div className="text-xs text-amber-600">
              Sampled to {heatmapData.max} points
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export default function HeatmapPage() {
  return (
    <Suspense fallback={null}>
      <HeatmapInner />
    </Suspense>
  );
}
