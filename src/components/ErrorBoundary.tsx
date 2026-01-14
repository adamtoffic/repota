import type { ReactNode, ErrorInfo } from "react";
import { Component } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-gray-600">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>

            <div className="mt-6 max-h-40 overflow-auto rounded-lg bg-gray-100 p-4 text-left">
              <p className="font-mono text-xs break-all text-red-500">
                {this.state.error?.message || "Unknown Error"}
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 active:scale-95"
            >
              <RefreshCcw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
