import { useId } from 'react';
import { plotSeries, seriesChange, svgId } from './chartGeometry';

const WIDTH = 100;
const HEIGHT = 40;

interface SparklineProps {
  series: number[];
  /** Small value tag next to the last point (e.g. the change in USD). */
  bubble?: string;
  className?: string;
}

/**
 * Decorative trend line. The numbers it shows are always present as text next to it
 * (rate, delta, price), so the drawing itself is hidden from assistive technology.
 */
export function Sparkline({ series, bubble, className }: SparklineProps) {
  const id = svgId(useId());
  if (series.length < 2) return null;
  // The line stops short of the right edge so the last-point marker is never clipped by the card.
  const plot = plotSeries(series, WIDTH - 6, HEIGHT, 7);
  const [lastX, lastY] = plot.points[plot.points.length - 1] ?? [WIDTH, HEIGHT / 2];
  const tone = seriesChange(series) < 0 ? 'down' : 'up';
  const dot = { left: `${(lastX / WIDTH) * 100}%`, top: `${(lastY / HEIGHT) * 100}%` };

  return (
    <span className={`spark spark--${tone} ${className ?? ''}`.trim()} aria-hidden="true">
      <svg className="spark__svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="0.6" stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="1" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        <line className="spark__baseline" x1="0" x2={WIDTH} y1={plot.baselineY} y2={plot.baselineY} vectorEffect="non-scaling-stroke" />
        <path d={plot.area} fill={`url(#${id}-fill)`} />
        <path d={plot.line} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2.25" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="spark__dot" style={dot} />
      {bubble ? (
        <span className={`spark__bubble ${lastY / HEIGHT < 0.4 ? 'spark__bubble--below' : ''}`} style={dot}>
          {bubble}
        </span>
      ) : null}
    </span>
  );
}
