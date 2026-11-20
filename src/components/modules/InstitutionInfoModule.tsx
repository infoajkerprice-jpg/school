import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '../../types';
import { isLegacyRemovedImage } from '../../context/PublicDataContext';
import { AdminModuleHeader } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';

function isLegacyDemoSettings(data: Partial<SiteSettings>): boolean {
  const name = (data.schoolNameBn || '').trim();
  return name.includes('ঢাকা হেরিটেজ') || (data.email || '').includes('dhakaheritage');
}

function sanitizeStringList(items: string[] | undefined, maxItems: number, maxItemLen = 120): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((s) => clampStr(s, maxItemLen))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

export function buildValidatedSiteSettingsPayload(settings: SiteSettings) {
  return {
    schoolNameBn: clampStr(settings.schoolNameBn || DEFAULT_SITE_SETTINGS.schoolNameBn, 180),
    schoolNameEn: clampStr(settings.schoolNameEn, 180),
    schoolSubtitleBn: clampStr(settings.schoolSubtitleBn, 180),
    logoUrl: clampStr(settings.logoUrl, 500),
    eiin: clampStr(settings.eiin, 30),
    schoolCode: clampStr(settings.schoolCode, 30),
    regNo: clampStr(settings.regNo, 40),
    establishedYear: clampStr(settings.establishedYear, 20),
    aboutTitle: clampStr(settings.aboutTitle, 140),
    aboutText: clampStr(settings.aboutText, 4000),
    historyText: clampStr(settings.historyText, 4000),
    missionText: clampStr(settings.missionText, 4000),
    aboutImageUrl: clampStr(
      isLegacyRemovedImage(settings.aboutImageUrl)
        ? DEFAULT_SITE_SETTINGS.aboutImageUrl
        : settings.aboutImageUrl,
      500
    ),
    principalName: clampStr(settings.principalName, 120),
    principalDesignation: clampStr(settings.principalDesignation, 120),
    principalPhotoUrl: clampStr(
      isLegacyRemovedImage(settings.principalPhotoUrl) ? '' : settings.principalPhotoUrl,
      500
    ),
    principalMessage: clampStr(settings.principalMessage, 2500),
    tickerOverride: clampStr(settings.tickerOverride, 400),
    address: clampStr(settings.address, 300),
    phone: clampStr(settings.phone, 80),
    email: clampStr(settings.email, 160),
    websiteUrl: clampStr(settings.websiteUrl, 300),
    facebookUrl: clampStr(settings.facebookUrl, 300),
    facebookVerified: Boolean(settings.facebookVerified),
    googleMapQuery: clampStr(settings.googleMapQuery, 300),
    officeHours: clampStr(settings.officeHours, 140),
    educationMediums: sanitizeStringList(settings.educationMediums, 10, 120),
    classList: sanitizeStringList(settings.classList, 20, 60),
    highestClass: clampStr(settings.highestClass, 80),
    shifts: sanitizeStringList(settings.shifts, 6, 60),
    specialPrograms: sanitizeStringList(settings.specialPrograms, 15, 100),
    totalStaffCount: Math.max(0, Math.min(5000, Number(settings.totalStaffCount) || 0)),
    totalClassesCount: Math.max(0, Math.min(200, Number(settings.totalClassesCount) || 0)),
    passRatePercent: Math.max(0, Math.min(100, Number(settings.passRatePercent) || 0)),
    academicCalendarNote: clampStr(settings.academicCalendarNote, 2000),
    holidayListNote: clampStr(settings.holidayListNote, 2000),
    updatedAt: serverTimestamp(),
  };
}

interface ListEditorProps {
  label: string;
  items: string[];
  placeholder: string;
  maxItems: number;
  onChange: (next: string[]) => void;
}

const TagListEditor: React.FC<ListEditorProps> = ({
  label,
  items,
  placeholder,
  maxItems,
  onChange,
}) => {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const clean = draft.trim();
    if (!clean || items.length >= maxItems || items.includes(clean)) return;
    onChange([...items, clean]);
    setDraft('');
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-[#DCE8E1] bg-[#F8FBF9] p-4 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <label className="text-xs font-extrabold text-[#123B67] dark:text-slate-100">{label}</label>
        <span className="text-[11px] font-semibold text-[#526B78] dark:text-slate-400">
          সর্বোচ্চ {maxItems}টি
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#087F5B]/25 bg-white px-2.5 py-1 text-xs font-bold text-[#087F5B] dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              aria-label={`${item} সরান`}
              className="rounded-full p-0.5 text-[#587064] transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-[#6B8075] dark:text-slate-500">কোনো আইটেম যুক্ত করা হয়নি।</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-[#CFE0D6] bg-white px-3 py-1.5 text-xs text-[#263B35] outline-none focus:border-[#087F5B] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim() || items.length >= maxItems}
          className="inline-flex items-center gap-1 rounded-xl bg-[#087F5B] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#06684A] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          যুক্ত করুন
        </button>
      </div>
    </div>
  );
};

export const InstitutionInfoModule: React.FC = () => {
  const { notify, confirm } = useUIFeedback();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'site_settings', 'main'),
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as SiteSettings;
          if (isLegacyDemoSettings(remote)) {
            setSettings(DEFAULT_SITE_SETTINGS);
          } else {
            setSettings({ ...DEFAULT_SITE_SETTINGS, ...remote });
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'site_settings/main')
    );
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildValidatedSiteSettingsPayload({
        ...settings,
        totalClassesCount: (settings.classList || []).length,
      });
      await setDoc(doc(db, 'site_settings', 'main'), payload);
      notify(
        'প্রতিষ্ঠানের সকল তথ্য সফলভাবে সংরক্ষণ করা হয়েছে এবং ওয়েবসাইটের সব পেজে স্বয়ংক্রিয়ভাবে আপডেট হয়েছে।',
        'success'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_settings/main');
      notify('তথ্য সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const ok = await confirm({
      title: 'ডিফল্ট তথ্য লোড করুন',
      message: 'শাহ ইসলামিক স্কুল এন্ড কলেজের নির্ধারিত তথ্য ফর্মে লোড করবেন? সংরক্ষণ বাটনে ক্লিক না করা পর্যন্ত ডাটাবেজে পরিবর্তন হবে না।',
      confirmLabel: 'লোড করুন',
    });
    if (!ok) return;
    setSettings((prev) => ({
      ...prev,
      ...DEFAULT_SITE_SETTINGS,
    }));
    notify('নির্ধারিত তথ্য ফর্মে লোড করা হয়েছে। সংরক্ষণ করতে নিচের বাটনে ক্লিক করুন।', 'info');
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="প্রতিষ্ঠানের তথ্য"
        subtitle="প্রতিষ্ঠানের বাংলা ও ইংরেজি নাম, লোগো, প্রতিষ্ঠার সাল, ঠিকানা, যোগাযোগ, শিক্ষার মাধ্যম, শ্রেণিসমূহ, শিফট ও বিশেষ ইসলামিক শিক্ষা কার্যক্রম এখান থেকে নিয়ন্ত্রণ করুন।"
        icon={<Building2 className="h-5 w-5" />}
        accent="emerald"
        actions={
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#087F5B]" />
            ডিফল্ট তথ্য লোড করুন
          </button>
        }
      />

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-2xl border border-[#DCE8E1] bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Section 1 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6F0EA] pb-2.5 dark:border-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#087F5B]/12 text-xs font-extrabold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
              ১
            </span>
            <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">প্রতিষ্ঠানের মৌলিক তথ্য</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                প্রতিষ্ঠানের বাংলা নাম *
              </label>
              <input
                required
                value={settings.schoolNameBn}
                onChange={(e) => setSettings({ ...settings, schoolNameBn: e.target.value })}
                placeholder="শাহ ইসলামিক স্কুল এন্ড কলেজ"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                প্রতিষ্ঠানের ইংরেজি নাম
              </label>
              <input
                value={settings.schoolNameEn || ''}
                onChange={(e) => setSettings({ ...settings, schoolNameEn: e.target.value })}
                placeholder="Shah Islamic School And College"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                প্রতিষ্ঠার সাল
              </label>
              <input
                value={settings.establishedYear || ''}
                onChange={(e) => setSettings({ ...settings, establishedYear: e.target.value })}
                placeholder="২০১৯"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                লোগো ছবির লিংক (URL)
              </label>
              <input
                value={settings.logoUrl || ''}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                placeholder="https://... (খালি রাখলে ডিফল্ট মনোগ্রাম দেখাবে)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                সর্বোচ্চ শ্রেণি
              </label>
              <input
                value={settings.highestClass || ''}
                onChange={(e) => setSettings({ ...settings, highestClass: e.target.value })}
                placeholder="অষ্টম শ্রেণি"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ঠিকানা *</label>
              <input
                required
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০।"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                গুগল ম্যাপ লোকেশন ঠিকানা
              </label>
              <input
                value={settings.googleMapQuery || ''}
                onChange={(e) => setSettings({ ...settings, googleMapQuery: e.target.value })}
                placeholder="তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6F0EA] pb-2.5 dark:border-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#21A9D6]/15 text-xs font-extrabold text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300">
              ২
            </span>
            <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
              যোগাযোগ, ইমেইল, ওয়েবসাইট ও ফেসবুক পেজ
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                মোবাইল নম্বর *
              </label>
              <input
                required
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+880 1711-759705"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                অফিসিয়াল ওয়েবসাইট
              </label>
              <input
                value={settings.websiteUrl || ''}
                onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value })}
                placeholder="https://shahislamicschool.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                অফিসিয়াল ইমেইল (খালি রাখলে ওয়েবসাইটে দেখাবে না)
              </label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="নিশ্চিত অফিসিয়াল ইমেইল লিখুন"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                ফেসবুক পেজ লিংক (প্রকৃত অফিসিয়াল পেজের লিংক)
              </label>
              <input
                value={settings.facebookUrl || ''}
                onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                placeholder="https://facebook.com/..."
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3.5 py-2.5 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(settings.facebookVerified)}
                  onChange={(e) => setSettings({ ...settings, facebookVerified: e.target.checked })}
                  className="h-4 w-4 accent-[#087F5B]"
                />
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#087F5B] dark:text-emerald-400" />
                <span>যাচাইকৃত অফিসিয়াল পেজ</span>
              </label>
            </div>
          </div>
          <p className="rounded-xl bg-[#F2F8F5] px-3.5 py-2.5 text-[11px] font-medium text-[#4D6674] dark:bg-slate-800/70 dark:text-slate-400">
            নিরাপত্তা নীতি: “যাচাইকৃত অফিসিয়াল পেজ” টিক না দেওয়া পর্যন্ত ফেসবুক লিংকটি ওয়েবসাইটে অফিসিয়াল পেজ হিসেবে প্রদর্শিত হবে না। একইভাবে ইমেইল খালি রাখলে কোনো কাল্পনিক ইমেইল দেখাবে না।
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6F0EA] pb-2.5 dark:border-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#805AD5]/15 text-xs font-extrabold text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300">
              ৩
            </span>
            <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
              শিক্ষার মাধ্যম, শ্রেণিসমূহ, শিফট ও বিশেষ শিক্ষা কার্যক্রম
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TagListEditor
              label="শিক্ষার মাধ্যম"
              items={settings.educationMediums || []}
              placeholder="যেমন: বাংলা ভার্সন"
              maxItems={10}
              onChange={(next) => setSettings({ ...settings, educationMediums: next })}
            />
            <TagListEditor
              label="শিফটসমূহ"
              items={settings.shifts || []}
              placeholder="যেমন: মর্নিং শিফট বা ডে শিফট"
              maxItems={6}
              onChange={(next) => setSettings({ ...settings, shifts: next })}
            />
            <TagListEditor
              label="পাঠদানকৃত শ্রেণিসমূহ"
              items={settings.classList || []}
              placeholder="যেমন: প্লে গ্রুপ, ষষ্ঠ শ্রেণি..."
              maxItems={20}
              onChange={(next) => setSettings({ ...settings, classList: next })}
            />
            <TagListEditor
              label="বিশেষ ইসলামিক শিক্ষা কার্যক্রম"
              items={settings.specialPrograms || []}
              placeholder="যেমন: সহিহ কুরআন শিক্ষা"
              maxItems={15}
              onChange={(next) => setSettings({ ...settings, specialPrograms: next })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[#E6F0EA] pt-4 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'প্রতিষ্ঠানের তথ্য সংরক্ষণ করুন'}
          </button>
        </div>
      </form>
    </div>
  );
};
