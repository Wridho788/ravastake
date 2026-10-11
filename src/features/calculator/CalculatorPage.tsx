import { useId, useState } from 'react';
import { Calculator } from 'lucide-react';
import { MAX_DURATION_DAYS, MAX_PRINCIPAL_UNITS, MIN_DURATION_DAYS } from '../../domain/constants';
import { parsePercentToBps, parseUnits, parseWholeDays } from '../../domain/decimal';
import { formatBps, formatUsdCents } from '../../domain/format';
import { rewardUnits, usdCents } from '../../domain/reward';
import { useSnapshot } from '../../app/store';
import { Amount } from '../../shared/Amount';
import { AssetIcon } from '../../shared/AssetIcon';
import { TickSlider } from '../../shared/TickSlider';

function percentInput(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const frac = bps % 100;
  return frac === 0 ? String(whole) : `${whole},${String(frac).padStart(2, '0').replace(/0$/, '')}`;
}

/** Common durations, like the reference's month presets. */
const PRESETS = [
  { days: 30, label: '1 bln' },
  { days: 90, label: '3 bln' },
  { days: 180, label: '6 bln' },
  { days: 365, label: '1 thn' },
] as const;

/** Pure estimate (STK-04): never writes to the ledger or positions. */
export function CalculatorPage() {
  const snapshot = useSnapshot();
  const first = snapshot.assets[0];
  const [assetId, setAssetId] = useState(first?.asset.id ?? 'ETH');
  const [principal, setPrincipal] = useState('1');
  const [apr, setApr] = useState(first ? percentInput(first.provider.aprBps) : '5');
  const [days, setDays] = useState('365');
  const ids = { asset: useId(), principal: useId(), apr: useId(), days: useId(), slider: useId() };

  const view = snapshot.assets.find((v) => v.asset.id === assetId);
  const symbol = view?.asset.symbol ?? '';
  const principalResult = parseUnits(principal, {
    maxUnits: MAX_PRINCIPAL_UNITS,
    maxLabel: `Maksimal 1.000.000 ${symbol}.`,
  });
  const aprResult = parsePercentToBps(apr);
  const daysResult = parseWholeDays(days, MIN_DURATION_DAYS, MAX_DURATION_DAYS);
  const valid = principalResult.ok && aprResult.ok && daysResult.ok;
  const reward = valid ? rewardUnits(principalResult.value, aprResult.value, daysResult.value) : null;
  const sliderValue = daysResult.ok ? daysResult.value : Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, Number(days) || 1));

  const errorFor = (result: { ok: boolean; message?: string }, id: string) =>
    result.ok ? {} : { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` };

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Kalkulator</p>
          <h1>Kalkulator reward</h1>
          <p className="page-head__lead">
            Simple interest tanpa compounding, biaya, atau perubahan harga. Kalkulator tidak menyimpan apa pun dan tidak mengubah
            saldo atau posisi.
          </p>
        </div>
      </header>

      <div className="split split--calc">
        <section className="panel" aria-labelledby="calc-input-heading">
          <div className="panel__head">
            <h2 id="calc-input-heading">
              <span className="panel__title-icon" aria-hidden="true">
                <Calculator />
              </span>
              Input
            </h2>
          </div>
          <form className="form-grid" onSubmit={(e) => e.preventDefault()} noValidate>
            <div className="field">
              <label htmlFor={ids.asset}>Aset</label>
              <select
                id={ids.asset}
                value={assetId}
                onChange={(e) => {
                  setAssetId(e.target.value);
                  const next = snapshot.assets.find((v) => v.asset.id === e.target.value);
                  if (next) setApr(percentInput(next.provider.aprBps));
                }}
              >
                {snapshot.assets.map((v) => (
                  <option key={v.asset.id} value={v.asset.id}>
                    {v.asset.symbol} · APR provider {formatBps(v.provider.aprBps)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={ids.principal}>Principal (contoh: 1,5)</label>
              <input
                id={ids.principal}
                inputMode="decimal"
                autoComplete="off"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                {...errorFor(principalResult, ids.principal)}
              />
              {!principalResult.ok ? (
                <p id={`${ids.principal}-error`} className="field-error" role="alert">
                  {principalResult.message}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor={ids.apr}>APR simulasi (%)</label>
              <input id={ids.apr} inputMode="decimal" value={apr} onChange={(e) => setApr(e.target.value)} {...errorFor(aprResult, ids.apr)} />
              {!aprResult.ok ? (
                <p id={`${ids.apr}-error`} className="field-error" role="alert">
                  {aprResult.message}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor={ids.days}>Hari (1–365)</label>
              <input id={ids.days} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} {...errorFor(daysResult, ids.days)} />
              {!daysResult.ok ? (
                <p id={`${ids.days}-error`} className="field-error" role="alert">
                  {daysResult.message}
                </p>
              ) : null}
            </div>
            <div className="field field--wide calc-days">
              <label htmlFor={ids.slider} className="visually-hidden">
                Hari (slider)
              </label>
              <TickSlider
                min={MIN_DURATION_DAYS}
                max={MAX_DURATION_DAYS}
                value={sliderValue}
                bubble={`${sliderValue} hari`}
                scale={[`${MIN_DURATION_DAYS} hari`, `${MAX_DURATION_DAYS} hari`]}
                input={{ id: ids.slider, onChange: (value) => setDays(String(value)), valueText: `${sliderValue} hari` }}
              />
              <div className="chip-group" role="group" aria-label="Durasi cepat">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    className="chip-button"
                    aria-pressed={daysResult.ok && daysResult.value === preset.days}
                    onClick={() => setDays(String(preset.days))}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </section>

        <section className="panel panel--highlight calc-result" aria-labelledby="calc-result-heading" aria-live="polite">
          <div className="panel__head">
            <h2 id="calc-result-heading">Hasil estimasi</h2>
            {view ? <AssetIcon symbol={view.asset.symbol} /> : null}
          </div>
          {reward !== null && principalResult.ok && aprResult.ok && daysResult.ok && view ? (
            <>
              <div className="calc-result__value">
                <p className="panel__eyebrow">Reward setelah {daysResult.value} hari</p>
                <p className="display-number">
                  <Amount units={reward} symbol={symbol} testId="calc-reward" />
                </p>
                <p className="muted">≈ {formatUsdCents(usdCents(reward, view.asset.priceUsdCents))} pada harga fixture</p>
              </div>
              <ul className="mini-stats">
                <li className="mini-stat">
                  <span className="mini-stat__head">Principal</span>
                  <p className="mini-stat__value">
                    <Amount units={principalResult.value} symbol={symbol} />
                  </p>
                </li>
                <li className="mini-stat">
                  <span className="mini-stat__head">APR</span>
                  <p className="mini-stat__value">{formatBps(aprResult.value)}</p>
                </li>
              </ul>
              <p className="formula" data-testid="calc-formula">
                floor({principalResult.value.toString()} unit × {aprResult.value} bps × {daysResult.value} hari ÷ 3.650.000) ={' '}
                {reward.toString()} unit
              </p>
              <ul className="assumptions">
                <li>
                  Posisi sungguhan memakai APR provider saat aktivasi ({formatBps(view.provider.aprBps)}), bukan APR bebas di sini.
                </li>
                <li>Reward dibulatkan ke bawah ke 8 desimal.</li>
              </ul>
            </>
          ) : (
            <p className="muted" data-testid="calc-invalid">
              Perbaiki input untuk melihat estimasi.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
