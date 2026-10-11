import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { formatSignedPercent } from '../domain/format';

/** Signed change with colour, arrow, and sign, so the direction never depends on colour alone. */
export function Delta({ ratio, period }: { ratio: number; period?: string }) {
  const rounded = Math.round(ratio * 1000);
  const tone = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const Icon = tone === 'up' ? ArrowUpRight : tone === 'down' ? ArrowDownRight : ArrowRight;
  return (
    <span className={`delta delta--${tone}`}>
      <span className="delta__icon">
        <Icon />
      </span>
      {formatSignedPercent(rounded / 1000)}
      {period ? <span className="delta__period">{period}</span> : null}
    </span>
  );
}
