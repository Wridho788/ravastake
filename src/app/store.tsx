import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { realNow } from '../data/clock';
import { TransactionCoordinator } from '../data/coordinator';
import { DB_NAME, openRavaDb } from '../data/db';
import { DomainError, toDomainError } from '../data/errors';
import { loadSnapshot, type Snapshot } from '../data/queries';
import { ensureSeeded, type Deps } from '../data/useCases';

const CHANNEL_NAME = 'ravastake';
/** Errors after which the visible data is probably outdated and must be reloaded. */
const REFRESH_ON: ReadonlySet<DomainError['code']> = new Set(['stale-time', 'stale-draft', 'not-found', 'invalid-transition', 'insufficient-balance']);

type BootState =
  | { kind: 'loading' }
  | { kind: 'ready'; deps: Deps; snapshot: Snapshot }
  | { kind: 'error'; error: DomainError };

interface AppDataValue {
  state: BootState;
  pending: boolean;
  /** Runs one use case, then reloads the snapshot here and in other tabs. Errors are rethrown as DomainError. */
  mutate<T>(work: (deps: Deps) => Promise<T>): Promise<T>;
  refresh(): Promise<void>;
  /** Value to prefill "Majukan N hari" (set by "Lompat ke jatuh tempo"). */
  advancePrefill: { days: number; token: number } | null;
  requestAdvancePrefill(days: number): void;
  /** Polite status message announced via aria-live. */
  notice: string;
  setNotice(message: string): void;
  /** Blocking notice when another tab upgrades or blocks the database. */
  connectionWarning: string;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootState>({ kind: 'loading' });
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [connectionWarning, setConnectionWarning] = useState('');
  const [advancePrefill, setAdvancePrefill] = useState<{ days: number; token: number } | null>(null);
  const depsRef = useRef<Deps | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const refresh = useCallback(async () => {
    const deps = depsRef.current;
    if (!deps) return;
    try {
      const snapshot = await loadSnapshot(deps);
      setState({ kind: 'ready', deps, snapshot });
    } catch (error) {
      setState({ kind: 'error', error: toDomainError(error) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let closeDb: (() => void) | undefined;
    (async () => {
      try {
        const db = await openRavaDb(DB_NAME, {
          onVersionChange: () =>
            setConnectionWarning('Versi data yang lebih baru dibuka di tab lain. Muat ulang halaman ini untuk melanjutkan.'),
          onBlocked: () =>
            setConnectionWarning('Pembaruan data tertahan oleh tab RavaStake lain. Tutup tab lain lalu muat ulang.'),
        });
        if (cancelled) {
          db.close();
          return;
        }
        closeDb = () => db.close();
        const deps: Deps = { coordinator: new TransactionCoordinator(db), realNow };
        await ensureSeeded(deps);
        depsRef.current = deps;
        const snapshot = await loadSnapshot(deps);
        if (!cancelled) setState({ kind: 'ready', deps, snapshot });
      } catch (error) {
        if (!cancelled) setState({ kind: 'error', error: toDomainError(error) });
      }
    })();
    return () => {
      cancelled = true;
      depsRef.current = null;
      closeDb?.();
    };
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => void refresh();
    channelRef.current = channel;
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      channel.close();
      channelRef.current = null;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const mutate = useCallback(
    async <T,>(work: (deps: Deps) => Promise<T>): Promise<T> => {
      const deps = depsRef.current;
      if (!deps) throw new DomainError('storage-unavailable', 'Penyimpanan belum siap. Tunggu sebentar lalu coba lagi.');
      setPending(true);
      try {
        const result = await work(deps);
        await refresh();
        channelRef.current?.postMessage({ type: 'invalidate' });
        return result;
      } catch (error) {
        const domainError = toDomainError(error);
        if (REFRESH_ON.has(domainError.code)) await refresh();
        throw domainError;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const requestAdvancePrefill = useCallback((days: number) => {
    setAdvancePrefill({ days, token: Date.now() });
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({
      state,
      pending,
      mutate,
      refresh,
      advancePrefill,
      requestAdvancePrefill,
      notice,
      setNotice,
      connectionWarning,
    }),
    [state, pending, mutate, refresh, advancePrefill, requestAdvancePrefill, notice, connectionWarning],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData harus dipakai di dalam AppDataProvider');
  return value;
}

/** Snapshot for screens rendered only once the app is ready (see Layout). */
// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useSnapshot(): Snapshot {
  const { state } = useAppData();
  if (state.kind !== 'ready') throw new Error('Snapshot belum siap');
  return state.snapshot;
}
