import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'অপ্রত্যাশিত একটি ত্রুটি ঘটেছে।',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let displayMsg = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          displayMsg = `ডাটাবেস বা অনুমতি সংক্রান্ত ত্রুটি: ${parsed.error}`;
        }
      } catch {
        // Plain message
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F2F8F5] p-6 dark:bg-slate-950">
          <div className="w-full max-w-lg rounded-2xl border border-[#DCE8E1] bg-white p-7 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#123B67] dark:text-white">একটি সাময়িক ত্রুটি ঘটেছে</h2>
            <p className="mt-2 break-words rounded-xl bg-[#F2F8F5] p-3.5 text-xs leading-relaxed text-[#263B35] dark:bg-slate-800 dark:text-slate-300">
              {displayMsg}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#06684A]"
            >
              <RefreshCw className="h-4 w-4" />
              পৃষ্ঠা পুনরায় লোড করুন
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
