import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { labelClass, ROLE_BN, toBnDigits } from '../../i18n';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import type { StudentRecord, UserAccount, UserRole } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const PAGE_SIZE = 10;

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  admin: 'bg-[#805AD5]/15 text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300',
  teacher: 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300',
  student: 'bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300',
  parent: 'bg-[#F4A62A]/18 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300',
};

export const UsersRolesModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'users'),
      (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() } as UserAccount))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'users')
    );
    const u2 = onSnapshot(
      collection(db, 'students'),
      (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'students')
    );
    return () => {
      u1();
      u2();
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        ROLE_BN[u.role].toLowerCase().includes(q)
      );
    });
  }, [users, searchTerm, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  const changeRole = async (user: UserAccount, newRole: UserRole) => {
    if (user.role === newRole) return;
    if (newRole === 'admin') {
      const ok = await confirm({
        title: 'অ্যাডমিন অনুমতি প্রদান',
        message: `আপনি কি নিশ্চিতভাবে ${user.displayName} (${user.email})-কে পূর্ণাঙ্গ অ্যাডমিন ভূমিকা প্রদান করতে চান?`,
        confirmLabel: 'অনুমতি দিন',
      });
      if (!ok) return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email,
          grantedBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      } else if (user.uid !== currentUser.uid) {
        try {
          await deleteDoc(doc(db, 'admins', user.uid));
        } catch {
          // Ignore if not in admins collection
        }
      }
      notify(`${user.displayName}-এর ভূমিকা "${ROLE_BN[newRole]}" হিসেবে হালনাগাদ হয়েছে।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      notify('ভূমিকা পরিবর্তন ব্যর্থ হয়েছে।', 'error');
    }
  };

  const linkStudent = async (user: UserAccount, studentId: string) => {
    if (!studentId) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        linkedEntityId: studentId,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'students', studentId), {
        ...(user.role === 'parent' ? { parentUid: user.uid } : { studentUid: user.uid }),
        updatedAt: serverTimestamp(),
      });
      notify(`${user.displayName}-কে নির্বাচিত শিক্ষার্থীর সাথে সংযুক্ত করা হয়েছে।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
      notify('শিক্ষার্থী সংযোগ করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (user.uid === currentUser.uid) return;
    const ok = await confirm({
      title: 'ব্যবহারকারী মুছে ফেলুন',
      message: `${user.displayName} (${user.email})-এর অ্যাকাউন্ট রেকর্ডটি কি স্থায়ীভাবে মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      notify('ব্যবহারকারী অ্যাকাউন্ট মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
      notify('অ্যাকাউন্ট মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const roleCounts = useMemo(
    () => ({
      admin: users.filter((u) => u.role === 'admin').length,
      teacher: users.filter((u) => u.role === 'teacher').length,
      student: users.filter((u) => u.role === 'student').length,
      parent: users.filter((u) => u.role === 'parent').length,
    }),
    [users]
  );

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="ব্যবহারকারী ও অনুমতি ব্যবস্থাপনা"
        subtitle={`মোট নিবন্ধিত অ্যাকাউন্ট: ${toBnDigits(users.length)}টি · অ্যাডমিন, শিক্ষক, শিক্ষার্থী ও অভিভাবক ভূমিকা নিয়ন্ত্রণ করুন।`}
        icon={<ShieldCheck className="h-5 w-5" />}
        accent="purple"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B]/12 px-3.5 py-2 text-xs font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            ভূমিকা-ভিত্তিক নিরাপত্তা সক্রিয়
          </span>
        }
      />

      {/* Role Summary Strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {(['admin', 'teacher', 'student', 'parent'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter((prev) => (prev === r ? 'ALL' : r))}
            className={`rounded-2xl border p-4 text-left transition ${
              roleFilter === r
                ? 'border-[#087F5B] bg-[#F2F8F5] shadow-xs dark:border-emerald-500 dark:bg-slate-800'
                : 'border-[#DCE8E1] bg-white hover:border-[#087F5B]/40 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${ROLE_BADGE_STYLES[r]}`}>
                {ROLE_BN[r]}
              </span>
              <Users className="h-4 w-4 text-[#647B86] dark:text-slate-400" />
            </div>
            <p className="mt-2.5 text-2xl font-extrabold text-[#123B67] tabular-nums dark:text-white">
              {toBnDigits(roleCounts[r])}
            </p>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647B86] dark:text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ব্যবহারকারীর নাম বা ইমেইল দিয়ে খুঁজুন..."
            className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] outline-none focus:border-[#087F5B] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
          className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="ALL">সকল ভূমিকা</option>
          {(['admin', 'teacher', 'student', 'parent'] as const).map((r) => (
            <option key={r} value={r}>
              {ROLE_BN[r]}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#123B67] text-white dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold">নাম ও ইমেইল</th>
                <th className="px-4 py-3 font-bold">ভূমিকা (রোল)</th>
                <th className="px-4 py-3 font-bold">শিক্ষার্থী সংযোগ</th>
                <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                    কোনো ব্যবহারকারী পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#123B67]/10 text-xs font-extrabold text-[#123B67] dark:bg-slate-800 dark:text-sky-300">
                          {(u.displayName || u.email || 'U').slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#123B67] dark:text-white">
                            {u.displayName}
                            {u.uid === currentUser.uid && (
                              <span className="ml-1.5 rounded-md bg-[#087F5B]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
                                আপনি
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-[#526B78] dark:text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`hidden rounded-lg px-2 py-0.5 text-[11px] font-bold sm:inline-block ${ROLE_BADGE_STYLES[u.role]}`}>
                          {ROLE_BN[u.role]}
                        </span>
                        <select
                          value={u.role}
                          disabled={u.uid === currentUser.uid}
                          onChange={(e) => changeRole(u, e.target.value as UserRole)}
                          className="rounded-xl border border-[#CFE0D6] bg-white px-2.5 py-1.5 text-xs font-bold text-[#123B67] disabled:opacity-55 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {(['admin', 'teacher', 'student', 'parent'] as const).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_BN[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'student' || u.role === 'parent' ? (
                        <select
                          value={u.linkedEntityId || ''}
                          onChange={(e) => linkStudent(u, e.target.value)}
                          className="rounded-xl border border-[#CFE0D6] bg-white px-2.5 py-1.5 text-xs text-[#263B35] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="">-- শিক্ষার্থী সংযুক্ত করুন --</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({labelClass(s.className)} · রোল {toBnDigits(s.rollNumber)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-[#647B86] dark:text-slate-500">প্রযোজ্য নয়</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.uid !== currentUser.uid && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          aria-label="মুছে ফেলুন"
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          totalItems={filteredUsers.length}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
