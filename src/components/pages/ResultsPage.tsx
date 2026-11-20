import React, { useMemo, useState } from 'react';
import {
  Award,
  Download,
  Eye,
  FileCheck,
  GraduationCap,
  Loader2,
  Search,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { downloadMarksheetPdf } from '../../lib/reports';
import { computeMarksheetContext } from '../../lib/marksheetPdf';
import { MarksheetPreviewModal } from '../MarksheetPreviewModal';
import { labelClass, labelSection, toBnDigits } from '../../i18n';
import { BD_CLASSES, type ExamResult } from '../../types';
import { EmptyState, PageHeader, PageSkeleton } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

const FIELD_CLASS =
  'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2.5 text-sm font-medium text-[#263B35] transition focus:border-[#087F5B] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20';

export const ResultsPage: React.FC = () => {
  const { settings, publishedResults, isLoading } = usePublicData();
  const { notify } = useUIFeedback();
  const [resExam, setResExam] = useState<string>('সকল');
  const [resYear, setResYear] = useState<string>('2025');
  const [resClass, setResClass] = useState<string>('Class 6');
  const [resRoll, setResRoll] = useState<string>('');
  const [resSearched, setResSearched] = useState(false);
  const [resMatches, setResMatches] = useState<ExamResult[]>([]);
  const [previewResult, setPreviewResult] = useState<ExamResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (res: ExamResult) => {
    setDownloadingId(res.id);
    try {
      const ctx = computeMarksheetContext(res, publishedResults, settings.schoolNameBn);
      await downloadMarksheetPdf(res, ctx);
      notify(`${res.studentName}-এর মার্কশিট পিডিএফ ডাউনলোড সম্পন্ন হয়েছে।`, 'success');
    } catch (err) {
      console.error('Marksheet download failed:', err);
      notify('মার্কশিট পিডিএফ তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const availableExams = useMemo(() => {
    const set = new Set<string>(['সকল']);
    publishedResults.forEach((r) => set.add(r.examName));
    return Array.from(set);
  }, [publishedResults]);

  const availableYears = useMemo(() => {
    const set = new Set<string>(['2025']);
    publishedResults.forEach((r) => set.add(r.academicYear));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [publishedResults]);

  const recentSamples = useMemo(() => publishedResults.slice(0, 6), [publishedResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const rollNorm = resRoll.trim().toLowerCase();
    const matches = publishedResults.filter((r) => {
      const classOk = r.className === resClass;
      const yearOk = !resYear || r.academicYear === resYear;
      const examOk = resExam === 'সকল' || r.examName === resExam;
      const rollOk = !rollNorm || r.studentRoll.toLowerCase() === rollNorm;
      return classOk && yearOk && examOk && rollOk;
    });
    setResMatches(matches);
    setResSearched(true);
  };

  const handleQuickSelect = (res: ExamResult) => {
    setResClass(res.className);
    setResYear(res.academicYear);
    setResExam(res.examName);
    setResRoll(res.studentRoll);
    setResMatches([res]);
    setResSearched(true);
  };

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'পরীক্ষার ফলাফল যাচাই' }]}
        badge={`প্রকাশিত ফলাফল: ${toBnDigits(publishedResults.length)} টি`}
        icon={<FileCheck className="h-3.5 w-3.5" />}
        title="অনলাইন পরীক্ষার ফলাফল যাচাই"
        subtitle="পরীক্ষার নাম, শিক্ষাবর্ষ, শ্রেণি ও রোল নম্বর দিয়ে বিষয়ভিত্তিক ফলাফল দেখুন এবং অফিসিয়াল মার্কশিট পিডিএফ ডাউনলোড করুন।"
        accent="sky"
      />

      <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs sm:p-7">
        {/* Search Filter Card */}
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-[#DCE8E1] bg-gradient-to-br from-[#F2F8F5] to-[#EDF4FB]/50 p-5 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-[#123B67]">পরীক্ষার নাম</label>
            <select value={resExam} onChange={(e) => setResExam(e.target.value)} className={FIELD_CLASS}>
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-[#123B67]">শিক্ষাবর্ষ</label>
            <select value={resYear} onChange={(e) => setResYear(e.target.value)} className={FIELD_CLASS}>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {toBnDigits(yr)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-[#123B67]">শ্রেণি নির্বাচন</label>
            <select value={resClass} onChange={(e) => setResClass(e.target.value)} className={FIELD_CLASS}>
              {BD_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {labelClass(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-[#123B67]">রোল নম্বর</label>
            <input
              type="text"
              value={resRoll}
              onChange={(e) => setResRoll(e.target.value)}
              placeholder="যেমন: 101 (খালি রাখলে সব)"
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#06684A]"
            >
              <Search className="h-4 w-4" />
              ফলাফল দেখুন
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="mt-6">
            <PageSkeleton variant="cards" count={3} />
          </div>
        ) : !resSearched ? (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-dashed border-[#CBE0D4] bg-[#FAFDFB] p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF9F4] text-[#087F5B]">
                <Award className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-extrabold text-[#123B67]">
                উপরের ফর্মে শ্রেণি ও রোল নম্বর দিয়ে “ফলাফল দেখুন” বাটনে ক্লিক করুন
              </p>
              <p className="mt-1 text-xs text-[#526B78] tabular-nums">
                ডাটাবেসে মোট প্রকাশিত ফলাফল সংরক্ষিত আছে: {toBnDigits(publishedResults.length)} টি
              </p>
            </div>

            {recentSamples.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#F4A62A]" />
                  <h2 className="text-sm font-extrabold text-[#123B67]">
                    সাম্প্রতিক প্রকাশিত ফলাফলসমূহ (ক্লিক করে মার্কশিট দেখুন)
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {recentSamples.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleQuickSelect(sample)}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE8E1] bg-[#FAFDFB] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#087F5B] hover:bg-white hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[#123B67] group-hover:text-[#087F5B]">
                          {sample.studentName}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-[#526B78] tabular-nums">
                          {labelClass(sample.className)} · রোল {toBnDigits(sample.studentRoll)} ·{' '}
                          {sample.examName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-block rounded-lg bg-[#EDF9F4] px-2.5 py-1 text-xs font-extrabold text-[#087F5B] tabular-nums">
                          GPA {toBnDigits(sample.gpa.toFixed(2))}
                        </span>
                        <p className="mt-1 text-[11px] font-bold text-[#805AD5]">গ্রেড: {sample.grade}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {resMatches.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="h-7 w-7 text-[#F4A62A]" />}
                title="প্রদত্ত তথ্যের সাথে মিল রেখে কোনো ফলাফল পাওয়া যায়নি"
                description="সঠিক শ্রেণি, শিক্ষাবর্ষ, পরীক্ষার নাম ও রোল নম্বর যাচাই করে আবার অনুসন্ধান করুন।"
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setResRoll('');
                      setResExam('সকল');
                      setResSearched(false);
                    }}
                    className="rounded-xl bg-[#123B67] px-4 py-2 text-xs font-bold text-white"
                  >
                    পুনরায় অনুসন্ধান করুন
                  </button>
                }
              />
            ) : (
              resMatches.map((res) => (
                <div
                  key={res.id}
                  className="overflow-hidden rounded-2xl border border-[#CFE2D7] bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#123B67] to-[#087F5B] px-5 py-4 text-white">
                    <div>
                      <h2 className="text-lg font-extrabold">{res.studentName}</h2>
                      <p className="mt-0.5 text-xs text-sky-100 tabular-nums">
                        {labelClass(res.className)} ({labelSection(res.section)}) · রোল:{' '}
                        {toBnDigits(res.studentRoll)} · {res.examName} ({toBnDigits(res.academicYear)})
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewResult(res)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/35 bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25"
                      >
                        <Eye className="h-4 w-4" />
                        মার্কশিট প্রিভিউ
                      </button>
                      <button
                        type="button"
                        disabled={downloadingId === res.id}
                        onClick={() => void handleDownloadPdf(res)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2 text-xs font-extrabold text-[#123B67] shadow-xs transition hover:bg-[#f7b547] disabled:opacity-65"
                      >
                        {downloadingId === res.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {downloadingId === res.id ? 'তৈরি হচ্ছে...' : 'মার্কশিট পিডিএফ ডাউনলোড'}
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="overflow-x-auto rounded-xl border border-[#E2EDE7]">
                      <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
                        <thead className="bg-[#F2F8F5] text-[#123B67]">
                          <tr>
                            <th className="px-4 py-3 font-extrabold">বিষয়</th>
                            <th className="px-4 py-3 font-extrabold">পূর্ণমান</th>
                            <th className="px-4 py-3 font-extrabold">প্রাপ্ত নম্বর</th>
                            <th className="px-4 py-3 font-extrabold">লেটার গ্রেড</th>
                            <th className="px-4 py-3 font-extrabold">গ্রেড পয়েন্ট</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDF3EF]">
                          {res.subjects.map((sub, i) => (
                            <tr key={`${sub.subject}-${i}`} className="transition hover:bg-[#F8FBF9]">
                              <td className="px-4 py-3 font-bold text-[#123B67]">{sub.subject}</td>
                              <td className="px-4 py-3 text-[#526B78] tabular-nums">
                                {toBnDigits(sub.fullMarks)}
                              </td>
                              <td className="px-4 py-3 font-extrabold text-[#123B67] tabular-nums">
                                {toBnDigits(sub.marks)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-extrabold ${
                                    sub.grade === 'F'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-[#EDF9F4] text-[#087F5B]'
                                  }`}
                                >
                                  {sub.grade}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#263B35] tabular-nums">
                                {toBnDigits(sub.point.toFixed(2))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 4-Color Result KPI Strip */}
                    <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                      <div className="rounded-xl border border-[#C8DDF2] bg-[#EDF4FB] p-3.5">
                        <p className="text-xs font-bold text-[#123B67]">মোট নম্বর</p>
                        <p className="mt-1 text-xl font-extrabold text-[#123B67] tabular-nums">
                          {toBnDigits(res.totalMarks)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#C5E8D8] bg-[#EDF9F4] p-3.5">
                        <p className="text-xs font-bold text-[#087F5B]">জিপিএ (৫.০০)</p>
                        <p className="mt-1 text-xl font-extrabold text-[#087F5B] tabular-nums">
                          {toBnDigits(res.gpa.toFixed(2))}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#F8DFAF] bg-[#FFF8EA] p-3.5">
                        <p className="text-xs font-bold text-[#A66300]">চূড়ান্ত গ্রেড</p>
                        <p className="mt-1 text-xl font-extrabold text-[#A66300]">{res.grade}</p>
                      </div>
                      <div className="rounded-xl border border-[#DDD1F5] bg-[#F5F0FF] p-3.5">
                        <p className="text-xs font-bold text-[#805AD5]">মেধাক্রম</p>
                        <p className="mt-1 inline-flex items-center justify-center gap-1 text-lg font-extrabold text-[#805AD5]">
                          <Trophy className="h-4 w-4" />
                          {res.meritPosition || 'উত্তীর্ণ'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {previewResult && (
        <MarksheetPreviewModal
          result={previewResult}
          options={computeMarksheetContext(previewResult, publishedResults, settings.schoolNameBn)}
          onClose={() => setPreviewResult(null)}
        />
      )}
    </div>
  );
};
