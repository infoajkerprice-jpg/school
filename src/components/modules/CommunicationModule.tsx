import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Mail,
  MessageSquare,
  Send,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import { FEEDBACK_CATEGORY_BN, labelClass, ROLE_BN, toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import { BD_CLASSES, type FeedbackMessage, type StudentRecord, type UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const MSG_STATUS_BN: Record<FeedbackMessage['status'], string> = {
  Open: 'নতুন / অপেক্ষমাণ',
  Replied: 'উত্তর দেওয়া হয়েছে',
  Resolved: 'সমাধানকৃত',
};

export const CommunicationModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const isStaff = currentUser.role === 'admin' || currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';

  const [tab, setTab] = useState<'inbox' | 'broadcast'>(isStaff ? 'broadcast' : 'inbox');
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [feedbackForm, setFeedbackForm] = useState({
    category: 'TeacherMessage' as 'Complaint' | 'Suggestion' | 'TeacherMessage',
    subject: '',
    message: '',
  });

  const [smsForm, setSmsForm] = useState({
    targetClass: 'সকল',
    subject: '',
    message: '',
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const msgRef = isStaff
      ? collection(db, 'feedback_messages')
      : query(collection(db, 'feedback_messages'), where('senderUid', '==', currentUser.uid));

    unsubs.push(
      onSnapshot(
        msgRef,
        (s) => setMessages(s.docs.map((d) => ({ id: d.id, ...d.data() } as FeedbackMessage))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'feedback_messages')
      )
    );

    if (isStaff) {
      unsubs.push(
        onSnapshot(
          collection(db, 'students'),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'students')
        )
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [isStaff, currentUser.uid]);

  const targetStudents =
    smsForm.targetClass === 'সকল'
      ? students
      : students.filter((s) => s.className === smsForm.targetClass);
  const recipientPhones = Array.from(new Set(targetStudents.map((s) => s.guardianPhone).filter(Boolean)));

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const id = makeSafeDocId('msg');
      await setDoc(doc(db, 'feedback_messages', id), {
        senderUid: currentUser.uid,
        senderName: clampStr(currentUser.displayName, 120),
        senderRole: currentUser.role,
        category: feedbackForm.category,
        subject: clampStr(feedbackForm.subject, 180),
        message: clampStr(feedbackForm.message, 2000),
        targetAudience: 'প্রশাসন ও শিক্ষকবৃন্দ',
        reply: '',
        status: 'Open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setFeedbackForm({ category: 'TeacherMessage', subject: '', message: '' });
      notify('আপনার বার্তা/অভিযোগ সফলভাবে পাঠানো হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feedback_messages');
      notify('বার্তা পাঠাতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogSmsBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaff) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('sms');
      const audienceLabel =
        smsForm.targetClass === 'সকল'
          ? `সকল অভিভাবক (${toBnDigits(recipientPhones.length)} জন)`
          : `${labelClass(smsForm.targetClass)} অভিভাবক (${toBnDigits(recipientPhones.length)} জন)`;
      await setDoc(doc(db, 'feedback_messages', id), {
        senderUid: currentUser.uid,
        senderName: clampStr(currentUser.displayName, 120),
        senderRole: currentUser.role,
        category: 'SmsBroadcast',
        subject: clampStr(smsForm.subject, 180),
        message: clampStr(smsForm.message, 2000),
        targetAudience: clampStr(audienceLabel, 80),
        reply: '',
        status: 'Resolved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSmsForm({ targetClass: 'সকল', subject: '', message: '' });
      notify(`SMS / নোটিফিকেশন বার্তাটি সংরক্ষিত হয়েছে (${audienceLabel})।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feedback_messages');
      notify('বার্তা সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMessage = async (b: FeedbackMessage) => {
    const ok = await confirm({
      title: 'বার্তা মুছে ফেলুন',
      message: `"${b.subject}" বার্তাটি কি স্থায়ীভাবে মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'feedback_messages', b.id));
      notify('বার্তাটি মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `feedback_messages/${b.id}`);
      notify('বার্তা মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleReply = async (item: FeedbackMessage, newStatus: 'Replied' | 'Resolved') => {
    if (!isStaff) return;
    const replyText = (replyDrafts[item.id] ?? item.reply ?? '').trim();
    try {
      await updateDoc(doc(db, 'feedback_messages', item.id), {
        reply: clampStr(replyText || 'আপনার বার্তাটি গ্রহণ ও সমাধান করা হয়েছে।', 1500),
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      notify('উত্তর সংরক্ষণ করা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `feedback_messages/${item.id}`);
      notify('উত্তর সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    }
  };

  const copyPhoneList = () => {
    if (recipientPhones.length === 0) return;
    void navigator.clipboard.writeText(recipientPhones.join(', '));
    notify(`${toBnDigits(recipientPhones.length)} জন অভিভাবকের মোবাইল নম্বর কপি করা হয়েছে।`, 'info');
  };

  const inboxItems = messages.filter((m) => m.category !== 'SmsBroadcast');
  const broadcastItems = messages.filter((m) => m.category === 'SmsBroadcast');

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="যোগাযোগ, SMS বার্তা ও অভিভাবক মতামত"
        subtitle="অভিভাবক ও শিক্ষার্থীদের অভিযোগ-পরামর্শ, শিক্ষকের সাথে যোগাযোগ এবং শ্রেণিভিত্তিক SMS/ইমেইল বার্তা কেন্দ্র।"
        icon={<MessageSquare className="h-5 w-5" />}
        accent="sky"
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-[#F2F8F5] p-1 dark:bg-slate-800">
            {isStaff && (
              <button
                type="button"
                onClick={() => setTab('broadcast')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  tab === 'broadcast'
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : 'text-[#263B35] dark:text-slate-300'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                SMS কেন্দ্র ({toBnDigits(broadcastItems.length)})
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('inbox')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === 'inbox'
                  ? 'bg-[#123B67] text-white shadow-xs'
                  : 'text-[#263B35] dark:text-slate-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              অভিযোগ ও মতামত ({toBnDigits(inboxItems.length)})
            </button>
          </div>
        }
      />

      {/* TAB 1: SMS / EMAIL BROADCAST CENTER */}
      {tab === 'broadcast' && isStaff && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleLogSmsBroadcast}
            className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs lg:col-span-7 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="flex items-center gap-2 border-b border-[#E6F0EA] pb-2.5 text-sm font-extrabold text-[#123B67] dark:border-slate-800 dark:text-white">
              <Mail className="h-4 w-4 text-[#087F5B]" />
              অভিভাবকদের কাছে শ্রেণিভিত্তিক SMS / বিজ্ঞপ্তি বার্তা পাঠান
            </h3>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">প্রাপক শ্রেণি</label>
                <select
                  value={smsForm.targetClass}
                  onChange={(e) => setSmsForm({ ...smsForm, targetClass: e.target.value })}
                  className={inputClass}
                >
                  <option value="সকল">সকল শ্রেণির অভিভাবক</option>
                  {BD_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {labelClass(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">বার্তার বিষয় *</label>
                <input
                  required
                  placeholder="যেমন: অনুপস্থিতি / বকেয়া বেতন / জরুরি ছুটি"
                  value={smsForm.subject}
                  onChange={(e) => setSmsForm({ ...smsForm, subject: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">বার্তার বিবরণ *</label>
              <textarea
                required
                rows={4}
                placeholder="প্রিয় অভিভাবক, আপনার সন্তানের ..."
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCE8E1] bg-[#F2F8F5] px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
              <span className="font-semibold text-[#263B35] tabular-nums dark:text-slate-300">
                নির্বাচিত প্রাপক মোবাইল নম্বর:{' '}
                <strong className="text-[#087F5B] dark:text-emerald-400">
                  {toBnDigits(recipientPhones.length)} টি
                </strong>
              </span>
              <button
                type="button"
                disabled={recipientPhones.length === 0}
                onClick={copyPhoneList}
                className="inline-flex items-center gap-1 rounded-lg border border-[#CFE0D6] bg-white px-2.5 py-1 text-[11px] font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300"
              >
                <Copy className="h-3 w-3" />
                নম্বর তালিকা কপি
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {saving ? 'পাঠানো হচ্ছে...' : 'বার্তা পাঠান ও লগ সংরক্ষণ করুন'}
            </button>
          </form>

          <div className="space-y-3 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="border-b border-[#E6F0EA] pb-2.5 text-sm font-extrabold text-[#123B67] dark:border-slate-800 dark:text-white">
              প্রেরিত বার্তা তালিকা
            </h3>
            <div className="max-h-96 space-y-2.5 overflow-y-auto">
              {broadcastItems.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#587064] dark:text-slate-400">
                  এখনো কোনো SMS বার্তা পাঠানো হয়নি।
                </p>
              ) : (
                broadcastItems.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[#E6F0EA] bg-[#F8FBF9] p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[#123B67] dark:text-white">{b.subject}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteMessage(b)}
                          aria-label="মুছে ফেলুন"
                          className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-[#087F5B] dark:text-emerald-400">
                      প্রাপক: {b.targetAudience || 'অভিভাবক'}
                    </p>
                    <p className="mt-1.5 leading-relaxed text-[#263B35] dark:text-slate-300">{b.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INBOX */}
      {tab === 'inbox' && (
        <div className="space-y-5">
          <form
            onSubmit={handleSubmitFeedback}
            className="grid grid-cols-1 gap-3.5 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <select
              value={feedbackForm.category}
              onChange={(e) =>
                setFeedbackForm({
                  ...feedbackForm,
                  category: e.target.value as 'Complaint' | 'Suggestion' | 'TeacherMessage',
                })
              }
              className={inputClass}
            >
              <option value="TeacherMessage">শিক্ষকের সাথে যোগাযোগ</option>
              <option value="Complaint">অভিভাবকের অভিযোগ</option>
              <option value="Suggestion">মতামত ও পরামর্শ</option>
            </select>
            <input
              required
              placeholder="বিষয় লিখুন *"
              value={feedbackForm.subject}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, subject: e.target.value })}
              className={`${inputClass} md:col-span-2`}
            />
            <textarea
              required
              rows={3}
              placeholder="আপনার বার্তা, প্রশ্ন বা অভিযোগ বিস্তারিত লিখুন *"
              value={feedbackForm.message}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
              className={`${inputClass} md:col-span-3`}
            />
            <div className="flex justify-end md:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                {saving ? 'জমা হচ্ছে...' : 'বার্তা পাঠান'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {inboxItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#CFE0D6] bg-white p-10 text-center text-sm text-[#587064] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                এখনো কোনো অভিযোগ বা যোগাযোগের বার্তা নেই।
              </div>
            ) : (
              inboxItems.map((item) => (
                <div
                  key={item.id}
                  className="space-y-2.5 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-[#123B67] dark:text-white">{item.subject}</span>
                      <span className="rounded-lg bg-[#805AD5]/15 px-2 py-0.5 text-[11px] font-bold text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300">
                        {FEEDBACK_CATEGORY_BN[item.category]}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          item.status === 'Resolved'
                            ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                            : item.status === 'Replied'
                            ? 'bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300'
                            : 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {MSG_STATUS_BN[item.status]}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#526B78] dark:text-slate-400">
                      প্রেরক: {item.senderName} ({ROLE_BN[item.senderRole]})
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-[#263B35] dark:text-slate-300">{item.message}</p>

                  {item.reply && (
                    <div className="rounded-xl border border-[#087F5B]/25 bg-[#F2F8F5] p-3 text-xs text-[#123B67] dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <strong>প্রশাসন / শিক্ষকের উত্তর:</strong> {item.reply}
                    </div>
                  )}

                  {isStaff && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <input
                        placeholder="উত্তর লিখুন..."
                        value={replyDrafts[item.id] ?? item.reply ?? ''}
                        onChange={(e) => setReplyDrafts({ ...replyDrafts, [item.id]: e.target.value })}
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => void handleReply(item, 'Replied')}
                        className="rounded-xl bg-[#087F5B] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#06684A]"
                      >
                        উত্তর দিন
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReply(item, 'Resolved')}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#087F5B]/30 bg-[#087F5B]/10 px-3.5 py-2 text-xs font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        সমাধানকৃত
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
