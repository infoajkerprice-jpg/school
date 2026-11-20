import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'pill' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { canPromptNative, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (canPromptNative) {
      await promptInstall();
    } else {
      setShowGuide(true);
    }
  };

  const buttonNode =
    variant === 'compact' ? (
      <button
        type="button"
        onClick={handleClick}
        aria-label="অ্যাপ ইনস্টল করুন"
        title="মোবাইল অ্যাপ হিসেবে ইনস্টল করুন"
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#21A9D6]/40 bg-[#21A9D6]/10 px-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#21A9D6] hover:text-white ${className}`}
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        <span className="hidden xs:inline">অ্যাপ</span>
      </button>
    ) : variant === 'full' ? (
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#123B67] to-[#087F5B] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95 ${className}`}
      >
        <Download className="h-4 w-4 shrink-0 text-[#F4A62A]" />
        <span>মোবাইল অ্যাপ হিসেবে ইনস্টল করুন</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#087F5B]/25 bg-[#F2F8F5] px-3 py-2 text-xs font-bold text-[#123B67] transition hover:border-[#087F5B] hover:bg-[#087F5B] hover:text-white whitespace-nowrap shrink-0 ${className}`}
      >
        <Download className="h-3.5 w-3.5 shrink-0 text-[#087F5B] group-hover:text-white" />
        <span>অ্যাপ ইনস্টল</span>
      </button>
    );

  return (
    <>
      {buttonNode}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#091C2B]/65 p-4 backdrop-blur-xs sm:items-center"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="sheet-enter w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#123B67] to-[#087F5B] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <img src="/icon.svg" alt="SISC" className="h-8 w-8 rounded-lg shadow-xs" />
                <div>
                  <h3 className="text-sm font-bold">SISC মোবাইল অ্যাপ ইনস্টল</h3>
                  <p className="text-[11px] text-emerald-100">শাহ ইসলামিক স্কুল এন্ড কলেজ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="বন্ধ করুন"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 text-sm text-[#243B47]">
              <p className="text-xs leading-relaxed text-[#47606D]">
                অ্যাপটি হোম স্ক্রিনে যুক্ত করলে নোটিশ, রুটিন, ফলাফল ও ভর্তি সেবা এক ক্লিকেই মোবাইল অ্যাপের মতো ব্যবহার করতে পারবেন।
              </p>

              {isIOS ? (
                <ol className="space-y-2.5 rounded-xl border border-[#DCE8E1] bg-[#F2F8F5] p-4 text-xs">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#087F5B] text-[11px] font-bold text-white">১</span>
                    <span>
                      Safari ব্রাউজারের নিচে থাকা <strong className="inline-flex items-center gap-1 text-[#123B67]"><Share className="h-3.5 w-3.5" /> Share</strong> আইকনে ট্যাপ করুন।
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#087F5B] text-[11px] font-bold text-white">২</span>
                    <span>
                      তালিকা থেকে <strong className="text-[#123B67]">“Add to Home Screen”</strong> নির্বাচন করুন।
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#087F5B] text-[11px] font-bold text-white">৩</span>
                    <span>
                      উপরে ডানে <strong className="text-[#123B67]">“Add”</strong> চাপুন — অ্যাপটি হোম স্ক্রিনে যুক্ত হয়ে যাবে।
                    </span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5 rounded-xl border border-[#DCE8E1] bg-[#F2F8F5] p-4 text-xs">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#087F5B] text-[11px] font-bold text-white">১</span>
                    <span>
                      আপনার ব্রাউজারের উপরের ডানদিকে <strong className="text-[#123B67]">মেনু (⋮)</strong> বা ঠিকানা বারের <strong className="text-[#123B67]">ইনস্টল আইকনে</strong> ক্লিক করুন।
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#087F5B] text-[11px] font-bold text-white">২</span>
                    <span>
                      <strong className="text-[#123B67]">“Install app”</strong> বা <strong className="text-[#123B67]">“Add to Home screen”</strong> বেছে নিন।
                    </span>
                  </li>
                </ol>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-[#087F5B] py-2.5 text-xs font-bold text-white transition hover:bg-[#06674A]"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#123B67] px-4 py-2 text-xs font-semibold text-white shadow-lg ring-2 ring-[#F4A62A]/60 lg:bottom-6"
    >
      <WifiOff className="h-4 w-4 text-[#F4A62A]" />
      <span>আপনি এখন অফলাইনে আছেন · সংরক্ষিত তথ্য দেখানো হচ্ছে</span>
    </div>
  );
};
