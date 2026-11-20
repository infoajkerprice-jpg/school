import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface UIFeedbackContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIFeedbackContext = createContext<UIFeedbackContextValue | null>(null);

export const UIFeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const notify = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmChoice = (accepted: boolean) => {
    if (confirmState) {
      confirmState.resolve(accepted);
      setConfirmState(null);
    }
  };

  return (
    <UIFeedbackContext.Provider value={{ notify, confirm }}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2.5 px-3 sm:px-0"
      >
        {toasts.map((toast) => {
          const styles: Record<ToastVariant, string> = {
            success: 'border-[#087F5B]/30 bg-white text-[#123B67] dark:bg-slate-900 dark:text-slate-100',
            error: 'border-rose-300 bg-white text-rose-800 dark:bg-slate-900 dark:text-rose-200',
            warning: 'border-[#F4A62A]/50 bg-white text-[#9A5B00] dark:bg-slate-900 dark:text-amber-200',
            info: 'border-[#21A9D6]/40 bg-white text-[#123B67] dark:bg-slate-900 dark:text-sky-200',
          };
          const Icon =
            toast.variant === 'success'
              ? CheckCircle2
              : toast.variant === 'error'
              ? XCircle
              : toast.variant === 'warning'
              ? AlertTriangle
              : Info;
          const iconColor =
            toast.variant === 'success'
              ? 'text-[#087F5B]'
              : toast.variant === 'error'
              ? 'text-rose-600'
              : toast.variant === 'warning'
              ? 'text-[#F4A62A]'
              : 'text-[#21A9D6]';

          return (
            <div
              key={toast.id}
              className={`sheet-enter pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-xl ${styles[toast.variant]}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
              <p className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</p>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                aria-label="বন্ধ করুন"
                className="rounded p-0.5 opacity-60 transition hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091C2B]/65 p-4 backdrop-blur-xs"
          onClick={() => handleConfirmChoice(false)}
        >
          <div
            className="sheet-enter w-full max-w-md overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 p-5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  confirmState.options.danger
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-[#F4A62A]/20 text-[#B47009] dark:bg-amber-950/50 dark:text-amber-300'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
                  {confirmState.options.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#4B6370] dark:text-slate-300">
                  {confirmState.options.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-[#E6F0EA] bg-[#F8FBF9] px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="rounded-xl border border-[#CBE0D6] bg-white px-4 py-2 text-xs font-bold text-[#263B35] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {confirmState.options.cancelLabel || 'বাতিল করুন'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition ${
                  confirmState.options.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#087F5B] hover:bg-[#06684A]'
                }`}
              >
                {confirmState.options.confirmLabel || 'নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIFeedbackContext.Provider>
  );
};

export function useUIFeedback(): UIFeedbackContextValue {
  const ctx = useContext(UIFeedbackContext);
  if (!ctx) {
    throw new Error('useUIFeedback must be used inside UIFeedbackProvider');
  }
  return ctx;
}
