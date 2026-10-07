export interface Asset {
  id: string;
  symbol: string;
  name: string;
  priceUsdCents: number;
  /** 7 daily observations in USD cents; the last value equals priceUsdCents. */
  chart7d: number[];
  /** 30 daily observations in USD cents; the last value equals priceUsdCents. */
  chart30d: number[];
}

export interface Provider {
  id: string;
  name: string;
  assetId: string;
  aprBps: number;
}

export type PositionStatus = 'draft' | 'active' | 'closed';

export interface Position {
  id: string;
  assetId: string;
  providerId: string;
  /** Canonical integer string in base units (8 decimals). */
  principalUnits: string;
  durationDays: number;
  note: string;
  status: PositionStatus;
  createdAtMs: number;
  updatedAtMs: number;
  aprBpsSnapshot?: number;
  activatedAtMs?: number;
  closedAtMs?: number;
  elapsedDaysSnapshot?: number;
  rewardUnitsSnapshot?: string;
}

export type LedgerKind = 'seed' | 'reserve' | 'return' | 'reward';

export interface LedgerEntry {
  id: string;
  operationId: string;
  assetId: string;
  positionId?: string;
  kind: LedgerKind;
  /** Canonical integer string, may be negative. */
  deltaUnits: string;
  createdAtMs: number;
}

export type OperationKind = 'seed' | 'activate' | 'close' | 'time-advance';

export interface OperationRecord {
  operationId: string;
  kind: OperationKind;
  positionId?: string;
  resultSnapshot: Record<string, string | number | boolean>;
  createdAtMs: number;
}

export type ActivityKind = 'activate' | 'close' | 'time-advance';

export interface ActivityPayload {
  assetId?: string;
  amountUnits?: string;
  rewardUnits?: string;
  elapsedDays?: number;
  days?: number;
  previousOffsetMs?: number;
  newOffsetMs?: number;
}

export interface ActivityRecord {
  id: string;
  operationId: string;
  positionId?: string;
  kind: ActivityKind;
  payload: ActivityPayload;
  createdAtMs: number;
}

export interface Meta {
  key: 'meta';
  schemaVersion: 1;
  seedVersion: 'stake-v1';
  seededAtMs: number;
  /** Simulated-time offset; always a non-negative multiple of one day. */
  simOffsetMs: number;
  /** Simulated time of the latest committed mutation; keeps record timestamps monotonic. */
  lastCommittedSimMs: number;
  /** True after the first time advance; the explanatory dialog is shown until then. */
  timeTravelAcknowledged: boolean;
}
