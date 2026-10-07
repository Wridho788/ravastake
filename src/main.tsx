import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

async function boot() {
  // The e2e build installs test hooks (real clock, fault injection) before the app opens the database.
  // Vite replaces MODE at build time, so production bundles drop this branch entirely.
  if (import.meta.env.MODE === 'e2e') {
    await import('./testing/e2eHooks');
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('Elemen #root tidak ditemukan');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
