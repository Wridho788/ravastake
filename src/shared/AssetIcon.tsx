import type { CSSProperties } from 'react';

const COLORS: Record<string, [string, string]> = {
  ETH: ['#9aa6e8', '#4f58a6'],
  SOL: ['#3fe0b5', '#8a4dff'],
  AVAX: ['#ff7a7a', '#c92f3a'],
};
const FALLBACK: [string, string] = ['#b9a0ff', '#6b4fd8'];

/**
 * Original monogram tile per asset (not a brand logo, DESIGN_SPEC). The glyph comes from CSS
 * `attr(data-glyph)`, so it adds nothing to the text content or accessible name of its container.
 */
export function AssetIcon({ symbol, size = 'md' }: { symbol: string; size?: 'sm' | 'md' | 'lg' }) {
  const [from, to] = COLORS[symbol] ?? FALLBACK;
  const style = { '--asset-from': from, '--asset-to': to } as CSSProperties;
  return <span className={`asset-icon asset-icon--${size}`} style={style} data-glyph={symbol.slice(0, 1)} aria-hidden="true" />;
}

// eslint-disable-next-line react-refresh/only-export-components -- shared with the allocation bars
export function assetColors(symbol: string): CSSProperties {
  const [from, to] = COLORS[symbol] ?? FALLBACK;
  return { '--asset-from': from, '--asset-to': to } as CSSProperties;
}
