export type ErrorCode =
  | 'validation'
  | 'insufficient-balance'
  | 'invalid-transition'
  | 'not-found'
  | 'stale-time'
  | 'stale-draft'
  | 'storage-unavailable'
  | 'quota'
  | 'migration-blocked'
  | 'unsupported-schema'
  | 'write-failed';

/** Structured error returned by every use case (TRD "Error contract"). */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly field?: string;

  constructor(code: ErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.field = field;
  }
}

export const STALE_TIME_MESSAGE =
  'Waktu simulasi berubah di tab lain atau batas hari terlewati. Periksa ulang nilai.';

/** Maps IndexedDB/DOM failures to the error contract; DomainErrors pass through unchanged. */
export function toDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  switch (name) {
    case 'QuotaExceededError':
      return new DomainError('quota', 'Penyimpanan browser penuh. Hapus data situs lain atau reset demo, lalu coba lagi.');
    case 'VersionError':
      return new DomainError(
        'unsupported-schema',
        'Data tersimpan dibuat oleh versi RavaStake yang lebih baru. Data tidak diubah; buka versi terbaru atau reset demo.',
      );
    case 'ConstraintError':
      return new DomainError('write-failed', 'Penulisan ditolak karena data ganda. Tidak ada perubahan yang disimpan.');
    case 'InvalidStateError':
    case 'UnknownError':
    case 'SecurityError':
      return new DomainError('storage-unavailable', 'Penyimpanan browser tidak tersedia. Muat ulang halaman atau periksa izin situs.');
    default:
      return new DomainError(
        'write-failed',
        `Penyimpanan gagal; tidak ada perubahan yang disimpan.${error instanceof Error && error.message ? ` (${error.message})` : ''}`,
      );
  }
}
