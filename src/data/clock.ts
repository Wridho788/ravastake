/**
 * Real wall-clock time for the app. In production this is Date.now().
 * The e2e build hook may shift it (setNow/advanceNow) to test day boundaries
 * and a device clock moving backwards; production never imports that hook.
 */
let shiftMs = 0;

export function realNow(): number {
  return Date.now() + shiftMs;
}

/** Used only by src/testing/e2eHooks.ts. */
export function shiftRealClockTo(targetMs: number): void {
  shiftMs = targetMs - Date.now();
}

/** Used only by src/testing/e2eHooks.ts. */
export function shiftRealClockBy(deltaMs: number): void {
  shiftMs += deltaMs;
}
