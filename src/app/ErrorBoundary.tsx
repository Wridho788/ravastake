import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('RavaStake UI error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="page page--center" role="alert">
          <h1>Terjadi kesalahan tampilan</h1>
          <p>Data yang sudah tersimpan tidak berubah. Muat ulang halaman untuk melanjutkan.</p>
          <p className="muted">{this.state.error.message}</p>
          <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
            Muat ulang
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
