import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileBadge2,
  GraduationCap,
  Home,
  Loader2,
  Phone,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import {
  decodeExamLabel,
  lookupStudentVerification,
  sanitizeVerificationDocId,
  type PublicStudentVerificationRecord,
} from '../../lib/studentVerification';
import {
  GROUP_BN,
  labelClass,
  labelSection,
  SHIFT_BN,
  STUDENT_STATUS_BN,
  toBnDigits,
} from '../../i18n';

export const VerifyStudentPage: React.FC = () => {
  const { settings } = usePublicData();
  const [searchParams, setSearchParams] = useSearchParams();

  const idFromUrl = (searchParams.get('id') || '').trim();
  const examShort = searchParams.get('e');
  const examRaw = searchParams.get('exam');
  const yearParam = (searchParams.get('y') || searchParams.get('year') || '').trim();

  const examLabel = decodeExamLabel(examShort, examRaw);

  const [inputCode, setInputCode] = useState(idFromUrl);
  const [loading, setLoading] = useState(Boolean(idFromUrl));
  const [record, setRecord] = useState<PublicStudentVerificationRecord | null>(null);
  const [checkedCode, setCheckedCode] = useState<string>('');
  const [checkedAt, setCheckedAt] = useState<string>('');

  useEffect(() => {
    document.title = `অনলাইন শিক্ষার্থী ও প্রবেশপত্র যাচাই | ${settings.schoolNameBn}`;
  }, [settings.schoolNameBn]);

  useEffect(() => {
    setInputCode(idFromUrl);
    if (!idFromUrl) {
      setRecord(null);
      setCheckedCode('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setRecord(null);

    void lookupStudentVerification(idFromUrl).then((res) => {
      if (cancelled) return;
      setRecord(res);
      setCheckedCode(idFromUrl);
      const now = new Date();
      const timeStr = now.toLocaleString('bn-BD', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setCheckedAt(timeStr);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [idFromUrl]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeVerificationDocId(inputCode);
    if (!clean) return;
    const next = new URLSearchParams();
    next.set('id', clean);
    setSearchParams(next);
  };

  const logoSrc = settings.logoUrl || '/school-logo.png';

  return (
    <div className="min-h-[82vh] bg-[#F2F8F5] pb-16">
      {/* Premium Brand Header Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B355B] via-[#0A5A75] to-[#087F5B] py-10 text-white sm:py-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#F4A62A]/18 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#21A9D6]/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white p-1.5 shadow-lg ring-4 ring-[#F4A62A]/60">
            <img
              src={logoSrc}
              alt={settings.schoolNameBn}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-bold text-[#FDE59B] backdrop-blur-xs">
            <QrCode className="h-3.5 w-3.5" />
            ডিজিটাল QR ভেরিফিকেশন পোর্টাল
          </span>
          <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
            অনলাইন শিক্ষার্থী ও প্রবেশপত্র যাচাই
          </h1>
          <p className="mt-1.5 text-xs text-sky-100/90 sm:text-sm">
            {settings.schoolNameBn} — প্রবেশপত্র বা আইডি কার্ডের QR কোড স্ক্যান করে অথবা শিক্ষার্থী আইডি লিখে মুহূর্তেই বৈধতা যাচাই করুন।
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-6 max-w-2xl px-4 sm:px-6">
        {/* Manual ID Search Box */}
        <form
          onSubmit={handleManualSubmit}
          className="relative z-20 rounded-2xl border border-[#D4E6DC] bg-white p-4 shadow-lg sm:p-5"
        >
          <label
            htmlFor="verify-student-id"
            className="mb-2 block text-xs font-extrabold text-[#123B67]"
          >
            শিক্ষার্থী আইডি নম্বর দিয়ে যাচাই করুন
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5B7884]" />
              <input
                id="verify-student-id"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="যেমন: SISC-2026-PG-01 বা SISC-2026-C1-05"
                className="w-full rounded-xl border border-[#C6DDD1] bg-[#F8FBF9] py-2.5 pr-3.5 pl-10 text-sm font-semibold text-[#123B67] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#06684A] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-[#F4A62A]" />
              )}
              যাচাই করুন
            </button>
          </div>
        </form>

        {/* Verification Result Area */}
        <div className="mt-6">
          {loading && (
            <div className="rounded-2xl border border-[#D4E6DC] bg-white p-10 text-center shadow-sm">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#087F5B]" />
              <p className="mt-3 text-sm font-bold text-[#123B67]">
                অনলাইন ডাটাবেসে শিক্ষার্থীর তথ্য যাচাই করা হচ্ছে...
              </p>
              <p className="mt-1 text-xs text-[#5B746A]">আইডি: {idFromUrl}</p>
            </div>
          )}

          {/* VERIFIED STUDENT CARD */}
          {!loading && record && (
            <div className="overflow-hidden rounded-3xl border-2 border-[#087F5B] bg-white shadow-xl">
              {/* Green Verified Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#066D4E] via-[#087F5B] to-[#0B6F78] px-5 py-4 text-white sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-2 ring-[#F4A62A]">
                    <BadgeCheck className="h-6 w-6 text-[#FDE084]" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold tracking-wide text-[#FDE59B] uppercase">
                      Official Online Verification
                    </p>
                    <h2 className="text-base font-extrabold sm:text-lg">
                      যাচাইকৃত নিবন্ধিত শিক্ষার্থী
                    </h2>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold shadow-xs ${
                    record.status === 'Active'
                      ? 'bg-white text-[#087F5B]'
                      : record.status === 'Graduated'
                      ? 'bg-[#F5F0FF] text-[#6B46C1]'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {STUDENT_STATUS_BN[record.status] || record.status}
                </span>
              </div>

              {/* Admit Card Exam Context Banner (if scanned from an Admit Card) */}
              {examLabel && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8D5A3] bg-[#FFFBEB] px-5 py-2.5 text-xs font-bold text-[#8A4F04] sm:px-6">
                  <span className="inline-flex items-center gap-1.5">
                    <FileBadge2 className="h-4 w-4 text-[#D9820B]" />
                    প্রবেশপত্র যাচাই: {examLabel}
                    {yearParam ? ` — ${toBnDigits(yearParam)} ইং` : ''}
                  </span>
                  <span className="rounded-md bg-[#087F5B]/10 px-2 py-0.5 text-[11px] font-extrabold text-[#087F5B]">
                    বৈধ প্রবেশপত্র ✓
                  </span>
                </div>
              )}

              {/* Student Identity Block */}
              <div className="p-5 sm:p-6">
                <div className="flex flex-col items-center gap-4 border-b border-[#E5F0EA] pb-5 text-center sm:flex-row sm:text-left">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#087F5B] bg-[#EDF7F2] text-2xl font-extrabold text-[#087F5B] shadow-sm">
                    {record.photoUrl ? (
                      <img
                        src={record.photoUrl}
                        alt={record.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{record.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF5F9] px-2.5 py-0.5 text-xs font-extrabold text-[#0B4F6C]">
                      আইডি নং: {record.studentIdCode}
                    </div>
                    <h3 className="mt-1.5 text-xl font-extrabold text-[#123B67] sm:text-2xl">
                      {record.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-[#4D6874]">
                      {settings.schoolNameBn}
                    </p>
                  </div>
                  {/* Prominent Roll Badge */}
                  <div className="shrink-0 rounded-2xl border-2 border-[#E8A928] bg-[#FFFDF2] px-5 py-2.5 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-[#8A5205]">রোল নম্বর</p>
                    <p className="text-2xl font-extrabold text-[#C81D25] tabular-nums">
                      {toBnDigits(record.rollNumber)}
                    </p>
                  </div>
                </div>

                {/* Academic Details Grid (Zero-PII) */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#DCEAE3] bg-[#F7FBF9] p-3">
                    <p className="flex items-center gap-1 text-[11px] font-bold text-[#526E78]">
                      <GraduationCap className="h-3.5 w-3.5 text-[#087F5B]" />
                      শ্রেণি
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-[#123B67]">
                      {labelClass(record.className)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#DCEAE3] bg-[#F7FBF9] p-3">
                    <p className="flex items-center gap-1 text-[11px] font-bold text-[#526E78]">
                      <BookOpen className="h-3.5 w-3.5 text-[#21A9D6]" />
                      শাখা
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-[#123B67]">
                      {labelSection(record.section)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#DCEAE3] bg-[#F7FBF9] p-3">
                    <p className="flex items-center gap-1 text-[11px] font-bold text-[#526E78]">
                      <UserCheck className="h-3.5 w-3.5 text-[#805AD5]" />
                      শিফট
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-[#123B67]">
                      {SHIFT_BN[record.shift] || record.shift}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#DCEAE3] bg-[#F7FBF9] p-3">
                    <p className="text-[11px] font-bold text-[#526E78]">বিভাগ</p>
                    <p className="mt-1 text-sm font-extrabold text-[#123B67]">
                      {GROUP_BN[record.group] || record.group}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#DCEAE3] bg-[#F7FBF9] p-3">
                    <p className="flex items-center gap-1 text-[11px] font-bold text-[#526E78]">
                      <Calendar className="h-3.5 w-3.5 text-[#F4A62A]" />
                      ভর্তি / শিক্ষাবর্ষ
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-[#123B67]">
                      {toBnDigits(record.admissionYear || '2026')}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#DCEAE3] bg-[#F7FBF9] p-3">
                    <p className="text-[11px] font-bold text-[#526E78]">প্রতিষ্ঠান কোড</p>
                    <p className="mt-1 text-sm font-extrabold text-[#123B67]">
                      {settings.eiin ? `EIIN ${toBnDigits(settings.eiin)}` : 'SISC'}
                    </p>
                  </div>
                </div>

                {/* Security Verification Footer */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D4E8DF] bg-[#ECF8F2] px-4 py-3 text-[11px] font-semibold text-[#0A5D44]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#087F5B]" />
                    এই শিক্ষার্থী {settings.schoolNameBn}-এর অনলাইন রেকর্ডে নিবন্ধিত রয়েছে।
                  </span>
                  {checkedAt && (
                    <span className="text-[#4B6B60]">যাচাই সময়: {checkedAt}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NOT FOUND / INVALID ID ALERT */}
          {!loading && checkedCode && !record && (
            <div className="overflow-hidden rounded-3xl border-2 border-rose-500 bg-white shadow-lg">
              <div className="flex items-center gap-3 bg-gradient-to-r from-rose-600 to-red-600 px-5 py-4 text-white">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-rose-100 uppercase">
                    Verification Failed
                  </p>
                  <h2 className="text-base font-extrabold sm:text-lg">
                    শিক্ষার্থীর তথ্য অনলাইনে পাওয়া যায়নি
                  </h2>
                </div>
              </div>

              <div className="space-y-3 p-5 text-sm text-[#354B54] sm:p-6">
                <p>
                  প্রদত্ত আইডি কোড{' '}
                  <strong className="rounded bg-rose-50 px-2 py-0.5 text-rose-700">
                    {checkedCode}
                  </strong>{' '}
                  {settings.schoolNameBn}-এর অনলাইন ডাটাবেসে পাওয়া যায়নি।
                </p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-[#546B74]">
                  <li>প্রবেশপত্র বা আইডি কার্ডে থাকা আইডি নম্বরটি সঠিকভাবে লেখা হয়েছে কিনা যাচাই করুন।</li>
                  <li>সন্দেহজনক বা অকার্যকর প্রবেশপত্র হলে প্রতিষ্ঠান অফিসে যোগাযোগ করুন।</li>
                </ul>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={`tel:${(settings.phone || '+8801711759705').replace(/[^+\d]/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B67] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0B2A4D]"
                  >
                    <Phone className="h-3.5 w-3.5 text-[#F4A62A]" />
                    অফিসে কল করুন ({toBnDigits(settings.phone || '+880 1711-759705')})
                  </a>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-4 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5]"
                  >
                    <Home className="h-3.5 w-3.5" />
                    হোমপেজে ফিরুন
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* EMPTY PROMPT WHEN VISITED DIRECTLY WITHOUT ?id= */}
          {!loading && !checkedCode && (
            <div className="rounded-2xl border border-[#D4E6DC] bg-white p-6 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F6F0] text-[#087F5B]">
                <QrCode className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-base font-extrabold text-[#123B67]">
                QR কোড স্ক্যান করুন অথবা আইডি লিখুন
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#526B78]">
                যেকোনো স্মার্টফোনের ক্যামেরা বা QR স্ক্যানার দিয়ে প্রবেশপত্র কিংবা আইডি কার্ডের QR কোড স্ক্যান করলে শিক্ষার্থীর নাম, শ্রেণি, রোল ও নিবন্ধন স্ট্যাটাস সাথে সাথে এখানে প্রদর্শিত হবে।
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
