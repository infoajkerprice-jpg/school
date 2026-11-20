import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, Plus, Search, Trash2 } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import { DAY_BN, labelClass, labelDay, labelSection, toBnDigits } from '../../i18n';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import { BD_CLASSES, BD_SECTIONS, type RoutineItem, type UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
  defaultType?: 'class' | 'exam';
}

const PAGE_SIZE = 12;

export const RoutinesModule: React.FC<Props> = ({ currentUser, defaultType = 'class' }) => {
  const { notify, confirm } = useUIFeedback();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [tab, setTab] = useState<'class' | 'exam'>(defaultType);
  const [classFilter, setClassFilter] = useState<string>('সকল');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTab(defaultType);
  }, [defaultType]);

  const canManage = currentUser.role === 'admin' || currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';

  const [form, setForm] = useState({
    className: 'Class 6',
    section: 'Padma',
    dayOrDate: 'Sunday',
    timeSlot: '০৮:০০ - ০৮:৪৫',
    subject: '',
    teacherName: '',
    room: 'কক্ষ ২০১',
    examName: 'অর্ধবার্ষিক পরীক্ষা ২০২৫',
  });

  useEffect(() => {
    return onSnapshot(
      collection(db, 'routines'),
      (snap) => setRoutines(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItem))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'routines')
    );
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return routines.filter((r) => {
      if (r.type !== tab) return false;
      if (classFilter !== 'সকল' && r.className !== classFilter) return false;
      if (!q) return true;
      return (
        r.subject.toLowerCase().includes(q) ||
        (r.teacherName || '').toLowerCase().includes(q) ||
        (r.examName || '').toLowerCase().includes(q) ||
        (r.room || '').toLowerCase().includes(q) ||
        labelClass(r.className).toLowerCase().includes(q)
      );
    });
  }, [routines, tab, classFilter, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [tab, classFilter, searchTerm]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('rtn');
      await setDoc(doc(db, 'routines', id), {
        type: tab,
        className: form.className,
        section: form.section,
        dayOrDate: clampStr(form.dayOrDate, 40),
        timeSlot: clampStr(form.timeSlot, 40),
        subject: clampStr(form.subject, 80),
        teacherName: tab === 'class' ? clampStr(form.teacherName, 100) : '',
        room: clampStr(form.room, 40),
        examName: tab === 'exam' ? clampStr(form.examName, 100) : '',
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm((prev) => ({ ...prev, subject: '' }));
      notify(tab === 'class' ? 'নতুন ক্লাস রুটিন যুক্ত হয়েছে।' : 'নতুন পরীক্ষার রুটিন যুক্ত হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'routines');
      notify('রুটিন সংরক্ষণ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: RoutineItem) => {
    if (!isAdmin) return;
    const ok = await confirm({
      title: 'রুটিন মুছে ফেলুন',
      message: `${labelClass(r.className)} — ${r.subject} (${toBnDigits(r.timeSlot)}) সারিটি কি মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'routines', r.id));
      notify('রুটিন সারি মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `routines/${r.id}`);
      notify('রুটিন মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title={tab === 'class' ? 'ক্লাস রুটিন ব্যবস্থাপনা' : 'পরীক্ষার রুটিন ব্যবস্থাপনা'}
        subtitle="সাপ্তাহিক পাঠদান ও পরীক্ষার সময়সূচি সরাসরি ওয়েবসাইটের একাডেমিক বিভাগে প্রদর্শিত হয়।"
        icon={<CalendarClock className="h-5 w-5" />}
        accent={tab === 'class' ? 'emerald' : 'purple'}
        actions={
          <div className="flex items-center gap-1.5 rounded-xl bg-[#F2F8F5] p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTab('class')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === 'class'
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'text-[#263B35] hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              ক্লাস রুটিন
            </button>
            <button
              type="button"
              onClick={() => setTab('exam')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === 'exam'
                  ? 'bg-[#805AD5] text-white shadow-xs'
                  : 'text-[#263B35] hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              পরীক্ষার রুটিন
            </button>
          </div>
        }
      />

      {canManage && (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between border-b border-[#E6F0EA] pb-3 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
              {tab === 'class' ? 'নতুন ক্লাস পিরিয়ড যুক্ত করুন' : 'নতুন পরীক্ষার সময়সূচি যুক্ত করুন'}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#087F5B]/10 px-2.5 py-1 text-[11px] font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
              <Clock className="h-3.5 w-3.5" />
              লাইভ সিঙ্ক
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শ্রেণি *</label>
              <select
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                className={inputClass}
              >
                {BD_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {labelClass(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শাখা *</label>
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className={inputClass}
              >
                {BD_SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {labelSection(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                {tab === 'class' ? 'বার *' : 'পরীক্ষার তারিখ *'}
              </label>
              {tab === 'class' ? (
                <select
                  value={form.dayOrDate}
                  onChange={(e) => setForm({ ...form, dayOrDate: e.target.value })}
                  className={inputClass}
                >
                  {Object.entries(DAY_BN).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  type="date"
                  value={form.dayOrDate.match(/^\d{4}-/) ? form.dayOrDate : '2025-06-15'}
                  onChange={(e) => setForm({ ...form, dayOrDate: e.target.value })}
                  className={inputClass}
                />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">সময় *</label>
              <input
                required
                value={form.timeSlot}
                onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                placeholder="১০:০০ - ০১:০০"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">বিষয় *</label>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="যেমন: উচ্চতর গণিত"
                className={inputClass}
              />
            </div>
            {tab === 'class' ? (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিক্ষকের নাম</label>
                <input
                  value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                  placeholder="শিক্ষকের নাম"
                  className={inputClass}
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">পরীক্ষার নাম</label>
                <input
                  value={form.examName}
                  onChange={(e) => setForm({ ...form, examName: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">কক্ষ নং</label>
              <input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'রুটিন যোগ করুন'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[210px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647B86] dark:text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="বিষয়, শিক্ষক, পরীক্ষা বা কক্ষ খুঁজুন..."
            className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] outline-none focus:border-[#087F5B] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="সকল">সকল শ্রেণি</option>
          {BD_CLASSES.map((c) => (
            <option key={c} value={c}>
              {labelClass(c)}
            </option>
          ))}
        </select>
        <span className="rounded-xl bg-[#F2F8F5] px-3 py-2 text-xs font-bold text-[#087F5B] tabular-nums dark:bg-slate-800 dark:text-emerald-400">
          মোট তালিকা: {toBnDigits(filtered.length)}টি
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#123B67] text-white dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold">শ্রেণি ও শাখা</th>
                <th className="px-4 py-3 font-bold">{tab === 'class' ? 'বার' : 'তারিখ'}</th>
                <th className="px-4 py-3 font-bold">সময়</th>
                <th className="px-4 py-3 font-bold">বিষয়</th>
                <th className="px-4 py-3 font-bold">{tab === 'class' ? 'শিক্ষক' : 'পরীক্ষা'}</th>
                <th className="px-4 py-3 font-bold">কক্ষ</th>
                {isAdmin && <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                    কোনো রুটিন পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-bold text-[#123B67] dark:text-white">
                      {labelClass(r.className)} ({labelSection(r.section)})
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-[#087F5B]/12 px-2.5 py-0.5 text-xs font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
                        {labelDay(r.dayOrDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#263B35] tabular-nums dark:text-slate-300">
                      {toBnDigits(r.timeSlot)}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#123B67] dark:text-slate-100">{r.subject}</td>
                    <td className="px-4 py-3 text-[#4B6370] dark:text-slate-300">
                      {tab === 'class' ? r.teacherName || '—' : r.examName || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#4B6370] tabular-nums dark:text-slate-400">
                      {toBnDigits(r.room || '—')}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          aria-label="মুছে ফেলুন"
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
