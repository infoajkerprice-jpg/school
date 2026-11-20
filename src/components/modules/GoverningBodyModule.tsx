import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react';
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
import type { GoverningMember, UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

export const GoverningBodyModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [members, setMembers] = useState<GoverningMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    designation: '',
    qualification: '',
    responsibility: '',
    bio: '',
    speech: '',
    photoUrl: '',
    joinedDate: '',
    termEndDate: '',
    orderIndex: '1',
  });

  useEffect(() => {
    return onSnapshot(
      collection(db, 'governing_body'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as GoverningMember))
          .sort((a, b) => a.orderIndex - b.orderIndex);
        setMembers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'governing_body')
    );
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      designation: '',
      qualification: '',
      responsibility: '',
      bio: '',
      speech: '',
      photoUrl: '',
      joinedDate: '',
      termEndDate: '',
      orderIndex: String(members.length + 1),
    });
  };

  const startEdit = (m: GoverningMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      designation: m.designation,
      qualification: m.qualification || '',
      responsibility: m.responsibility || '',
      bio: m.bio || '',
      speech: m.speech || '',
      photoUrl: m.photoUrl || '',
      joinedDate: m.joinedDate || '',
      termEndDate: m.termEndDate || '',
      orderIndex: String(m.orderIndex),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const orderNum = Math.max(0, Math.min(500, Number(form.orderIndex) || 1));
      const base = {
        name: clampStr(form.name, 120),
        designation: clampStr(form.designation, 100),
        qualification: clampStr(form.qualification, 140),
        responsibility: clampStr(form.responsibility, 180),
        bio: clampStr(form.bio, 1000),
        speech: clampStr(form.speech, 1500),
        photoUrl: clampStr(form.photoUrl, 500),
        joinedDate: clampStr(form.joinedDate, 40),
        termEndDate: clampStr(form.termEndDate, 40),
        orderIndex: orderNum,
      };
      if (editingId) {
        await updateDoc(doc(db, 'governing_body', editingId), {
          ...base,
          updatedAt: serverTimestamp(),
        });
        notify('পরিচালনা পর্ষদের সদস্যের তথ্য হালনাগাদ করা হয়েছে।', 'success');
      } else {
        const id = makeSafeDocId('gov');
        await setDoc(doc(db, 'governing_body', id), {
          ...base,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify('নতুন সদস্য সফলভাবে পরিচালনা পর্ষদে যুক্ত হয়েছে।', 'success');
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'governing_body');
      notify('সদস্যের তথ্য সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: GoverningMember) => {
    const ok = await confirm({
      title: 'সদস্য মুছে ফেলুন',
      message: `${m.name} (${m.designation})-এর তথ্য কি পরিচালনা পর্ষদ থেকে মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'governing_body', m.id));
      notify('সদস্যের তথ্য মুছে ফেলা হয়েছে।', 'success');
      if (editingId === m.id) resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `governing_body/${m.id}`);
      notify('তথ্য মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="পরিচালনা পর্ষদ ব্যবস্থাপনা"
        subtitle="সভাপতি, সহ-সভাপতি, সম্পাদক ও সদস্যদের পরিচিতি এবং বাণী ওয়েবসাইটে রিয়েল-টাইমে প্রদর্শিত হয়।"
        icon={<Users className="h-5 w-5" />}
        accent="purple"
        actions={
          <span className="rounded-xl bg-[#805AD5]/15 px-3.5 py-2 text-xs font-bold text-[#805AD5] tabular-nums dark:bg-purple-500/20 dark:text-purple-300">
            মোট সদস্য: {toBnDigits(members.length)} জন
          </span>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#E6F0EA] pb-3 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
            {editingId ? 'সদস্যের তথ্য সম্পাদনা করুন' : 'নতুন পরিচালনা পর্ষদ সদস্য যোগ করুন'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F2F8F5] px-3 py-1.5 text-xs font-bold text-[#263B35] hover:bg-[#E2EFE8] dark:bg-slate-800 dark:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              বাতিল করুন
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">পূর্ণ নাম *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="যেমন: আলহাজ্ব হাসমত উল্লাহ"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">পদবি *</label>
            <input
              required
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="যেমন: সভাপতি / সহ-সভাপতি / সচিব"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিক্ষাগত যোগ্যতা</label>
            <input
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              placeholder="যেমন: এম.কম, ঢাকা বিশ্ববিদ্যালয়"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">দায়িত্ব</label>
            <input
              value={form.responsibility}
              onChange={(e) => setForm({ ...form, responsibility: e.target.value })}
              placeholder="যেমন: সার্বিক নীতি নির্ধারণ ও পরিচালনা"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">যোগদানের তারিখ</label>
            <input
              value={form.joinedDate}
              onChange={(e) => setForm({ ...form, joinedDate: e.target.value })}
              placeholder="যেমন: ১ জানুয়ারি, ২০২২"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">মেয়াদকাল</label>
            <input
              value={form.termEndDate}
              onChange={(e) => setForm({ ...form, termEndDate: e.target.value })}
              placeholder="যেমন: ১ জানুয়ারি, ২০২৭"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ছবির লিংক (ঐচ্ছিক)</label>
            <input
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">প্রদর্শন ক্রম</label>
            <input
              type="number"
              min={1}
              max={500}
              value={form.orderIndex}
              onChange={(e) => setForm({ ...form, orderIndex: e.target.value })}
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
              পরিচালকের বাণী (হোমপেজে প্রদর্শিত হবে)
            </label>
            <textarea
              rows={2}
              value={form.speech}
              onChange={(e) => setForm({ ...form, speech: e.target.value })}
              placeholder="শিক্ষার্থী ও অভিভাবকদের উদ্দেশ্যে সংক্ষিপ্ত বাণী লিখুন..."
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">সংক্ষিপ্ত পরিচিতি</label>
            <textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="সদস্যের সংক্ষিপ্ত জীবনী বা কর্মজীবন..."
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
            {saving ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'হালনাগাদ করুন' : 'সদস্য সংরক্ষণ করুন'}
          </button>
        </div>
      </form>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFE0D6] bg-white py-12 text-center text-sm text-[#587064] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          এখনো কোনো পরিচালনা পর্ষদ সদস্য যুক্ত করা হয়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {m.photoUrl ? (
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-[#805AD5]/25"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#805AD5]/15 text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300">
                        <Users className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-extrabold text-[#123B67] dark:text-white">{m.name}</h4>
                      <p className="text-xs font-bold text-[#805AD5] dark:text-purple-300">{m.designation}</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-[#F2F8F5] px-2 py-0.5 text-[11px] font-bold text-[#123B67] tabular-nums dark:bg-slate-800 dark:text-slate-300">
                    #{toBnDigits(m.orderIndex)}
                  </span>
                </div>
                {m.qualification && (
                  <p className="mt-2.5 text-xs text-[#526B78] dark:text-slate-400">যোগ্যতা: {m.qualification}</p>
                )}
                {m.speech && (
                  <p className="mt-2.5 line-clamp-3 rounded-xl bg-[#F2F8F5] p-2.5 text-xs leading-relaxed text-[#263B35] dark:bg-slate-800/70 dark:text-slate-300">
                    “{m.speech}”
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#EDF3EF] pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#21A9D6]/14 px-2.5 py-1.5 text-xs font-bold text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-cyan-500/20 dark:text-cyan-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  সম্পাদনা
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  মুছুন
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
