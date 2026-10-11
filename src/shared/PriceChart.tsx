import { useId } from 'react';
import { formatUsdCents } from '../domain/format';
import { plotSeries, seriesChange, svgId } from './chartGeometry';

interface PriceChartProps {
  /** Daily observations in USD cents, oldest first. */
  series: number[];
  label: string;
}

const WIDTH = 320;
const HEIGHT = 120;

/**
 * SVG area chart. The data is also available as a table (accessible alternative,
 * DESIGN_SPEC "Aksesibilitas"); the SVG itself carries a numeric summary.
 */
export function PriceChart({ series, label }: PriceChartProps) {
  const tableId = useId();
  const gradientId = `chart-${svgId(useId())}`;
  if (series.length === 0) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? 0;
  const change = first === 0 ? 0 : ((last - first) / first) * 100;
  const summary = `${label}: terendah ${formatUsdCents(BigInt(min))}, tertinggi ${formatUsdCents(BigInt(max))}, terakhir ${formatUsdCents(BigInt(last))} (${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')}% dari awal periode).`;
  const plot = plotSeries(series, WIDTH, HEIGHT, 10);
  const [lastX, lastY] = plot.points[plot.points.length - 1] ?? [WIDTH, HEIGHT / 2];

  return (
    <figure className={`chart ${seriesChange(series) < 0 ? 'chart--down' : ''}`}>
      <div className="chart__plot">
        <span className="chart__guide chart__guide--max" aria-hidden="true">
          {formatUsdCents(BigInt(max))}
        </span>
        <span className="chart__guide chart__guide--min" aria-hidden="true">
          {formatUsdCents(BigInt(min))}
        </span>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="chart__svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            className="spark__baseline"
            x1="0"
            x2={WIDTH}
            y1={plot.baselineY}
            y2={plot.baselineY}
            vectorEffect="non-scaling-stroke"
          />
          <path d={plot.area} fill={`url(#${gradientId})`} />
          <path d={plot.line} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="spark__dot"
          aria-hidden="true"
          style={{ left: `${(lastX / WIDTH) * 100}%`, top: `calc(16px + (100% - 24px) * ${lastY / HEIGHT})` }}
        />
      </div>
      <figcaption className="muted small">{summary}</figcaption>
      <details className="chart__table">
        <summary>Tabel data ({series.length} hari)</summary>
        <table aria-describedby={tableId} data-testid="chart-table">
          <caption id={tableId} className="visually-hidden">
            {label}
          </caption>
          <thead>
            <tr>
              <th scope="col">Hari</th>
              <th scope="col">Harga</th>
            </tr>
          </thead>
          <tbody>
            {series.map((value, i) => (
              <tr key={i}>
                <td>{i - series.length + 1 === 0 ? 'Hari ini' : `H${i - series.length + 1}`}</td>
                <td>{formatUsdCents(BigInt(value))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
