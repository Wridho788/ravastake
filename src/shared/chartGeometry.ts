/** Geometry shared by the sparkline and the price chart. Display-only math on fixture series. */

export interface Plot {
  /** Points in viewBox units. */
  points: [number, number][];
  /** Smooth line path. */
  line: string;
  /** Closed area path down to the bottom edge. */
  area: string;
  /** Y of the first observation (dashed baseline). */
  baselineY: number;
}

export function plotSeries(series: number[], width: number, height: number, padY: number): Plot {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = series.length > 1 ? width / (series.length - 1) : 0;
  const y = (value: number) => padY + (height - padY * 2) * (1 - (value - min) / span);
  const points = series.map((value, i): [number, number] => [i * step, y(value)]);
  const line = smoothPath(points);
  const last = points[points.length - 1] ?? [0, 0];
  const first = points[0] ?? [0, 0];
  return {
    points,
    line,
    area: `${line} L${last[0].toFixed(2)},${height} L${first[0].toFixed(2)},${height} Z`,
    baselineY: y(series[0] ?? min),
  };
}

/** Catmull-Rom spline through every point, as cubic Bézier segments. */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  const [x0, y0] = points[0] ?? [0, 0];
  let d = `M${x0.toFixed(2)},${y0.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Relative change from the first to the last observation, e.g. 0.023 for +2,3%. */
export function seriesChange(series: number[]): number {
  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? 0;
  return first === 0 ? 0 : (last - first) / first;
}

/** SVG ids from useId() contain characters that break url(#id) references. */
export function svgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '');
}
