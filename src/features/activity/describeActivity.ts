import { formatUnits } from '../../domain/format';
import { offsetDays } from '../../domain/time';
import type { ActivityRecord } from '../../domain/types';

export function describeActivity(record: ActivityRecord, assets: { id: string; symbol: string }[]): string {
  const symbol = assets.find((a) => a.id === record.payload.assetId)?.symbol ?? record.payload.assetId ?? '';
  const amount = record.payload.amountUnits ? formatUnits(BigInt(record.payload.amountUnits)) : '';
  switch (record.kind) {
    case 'activate':
      return `Aktivasi ${amount} ${symbol}`;
    case 'close':
      return `Penutupan ${amount} ${symbol}, reward ${formatUnits(BigInt(record.payload.rewardUnits ?? '0'))} ${symbol}`;
    case 'time-advance':
      return `Lompatan waktu +${record.payload.days ?? 0} hari (total +${offsetDays(record.payload.newOffsetMs ?? 0)} hari)`;
    default:
      return 'Aktivitas';
  }
}
