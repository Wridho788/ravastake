import { useId } from 'react';

/** RavaStake's own mark (stacked layers = staking). Decorative; the brand name is always next to it. */
export function BrandMark({ small = false }: { small?: boolean }) {
  // Each instance needs its own gradient id: a gradient inside a hidden copy would not render elsewhere.
  const gradientId = `brand-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg className={`brand-mark ${small ? 'brand-mark--sm' : ''}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3daff" />
          <stop offset="0.55" stopColor="#a88bff" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d="M16 7.5 24.5 12 16 16.5 7.5 12Z" fill="#0b0912" />
      <path d="M7.5 16.2 16 20.7 24.5 16.2" fill="none" stroke="#0b0912" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M7.5 20.2 16 24.7 24.5 20.2"
        fill="none"
        stroke="#0b0912"
        strokeOpacity="0.55"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
