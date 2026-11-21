import React, { useEffect, useState } from 'react';
import { Eye, Image as ImageIcon, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import { MAX_BANNER_IMAGE_LEN, sanitizeImageUrlForFirestore } from '../../lib/imageUpload';
import { toBnDigits } from '../../i18n';
import {
  CAMPUS_IMAGES,
  DEFAULT_SITE_SETTINGS,
  type HeroSlide,
  type SiteSettings,
  type UserAccount,
} from '../../types';
import { isLegacyRemovedImage } from '../../context/PublicDataContext';
import { buildValidatedSiteSettingsPayload } from './InstitutionInfoModule';
import { ImageUploadField } from '../ImageUploadField';
import { useUIFeedback } from '../ToastContext';

interface Props {
  currentUser: UserAccount;
}

const CAMPUS_PRESETS = [
  { label: 'ক্যাম্পাস গেট', url: CAMPUS_IMAGES.hero },
  { label: 'অ্যাসেম্বলি', url: CAMPUS_IMAGES.assembly1 },
  { label: 'আয়োজন', url: CAMPUS_IMAGES.event },
  { label: 'ক্যাম্পাস প্রাঙ্গণ', url: CAMPUS_IMAGES.courtyard },
];

function isLegacyDemoSettings(data: Partial<SiteSettings>): boolean {
  const name = (data.schoolNameBn || '').trim();
  return name.includes('ঢাকা হেরিটেজ') || (data.email || '').includes('dhakaheritage');
}

export const WebsiteSettingsModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSlide, setSavingSlide] = useState(false);

  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: CAMPUS_IMAGES.hero as string,
    orderIndex: '1',
    isActive: true,
  });

  useEffect(() => {
    const u1 = onSnapshot(
      doc(db, 'site_settings', 'main'),
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as SiteSettings;
          if (isLegacyDemoSettings(remote)) {
            setSettings(DEFAULT_SITE_SETTINGS);
          } else {
            const merged = { ...DEFAULT_SITE_SETTINGS, ...remote };
            if (isLegacyRemovedImage(merged.aboutImageUrl)) {
              merged.aboutImageUrl = DEFAULT_SITE_SETTINGS.aboutImageUrl;
            }
            if (isLegacyRemovedImage(merged.principalPhotoUrl)) {
              merged.principalPhotoUrl = '';
            }
            setSettings(merged);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'site_settings/main')
    );

    const u2 = onSnapshot(
      collection(db, 'slides'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as HeroSlide))
          .sort((a, b) => a.orderIndex - b.orderIndex);
        setSlides(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'slides')
    );

    return () => {
      u1();
      u2();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'site_settings', 'main'), buildValidatedSiteSettingsPayload(settings));
      notify('ওয়েবসাইটের সকল সেটিংস সফলভাবে সংরক্ষণ ও প্রকাশিত হয়েছে।', 'success');
    } catch (err) {
      notify('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'site_settings/main');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSlide(true);
    try {
      const id = makeSafeDocId('sld');
      await setDoc(doc(db, 'slides', id), {
        title: clampStr(slideForm.title, 180),
        subtitle: clampStr(slideForm.subtitle, 280),
        imageUrl: sanitizeImageUrlForFirestore(slideForm.imageUrl, MAX_BANNER_IMAGE_LEN),
        orderIndex: Math.max(0, Math.min(500, Number(slideForm.orderIndex) || slides.length + 1)),
        isActive: slideForm.isActive,
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSlideForm({
        title: '',
        subtitle: '',
        imageUrl: CAMPUS_IMAGES.hero,
        orderIndex: String(slides.length + 2),
        isActive: true,
      });
      notify('নতুন হোমপেজ স্লাইডার ছবি যুক্ত করা হয়েছে।', 'success');
    } catch (err) {
      notify('স্লাইড যুক্ত করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.CREATE, 'slides');
    } finally {
      setSavingSlide(false);
    }
  };

  const toggleSlideActive = async (slide: HeroSlide) => {
    try {
      await updateDoc(doc(db, 'slides', slide.id), {
        isActive: !slide.isActive,
        updatedAt: serverTimestamp(),
      });
      notify(slide.isActive ? 'স্লাইডটি নিষ্ক্রিয় করা হয়েছে।' : 'স্লাইডটি সক্রিয় করা হয়েছে।', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `slides/${slide.id}`);
    }
  };

  const deleteSlide = async (slide: HeroSlide) => {
    const ok = await confirm({
      title: 'স্লাইড মুছে ফেলবেন?',
      message: `"${slide.title}" স্লাইডটি স্থায়ীভাবে মুছে ফেলা হবে এবং হোমপেজ থেকে অপসারিত হবে।`,
      confirmLabel: 'হ্যাঁ, মুছুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'slides', slide.id));
      notify('স্লাইডটি সফলভাবে মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      notify('স্লাইড মুছতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.DELETE, `slides/${slide.id}`);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2.5 text-sm text-[#263B35] transition focus:border-[#087F5B] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
  const labelClass = 'mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#805AD5]">
            <Sparkles className="h-3.5 w-3.5" />
            ওয়েবসাইট CMS ও কনফিগারেশন
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold text-[#123B67] dark:text-white">
            ওয়েবসাইট সেটিংস ও হোমপেজ স্লাইডার পরিচালনা
          </h2>
          <p className="text-xs text-[#546E7A] dark:text-slate-400">
            প্রতিষ্ঠানের নাম, লোগো, পরিচিতি, অধ্যক্ষের বাণী, যোগাযোগ এবং হোমপেজ স্লাইডার পরিবর্তন করলে তাৎক্ষণিকভাবে মূল ওয়েবসাইটে আপডেট হবে।
          </p>
        </div>
      </div>

      {/* Main Institution Settings Form */}
      <form
        onSubmit={handleSaveSettings}
        className="space-y-6 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <h3 className="border-b border-[#E8F1EC] pb-2.5 text-base font-extrabold text-[#087F5B] dark:border-slate-800 dark:text-emerald-400">
          প্রতিষ্ঠানের মৌলিক তথ্য ও হেডার সেটিংস
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>প্রতিষ্ঠানের বাংলা নাম *</label>
            <input
              required
              value={settings.schoolNameBn}
              onChange={(e) => setSettings({ ...settings, schoolNameBn: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>প্রতিষ্ঠাকাল (সাল)</label>
            <input
              value={settings.establishedYear || ''}
              onChange={(e) => setSettings({ ...settings, establishedYear: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>সংক্ষিপ্ত পরিচিতি / স্লোগান</label>
            <input
              value={settings.schoolSubtitleBn || ''}
              onChange={(e) => setSettings({ ...settings, schoolSubtitleBn: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <ImageUploadField
              label="প্রতিষ্ঠানের লোগো আপলোড (ঐচ্ছিক)"
              value={settings.logoUrl || ''}
              onChange={(url) => setSettings({ ...settings, logoUrl: url })}
              preset="logo"
              helperText="PNG বা JPG লোগো আপলোড করুন; খালি রাখলে অফিসিয়াল ডিফল্ট লোগো দেখাবে"
            />
          </div>
          <div>
            <label className={labelClass}>EIIN নম্বর (ঐচ্ছিক)</label>
            <input
              value={settings.eiin || ''}
              onChange={(e) => setSettings({ ...settings, eiin: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>প্রতিষ্ঠান কোড (ঐচ্ছিক)</label>
            <input
              value={settings.schoolCode || ''}
              onChange={(e) => setSettings({ ...settings, schoolCode: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)</label>
            <input
              value={settings.regNo || ''}
              onChange={(e) => setSettings({ ...settings, regNo: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelClass}>
              কাস্টম নোটিশ টিকার বার্তা (খালি রাখলে সর্বশেষ নোটিশগুলো স্বয়ংক্রিয়ভাবে চলবে)
            </label>
            <input
              value={settings.tickerOverride || ''}
              onChange={(e) => setSettings({ ...settings, tickerOverride: e.target.value })}
              placeholder="যেমন: নতুন শিক্ষাবর্ষে ভর্তি কার্যক্রম চলমান রয়েছে।"
              className={inputClass}
            />
          </div>
        </div>

        <h3 className="border-b border-[#E8F1EC] pt-2 pb-2.5 text-base font-extrabold text-[#123B67] dark:border-slate-800 dark:text-sky-300">
          প্রতিষ্ঠান পরিচিতি ও ইতিহাস
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>পরিচিতি শিরোনাম</label>
            <input
              value={settings.aboutTitle || ''}
              onChange={(e) => setSettings({ ...settings, aboutTitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              label="ক্যাম্পাস পরিচিতি ছবি আপলোড"
              value={settings.aboutImageUrl || ''}
              onChange={(url) => setSettings({ ...settings, aboutImageUrl: url })}
              preset="banner"
              quickPresets={CAMPUS_PRESETS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>প্রতিষ্ঠানের পরিচিতি</label>
            <textarea
              rows={3}
              value={settings.aboutText || ''}
              onChange={(e) => setSettings({ ...settings, aboutText: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>বিস্তারিত ইতিহাস</label>
            <textarea
              rows={3}
              value={settings.historyText || ''}
              onChange={(e) => setSettings({ ...settings, historyText: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>লক্ষ্য ও উদ্দেশ্য</label>
            <textarea
              rows={3}
              value={settings.missionText || ''}
              onChange={(e) => setSettings({ ...settings, missionText: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <h3 className="border-b border-[#E8F1EC] pt-2 pb-2.5 text-base font-extrabold text-[#805AD5] dark:border-slate-800 dark:text-purple-300">
          প্রতিষ্ঠান প্রধানের বক্তব্য
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>অধ্যক্ষ / প্রধান শিক্ষকের নাম</label>
            <input
              value={settings.principalName || ''}
              onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>পদবি</label>
            <input
              value={settings.principalDesignation || ''}
              onChange={(e) => setSettings({ ...settings, principalDesignation: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-3">
            <ImageUploadField
              label="অধ্যক্ষ / প্রধান শিক্ষকের ছবি আপলোড"
              value={settings.principalPhotoUrl || ''}
              onChange={(url) => setSettings({ ...settings, principalPhotoUrl: url })}
              preset="portrait"
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>বক্তব্য / বাণী</label>
            <textarea
              rows={3}
              value={settings.principalMessage || ''}
              onChange={(e) => setSettings({ ...settings, principalMessage: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <h3 className="border-b border-[#E8F1EC] pt-2 pb-2.5 text-base font-extrabold text-[#21A9D6] dark:border-slate-800">
          একাডেমিক ক্যালেন্ডার, ছুটির তালিকা ও যোগাযোগ তথ্য
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>মোট কর্মকর্তা ও কর্মচারী (ঐচ্ছিক)</label>
            <input
              type="number"
              min={0}
              value={settings.totalStaffCount ?? 0}
              onChange={(e) => setSettings({ ...settings, totalStaffCount: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>মোট শ্রেণি সংখ্যা</label>
            <input
              type="number"
              min={0}
              value={settings.totalClassesCount ?? 10}
              onChange={(e) => setSettings({ ...settings, totalClassesCount: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>অফিস সময়সূচি</label>
            <input
              value={settings.officeHours || ''}
              onChange={(e) => setSettings({ ...settings, officeHours: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>ঠিকানা</label>
            <input
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>ফোন নম্বর</label>
            <input
              value={settings.phone || ''}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>অফিশিয়াল ইমেইল (ঐচ্ছিক)</label>
            <input
              value={settings.email || ''}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              placeholder="অফিশিয়াল ইমেইল নিশ্চিত হলে লিখুন"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>একাডেমিক ক্যালেন্ডার বিবরণ</label>
            <textarea
              rows={2}
              value={settings.academicCalendarNote || ''}
              onChange={(e) => setSettings({ ...settings, academicCalendarNote: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>বার্ষিক ছুটির তালিকা</label>
            <textarea
              rows={2}
              value={settings.holidayListNote || ''}
              onChange={(e) => setSettings({ ...settings, holidayListNote: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingSettings}
          className="inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#06684A] disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {savingSettings ? 'সংরক্ষণ হচ্ছে...' : 'ওয়েবসাইট সেটিংস সংরক্ষণ করুন'}
        </button>
      </form>

      {/* Homepage Hero Image Slider Manager with Live Image Preview */}
      <div className="space-y-5 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8F1EC] pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#21A9D6] text-white">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
                হোমপেজ ইমেজ স্লাইডার পরিচালনা ({toBnDigits(slides.length)}টি স্লাইড)
              </h3>
              <p className="text-[11px] text-[#587064] dark:text-slate-400">
                লাইভ প্রিভিউ দেখে নতুন স্লাইড যোগ করুন বা বিদ্যমান স্লাইড সক্রিয়/নিষ্ক্রিয় করুন
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddSlide} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8">
            <div>
              <label className={labelClass}>স্লাইড শিরোনাম *</label>
              <input
                required
                value={slideForm.title}
                onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                placeholder="যেমন: স্বাগতম শাহ ইসলামিক স্কুল এন্ড কলেজ-এ!"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>উপ-শিরোনাম</label>
              <input
                value={slideForm.subtitle}
                onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                placeholder="সংক্ষিপ্ত পরিচিতিমূলক বাক্য"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <ImageUploadField
                label="স্লাইডার ছবি আপলোড (কম্পিউটার বা মোবাইল)"
                value={slideForm.imageUrl}
                onChange={(url) => setSlideForm({ ...slideForm, imageUrl: url })}
                preset="banner"
                required
                quickPresets={CAMPUS_PRESETS}
              />
            </div>
            <div>
              <label className={labelClass}>ক্রম (Order)</label>
              <input
                type="number"
                min={1}
                value={slideForm.orderIndex}
                onChange={(e) => setSlideForm({ ...slideForm, orderIndex: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingSlide}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {savingSlide ? 'যুক্ত হচ্ছে...' : 'স্লাইড যুক্ত করুন'}
              </button>
            </div>
          </div>

          {/* Live Slide Image Preview */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#D4E6DD] bg-[#F8FBF9] p-3 dark:border-slate-800 dark:bg-slate-800/60 lg:col-span-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#123B67] dark:text-slate-300">
              <Eye className="h-3.5 w-3.5 text-[#21A9D6]" />
              লাইভ স্লাইড প্রিভিউ
            </div>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#DCE8E1] bg-[#123B67]">
              {slideForm.imageUrl ? (
                <img
                  src={slideForm.imageUrl}
                  alt="Slide preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/70">
                  ছবির লিংক দিন
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B233E]/90 to-transparent p-3 text-white">
                <p className="line-clamp-1 text-xs font-extrabold">
                  {slideForm.title || 'স্লাইড শিরোনাম প্রিভিউ'}
                </p>
                {slideForm.subtitle && (
                  <p className="line-clamp-1 text-[10px] text-sky-100">{slideForm.subtitle}</p>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-[#F9FCFA] shadow-2xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-800/70"
            >
              <img src={slide.imageUrl} alt={slide.title} className="h-40 w-full object-cover" />
              <div className="p-4">
                <p className="line-clamp-1 text-sm font-bold text-[#123B67] dark:text-white">
                  {slide.title}
                </p>
                {slide.subtitle && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-[#546E7A] dark:text-slate-400">
                    {slide.subtitle}
                  </p>
                )}
                <div className="mt-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => void toggleSlideActive(slide)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      slide.isActive
                        ? 'bg-[#E9F7F1] text-[#087F5B] dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {slide.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSlide(slide)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/60 dark:text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    মুছুন
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
