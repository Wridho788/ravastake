import { useId } from 'react';
import { formatUsdCents } from '../domain/format';

interface PriceChartProps {
  /** Daily observations in USD cents, oldest first. */
  series: number[];
  label: string;
}

const WIDTH = 320;
const HEIGHT = 120;
const PAD = 8;

/**
 * Plain SVG line chart. The data is also available as a table (accessible alternative,
 * DESIGN_SPEC "Aksesibilitas"); the SVG itself carries a numeric summary.
 */
export function PriceChart({ series, label }: PriceChartProps) {
  const tableId = useId();
  if (series.length === 0) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = series.length > 1 ? (WIDTH - PAD * 2) / (series.length - 1) : 0;
  const points = series
    .map((value, i) => {
      const x = PAD + i * step;
      const y = PAD + (HEIGHT - PAD * 2) * (1 - (value - min) / span);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? 0;
  const change = first === 0 ? 0 : ((last - first) / first) * 100;
  const summary = `${label}: terendah ${formatUsdCents(BigInt(min))}, tertinggi ${formatUsdCents(BigInt(max))}, terakhir ${formatUsdCents(BigInt(last))} (${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')}% dari awal periode).`;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="chart__svg" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
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
