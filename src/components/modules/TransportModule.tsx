import React, { useEffect, useState } from 'react';
import { Bus, FileSpreadsheet, MapPin, Phone, Plus, Trash2, UserCheck, Users, X } from 'lucide-react';
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
import { formatBdtBn, labelClass, toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import type { StudentRecord, TransportRoute, UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const ROUTE_STATUS_BN: Record<TransportRoute['status'], string> = {
  Active: 'সক্রিয়',
  Maintenance: 'মেরামতাধীন',
  Inactive: 'বন্ধ',
};

export const TransportModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const isAdmin = currentUser.role === 'admin';
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allocRoute, setAllocRoute] = useState<TransportRoute | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    busNumber: '',
    routeName: '',
    stops: '',
    driverName: '',
    driverPhone: '',
    helperName: '',
    helperPhone: '',
    monthlyFeeBdt: '800',
    capacity: '32',
    status: 'Active' as TransportRoute['status'],
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const routeRef =
      isAdmin || currentUser.role === 'teacher'
        ? collection(db, 'transport_routes')
        : query(collection(db, 'transport_routes'), where('status', '==', 'Active'));

    unsubs.push(
      onSnapshot(
        routeRef,
        (s) => setRoutes(s.docs.map((d) => ({ id: d.id, ...d.data() } as TransportRoute))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'transport_routes')
      )
    );

    if (isAdmin || currentUser.role === 'teacher') {
      unsubs.push(
        onSnapshot(
          collection(db, 'students'),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'students')
        )
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [isAdmin, currentUser.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const payload = {
        busNumber: clampStr(form.busNumber, 40),
        routeName: clampStr(form.routeName, 140),
        stops: clampStr(form.stops, 600),
        driverName: clampStr(form.driverName, 120),
        driverPhone: clampStr(form.driverPhone, 25),
        helperName: clampStr(form.helperName, 120),
        helperPhone: clampStr(form.helperPhone, 25),
        monthlyFeeBdt: Math.max(0, Math.min(100000, Number(form.monthlyFeeBdt) || 0)),
        capacity: Math.max(1, Math.min(120, Number(form.capacity) || 30)),
        status: form.status,
      };

      if (editingId) {
        await updateDoc(doc(db, 'transport_routes', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        notify('বাস ও রুটের তথ্য আপডেট করা হয়েছে।', 'success');
      } else {
        const id = makeSafeDocId('bus');
        await setDoc(doc(db, 'transport_routes', id), {
          ...payload,
          assignedStudentIds: [],
          authorUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify('নতুন স্কুল বাস ও রুট সফলভাবে যুক্ত হয়েছে।', 'success');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({
        busNumber: '',
        routeName: '',
        stops: '',
        driverName: '',
        driverPhone: '',
        helperName: '',
        helperPhone: '',
        monthlyFeeBdt: '800',
        capacity: '32',
        status: 'Active',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transport_routes');
      notify('রুট সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignStudent = async (route: TransportRoute) => {
    if (!isAdmin || !selectedStudentId) return;
    if (route.assignedStudentIds.includes(selectedStudentId)) return;
    if (route.assignedStudentIds.length >= route.capacity || route.assignedStudentIds.length >= 100) {
      notify('এই বাসের আসন পূর্ণ হয়ে গেছে।', 'warning');
      return;
    }
    setSaving(true);
    try {
      const updated = [...route.assignedStudentIds, selectedStudentId];
      await updateDoc(doc(db, 'transport_routes', route.id), {
        assignedStudentIds: updated,
        updatedAt: serverTimestamp(),
      });
      setAllocRoute({ ...route, assignedStudentIds: updated });
      setSelectedStudentId('');
      notify('শিক্ষার্থীকে বাসে বরাদ্দ করা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transport_routes/${route.id}`);
      notify('বরাদ্দ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudent = async (route: TransportRoute, studentId: string) => {
    if (!isAdmin) return;
    try {
      const updated = route.assignedStudentIds.filter((id) => id !== studentId);
      await updateDoc(doc(db, 'transport_routes', route.id), {
        assignedStudentIds: updated,
        updatedAt: serverTimestamp(),
      });
      setAllocRoute({ ...route, assignedStudentIds: updated });
      notify('শিক্ষার্থীকে বাস তালিকা থেকে বাদ দেওয়া হয়েছে।', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transport_routes/${route.id}`);
      notify('তালিকা আপডেট ব্যর্থ হয়েছে।', 'error');
    }
  };

  const handleDeleteRoute = async (route: TransportRoute) => {
    if (!isAdmin) return;
    const ok = await confirm({
      title: 'বাস রুট মুছে ফেলুন',
      message: `"${route.routeName}" (বাস নং: ${route.busNumber}) কি স্থায়ীভাবে মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'transport_routes', route.id));
      notify('রুট মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `transport_routes/${route.id}`);
      notify('রুট মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleExportRouteRoster = (route: TransportRoute) => {
    const passengers = students.filter((s) => route.assignedStudentIds.includes(s.id));
    if (passengers.length === 0) return;
    void exportToExcel(
      passengers.map((s) => ({
        'বাস নম্বর': route.busNumber,
        'রুট': route.routeName,
        'আইডি': s.studentIdCode,
        'নাম': s.name,
        'শ্রেণি': labelClass(s.className),
        'রোল': s.rollNumber,
        'অভিভাবকের মোবাইল': s.guardianPhone,
        'মাসিক পরিবহন ফি': route.monthlyFeeBdt,
      })),
      `Bus_${route.busNumber}`,
      `transport_${route.busNumber}.xlsx`
    );
    notify('যাত্রী তালিকা এক্সেল ডাউনলোড হয়েছে।', 'info');
  };

  const totalSeats = routes.reduce((s, r) => s + r.capacity, 0);
  const totalAssigned = routes.reduce((s, r) => s + (r.assignedStudentIds?.length || 0), 0);

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="পরিবহন ব্যবস্থাপনা (স্কুল বাস ও রুট)"
        subtitle="বাসের তথ্য, রুট, ড্রাইভার ও সহকারী, মাসিক পরিবহন ফি এবং বাসভিত্তিক শিক্ষার্থী বরাদ্দ।"
        icon={<Bus className="h-5 w-5" />}
        accent="sky"
        actions={
          isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setShowForm(!showForm);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'ফর্ম বন্ধ করুন' : 'নতুন বাস ও রুট যুক্ত করুন'}
            </button>
          )
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-[#526B78] dark:text-slate-400">মোট সক্রিয় বাস / রুট</p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
            {toBnDigits(routes.filter((r) => r.status === 'Active').length)} / {toBnDigits(routes.length)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-[#526B78] dark:text-slate-400">বরাদ্দকৃত শিক্ষার্থী</p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#21A9D6] tabular-nums dark:text-cyan-300">
            {toBnDigits(totalAssigned)} জন
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-[#526B78] dark:text-slate-400">মোট আসন ধারণক্ষমতা</p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#123B67] tabular-nums dark:text-white">
            {toBnDigits(totalSeats)} টি
          </p>
        </div>
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">বাস নম্বর *</label>
            <input
              required
              value={form.busNumber}
              onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
              placeholder="যেমন: গাইবান্ধা-স-১১-০১২৩"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">রুটের নাম *</label>
            <input
              required
              value={form.routeName}
              onChange={(e) => setForm({ ...form, routeName: e.target.value })}
              placeholder="যেমন: তুলসীঘাট — গাইবান্ধা শহর রুট-১"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">স্টপেজ সমূহ *</label>
            <input
              required
              value={form.stops}
              onChange={(e) => setForm({ ...form, stops: e.target.value })}
              placeholder="তুলসীঘাট, বাস টার্মিনাল, পুরাতন বাজার, ডিসি অফিস"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ড্রাইভারের নাম *</label>
            <input
              required
              value={form.driverName}
              onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ড্রাইভারের মোবাইল *</label>
            <input
              required
              value={form.driverPhone}
              onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
              placeholder="+880 17XX-XXXXXX"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">সহকারীর নাম</label>
            <input
              value={form.helperName}
              onChange={(e) => setForm({ ...form, helperName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">সহকারীর মোবাইল</label>
            <input
              value={form.helperPhone}
              onChange={(e) => setForm({ ...form, helperPhone: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
              মাসিক পরিবহন ফি (টাকা) *
            </label>
            <input
              required
              type="number"
              min={0}
              value={form.monthlyFeeBdt}
              onChange={(e) => setForm({ ...form, monthlyFeeBdt: e.target.value })}
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">আসন সংখ্যা *</label>
              <input
                required
                type="number"
                min={1}
                max={120}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">অবস্থা</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TransportRoute['status'] })}
                className={inputClass}
              >
                <option value="Active">সক্রিয়</option>
                <option value="Maintenance">মেরামতাধীন</option>
                <option value="Inactive">বন্ধ</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'আপডেট করুন' : 'রুট সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      )}

      {/* Routes Cards */}
      {routes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFE0D6] bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <Bus className="mx-auto h-10 w-10 text-[#21A9D6]/50" />
          <p className="mt-2.5 text-sm font-bold text-[#123B67] dark:text-white">
            এখনো কোনো বাস বা পরিবহন রুট যুক্ত করা হয়নি
          </p>
          <p className="mt-1 text-xs text-[#526B78] dark:text-slate-400">
            উপরের বাটনে ক্লিক করে স্কুল বাস, রুট, ড্রাইভার ও পরিবহন ফি যোগ করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {routes.map((route) => {
            const assignedCount = route.assignedStudentIds?.length || 0;
            return (
              <div
                key={route.id}
                className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">{route.routeName}</h3>
                        <p className="text-xs font-bold text-[#087F5B] dark:text-emerald-400">
                          বাস নং: {route.busNumber}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                        route.status === 'Active'
                          ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                          : route.status === 'Maintenance'
                          ? 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {ROUTE_STATUS_BN[route.status]}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-[#3D574B] dark:text-slate-300">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087F5B]" />
                      <span>
                        <strong>স্টপেজ:</strong> {route.stops}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                      <span>
                        <strong>ড্রাইভার:</strong> {route.driverName} ({route.driverPhone})
                      </span>
                    </p>
                    {route.helperName && (
                      <p className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 shrink-0 text-[#805AD5]" />
                        <span>
                          <strong>সহকারী:</strong> {route.helperName}{' '}
                          {route.helperPhone ? `(${route.helperPhone})` : ''}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#EDF3EF] pt-3 text-xs tabular-nums dark:border-slate-800">
                    <span className="font-extrabold text-[#087F5B] dark:text-emerald-400">
                      মাসিক ফি: {formatBdtBn(route.monthlyFeeBdt)}
                    </span>
                    <span className="font-bold text-[#526B78] dark:text-slate-400">
                      যাত্রী: {toBnDigits(assignedCount)} / {toBnDigits(route.capacity)} জন
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EDF3EF] pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAllocRoute(route)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#087F5B]/12 px-3 py-1.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white dark:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      <Users className="h-3.5 w-3.5" />
                      শিক্ষার্থী বরাদ্দ ({toBnDigits(assignedCount)})
                    </button>
                    {assignedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleExportRouteRoster(route)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#CFE0D6] px-3 py-1.5 text-xs font-bold text-[#123B67] hover:bg-[#F2F8F5] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-[#087F5B]" />
                        তালিকা Excel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(route.id);
                        setForm({
                          busNumber: route.busNumber,
                          routeName: route.routeName,
                          stops: route.stops,
                          driverName: route.driverName,
                          driverPhone: route.driverPhone,
                          helperName: route.helperName || '',
                          helperPhone: route.helperPhone || '',
                          monthlyFeeBdt: String(route.monthlyFeeBdt),
                          capacity: String(route.capacity),
                          status: route.status,
                        });
                        setShowForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-lg bg-[#21A9D6]/14 px-3 py-1.5 text-xs font-bold text-[#0E7DA3] hover:bg-[#21A9D6] hover:text-white dark:bg-cyan-500/20 dark:text-cyan-300"
                    >
                      সম্পাদনা
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteRoute(route)}
                      className="ml-auto rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                      aria-label="মুছে ফেলুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student Allocation Modal */}
      {allocRoute && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091C2B]/65 p-4 backdrop-blur-xs"
          onClick={() => setAllocRoute(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sheet-enter w-full max-w-xl rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-[#E6F0EA] pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
                  বাসভিত্তিক শিক্ষার্থী বরাদ্দ — {allocRoute.busNumber}
                </h3>
                <p className="text-xs text-[#526B78] dark:text-slate-400">{allocRoute.routeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAllocRoute(null)}
                className="rounded-lg p-1.5 text-[#526B78] hover:bg-[#F2F8F5] dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className={`${inputClass} flex-1`}
              >
                <option value="">শিক্ষার্থী নির্বাচন করুন...</option>
                {students
                  .filter((s) => !allocRoute.assignedStudentIds.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {labelClass(s.className)} (রোল: {toBnDigits(s.rollNumber)})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!selectedStudentId || saving}
                onClick={() => void handleAssignStudent(allocRoute)}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#06684A] disabled:opacity-50"
              >
                বরাদ্দ করুন
              </button>
            </div>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {allocRoute.assignedStudentIds.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#587064] dark:text-slate-400">
                  এই বাসে এখনো কোনো শিক্ষার্থী বরাদ্দ হয়নি।
                </p>
              ) : (
                allocRoute.assignedStudentIds.map((sid) => {
                  const st = students.find((s) => s.id === sid);
                  return (
                    <div
                      key={sid}
                      className="flex items-center justify-between rounded-xl border border-[#E6F0EA] bg-[#F8FBF9] px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div>
                        <p className="font-bold text-[#123B67] dark:text-white">{st?.name || sid}</p>
                        {st && (
                          <p className="text-[11px] text-[#526B78] tabular-nums dark:text-slate-400">
                            {labelClass(st.className)} · রোল: {toBnDigits(st.rollNumber)} · {st.guardianPhone}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveStudent(allocRoute, sid)}
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/50 dark:text-rose-300"
                      >
                        বাদ দিন
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
