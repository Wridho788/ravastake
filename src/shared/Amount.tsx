import { formatUnits } from '../domain/format';

interface AmountProps {
  units: bigint;
  symbol?: string;
  testId?: string;
  className?: string;
}

/**
 * Renders base units with the shared exact formatter. `data-units` carries the raw value,
 * which E2E and the Ledger X-ray compare against (TRD "Formatter").
 */
export function Amount({ units, symbol, testId, className }: AmountProps) {
  return (
    <span className={`amount ${className ?? ''}`.trim()} data-units={units.toString()} data-testid={testId}>
      {formatUnits(units)}
      {symbol ? <span className="amount__symbol"> {symbol}</span> : null}
    </span>
  );
}
