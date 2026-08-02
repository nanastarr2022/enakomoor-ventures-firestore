import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught applet error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRefresh = () => {
    // Reset state and reload the window fully to restore clean system state
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans selection:bg-rose-500/30 selection:text-white">
          <div className="w-full max-w-lg bg-slate-800/60 border border-slate-700/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl space-y-6 text-center">
            {/* Visual Warning Shield */}
            <div className="mx-auto size-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <AlertTriangle className="size-8" />
            </div>

            {/* Error Message Header */}
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                System Interrupt Detected
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                The application encountered an unexpected runtime crash. No data has been corrupted, but the system needs to be reinitialized to restore active services.
              </p>
            </div>

            {/* Technical Detail Collapsible (Tidy and hidden behind standard UI) */}
            {this.state.error && (
              <div className="text-left bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 max-h-40 overflow-y-auto font-mono text-xs text-rose-400 space-y-1">
                <p className="font-bold text-slate-300">Crash Reason:</p>
                <p className="break-all">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-500 mt-2 whitespace-pre-wrap leading-normal">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleRefresh}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                <RefreshCw className="size-4 animate-spin-slow" />
                <span>Refresh & Restore System</span>
              </button>

              <p className="text-[10px] text-slate-500">
                Clicking above will perform a full browser reload to restore active session state.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
