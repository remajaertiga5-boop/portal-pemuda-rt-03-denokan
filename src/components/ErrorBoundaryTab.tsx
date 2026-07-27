import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children : ReactNode;
  tabName ?: string;
  onRetry ?: () => void;
}

interface State {
  hasError : boolean;
  errorMsg : string;
}

/** Error Boundary per-tab — kalau crash, hanya tab ini yang rusak, bukan seluruh dashboard */
export default class ErrorBoundaryTab extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.tabName || "Tab"} crashed:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMsg: "" });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              ⚠️ Tab "{this.props.tabName || "ini"}" Error
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Terjadi kesalahan saat memuat komponen ini. Tab lainnya tetap berfungsi normal.
            </p>
            {this.state.errorMsg && (
              <p className="text-[10px] text-rose-500 font-mono bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg mt-2">
                {this.state.errorMsg}
              </p>
            )}
          </div>
          <button
            onClick={this.handleRetry}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 mx-auto transition-all shadow-md"
          >
            <RefreshCw size={14} /> Coba Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
