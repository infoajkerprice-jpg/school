import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
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
import { downloadFeeLedgerPdf, downloadFeeReceiptPdf, exportToExcel } from '../../lib/reports';
import {
  FEE_CATEGORY_BN,
  FEE_STATUS_BN,
  FINANCIAL_CATEGORY_BN,
  formatBdtBn,
  labelClass,
  PAYMENT_METHOD_BN,
  toBnDigits,
} from '../../i18n';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { StudentPicker } from '../StudentPicker';
import { useUIFeedback } from '../ToastContext';
import type { FeeInvoice, FinancialEntry, StudentRecord, UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const PAGE_SIZE = 10;

export const FeesModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [activeTab, setActiveTab] = useState<'fees' | 'accounts'>('fees');
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [payModal, setPayModal] = useState<FeeInvoice | null>(null);
  const [payMethod, setPayMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash'>('bKash');
  const [payAmount, setPayAmount] = useState('');
  const [txId, setTxId] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FeeInvoice['status']>('ALL');
  const [page, setPage] = useState(1);

  const isAdmin = currentUser.role === 'admin';

  const [acctForm, setAcctForm] = useState({
    entryType: 'Expense' as 'Income' | 'Expense',
    category: 'TeacherSalary' as FinancialEntry['category'],
    title: '',
    amountBdt: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Cash' as FinancialEntry['paymentMethod'],
    referenceNo: '',
    notes: '',
  });

  const [form, setForm] = useState({
    studentId: '',
    month: 'মার্চ',
    academicYear: '2025',
    feeCategory: 'Tuition' as FeeInvoice['feeCategory'],
    amountBdt: '2500',
    dueDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    if (isAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'students'),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'students')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'fee_invoices'),
          (s) => setInvoices(s.docs.map((d) => ({ id: d.id, ...d.data() } as FeeInvoice))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'fee_invoices')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'financial_entries'),
          (s) =>
            setEntries(
              s.docs
                .map((d) => ({ id: d.id, ...d.data() } as FinancialEntry))
                .sort((a, b) => b.date.localeCompare(a.date))
            ),
          (e) => handleFirestoreError(e, OperationType.LIST, 'financial_entries')
        )
      );
    } else {
      const uidField = currentUser.role === 'student' ? 'studentUid' : 'parentUid';
      unsubs.push(
        onSnapshot(
          query(collection(db, 'fee_invoices'), where(uidField, '==', currentUser.uid)),
          (s) => setInvoices(s.docs.map((d) => ({ id: d.id, ...d.data() } as FeeInvoice))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'fee_invoices')
        )
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [isAdmin, currentUser.role, currentUser.uid]);

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.studentName.toLowerCase().includes(q) ||
        inv.rollNumber.toLowerCase().includes(q) ||
        inv.month.toLowerCase().includes(q)
      );
    });
  }, [invoices, searchTerm, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, page]);

  const totalBilled = invoices.reduce((s, i) => s + i.amountBdt, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmountBdt, 0);
  const totalDue = Math.max(0, totalBilled - totalPaid);
  const totalOtherIncome = entries.filter((e) => e.entryType === 'Income').reduce((s, e) => s + e.amountBdt, 0);
  const totalExpenses = entries.filter((e) => e.entryType === 'Expense').reduce((s, e) => s + e.amountBdt, 0);
  const netBalance = totalPaid + totalOtherIncome - totalExpenses;

  const handleCreateFinancialEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('fin');
      await setDoc(doc(db, 'financial_entries', id), {
        entryType: acctForm.entryType,
        category: acctForm.category,
        title: clampStr(acctForm.title, 180),
        amountBdt: Math.max(1, Number(acctForm.amountBdt) || 1),
        date: acctForm.date,
        paymentMethod: acctForm.paymentMethod,
        referenceNo: clampStr(acctForm.referenceNo, 80),
        notes: clampStr(acctForm.notes, 400),
        recordedByUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAcctForm({
        ...acctForm,
        title: '',
        amountBdt: '',
        referenceNo: '',
        notes: '',
      });
      notify('আয়-ব্যয়ের এন্ট্রি সফলভাবে হিসাব খাতায় যুক্ত হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'financial_entries');
      notify('হিসাব সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (en: FinancialEntry) => {
    const ok = await confirm({
      title: 'হিসাব এন্ট্রি মুছে ফেলুন',
      message: `"${en.title}" (${formatBdtBn(en.amountBdt)}) এন্ট্রিটি কি মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'financial_entries', en.id));
      notify('হিসাব এন্ট্রি মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `financial_entries/${en.id}`);
      notify('এন্ট্রি মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id === form.studentId);
    if (!stu) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('inv');
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      await setDoc(doc(db, 'fee_invoices', id), {
        invoiceNo,
        studentId: stu.id,
        studentName: stu.name,
        rollNumber: stu.rollNumber,
        className: stu.className,
        month: clampStr(form.month, 30),
        academicYear: clampStr(form.academicYear, 10),
        feeCategory: form.feeCategory,
        amountBdt: Math.max(1, Number(form.amountBdt) || 1000),
        paidAmountBdt: 0,
        dueDate: form.dueDate,
        status: 'Unpaid',
        paymentMethod: 'None',
        transactionId: '',
        paidDate: '',
        ...(stu.studentUid ? { studentUid: stu.studentUid } : {}),
        ...(stu.parentUid ? { parentUid: stu.parentUid } : {}),
        createdByUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowCreate(false);
      notify(`নতুন ফি বিল (${invoiceNo}) তৈরি করা হয়েছে।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'fee_invoices');
      notify('ফি বিল তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setSaving(true);
    try {
      const remaining = Math.max(1, payModal.amountBdt - payModal.paidAmountBdt);
      const addedAmount = Math.max(1, Math.min(remaining, Number(payAmount) || remaining));
      const newPaidTotal = Math.min(payModal.amountBdt, payModal.paidAmountBdt + addedAmount);
      const newStatus: FeeInvoice['status'] = newPaidTotal >= payModal.amountBdt ? 'Paid' : 'Partial';
      const methodToUse = isAdmin ? payMethod : payMethod === 'Cash' ? 'bKash' : payMethod;
      const cleanTx = clampStr(txId || `TRX${Date.now().toString().slice(-6)}`, 80);
      await updateDoc(doc(db, 'fee_invoices', payModal.id), {
        paidAmountBdt: newPaidTotal,
        status: newStatus,
        paymentMethod: methodToUse,
        transactionId: cleanTx,
        paidDate: new Date().toISOString().slice(0, 10),
        updatedAt: serverTimestamp(),
      });
      notify(
        newStatus === 'Paid'
          ? `বিল ${payModal.invoiceNo} সম্পূর্ণ পরিশোধিত হয়েছে।`
          : `বিল ${payModal.invoiceNo}-এ আংশিক ${formatBdtBn(addedAmount)} জমা হয়েছে।`,
        'success'
      );
      setPayModal(null);
      setPayAmount('');
      setTxId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fee_invoices/${payModal.id}`);
      notify('পেমেন্ট সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async (inv: FeeInvoice) => {
    if (!isAdmin) return;
    const ok = await confirm({
      title: 'ফি বিল মুছে ফেলুন',
      message: `${inv.studentName}-এর বিল নং ${inv.invoiceNo} (${formatBdtBn(inv.amountBdt)}) কি স্থায়ীভাবে মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'fee_invoices', inv.id));
      notify('ফি বিল মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fee_invoices/${inv.id}`);
      notify('ফি বিল মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="বেতন, ফি ও আয়-ব্যয় হিসাব ব্যবস্থাপনা"
        subtitle={`মোট বিল: ${formatBdtBn(totalBilled)} · আদায়: ${formatBdtBn(totalPaid)} · বকেয়া: ${formatBdtBn(totalDue)}`}
        icon={<Wallet className="h-5 w-5" />}
        accent="orange"
        actions={
          isAdmin && (
            <>
              <div className="flex items-center gap-1 rounded-xl bg-[#F2F8F5] p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('fees')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === 'fees'
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'text-[#263B35] dark:text-slate-300'
                  }`}
                >
                  শিক্ষার্থী বেতন ও ফি
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('accounts')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === 'accounts'
                      ? 'bg-[#123B67] text-white shadow-xs'
                      : 'text-[#263B35] dark:text-slate-300'
                  }`}
                >
                  আয়-ব্যয় ({toBnDigits(entries.length)})
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  downloadFeeLedgerPdf(invoices);
                  notify('ফি লেজার পিডিএফ ডাউনলোড হয়েছে।', 'info');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5 text-[#21A9D6]" />
                লেজার পিডিএফ
              </button>
              <button
                type="button"
                onClick={() => {
                  exportToExcel(
                    invoices.map((i) => ({
                      InvoiceNo: i.invoiceNo,
                      Student: i.studentName,
                      Class: i.className,
                      Roll: i.rollNumber,
                      Month: i.month,
                      Category: i.feeCategory,
                      AmountBDT: i.amountBdt,
                      PaidBDT: i.paidAmountBdt,
                      Method: i.paymentMethod,
                      Status: i.status,
                    })),
                    'Fees',
                    'Fee_Ledger.xlsx'
                  );
                  notify('ফি লেজার এক্সেল ডাউনলোড হয়েছে।', 'info');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#087F5B] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                এক্সেল
              </button>
              {activeTab === 'fees' && (
                <button
                  type="button"
                  onClick={() => setShowCreate((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
                >
                  {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showCreate ? 'বন্ধ করুন' : 'নতুন ফি বিল'}
                </button>
              )}
            </>
          )
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-[#526B78] dark:text-slate-400">ফি + অন্যান্য মোট আয়</p>
          <p className="mt-1.5 text-xl font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
            {formatBdtBn(totalPaid + totalOtherIncome)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-[#526B78] dark:text-slate-400">মোট ব্যয় ও বেতন প্রদান</p>
          <p className="mt-1.5 text-xl font-extrabold text-rose-600 tabular-nums dark:text-rose-400">
            {formatBdtBn(totalExpenses)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-[#526B78] dark:text-slate-400">নিট স্থিতি</p>
          <p className="mt-1.5 text-xl font-extrabold text-[#123B67] tabular-nums dark:text-sky-300">
            {formatBdtBn(netBalance)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-[#526B78] dark:text-slate-400">মোট বকেয়া বেতন</p>
          <p className="mt-1.5 text-xl font-extrabold text-[#B47009] tabular-nums dark:text-amber-300">
            {formatBdtBn(totalDue)}
          </p>
        </div>
      </div>

      {activeTab === 'accounts' && isAdmin ? (
        <div className="space-y-5">
          <form
            onSubmit={handleCreateFinancialEntry}
            className="grid grid-cols-1 gap-3.5 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <select
              value={acctForm.entryType}
              onChange={(e) => setAcctForm({ ...acctForm, entryType: e.target.value as 'Income' | 'Expense' })}
              className={inputClass}
            >
              <option value="Expense">ব্যয় / বেতন প্রদান</option>
              <option value="Income">আয় / অনুদান</option>
            </select>
            <select
              value={acctForm.category}
              onChange={(e) =>
                setAcctForm({ ...acctForm, category: e.target.value as FinancialEntry['category'] })
              }
              className={inputClass}
            >
              {Object.entries(FINANCIAL_CATEGORY_BN).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="বিবরণ (যেমন: শিক্ষক বেতন — মার্চ)"
              value={acctForm.title}
              onChange={(e) => setAcctForm({ ...acctForm, title: e.target.value })}
              className={`${inputClass} md:col-span-2`}
            />
            <input
              required
              type="number"
              min={1}
              placeholder="টাকার পরিমাণ *"
              value={acctForm.amountBdt}
              onChange={(e) => setAcctForm({ ...acctForm, amountBdt: e.target.value })}
              className={`${inputClass} tabular-nums`}
            />
            <input
              required
              type="date"
              value={acctForm.date}
              onChange={(e) => setAcctForm({ ...acctForm, date: e.target.value })}
              className={inputClass}
            />
            <select
              value={acctForm.paymentMethod}
              onChange={(e) =>
                setAcctForm({ ...acctForm, paymentMethod: e.target.value as FinancialEntry['paymentMethod'] })
              }
              className={inputClass}
            >
              <option value="Cash">নগদ (হিসাব শাখা)</option>
              <option value="bKash">বিকাশ</option>
              <option value="Nagad">নগদ মোবাইল ব্যাংকিং</option>
              <option value="Rocket">রকেট</option>
              <option value="Bank">ব্যাংক</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'হিসাব যুক্ত করুন'}
            </button>
          </form>

          <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#123B67] text-white dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold">তারিখ</th>
                    <th className="px-4 py-3 font-bold">ধরন ও খাত</th>
                    <th className="px-4 py-3 font-bold">বিবরণ</th>
                    <th className="px-4 py-3 font-bold">মাধ্যম</th>
                    <th className="px-4 py-3 text-right font-bold">পরিমাণ</th>
                    <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                        এখনো কোনো আয়-ব্যয়ের এন্ট্রি যুক্ত করা হয়নি।
                      </td>
                    </tr>
                  ) : (
                    entries.map((en) => (
                      <tr key={en.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-bold text-[#123B67] tabular-nums dark:text-slate-200">
                          {toBnDigits(en.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                              en.entryType === 'Income'
                                ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}
                          >
                            {en.entryType === 'Income' ? 'আয়' : 'ব্যয়'} · {FINANCIAL_CATEGORY_BN[en.category]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#123B67] dark:text-white">{en.title}</td>
                        <td className="px-4 py-3 text-[#4B6370] dark:text-slate-300">
                          {PAYMENT_METHOD_BN[en.paymentMethod]}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-extrabold tabular-nums ${
                            en.entryType === 'Income'
                              ? 'text-[#087F5B] dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {en.entryType === 'Income' ? '+' : '-'} {formatBdtBn(en.amountBdt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(en)}
                            aria-label="মুছে ফেলুন"
                            className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {showCreate && isAdmin && (
            <form
              onSubmit={handleCreateInvoice}
              className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="mb-4 border-b border-[#E6F0EA] pb-2.5 text-sm font-extrabold text-[#123B67] dark:border-slate-800 dark:text-white">
                নতুন ফি বিল জারি করুন
              </h3>
              <div className="mb-3.5">
                <StudentPicker
                  students={students}
                  value={form.studentId}
                  onChange={(id) => setForm({ ...form, studentId: id })}
                  label="শ্রেণি ও শিক্ষার্থী নির্বাচন করুন"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ফি-এর খাত</label>
                  <select
                    value={form.feeCategory}
                    onChange={(e) => setForm({ ...form, feeCategory: e.target.value as FeeInvoice['feeCategory'] })}
                    className={inputClass}
                  >
                    {Object.entries(FEE_CATEGORY_BN).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">মাস *</label>
                  <input
                    required
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">টাকার পরিমাণ *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={form.amountBdt}
                    onChange={(e) => setForm({ ...form, amountBdt: e.target.value })}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শেষ তারিখ *</label>
                  <input
                    required
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
                >
                  {saving ? 'তৈরি হচ্ছে...' : 'বিল তৈরি করুন'}
                </button>
              </div>
            </form>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647B86] dark:text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="বিল নম্বর, শিক্ষার্থীর নাম, রোল বা মাস খুঁজুন..."
                className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] outline-none focus:border-[#087F5B] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | FeeInvoice['status'])}
              className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">সকল অবস্থা</option>
              <option value="Paid">পরিশোধিত</option>
              <option value="Partial">আংশিক</option>
              <option value="Unpaid">অপরিশোধিত</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {/* Mobile Invoice Cards */}
            <div className="divide-y divide-[#EAF2ED] md:hidden dark:divide-slate-800">
              {paginatedInvoices.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-[#587064] dark:text-slate-400">
                  কোনো ফি বিল পাওয়া যায়নি।
                </p>
              ) : (
                paginatedInvoices.map((inv) => (
                  <div key={inv.id} className="space-y-2.5 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="rounded-md bg-[#E9F7F1] px-2 py-0.5 text-[10px] font-extrabold text-[#087F5B] tabular-nums dark:bg-emerald-500/20 dark:text-emerald-300">
                          {inv.invoiceNo}
                        </span>
                        <p className="mt-1 truncate text-sm font-extrabold text-[#123B67] dark:text-white">
                          {inv.studentName}
                        </p>
                        <p className="text-[11px] text-[#526B78] tabular-nums dark:text-slate-400">
                          {labelClass(inv.className)} · রোল {toBnDigits(inv.rollNumber)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-0.5 text-[10.5px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                            : inv.status === 'Partial'
                            ? 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {FEE_STATUS_BN[inv.status]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F5F9F7] px-3 py-2 text-xs dark:bg-slate-800/70">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#123B67] dark:text-slate-100">
                          {FEE_CATEGORY_BN[inv.feeCategory]}
                        </p>
                        <p className="text-[10.5px] text-[#5A7380] dark:text-slate-400">
                          {inv.month} {toBnDigits(inv.academicYear)}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="font-extrabold text-[#123B67] dark:text-white">
                          {formatBdtBn(inv.amountBdt)}
                        </p>
                        {inv.paidAmountBdt > 0 && inv.paidAmountBdt < inv.amountBdt && (
                          <p className="text-[10px] font-bold text-[#B47009] dark:text-amber-300">
                            বাকি: {formatBdtBn(inv.amountBdt - inv.paidAmountBdt)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayModal(inv);
                            setPayMethod('bKash');
                            setPayAmount(String(Math.max(1, inv.amountBdt - inv.paidAmountBdt)));
                            setTxId('');
                          }}
                          className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#087F5B] px-2.5 text-xs font-bold text-white"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          পরিশোধ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          downloadFeeReceiptPdf(inv);
                          notify('ফি রশিদ পিডিএফ ডাউনলোড হয়েছে।', 'info');
                        }}
                        className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#21A9D6]/14 px-2.5 text-xs font-bold text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                        রশিদ
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv)}
                          aria-label="মুছে ফেলুন"
                          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#123B67] text-white dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold">বিল নম্বর</th>
                    <th className="px-4 py-3 font-bold">শিক্ষার্থী</th>
                    <th className="px-4 py-3 font-bold">খাত ও মাস</th>
                    <th className="px-4 py-3 font-bold">পরিমাণ</th>
                    <th className="px-4 py-3 font-bold">মাধ্যম</th>
                    <th className="px-4 py-3 font-bold">অবস্থা</th>
                    <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
                  {paginatedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                        কোনো ফি বিল পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    paginatedInvoices.map((inv) => (
                      <tr key={inv.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
                          {inv.invoiceNo}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#123B67] dark:text-white">{inv.studentName}</p>
                          <p className="text-[11px] text-[#526B78] tabular-nums dark:text-slate-400">
                            {labelClass(inv.className)} · রোল {toBnDigits(inv.rollNumber)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#263B35] dark:text-slate-200">
                            {FEE_CATEGORY_BN[inv.feeCategory]}
                          </p>
                          <p className="text-[11px] text-[#526B78] dark:text-slate-400">
                            {inv.month} {toBnDigits(inv.academicYear)}
                          </p>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <p className="font-extrabold text-[#123B67] dark:text-white">{formatBdtBn(inv.amountBdt)}</p>
                          {inv.paidAmountBdt > 0 && inv.paidAmountBdt < inv.amountBdt && (
                            <p className="text-[11px] font-bold text-[#B47009] dark:text-amber-300">
                              জমা: {formatBdtBn(inv.paidAmountBdt)} · বাকি:{' '}
                              {formatBdtBn(inv.amountBdt - inv.paidAmountBdt)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#4B6370] dark:text-slate-300">
                          {PAYMENT_METHOD_BN[inv.paymentMethod] || inv.paymentMethod}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                              inv.status === 'Paid'
                                ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                                : inv.status === 'Partial'
                                ? 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}
                          >
                            {FEE_STATUS_BN[inv.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {inv.status !== 'Paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayModal(inv);
                                  setPayMethod('bKash');
                                  setPayAmount(String(Math.max(1, inv.amountBdt - inv.paidAmountBdt)));
                                  setTxId('');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#087F5B] px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                পরিশোধ
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                downloadFeeReceiptPdf(inv);
                                notify('ফি রশিদ পিডিএফ ডাউনলোড হয়েছে।', 'info');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#21A9D6]/14 px-2.5 py-1.5 text-xs font-bold text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-cyan-500/20 dark:text-cyan-300"
                            >
                              <Download className="h-3.5 w-3.5" />
                              রশিদ
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv)}
                                aria-label="মুছে ফেলুন"
                                className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              totalItems={filteredInvoices.length}
              pageSize={PAGE_SIZE}
              currentPage={page}
              onPageChange={setPage}
            />
          </div>

          {/* Payment Modal */}
          {payModal && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-[#091C2B]/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
              onClick={() => setPayModal(null)}
            >
              <form
                onSubmit={handleRecordPayment}
                onClick={(e) => e.stopPropagation()}
                className="sheet-enter max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#DCE8E1] bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#123B67] dark:text-white">ফি পরিশোধ নিশ্চিত করুন</h3>
                    <p className="mt-1 text-xs text-[#526B78] dark:text-slate-400">
                      বিল নং: {payModal.invoiceNo} · শিক্ষার্থী: {payModal.studentName} · পরিমাণ:{' '}
                      <strong className="text-[#087F5B] dark:text-emerald-400">
                        {formatBdtBn(payModal.amountBdt)}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayModal(null)}
                    className="rounded-lg p-1 text-[#647B86] hover:bg-[#F2F8F5] dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                      জমা দেওয়ার পরিমাণ (সর্বোচ্চ {formatBdtBn(Math.max(1, payModal.amountBdt - payModal.paidAmountBdt))}) *
                    </label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={Math.max(1, payModal.amountBdt - payModal.paidAmountBdt)}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className={`${inputClass} font-bold tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                      পরিশোধের মাধ্যম
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) =>
                        setPayMethod(e.target.value as 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash')
                      }
                      className={inputClass}
                    >
                      <option value="bKash">বিকাশ (bKash)</option>
                      <option value="Nagad">নগদ (Nagad)</option>
                      <option value="Rocket">রকেট (Rocket)</option>
                      <option value="Bank">ব্যাংক জমা</option>
                      {isAdmin && <option value="Cash">নগদ (হিসাব শাখা)</option>}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                      ট্রানজেকশন আইডি (TrxID) *
                    </label>
                    <input
                      required
                      minLength={4}
                      value={txId}
                      onChange={(e) => setTxId(e.target.value)}
                      placeholder="যেমন: BK94839201"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPayModal(null)}
                    className="rounded-xl border border-[#CFE0D6] bg-white px-4 py-2 text-xs font-bold text-[#263B35] hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {saving ? 'সংরক্ষণ হচ্ছে...' : 'পরিশোধ নিশ্চিত করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};
