import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

async function boot() {
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
