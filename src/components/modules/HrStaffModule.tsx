import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Plus,
  Trash2,
  X,
  XCircle,
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
import { exportToExcel } from '../../lib/reports';
import {
  ATTENDANCE_STATUS_BN,
  formatBdtBn,
  LEAVE_STATUS_BN,
  LEAVE_TYPE_BN,
  STAFF_ROLE_BN,
  TEACHER_STATUS_BN,
  toBnDigits,
} from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import type {
  FacultyPublic,
  LeaveRequest,
  StaffAttendance,
  StaffMember,
  UserAccount,
} from '../../types';

interface Props {
  currentUser: UserAccount;
}

export const HrStaffModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const isAdmin = currentUser.role === 'admin';
  const [tab, setTab] = useState<'staff' | 'attendance' | 'leave'>(isAdmin ? 'staff' : 'leave');

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [faculty, setFaculty] = useState<FacultyPublic[]>([]);
  const [staffAtt, setStaffAtt] = useState<StaffAttendance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [staffForm, setStaffForm] = useState({
    employeeId: '',
    name: '',
    designation: '',
    department: 'প্রশাসন',
    roleType: 'Officer' as StaffMember['roleType'],
    phone: '',
    email: '',
    salaryBdt: '15000',
    bonusBdt: '0',
    joiningDate: new Date().toISOString().slice(0, 10),
    status: 'Active' as StaffMember['status'],
  });

  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Casual' as LeaveRequest['leaveType'],
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    if (isAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'staff_members'),
          (s) => setStaff(s.docs.map((d) => ({ id: d.id, ...d.data() } as StaffMember))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'staff_members')
        )
      );
    }

    if (isAdmin || currentUser.role === 'teacher') {
      unsubs.push(
        onSnapshot(
          collection(db, 'faculty'),
          (s) => setFaculty(s.docs.map((d) => ({ id: d.id, ...d.data() } as FacultyPublic))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'faculty')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'staff_attendance'),
          (s) => setStaffAtt(s.docs.map((d) => ({ id: d.id, ...d.data() } as StaffAttendance))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'staff_attendance')
        )
      );
    }

    const leaveRef = isAdmin
      ? collection(db, 'leave_requests')
      : query(collection(db, 'leave_requests'), where('applicantUid', '==', currentUser.uid));

    unsubs.push(
      onSnapshot(
        leaveRef,
        (s) =>
          setLeaves(
            s.docs
              .map((d) => ({ id: d.id, ...d.data() } as LeaveRequest))
              .sort((a, b) => b.fromDate.localeCompare(a.fromDate))
          ),
        (e) => handleFirestoreError(e, OperationType.LIST, 'leave_requests')
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [isAdmin, currentUser.role, currentUser.uid]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('stf');
      await setDoc(doc(db, 'staff_members', id), {
        employeeId: clampStr(staffForm.employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`, 32),
        name: clampStr(staffForm.name, 120),
        designation: clampStr(staffForm.designation, 80),
        department: clampStr(staffForm.department, 80),
        roleType: staffForm.roleType,
        phone: clampStr(staffForm.phone, 25),
        email: clampStr(staffForm.email, 160),
        salaryBdt: Math.max(0, Math.min(500000, Number(staffForm.salaryBdt) || 0)),
        bonusBdt: Math.max(0, Math.min(500000, Number(staffForm.bonusBdt) || 0)),
        joiningDate: clampStr(staffForm.joiningDate, 20),
        status: staffForm.status,
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowStaffForm(false);
      setStaffForm({
        employeeId: '',
        name: '',
        designation: '',
        department: 'প্রশাসন',
        roleType: 'Officer',
        phone: '',
        email: '',
        salaryBdt: '15000',
        bonusBdt: '0',
        joiningDate: new Date().toISOString().slice(0, 10),
        status: 'Active',
      });
      notify('কর্মচারীর প্রোফাইল সফলভাবে যুক্ত হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'staff_members');
      notify('কর্মচারী যুক্ত করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (s: StaffMember) => {
    const ok = await confirm({
      title: 'কর্মচারী মুছে ফেলুন',
      message: `${s.name} (${s.designation})-এর প্রোফাইলটি কি মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'staff_members', s.id));
      notify('কর্মচারী রেকর্ড মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `staff_members/${s.id}`);
      notify('রেকর্ড মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleMarkAttendance = async (
    personId: string,
    personName: string,
    designation: string,
    personType: 'Teacher' | 'Staff',
    status: StaffAttendance['status']
  ) => {
    if (!isAdmin) return;
    const docId = `${attDate}_${personId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const existing = staffAtt.find((a) => a.id === docId);
    try {
      if (existing) {
        await updateDoc(doc(db, 'staff_attendance', docId), {
          status,
          markedByUid: currentUser.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'staff_attendance', docId), {
          date: attDate,
          personId,
          personName: clampStr(personName, 120),
          designation: clampStr(designation, 80),
          personType,
          status,
          remarks: '',
          markedByUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      notify(`${personName}-এর উপস্থিতি (${ATTENDANCE_STATUS_BN[status]}) সংরক্ষণ করা হয়েছে।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `staff_attendance/${docId}`);
      notify('উপস্থিতি সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const id = makeSafeDocId('lv');
      const applicantRole: LeaveRequest['applicantRole'] =
        currentUser.role === 'teacher' ? 'teacher' : currentUser.role === 'admin' ? 'staff' : 'student';
      await setDoc(doc(db, 'leave_requests', id), {
        applicantUid: currentUser.uid,
        applicantName: clampStr(currentUser.displayName, 120),
        applicantRole,
        leaveType: leaveForm.leaveType,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        reason: clampStr(leaveForm.reason, 800),
        status: 'Pending',
        adminRemarks: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowLeaveForm(false);
      setLeaveForm({
        leaveType: 'Casual',
        fromDate: new Date().toISOString().slice(0, 10),
        toDate: new Date().toISOString().slice(0, 10),
        reason: '',
      });
      notify('ছুটির আবেদন জমা দেওয়া হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'leave_requests');
      notify('আবেদন জমা দিতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDecideLeave = async (id: string, status: 'Approved' | 'Rejected') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'leave_requests', id), {
        status,
        adminRemarks: status === 'Approved' ? 'অ্যাডমিন কর্তৃক অনুমোদিত' : 'অ্যাডমিন কর্তৃক প্রত্যাখ্যাত',
        updatedAt: serverTimestamp(),
      });
      notify(`ছুটির আবেদন ${LEAVE_STATUS_BN[status]} করা হয়েছে।`, status === 'Approved' ? 'success' : 'warning');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leave_requests/${id}`);
      notify('সিদ্ধান্ত সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    }
  };

  const totalPayroll = staff.reduce((sum, s) => sum + s.salaryBdt + (s.bonusBdt || 0), 0);

  const combinedPeople = [
    ...faculty.map((f) => ({ id: f.id, name: f.name, designation: f.designation, type: 'Teacher' as const })),
    ...staff.map((s) => ({ id: s.id, name: s.name, designation: s.designation, type: 'Staff' as const })),
  ];

  const todayAttMap = new Map(staffAtt.filter((a) => a.date === attDate).map((a) => [a.personId, a]));

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="কর্মচারী, শিক্ষক উপস্থিতি ও ছুটি (HR)"
        subtitle="কর্মকর্তা-কর্মচারীর প্রোফাইল, বেতন-বোনাস, দৈনিক হাজিরা এবং ছুটির আবেদন ও অনুমোদন ব্যবস্থাপনা।"
        icon={<Briefcase className="h-5 w-5" />}
        accent="navy"
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F2F8F5] p-1 dark:bg-slate-800">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setTab('staff')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === 'staff'
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : 'text-[#263B35] dark:text-slate-300'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                কর্মচারী ({toBnDigits(staff.length)})
              </button>
            )}
            {(isAdmin || currentUser.role === 'teacher') && (
              <button
                type="button"
                onClick={() => setTab('attendance')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === 'attendance'
                    ? 'bg-[#123B67] text-white shadow-xs'
                    : 'text-[#263B35] dark:text-slate-300'
                }`}
              >
                <CalendarCheck2 className="h-3.5 w-3.5" />
                হাজিরা
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('leave')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                tab === 'leave'
                  ? 'bg-[#805AD5] text-white shadow-xs'
                  : 'text-[#263B35] dark:text-slate-300'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              ছুটি ({toBnDigits(leaves.length)})
            </button>
          </div>
        }
      />

      {/* TAB 1: STAFF DIRECTORY & PAYROLL */}
      {tab === 'staff' && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap gap-6 text-xs">
              <div>
                <p className="font-bold text-[#526B78] dark:text-slate-400">মোট কর্মচারী</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#123B67] tabular-nums dark:text-white">
                  {toBnDigits(staff.length)} জন
                </p>
              </div>
              <div>
                <p className="font-bold text-[#526B78] dark:text-slate-400">মোট মাসিক বেতন ও বোনাস</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
                  {formatBdtBn(totalPayroll)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {staff.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    void exportToExcel(
                      staff.map((s) => ({
                        'আইডি': s.employeeId,
                        'নাম': s.name,
                        'পদবি': s.designation,
                        'দায়িত্ব': STAFF_ROLE_BN[s.roleType],
                        'মোবাইল': s.phone,
                        'মূল বেতন': s.salaryBdt,
                        'বোনাস': s.bonusBdt || 0,
                        'মোট': s.salaryBdt + (s.bonusBdt || 0),
                      })),
                      'Staff_HR',
                      'staff_payroll.xlsx'
                    );
                    notify('কর্মচারী পে-রোল এক্সেল ডাউনলোড হয়েছে।', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#087F5B]" />
                  Excel রিপোর্ট
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowStaffForm(!showStaffForm)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                {showStaffForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showStaffForm ? 'বন্ধ করুন' : 'নতুন কর্মচারী'}
              </button>
            </div>
          </div>

          {showStaffForm && (
            <form
              onSubmit={handleAddStaff}
              className="grid grid-cols-1 gap-3.5 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <input
                required
                placeholder="কর্মচারীর নাম *"
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="আইডি (যেমন: EMP-101)"
                value={staffForm.employeeId}
                onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                className={inputClass}
              />
              <input
                required
                placeholder="পদবি (যেমন: হিসাবরক্ষক) *"
                value={staffForm.designation}
                onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                className={inputClass}
              />
              <select
                value={staffForm.roleType}
                onChange={(e) => setStaffForm({ ...staffForm, roleType: e.target.value as StaffMember['roleType'] })}
                className={inputClass}
              >
                {Object.entries(STAFF_ROLE_BN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="মোবাইল নম্বর *"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                required
                placeholder="মূল বেতন (টাকা) *"
                value={staffForm.salaryBdt}
                onChange={(e) => setStaffForm({ ...staffForm, salaryBdt: e.target.value })}
                className={`${inputClass} tabular-nums`}
              />
              <input
                type="number"
                placeholder="বোনাস (টাকা)"
                value={staffForm.bonusBdt}
                onChange={(e) => setStaffForm({ ...staffForm, bonusBdt: e.target.value })}
                className={`${inputClass} tabular-nums`}
              />
              <input
                type="date"
                value={staffForm.joiningDate}
                onChange={(e) => setStaffForm({ ...staffForm, joiningDate: e.target.value })}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
              >
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'কর্মচারী সংরক্ষণ করুন'}
              </button>
            </form>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#123B67] text-white dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold">আইডি ও নাম</th>
                    <th className="px-4 py-3 font-bold">পদবি ও দায়িত্ব</th>
                    <th className="px-4 py-3 font-bold">মোবাইল</th>
                    <th className="px-4 py-3 font-bold">মূল বেতন + বোনাস</th>
                    <th className="px-4 py-3 font-bold">অবস্থা</th>
                    <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF3EF] dark:divide-slate-800">
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                        কোনো কর্মচারী রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    staff.map((s) => (
                      <tr key={s.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#123B67] dark:text-white">{s.name}</p>
                          <p className="text-[11px] text-[#526B78] dark:text-slate-400">{s.employeeId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#263B35] dark:text-slate-200">{s.designation}</p>
                          <p className="text-[11px] text-[#526B78] dark:text-slate-400">{STAFF_ROLE_BN[s.roleType]}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-[#263B35] tabular-nums dark:text-slate-300">
                          {s.phone}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
                          {formatBdtBn(s.salaryBdt)}
                          {s.bonusBdt ? ` (+ ${formatBdtBn(s.bonusBdt)})` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-[#087F5B]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
                            {TEACHER_STATUS_BN[s.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(s)}
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
      )}

      {/* TAB 2: TEACHER & STAFF DAILY ATTENDANCE */}
      {tab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[#123B67] dark:text-slate-200">তারিখ নির্বাচন করুন:</label>
              <input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-1.5 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <p className="rounded-xl bg-[#21A9D6]/12 px-3 py-1.5 text-xs font-bold text-[#0E7DA3] tabular-nums dark:bg-cyan-500/20 dark:text-cyan-300">
              মোট শিক্ষক ও কর্মচারী: {toBnDigits(combinedPeople.length)} জন
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#123B67] text-white dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold">নাম</th>
                    <th className="px-4 py-3 font-bold">ধরন ও পদবি</th>
                    <th className="px-4 py-3 font-bold">বর্তমান অবস্থা</th>
                    {isAdmin && <th className="px-4 py-3 text-right font-bold">এক-ক্লিক হাজিরা</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF3EF] dark:divide-slate-800">
                  {combinedPeople.map((p) => {
                    const rec = todayAttMap.get(p.id);
                    return (
                      <tr key={p.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-bold text-[#123B67] dark:text-white">{p.name}</td>
                        <td className="px-4 py-3 text-[#526B78] dark:text-slate-400">
                          {p.type === 'Teacher' ? 'শিক্ষক' : 'কর্মচারী'} · {p.designation}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                              rec?.status === 'Present'
                                ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                                : rec?.status === 'Absent'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                : rec?.status === 'Late'
                                ? 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                                : rec?.status === 'Leave'
                                ? 'bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {rec ? ATTENDANCE_STATUS_BN[rec.status] : 'চিহ্নিত নয়'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-1">
                              {(['Present', 'Absent', 'Late', 'Leave'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => void handleMarkAttendance(p.id, p.name, p.designation, p.type, st)}
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                    rec?.status === st
                                      ? 'bg-[#087F5B] text-white shadow-xs'
                                      : 'border border-[#CFE0D6] bg-white text-[#263B35] hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {ATTENDANCE_STATUS_BN[st]}
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE REQUESTS & APPROVALS */}
      {tab === 'leave' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowLeaveForm(!showLeaveForm)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
            >
              {showLeaveForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showLeaveForm ? 'ফর্ম বন্ধ করুন' : 'নতুন ছুটির আবেদন করুন'}
            </button>
          </div>

          {showLeaveForm && (
            <form
              onSubmit={handleSubmitLeave}
              className="grid grid-cols-1 gap-3.5 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <select
                value={leaveForm.leaveType}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveRequest['leaveType'] })
                }
                className={inputClass}
              >
                {Object.entries(LEAVE_TYPE_BN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="date"
                required
                value={leaveForm.fromDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                className={inputClass}
              />
              <input
                type="date"
                required
                value={leaveForm.toDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                className={inputClass}
              />
              <textarea
                required
                rows={2}
                placeholder="ছুটির কারণ বিস্তারিত লিখুন *"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className={`${inputClass} md:col-span-3`}
              />
              <div className="flex justify-end md:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#087F5B] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
                >
                  {saving ? 'জমা হচ্ছে...' : 'আবেদন জমা দিন'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {leaves.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#CFE0D6] bg-white p-10 text-center text-sm text-[#587064] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                কোনো ছুটির আবেদন পাওয়া যায়নি।
              </div>
            ) : (
              leaves.map((lv) => (
                <div
                  key={lv.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-[#123B67] dark:text-white">{lv.applicantName}</span>
                      <span className="rounded-lg bg-[#805AD5]/15 px-2 py-0.5 text-[11px] font-bold text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300">
                        {LEAVE_TYPE_BN[lv.leaveType]}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          lv.status === 'Approved'
                            ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                            : lv.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {LEAVE_STATUS_BN[lv.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[#526B78] tabular-nums dark:text-slate-400">
                      তারিখ: {toBnDigits(lv.fromDate)} থেকে {toBnDigits(lv.toDate)}
                    </p>
                    <p className="text-xs text-[#263B35] dark:text-slate-300">{lv.reason}</p>
                  </div>

                  {isAdmin && lv.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDecideLeave(lv.id, 'Approved')}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#087F5B] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        অনুমোদন
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDecideLeave(lv.id, 'Rejected')}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        প্রত্যাখ্যান
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
