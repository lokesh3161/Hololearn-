import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[HoloLearn Uncaught React Error]', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      const errorStack = this.state.error?.stack || 'No stack trace available';
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black text-white font-mono select-text">
          <div className="max-w-2xl w-full bg-zinc-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-red-500/20 pb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-base font-bold">Smart Board Runtime Recovered Error</h2>
                <p className="text-xs text-zinc-400">{this.state.error?.toString()}</p>
              </div>
            </div>

            <div className="bg-black/80 p-4 rounded-xl border border-white/10 text-xs text-red-300 overflow-x-auto max-h-60 font-mono">
              <pre>{errorStack}</pre>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200 transition-all"
              >
                ↻ Dismiss & Resume Canvas
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-zinc-800 text-white font-bold rounded-xl text-xs hover:bg-zinc-700 transition-all border border-white/10"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
