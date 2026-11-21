import React, { useId, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Link2,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  isDataImageUrl,
  processUploadedImage,
  type ImageUploadPreset,
} from '../lib/imageUpload';
import { toBnDigits } from '../i18n';

export interface ImageUploadPresetOption {
  label: string;
  url: string;
}

export interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (nextUrl: string) => void;
  preset?: ImageUploadPreset;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  /** Optional quick-pick buttons (e.g. campus preset photos) */
  quickPresets?: ImageUploadPresetOption[];
  /** Compact layout for narrower form grid cells */
  compact?: boolean;
}

/**
 * Reusable Computer + Mobile Image Upload Field.
 * Supports:
 * - Click / Drag-and-drop from Computer or Mobile Gallery
 * - Direct Mobile Camera capture button (`capture`)
 * - Automatic client-side resize & compression (keeps PNG alpha for logos)
 * - Optional external URL paste toggle
 * - Live thumbnail preview + one-click clear
 */
export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  preset = 'portrait',
  required = false,
  placeholder = 'https://... অথবা নিচ থেকে ছবি আপলোড করুন',
  helperText,
  quickPresets,
  compact = false,
}) => {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaText, setMetaText] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const processed = await processUploadedImage(file, preset);
      onChange(processed.dataUrl);
      setMetaText(`${toBnDigits(processed.approxKb)} KB · ${toBnDigits(processed.width)}×${toBnDigits(processed.height)}`);
      setShowUrlInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const isUploaded = isDataImageUrl(value);
  const previewFrameClass =
    preset === 'banner'
      ? 'h-16 w-24 rounded-xl'
      : preset === 'logo'
      ? 'h-14 w-14 rounded-full bg-white p-1'
      : 'h-14 w-14 rounded-xl';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-[#263B35] dark:text-slate-300"
        >
          {label}
          {required ? ' *' : ''}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E7DA3] transition hover:text-[#087F5B] dark:text-sky-400"
        >
          <Link2 className="h-3 w-3" />
          {showUrlInput ? 'লিংক বক্স লুকান' : 'অথবা ছবির লিংক দিন'}
        </button>
      </div>

      {/* Hidden Native File & Mobile Camera Inputs */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        className="sr-only"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={preset === 'portrait' ? 'user' : 'environment'}
        onChange={(e) => void handleFile(e.target.files?.[0])}
        className="sr-only"
      />

      {/* Interactive Dropzone + Preview + Buttons */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed p-3 transition ${
          dragActive
            ? 'border-[#087F5B] bg-[#E8F7F0] dark:border-emerald-400 dark:bg-emerald-950/40'
            : 'border-[#C9DDD2] bg-[#F8FBF9] hover:border-[#087F5B]/60 dark:border-slate-700 dark:bg-slate-800/60'
        }`}
      >
        {/* Live Thumbnail */}
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden border border-[#CFE0D6] bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-900 ${previewFrameClass}`}
        >
          {value ? (
            <img
              src={value}
              alt={label}
              referrerPolicy="no-referrer"
              className={`h-full w-full ${preset === 'logo' ? 'object-contain' : 'object-cover'}`}
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-[#8BA69B]" />
          )}
        </div>

        {/* Upload Actions */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#087F5B] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#06684A] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {busy ? 'আপলোড হচ্ছে...' : compact ? 'ছবি আপলোড' : 'কম্পিউটার / গ্যালারি থেকে নিন'}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#087F5B]/40 bg-white px-2.5 py-1.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#EDF9F4] disabled:opacity-60 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300"
            >
              <Camera className="h-3.5 w-3.5" />
              ক্যামেরা
            </button>

            {value && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onChange('');
                  setMetaText(null);
                  setError(null);
                }}
                aria-label="ছবি সরান"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                মুছুন
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#56717D] dark:text-slate-400">
            {isUploaded ? (
              <span className="inline-flex items-center gap-1 font-bold text-[#087F5B] dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ডিভাইস থেকে ছবি যুক্ত হয়েছে{metaText ? ` (${metaText})` : ''}
              </span>
            ) : (
              <span>
                {helperText || 'JPG, PNG বা WebP ছবি নির্বাচন বা ড্র্যাগ করুন (স্বয়ংক্রিয়ভাবে অপটিমাইজ হবে)'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Optional URL Input Box (for pasting external URLs or checking non-data URL) */}
      {(showUrlInput || (required && !value)) && (
        <input
          type="text"
          required={required}
          value={isUploaded ? '' : value}
          onChange={(e) => {
            setMetaText(null);
            setError(null);
            onChange(e.target.value);
          }}
          placeholder={isUploaded ? 'ডিভাইস থেকে ছবি আপলোড করা আছে (নতুন লিংক দিলে সেটি প্রতিস্থাপন হবে)' : placeholder}
          className="w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      )}

      {/* Quick Campus Presets if provided */}
      {quickPresets && quickPresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#5C7582] dark:text-slate-400">
            দ্রুত ক্যাম্পাস ছবি:
          </span>
          {quickPresets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setMetaText(null);
                setError(null);
                onChange(p.url);
              }}
              className="rounded-lg border border-[#D4E6DD] bg-[#F2F8F5] px-2.5 py-1 text-[11px] font-bold text-[#123B67] transition hover:border-[#087F5B] hover:bg-[#087F5B] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
};
