// Only imported by main.tsx when the app is built with `--mode e2e`.
// Production builds never include this module (checked by scripts/check-no-test-hooks.mjs).
declare global {
  interface Window {
    __ravastakeTest?: { ready: boolean };
  }
}

window.__ravastakeTest = { ready: true };

export {};
