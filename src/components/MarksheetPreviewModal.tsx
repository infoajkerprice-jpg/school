import React, { useRef, useState } from 'react';
import { Download, Loader2, Printer, X } from 'lucide-react';
import { MarksheetTemplate, type MarksheetRenderOptions } from './MarksheetTemplate';
import { exportMarksheetElementToPdf } from '../lib/marksheetPdf';
import type { ExamResult } from '../types';

interface Props {
  result: ExamResult;
  options?: MarksheetRenderOptions;
  onClose: () => void;
}

export const MarksheetPreviewModal: React.FC<Props> = ({ result, options, onClose }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      await exportMarksheetElementToPdf(sheetRef.current, result);
    } catch (err) {
      console.error('Marksheet PDF export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-marksheet');
    const cleanup = () => {
      document.body.classList.remove('printing-marksheet');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-xs sm:p-6 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="মার্কশিট প্রিভিউ"
    >
      <div className="flex max-h-[94vh] w-full max-w-[900px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none">
        {/* Top Action Bar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE8E1] bg-[#005B9F] px-5 py-3.5 text-white print:hidden">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold sm:text-base">
              একাডেমিক মার্কশিট — {result.studentName}
            </h2>
            <p className="text-[11px] text-sky-100">
              {result.examName} ({result.academicYear}) · রোল: {result.studentRoll}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <Printer className="h-3.5 w-3.5" />
              প্রিন্ট
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#22C55E] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#16A34A] disabled:opacity-65"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloading ? 'পিডিএফ তৈরি হচ্ছে...' : 'পিডিএফ ডাউনলোড'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="rounded-md p-1.5 text-white/90 transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Marksheet Canvas */}
        <div className="overflow-auto bg-[#EDF3F7] p-4 sm:p-6 print:overflow-visible print:bg-white print:p-0">
          <div className="marksheet-print-sheet mx-auto w-fit overflow-hidden rounded-sm shadow-md print:shadow-none">
            <MarksheetTemplate ref={sheetRef} result={result} options={options} />
          </div>
        </div>
      </div>
    </div>
  );
};
