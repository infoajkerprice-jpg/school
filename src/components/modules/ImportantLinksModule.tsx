import React, { useEffect, useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
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
import { toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import type { ImportantLink, UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

export const ImportantLinksModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [links, setLinks] = useState<ImportantLink[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    url: '',
    category: 'সরকারি শিক্ষা পোর্টাল',
    orderIndex: '1',
  });

  useEffect(() => {
    return onSnapshot(
      collection(db, 'important_links'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as ImportantLink))
          .sort((a, b) => a.orderIndex - b.orderIndex);
        setLinks(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'important_links')
    );
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      url: '',
      category: 'সরকারি শিক্ষা পোর্টাল',
      orderIndex: String(links.length + 1),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: clampStr(form.title, 140),
        url: clampStr(form.url, 500),
        category: clampStr(form.category, 60),
        orderIndex: Math.max(0, Math.min(500, Number(form.orderIndex) || 1)),
      };
      if (editingId) {
        await updateDoc(doc(db, 'important_links', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        notify('গুরুত্বপূর্ণ লিংক হালনাগাদ করা হয়েছে।', 'success');
      } else {
        const id = makeSafeDocId('lnk');
        await setDoc(doc(db, 'important_links', id), {
          ...payload,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify('নতুন গুরুত্বপূর্ণ লিংক যুক্ত করা হয়েছে।', 'success');
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'important_links');
      notify('লিংক সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ImportantLink) => {
    const ok = await confirm({
      title: 'লিংক মুছে ফেলুন',
      message: `"${item.title}" লিংকটি কি মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'important_links', item.id));
      notify('লিংকটি মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `important_links/${item.id}`);
      notify('লিংক মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="গুরুত্বপূর্ণ লিংক ব্যবস্থাপনা"
        subtitle="শিক্ষা মন্ত্রণালয়, শিক্ষা বোর্ড, এনসিটিবি ও অন্যান্য সরকারি পোর্টালের লিংক পরিচালনা করুন।"
        icon={<Link2 className="h-5 w-5" />}
        accent="sky"
        actions={
          <span className="rounded-xl bg-[#21A9D6]/15 px-3.5 py-2 text-xs font-bold text-[#0E7DA3] tabular-nums dark:bg-cyan-500/20 dark:text-cyan-300">
            মোট লিংক: {toBnDigits(links.length)}টি
          </span>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#E6F0EA] pb-3 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
            {editingId ? 'লিংক সম্পাদনা করুন' : 'নতুন লিংক যোগ করুন'}
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
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">লিংকের শিরোনাম *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="যেমন: মাধ্যমিক ও উচ্চমাধ্যমিক শিক্ষা বোর্ড, দিনাজপুর"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
              ওয়েবসাইট ঠিকানা (URL) *
            </label>
            <input
              required
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://dinajpureducationboard.gov.bd"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ধরন</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ক্রম নম্বর</label>
            <input
              type="number"
              min={1}
              max={500}
              value={form.orderIndex}
              onChange={(e) => setForm({ ...form, orderIndex: e.target.value })}
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'হালনাগাদ করুন' : 'লিংক সংরক্ষণ করুন'}
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#123B67] text-white dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold">ক্রম</th>
                <th className="px-4 py-3 font-bold">শিরোনাম</th>
                <th className="px-4 py-3 font-bold">ধরন</th>
                <th className="px-4 py-3 font-bold">ঠিকানা</th>
                <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                    কোনো গুরুত্বপূর্ণ লিংক এখনো যুক্ত করা হয়নি।
                  </td>
                </tr>
              ) : (
                links.map((item) => (
                  <tr key={item.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
                      #{toBnDigits(item.orderIndex)}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#123B67] dark:text-white">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 shrink-0 text-[#21A9D6]" />
                        <span>{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-[#F2F8F5] px-2.5 py-0.5 text-[11px] font-bold text-[#4D6674] dark:bg-slate-800 dark:text-slate-300">
                        {item.category || 'সাধারণ'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7DA3] hover:underline dark:text-cyan-300"
                      >
                        <span className="max-w-[240px] truncate">{item.url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setForm({
                              title: item.title,
                              url: item.url,
                              category: item.category || '',
                              orderIndex: String(item.orderIndex),
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          aria-label="সম্পাদনা"
                          className="rounded-lg bg-[#21A9D6]/14 p-1.5 text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-cyan-500/20 dark:text-cyan-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          aria-label="মুছে ফেলুন"
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
