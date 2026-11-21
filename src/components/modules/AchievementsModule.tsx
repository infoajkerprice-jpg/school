import React, { useEffect, useMemo, useState } from 'react';
import { Award, Pencil, Plus, Search, Trash2, Trophy, X } from 'lucide-react';
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
import { MAX_PORTRAIT_IMAGE_LEN, sanitizeImageUrlForFirestore } from '../../lib/imageUpload';
import { labelClass, toBnDigits } from '../../i18n';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { ImageUploadField } from '../ImageUploadField';
import { useUIFeedback } from '../ToastContext';
import { BD_CLASSES, type StudentAchievement, type UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const PAGE_SIZE = 9;

export const AchievementsModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [items, setItems] = useState<StudentAchievement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    studentName: '',
    className: 'Class 6',
    rollNumber: '',
    academicYear: '2025',
    achievementTitle: '',
    description: '',
    photoUrl: '',
  });

  useEffect(() => {
    return onSnapshot(
      collection(db, 'student_achievements'),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentAchievement)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'student_achievements')
    );
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (classFilter !== 'ALL' && item.className !== classFilter) return false;
      if (!q) return true;
      return (
        item.studentName.toLowerCase().includes(q) ||
        item.achievementTitle.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        item.rollNumber.toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm, classFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, classFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      studentName: '',
      className: 'Class 6',
      rollNumber: '',
      academicYear: '2025',
      achievementTitle: '',
      description: '',
      photoUrl: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        studentName: clampStr(form.studentName, 120),
        className: form.className,
        rollNumber: clampStr(form.rollNumber, 20),
        academicYear: clampStr(form.academicYear, 20),
        achievementTitle: clampStr(form.achievementTitle, 180),
        description: clampStr(form.description, 800),
        photoUrl: sanitizeImageUrlForFirestore(form.photoUrl, MAX_PORTRAIT_IMAGE_LEN),
      };
      if (editingId) {
        await updateDoc(doc(db, 'student_achievements', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        notify('শিক্ষার্থীর অর্জনের তথ্য হালনাগাদ করা হয়েছে।', 'success');
      } else {
        const id = makeSafeDocId('ach');
        await setDoc(doc(db, 'student_achievements', id), {
          ...payload,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify('মেধাবী শিক্ষার্থীর অর্জন সফলভাবে যুক্ত হয়েছে।', 'success');
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'student_achievements');
      notify('অর্জন সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: StudentAchievement) => {
    const ok = await confirm({
      title: 'অর্জন মুছে ফেলুন',
      message: `${item.studentName}-এর "${item.achievementTitle}" অর্জনটি কি মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'student_achievements', item.id));
      notify('অর্জন রেকর্ডটি মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `student_achievements/${item.id}`);
      notify('রেকর্ড মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="শিক্ষার্থীদের অর্জন ও মেধাতালিকা"
        subtitle="কৃতী শিক্ষার্থী, বৃত্তিপ্রাপ্ত এবং সহ-শিক্ষা প্রতিযোগিতায় বিজয়ীদের তথ্য পাবলিক ওয়েবসাইটে প্রদর্শন করুন।"
        icon={<Trophy className="h-5 w-5" />}
        accent="orange"
        actions={
          <span className="rounded-xl bg-[#F4A62A]/18 px-3.5 py-2 text-xs font-bold text-[#9A5B00] tabular-nums dark:bg-amber-500/20 dark:text-amber-300">
            মোট অর্জন: {toBnDigits(items.length)}টি
          </span>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#E6F0EA] pb-3 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
            {editingId ? 'অর্জন সম্পাদনা করুন' : 'নতুন শিক্ষার্থীর অর্জন যোগ করুন'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F2F8F5] px-3 py-1.5 text-xs font-bold text-[#263B35] hover:bg-[#E2EFE8] dark:bg-slate-800 dark:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              বাতিল
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
              শিক্ষার্থীর নাম *
            </label>
            <input
              required
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              placeholder="যেমন: তানিয়া আক্তার"
              className={inputClass}
            />
          </div>
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
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">রোল নম্বর *</label>
            <input
              required
              value={form.rollNumber}
              onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
              placeholder="যেমন: ১০১"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিক্ষাবর্ষ</label>
            <input
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              placeholder="২০২৫"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
              বিশেষ অর্জনের শিরোনাম *
            </label>
            <input
              required
              value={form.achievementTitle}
              onChange={(e) => setForm({ ...form, achievementTitle: e.target.value })}
              placeholder="যেমন: জাতীয় গণিত অলিম্পিয়াডে স্বর্ণপদক / জিপিএ ৫.০০ (বোর্ড বৃত্তি)"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              label="শিক্ষার্থীর ছবি আপলোড (ঐচ্ছিক)"
              value={form.photoUrl}
              onChange={(url) => setForm({ ...form, photoUrl: url })}
              preset="portrait"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">বিস্তারিত বিবরণ</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="অর্জনের সংক্ষিপ্ত বিবরণ..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'হালনাগাদ করুন' : 'অর্জন সংরক্ষণ করুন'}
          </button>
        </div>
      </form>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647B86] dark:text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="শিক্ষার্থীর নাম, রোল বা অর্জনের শিরোনাম খুঁজুন..."
            className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] outline-none focus:border-[#087F5B] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="ALL">সকল শ্রেণি</option>
          {BD_CLASSES.map((c) => (
            <option key={c} value={c}>
              {labelClass(c)}
            </option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {paginated.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFE0D6] bg-white py-12 text-center text-sm text-[#587064] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          কোনো শিক্ষার্থীর অর্জন পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginated.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center gap-3">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.studentName}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-xl object-cover ring-2 ring-[#F4A62A]/30"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4A62A]/18 text-[#B47009] dark:bg-amber-500/20 dark:text-amber-300">
                      <Award className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-extrabold text-[#123B67] dark:text-white">
                      {item.studentName}
                    </h4>
                    <p className="text-xs text-[#526B78] tabular-nums dark:text-slate-400">
                      {labelClass(item.className)} · রোল: {toBnDigits(item.rollNumber)}
                      {item.academicYear ? ` · ${toBnDigits(item.academicYear)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-[#087F5B]/10 px-3 py-2 text-xs font-bold text-[#087F5B] dark:bg-emerald-500/15 dark:text-emerald-300">
                  {item.achievementTitle}
                </div>
                {item.description && (
                  <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-[#4C6357] dark:text-slate-300">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#EDF3EF] pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setForm({
                      studentName: item.studentName,
                      className: item.className,
                      rollNumber: item.rollNumber,
                      academicYear: item.academicYear || '2025',
                      achievementTitle: item.achievementTitle,
                      description: item.description || '',
                      photoUrl: item.photoUrl || '',
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#21A9D6]/14 px-2.5 py-1.5 text-xs font-bold text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-cyan-500/20 dark:text-cyan-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  সম্পাদনা
                </button>
                {currentUser.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    মুছুন
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white dark:border-slate-800 dark:bg-slate-900">
          <AdminPagination
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};
