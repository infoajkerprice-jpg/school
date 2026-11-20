import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  GraduationCap,
  Languages,
  LogIn,
  Phone,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { usePublicData } from '../../context/PublicDataContext';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import { downloadAdmissionAdmitCardPdf } from '../../lib/reports';
import { ADMISSION_STATUS_BN, GENDER_BN, GROUP_BN, labelClass, SHIFT_BN } from '../../i18n';
import {
  BD_CLASSES,
  BD_GROUPS,
  BD_SHIFTS,
  type AdmissionApplication,
} from '../../types';
import { PageHeader } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

interface AdmissionPageProps {
  authUid: string | null;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3.5 py-2.5 text-sm text-[#263B35] transition focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20';

const STATUS_BADGE: Record<string, string> = {
  Approved: 'bg-[#EDF9F4] text-[#087F5B] border border-[#C5E8D8]',
  Rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
  Pending: 'bg-[#FFF8EA] text-[#A66300] border border-[#F8DFAF]',
};

export const AdmissionPage: React.FC<AdmissionPageProps> = ({ authUid }) => {
  const { settings } = usePublicData();
  const { notify } = useUIFeedback();
  const [myAdmissions, setMyAdmissions] = useState<AdmissionApplication[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<AdmissionApplication | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    applicantName: '',
    applicantNameBn: '',
    fatherName: '',
    motherName: '',
    birthRegNo: '',
    photoUrl: '',
    applyingClass: 'Play Group',
    shift: 'Morning' as 'Morning' | 'Day',
    group: 'General' as 'General' | 'Science' | 'Business Studies' | 'Humanities',
    dateOfBirth: '2018-01-15',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    previousSchool: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    address: '',
  });

  useEffect(() => {
    if (!authUid) {
      setMyAdmissions([]);
      return;
    }
    const q = query(collection(db, 'admissions'), where('applicantUid', '==', authUid));
    return onSnapshot(
      q,
      (snap) => setMyAdmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdmissionApplication))),
      (err) => console.warn('myAdmissions listener:', err)
    );
  }, [authUid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUid) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const id = makeSafeDocId('adm');
      const applicationNo = `SISC-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const payload = {
        applicationNo,
        applicantName: clampStr(form.applicantName, 120),
        applicantNameBn: clampStr(form.applicantNameBn || form.applicantName, 120),
        fatherName: clampStr(form.fatherName, 120),
        motherName: clampStr(form.motherName, 120),
        birthRegNo: clampStr(form.birthRegNo, 40),
        photoUrl: clampStr(form.photoUrl, 500),
        applyingClass: form.applyingClass,
        shift: form.shift,
        group: form.group,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        previousSchool: clampStr(form.previousSchool, 160),
        guardianName: clampStr(form.guardianName, 120),
        guardianPhone: clampStr(form.guardianPhone, 25),
        guardianEmail: clampStr(form.guardianEmail, 160),
        address: clampStr(form.address, 300),
        status: 'Pending' as const,
        remarks: 'ভর্তি আবেদন সফলভাবে গৃহীত হয়েছে। যাচাই-বাছাই প্রক্রিয়াধীন।',
        applicantUid: authUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'admissions', id), payload);
      setSuccess({ ...payload, id, createdAt: null, updatedAt: null });
      notify(`ভর্তি আবেদন সফলভাবে জমা হয়েছে (${applicationNo})।`, 'success');
      setForm({
        applicantName: '',
        applicantNameBn: '',
        fatherName: '',
        motherName: '',
        birthRegNo: '',
        photoUrl: '',
        applyingClass: 'Play Group',
        shift: 'Morning',
        group: 'General',
        dateOfBirth: '2018-01-15',
        gender: 'Male',
        previousSchool: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        address: '',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'আবেদন জমা দিতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।';
      setError(msg);
      notify(msg, 'error');
      handleFirestoreError(err, OperationType.CREATE, 'admissions');
    } finally {
      setSubmitting(false);
    }
  };

  const educationMediums = settings.educationMediums?.length
    ? settings.educationMediums
    : ['বাংলা ভার্সন', 'ইংরেজি ভার্সন', 'আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল কারিকুলাম'];
  const shifts = settings.shifts?.length ? settings.shifts : ['মর্নিং শিফট', 'ডে শিফট'];
  const specialPrograms = settings.specialPrograms?.length
    ? settings.specialPrograms
    : ['সহিহ কুরআন শিক্ষা', 'হিফজুল কুরআন বিভাগ', 'মাসনুন দোয়া শিক্ষা', 'ইসলামিক আদব-কায়দা', 'আরবি ভাষা শিক্ষা', 'নৈতিক ও ধর্মীয় শিক্ষা'];

  const telHref = `tel:${(settings.phone || '+8801711759705').replace(/[^\d+]/g, '')}`;

  const steps = [
    {
      step: 'ধাপ ০১',
      title: 'তথ্য পূরণ ও জমা',
      text: 'শিক্ষার্থীর নাম, জন্মনিবন্ধন নম্বর ও অভিভাবকের সঠিক মোবাইল নম্বর দিয়ে আবেদন ফর্ম পূরণ করুন।',
      badge: 'bg-[#087F5B] text-white',
      border: 'border-[#C5E8D8] bg-[#EDF9F4]/60',
    },
    {
      step: 'ধাপ ০২',
      title: 'প্রবেশপত্র ডাউনলোড',
      text: 'আবেদন জমা দেওয়ার পর প্রাপ্ত আবেদন নম্বরসহ তাৎক্ষণিক প্রবেশপত্র পিডিএফ সংরক্ষণ করুন।',
      badge: 'bg-[#F4A62A] text-[#123B67]',
      border: 'border-[#F8DFAF] bg-[#FFF8EA]/70',
    },
    {
      step: 'ধাপ ০৩',
      title: 'স্ট্যাটাস ও চূড়ান্ত ভর্তি',
      text: 'এই পেজ থেকেই আপনার আবেদনের সর্বশেষ অনুমোদন স্ট্যাটাস সরাসরি দেখতে পারবেন।',
      badge: 'bg-[#21A9D6] text-white',
      border: 'border-[#BFE8F7] bg-[#EBF8FD]/70',
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'অনলাইন ভর্তি আবেদন' }]}
        badge={`ভর্তি চলছে · প্লে গ্রুপ – ${settings.highestClass || 'অষ্টম শ্রেণি'}`}
        icon={<UserPlus className="h-3.5 w-3.5" />}
        title="অনলাইন ভর্তি আবেদন ও নির্দেশিকা"
        subtitle={`${settings.schoolNameBn}-এ আধুনিক ও ইসলামিক শিক্ষায় ভর্তির জন্য অনলাইনে আবেদন জমা দিন ও প্রবেশপত্র পিডিএফ সংগ্রহ করুন।`}
        accent="emerald"
        rightSlot={
          settings.phone && (
            <a
              href={telHref}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] sm:text-sm"
            >
              <Phone className="h-4 w-4 text-[#123B67]" />
              <span>হেল্পলাইন: {settings.phone}</span>
            </a>
          )
        }
      />

      {/* Institutional Admission Summary (3 Distinct Brand Accents) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#C5E8D8] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF9F4] text-[#087F5B]">
              <Languages className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-extrabold text-[#123B67]">শিক্ষার মাধ্যম</h2>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs font-medium text-[#263B35]">
            {educationMediums.map((m) => (
              <li key={m} className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087F5B]" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#C8DDF2] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF4FB] text-[#123B67]">
              <Clock className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-extrabold text-[#123B67]">শ্রেণি ও শিফট</h2>
          </div>
          <div className="mt-3 space-y-2 text-xs text-[#263B35]">
            <p className="rounded-lg bg-[#F2F8F5] px-3 py-2">
              <strong className="text-[#123B67]">শ্রেণি:</strong> প্লে গ্রুপ থেকে {settings.highestClass || 'অষ্টম শ্রেণি'}
            </p>
            <p className="rounded-lg bg-[#FFF8EA] px-3 py-2">
              <strong className="text-[#A66300]">শিফট:</strong> {shifts.join(' ও ')}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#DDD1F5] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5F0FF] text-[#805AD5]">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-extrabold text-[#123B67]">ইসলামিক শিক্ষা কার্যক্রম</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#4C6470]">
            {specialPrograms.join(' · ')}
          </p>
        </div>
      </div>

      {/* 3-Step Admission Guidelines */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((item) => (
          <div key={item.step} className={`rounded-2xl border p-5 shadow-2xs ${item.border}`}>
            <span className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${item.badge}`}>
              {item.step}
            </span>
            <h2 className="mt-2.5 text-sm font-extrabold text-[#123B67]">{item.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#3D5562]">{item.text}</p>
          </div>
        ))}
      </div>

      {/* Main Application Form */}
      <div className="rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-7">
        {!authUid ? (
          <div className="rounded-2xl border border-[#CFE2D7] bg-gradient-to-b from-[#F2F8F5] to-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#087F5B] text-white shadow-sm">
              <GraduationCap className="h-7 w-7 text-[#F4A62A]" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#123B67]">
              ভর্তি আবেদন জমা দিতে লগইন করুন
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#4C6470] sm:text-sm">
              আবেদনের নিরাপত্তা, রিয়েল-টাইম স্ট্যাটাস যাচাই এবং প্রবেশপত্র পিডিএফ ডাউনলোডের জন্য প্রথমে আপনার অ্যাকাউন্টে লগইন করুন।
            </p>
            <Link
              to="/login?redirect=/admission"
              className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#087F5B] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#06684A]"
            >
              <LogIn className="h-4 w-4 text-[#F4A62A]" />
              লগইন করে আবেদন শুরু করুন
            </Link>
          </div>
        ) : (
          <>
            {success && (
              <div className="mb-6 rounded-2xl border border-[#087F5B]/35 bg-[#EDF9F4] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#087F5B]" />
                    <div>
                      <h3 className="text-sm font-extrabold text-[#087F5B]">
                        ভর্তি আবেদন সফলভাবে জমা হয়েছে!
                      </h3>
                      <p className="mt-0.5 text-xs text-[#263B35]">
                        আবেদন নম্বর: <strong className="font-extrabold text-[#123B67]">{success.applicationNo}</strong> · শিক্ষার্থী: {success.applicantName} ({labelClass(success.applyingClass)})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      downloadAdmissionAdmitCardPdf(success);
                      notify('ভর্তি প্রবেশপত্র পিডিএফ ডাউনলোড হচ্ছে।', 'success');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
                  >
                    <Download className="h-4 w-4" />
                    প্রবেশপত্র পিডিএফ
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div className="mb-5 flex items-center gap-2.5 border-b border-[#E8F1EC] pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B]/12 text-[#087F5B]">
                <FileCheck2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-[#123B67]">ভর্তি আবেদন ফর্ম</h2>
                <p className="text-xs text-[#526B78]">তারকাচিহ্নিত (*) সকল ঘর সঠিকভাবে পূরণ করুন</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">শিক্ষার্থীর নাম *</label>
                <input
                  required
                  value={form.applicantName}
                  onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                  placeholder="শিক্ষার্থীর পূর্ণ নাম লিখুন"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">জন্মতারিখ *</label>
                <input
                  required
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">পিতার নাম *</label>
                <input
                  required
                  value={form.fatherName}
                  onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                  placeholder="পিতার পূর্ণ নাম"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">মাতার নাম *</label>
                <input
                  required
                  value={form.motherName}
                  onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                  placeholder="মাতার পূর্ণ নাম"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">শ্রেণি নির্বাচন *</label>
                <select
                  value={form.applyingClass}
                  onChange={(e) => setForm({ ...form, applyingClass: e.target.value })}
                  className={INPUT_CLASS}
                >
                  {BD_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {labelClass(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#263B35]">শিফট</label>
                  <select
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value as 'Morning' | 'Day' })}
                    className={INPUT_CLASS}
                  >
                    {BD_SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {SHIFT_BN[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#263B35]">বিভাগ</label>
                  <select
                    value={form.group}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        group: e.target.value as 'General' | 'Science' | 'Business Studies' | 'Humanities',
                      })
                    }
                    className={INPUT_CLASS}
                  >
                    {BD_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {GROUP_BN[g]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">জন্মনিবন্ধন নম্বর *</label>
                <input
                  required
                  value={form.birthRegNo}
                  onChange={(e) => setForm({ ...form, birthRegNo: e.target.value })}
                  placeholder="১৭ সংখ্যার জন্মনিবন্ধন নম্বর"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">ছাত্র / ছাত্রী</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                  className={INPUT_CLASS}
                >
                  {Object.entries(GENDER_BN).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">অভিভাবকের নাম *</label>
                <input
                  required
                  value={form.guardianName}
                  onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                  placeholder="অভিভাবকের পূর্ণ নাম"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">অভিভাবকের মোবাইল নম্বর *</label>
                <input
                  required
                  value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                  placeholder="+880 17XX-XXXXXX"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">পূর্ববর্তী শিক্ষাপ্রতিষ্ঠান</label>
                <input
                  value={form.previousSchool}
                  onChange={(e) => setForm({ ...form, previousSchool: e.target.value })}
                  placeholder="যদি থাকে"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">শিক্ষার্থীর ছবির লিংক (ঐচ্ছিক)</label>
                <input
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  placeholder="https://..."
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-[#263B35]">বর্তমান ঠিকানা *</label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="গ্রাম/মহল্লা, ডাকঘর, উপজেলা, জেলা"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[48px] w-full rounded-xl bg-gradient-to-r from-[#087F5B] to-[#123B67] px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
                >
                  {submitting ? 'আবেদন জমা হচ্ছে...' : 'ভর্তি আবেদন জমা দিন'}
                </button>
              </div>
            </form>

            {myAdmissions.length > 0 && (
              <div className="mt-8 border-t border-[#E6F0EA] pt-6">
                <h3 className="mb-3.5 text-base font-extrabold text-[#123B67]">
                  আপনার জমাকৃত ভর্তি আবেদনসমূহ
                </h3>
                <div className="space-y-3">
                  {myAdmissions.map((app) => (
                    <div
                      key={app.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCE8E1] bg-[#F8FBF9] p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-extrabold text-[#123B67]">{app.applicantName}</p>
                          <span className="rounded-lg bg-[#EDF4FB] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#123B67]">
                            {app.applicationNo}
                          </span>
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                              STATUS_BADGE[app.status] || STATUS_BADGE.Pending
                            }`}
                          >
                            {ADMISSION_STATUS_BN[app.status] || app.status}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#526B78]">
                          {labelClass(app.applyingClass)} ({SHIFT_BN[app.shift]})
                        </p>
                        {app.remarks && <p className="text-[11px] text-[#647E8B]">{app.remarks}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          downloadAdmissionAdmitCardPdf(app);
                          notify('ভর্তি প্রবেশপত্র পিডিএফ ডাউনলোড হচ্ছে।', 'success');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#EDF9F4] px-4 py-2.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        প্রবেশপত্র পিডিএফ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
