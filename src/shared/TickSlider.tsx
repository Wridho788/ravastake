import type { CSSProperties } from 'react';

interface TickSliderProps {
  min: number;
  max: number;
  value: number;
  /** Text in the floating tag above the thumb. */
  bubble: string;
  /** Labels under the ruler (start, end). */
  scale?: [string, string];
  /**
   * Interactive mode: a native range input (keyboard, touch, and screen readers work as usual)
   * laid over the ruler. The caller provides the <label htmlFor={inputId}>.
   */
  input?: { id: string; onChange: (value: number) => void; valueText: string };
  /** Read-only mode: rendered as a progressbar with this name and value text. */
  progress?: { label: string; valueText: string };
}

/** Ruler-style slider from the reference ("Investment Period"), in either mode. */
export function TickSlider({ min, max, value, bubble, scale, input, progress }: TickSliderProps) {
  const span = max - min || 1;
  const ratio = Math.min(1, Math.max(0, (value - min) / span));
  const style = { '--ratio': ratio } as CSSProperties;

  return (
    <div className="tick-slider" style={style}>
      <span className="tick-slider__bubble" aria-hidden="true">
        {bubble}
      </span>
      <div className="tick-slider__track">
        <span className="tick-slider__ruler" aria-hidden="true" />
        <span className="tick-slider__line" aria-hidden="true" />
        <span className="tick-slider__thumb" aria-hidden="true" />
        {input ? (
          <input
            id={input.id}
            className="tick-slider__input"
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => input.onChange(Number(e.target.value))}
            aria-valuetext={input.valueText}
          />
        ) : null}
        {progress ? (
          <span
            className="visually-hidden"
            role="progressbar"
            aria-label={progress.label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={progress.valueText}
          />
        ) : null}
      </div>
      {scale ? (
        <div className="tick-slider__scale" aria-hidden="true">
          <span>{scale[0]}</span>
          <span>{scale[1]}</span>
        </div>
      ) : null}
    </div>
  );
}
