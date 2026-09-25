'use client';

import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { HistoryPoint, Locale } from '../types';
import { Money } from './money';

type PriceHistoryChartProps = {
  points: Array<Pick<HistoryPoint, 'capturedAt' | 'minBuyoutCopper'>>;
  locale?: Locale;
};

export function PriceHistoryChart({ points, locale }: PriceHistoryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartLocale: Locale = locale ?? (typeof navigator !== 'undefined' && navigator.language.startsWith('es') ? 'es-MX' : 'en-US');

  if (points.length < 2) {
    return <div className="grid h-36 place-items-center rounded border border-dashed border-[#514a45] text-sm text-[#9d968e]">{chartLocale === 'es-MX' ? 'Se necesitan más capturas para dibujar una tendencia.' : 'More captures are needed to draw a trend.'}</div>;
  }

  const values = points.map((point) => Number(point.minBuyoutCopper));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pointX = (index: number) => 8 + (index / (points.length - 1)) * 584;
  const pointY = (index: number) => 132 - ((values[index] - min) / span) * 116;
  const path = points.map((_, index) => `${index ? 'L' : 'M'} ${pointX(index)} ${pointY(index)}`).join(' ');
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];

  const handlePointerMove = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setHoveredIndex(Math.round(ratio * (points.length - 1)));
  };
  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = hoveredIndex ?? points.length - 1;
    setHoveredIndex(Math.max(0, Math.min(points.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))));
  };

  return <div className="relative rounded border border-[#4d453f] bg-[#171413] p-2">
    <svg viewBox="0 0 600 140" role="slider" tabIndex={0} aria-label={chartLocale === 'es-MX' ? 'Historial del precio mínimo' : 'Minimum price history'} aria-valuemin={0} aria-valuemax={points.length - 1} aria-valuenow={hoveredIndex ?? points.length - 1} onKeyDown={handleKeyDown} onMouseMove={handlePointerMove} onMouseLeave={() => setHoveredIndex(null)} className="h-40 w-full cursor-crosshair overflow-visible touch-none">
      <path d="M 8 16 H 592 M 8 74 H 592 M 8 132 H 592" stroke="#312c29"/>
      <path d={path} fill="none" stroke="#e8c94d" strokeWidth="3" strokeLinejoin="round"/>
      {hoveredIndex !== null && <><line x1={pointX(hoveredIndex)} x2={pointX(hoveredIndex)} y1="8" y2="132" stroke="#e8c94d" strokeWidth="1"/><circle cx={pointX(hoveredIndex)} cy={pointY(hoveredIndex)} r="4" fill="#fff17a" stroke="#171413" strokeWidth="2"/></>}
      <circle cx="592" cy={pointY(points.length - 1)} r="4" fill="#fff17a"/>
    </svg>
    {hoveredPoint && <div className="pointer-events-none absolute top-3 z-10 rounded border border-[#7b7a9e] bg-[#101426] px-3 py-2 text-xs text-[#f3f0ea] shadow-lg" style={{ left: `${Math.max(4, Math.min(72, (pointX(hoveredIndex!) / 600) * 100))}%` }}><time className="block text-[#d9d6ff]">{new Date(hoveredPoint.capturedAt).toLocaleString(chartLocale)}</time><span className="mt-1 flex items-center justify-between gap-4"><b className="font-normal text-[#9ea2ff]">{chartLocale === 'es-MX' ? 'Precio' : 'Price'}</b><Money copper={hoveredPoint.minBuyoutCopper}/></span></div>}
    <div className="flex justify-between text-xs text-[#8f8983]"><span>{new Date(points[0].capturedAt).toLocaleDateString(chartLocale)}</span><span>{new Date(points.at(-1)!.capturedAt).toLocaleDateString(chartLocale)}</span></div>
  </div>;
}
