'use client';
import { useEffect, useRef } from 'react';
import * as h337Mod from 'heatmap.js';
import type { HeatmapPoint } from '@causalfunnel/shared';

// heatmap.js ships as a UMD bundle; the default export may be nested
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const h337 = ((h337Mod as any).default ?? h337Mod) as typeof h337Mod;

interface Props {
  points: HeatmapPoint[];
  width: number;
  height: number;
}

export function HeatmapCanvas({ points, width, height }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const instance = h337.create({
      container: ref.current,
      radius: 30,
      maxOpacity: 0.7,
      minOpacity: 0.1,
      blur: 0.85,
    });
    const normalized = points.map((p) => {
      const sx = p.viewportW ? width / p.viewportW : 1;
      const sy = p.viewportH ? height / p.viewportH : 1;
      return { x: Math.round(p.x * sx), y: Math.round(p.y * sy), value: 1 };
    });
    const max = Math.max(5, ...normalized.map(() => 1));
    instance.setData({ min: 0, max, data: normalized });
  }, [points, width, height]);

  return (
    <div
      className="relative border rounded-md overflow-hidden"
      style={{
        width,
        height,
        background:
          'repeating-linear-gradient(45deg, transparent 0 12px, rgba(0,0,0,0.03) 12px 13px)',
      }}
    >
      <div ref={ref} style={{ width, height }} />
    </div>
  );
}
