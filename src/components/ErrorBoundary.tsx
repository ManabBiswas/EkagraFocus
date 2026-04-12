import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary catches React component errors
 * and displays a fallback UI instead of crashing the entire app
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-8 max-w-md text-center">
            <div className="h-12 w-12 rounded-full bg-red-400/20 mx-auto mb-4 flex items-center justify-center">
              <span className="text-xl text-red-300">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-red-200">Something went wrong</h1>
            <p className="mt-3 text-sm text-red-100 text-wrap">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <details className="mt-4 text-xs text-red-200/60 text-left">
              <summary className="cursor-pointer font-semibold">Details</summary>
              <pre className="mt-2 overflow-auto max-h-32 rounded bg-slate-900/50 p-2 text-[10px]">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={this.handleReload}
              className="mt-6 w-full rounded-lg border border-red-400/50 bg-red-400/20 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/30 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
