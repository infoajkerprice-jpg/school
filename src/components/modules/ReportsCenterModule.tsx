import React, { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  UserPlus,
  Users,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  downloadAttendancePdf,
  downloadFeeLedgerPdf,
  downloadStudentsPdf,
  downloadTeachersPdf,
  exportToExcel,
} from '../../lib/reports';
import { formatBdtBn, toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import type {
  AdmissionApplication,
  AttendanceRecord,
  ExamResult,
  FeeInvoice,
  StudentRecord,
  TeacherHRRecord,
} from '../../types';

export const ReportsCenterModule: React.FC = () => {
  const { notify } = useUIFeedback();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherHRRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [fees, setFees] = useState<FeeInvoice[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        collection(db, 'students'),
        (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'students')
      ),
      onSnapshot(
        collection(db, 'teacher_records'),
        (s) => setTeachers(s.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherHRRecord))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'teacher_records')
      ),
      onSnapshot(
        collection(db, 'attendance'),
        (s) => setAttendance(s.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'attendance')
      ),
      onSnapshot(
        collection(db, 'published_results'),
        (s) => setResults(s.docs.map((d) => ({ id: d.id, ...d.data() } as ExamResult))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'published_results')
      ),
      onSnapshot(
        collection(db, 'fee_invoices'),
        (s) => setFees(s.docs.map((d) => ({ id: d.id, ...d.data() } as FeeInvoice))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'fee_invoices')
      ),
      onSnapshot(
        collection(db, 'admissions'),
        (s) => setAdmissions(s.docs.map((d) => ({ id: d.id, ...d.data() } as AdmissionApplication))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'admissions')
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const totalCollected = fees.reduce((s, f) => s + f.paidAmountBdt, 0);

  const runExcel = async (
    rows: Record<string, string | number | boolean | null | undefined>[],
    sheet: string,
    file: string,
    label: string
  ) => {
    if (!rows.length) {
      notify(`${label} এক্সেল তৈরি করার মতো কোনো রেকর্ড পাওয়া যায়নি।`, 'warning');
      return;
    }
    await exportToExcel(rows, sheet, file);
    notify(`${label} এক্সেল (.xlsx) ফাইল ডাউনলোড হয়েছে।`, 'success');
  };

  const cards = [
    {
      title: 'শিক্ষার্থী তালিকা প্রতিবেদন',
      desc: 'নিবন্ধিত সকল শিক্ষার্থীর আইডি, রোল, শ্রেণি, শাখা ও অভিভাবকের তথ্য।',
      stat: `${toBnDigits(students.length)} জন শিক্ষার্থী`,
      icon: GraduationCap,
      accentBg: 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300',
      onPdf: () => {
        downloadStudentsPdf(students);
        notify('শিক্ষার্থী তালিকা পিডিএফ ডাউনলোড হয়েছে।', 'success');
      },
      onExcel: () =>
        runExcel(
          students.map((s) => ({
            StudentID: s.studentIdCode,
            Roll: s.rollNumber,
            Name: s.name,
            Class: s.className,
            Section: s.section,
            Shift: s.shift,
            Group: s.group,
            Guardian: s.guardianName,
            Phone: s.guardianPhone,
            Status: s.status,
          })),
          'Students',
          'Students_Report.xlsx',
          'শিক্ষার্থী তালিকা'
        ),
    },
    {
      title: 'শিক্ষক ও বেতন-ভাতা প্রতিবেদন',
      desc: 'শিক্ষকমণ্ডলীর কর্মচারী আইডি, পদবি, বিভাগ, যোগাযোগ ও বেতন কাঠামো।',
      stat: `${toBnDigits(teachers.length)} জন শিক্ষক`,
      icon: Users,
      accentBg: 'bg-[#123B67]/12 text-[#123B67] dark:bg-sky-500/20 dark:text-sky-300',
      onPdf: () => {
        downloadTeachersPdf(teachers);
        notify('শিক্ষক প্রতিবেদন পিডিএফ ডাউনলোড হয়েছে।', 'success');
      },
      onExcel: () =>
        runExcel(
          teachers.map((t) => ({
            EmployeeID: t.employeeId,
            Name: t.name,
            Designation: t.designation,
            Department: t.department,
            Phone: t.phone,
            Email: t.email,
            SalaryBDT: t.salaryBdt,
            Status: t.status,
          })),
          'Teachers',
          'Teachers_HR_Report.xlsx',
          'শিক্ষক প্রতিবেদন'
        ),
    },
    {
      title: 'দৈনিক উপস্থিতি রেজিস্টার প্রতিবেদন',
      desc: 'তারিখ ও শ্রেণিভিত্তিক শিক্ষার্থীদের উপস্থিতি ও অনুপস্থিতির পূর্ণাঙ্গ তালিকা।',
      stat: `${toBnDigits(attendance.length)}টি হাজিরা রেকর্ড`,
      icon: ClipboardCheck,
      accentBg: 'bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300',
      onPdf: () => {
        downloadAttendancePdf(attendance, `Total Attendance Records: ${attendance.length}`);
        notify('উপস্থিতি প্রতিবেদন পিডিএফ ডাউনলোড হয়েছে।', 'success');
      },
      onExcel: () =>
        runExcel(
          attendance.map((a) => ({
            Date: a.date,
            Class: a.className,
            Section: a.section,
            Roll: a.rollNumber,
            Student: a.studentName,
            Status: a.status,
            Remarks: a.remarks || '',
          })),
          'Attendance',
          'Attendance_Report.xlsx',
          'উপস্থিতি প্রতিবেদন'
        ),
    },
    {
      title: 'ফি ও হিসাব লেজার প্রতিবেদন',
      desc: 'মাসিক বেতন, পরীক্ষার ফি, বকেয়া ও আদায় সংক্রান্ত পূর্ণাঙ্গ আর্থিক হিসাব।',
      stat: `আদায়: ${formatBdtBn(totalCollected)}`,
      icon: CreditCard,
      accentBg: 'bg-[#F4A62A]/18 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300',
      onPdf: () => {
        downloadFeeLedgerPdf(fees);
        notify('ফি ও হিসাব লেজার পিডিএফ ডাউনলোড হয়েছে।', 'success');
      },
      onExcel: () =>
        runExcel(
          fees.map((f) => ({
            InvoiceNo: f.invoiceNo,
            Student: f.studentName,
            Class: f.className,
            Roll: f.rollNumber,
            Month: f.month,
            Category: f.feeCategory,
            AmountBDT: f.amountBdt,
            PaidBDT: f.paidAmountBdt,
            Method: f.paymentMethod,
            Status: f.status,
          })),
          'FeeLedger',
          'Fee_Ledger_Report.xlsx',
          'ফি লেজার'
        ),
    },
    {
      title: 'পরীক্ষার ফলাফল ও মেধাতালিকা',
      desc: 'শিক্ষাবর্ষ ও পরীক্ষাভিত্তিক জিপিএ, গ্রেড ও মোট নম্বরের সমন্বিত তালিকা।',
      stat: `${toBnDigits(results.length)}টি ফলাফল`,
      icon: Award,
      accentBg: 'bg-[#805AD5]/15 text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300',
      onExcel: () =>
        runExcel(
          results.map((r) => ({
            Exam: r.examName,
            Year: r.academicYear,
            Class: r.className,
            Section: r.section,
            Roll: r.studentRoll,
            Student: r.studentName,
            TotalMarks: r.totalMarks,
            GPA: r.gpa,
            Grade: r.grade,
            Merit: r.meritPosition || '',
            Status: r.status,
          })),
          'Results',
          'Exam_Results_Report.xlsx',
          'ফলাফল প্রতিবেদন'
        ),
    },
    {
      title: 'অনলাইন ভর্তি আবেদন প্রতিবেদন',
      desc: 'জমাকৃত সকল ভর্তি আবেদনের আবেদন নম্বর, শ্রেণি ও অনুমোদন স্ট্যাটাস।',
      stat: `${toBnDigits(admissions.length)}টি আবেদন`,
      icon: UserPlus,
      accentBg: 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300',
      onExcel: () =>
        runExcel(
          admissions.map((a) => ({
            ApplicationNo: a.applicationNo,
            Applicant: a.applicantName,
            Father: a.fatherName || '',
            Mother: a.motherName || '',
            Class: a.applyingClass,
            Shift: a.shift,
            Group: a.group,
            GuardianPhone: a.guardianPhone,
            Status: a.status,
          })),
          'Admissions',
          'Admissions_Report.xlsx',
          'ভর্তি আবেদন প্রতিবেদন'
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="রিপোর্ট ও প্রতিবেদন কেন্দ্র"
        subtitle="ডাটাবেসে সংরক্ষিত সরাসরি তথ্য থেকে অফিশিয়াল পিডিএফ (PDF) ও এক্সেল (Excel) প্রতিবেদন তৈরি ও ডাউনলোড করুন।"
        icon={<BarChart3 className="h-5 w-5" />}
        accent="navy"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.accentBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-lg bg-[#F2F8F5] px-2.5 py-1 text-xs font-extrabold text-[#123B67] tabular-nums dark:bg-slate-800 dark:text-slate-200">
                    {card.stat}
                  </span>
                </div>
                <h3 className="mt-3.5 text-base font-extrabold text-[#123B67] dark:text-white">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#526B78] dark:text-slate-400">{card.desc}</p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#EDF3EF] pt-3.5 dark:border-slate-800">
                {card.onPdf && (
                  <button
                    type="button"
                    onClick={card.onPdf}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#087F5B] px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    পিডিএফ
                  </button>
                )}
                <button
                  type="button"
                  onClick={card.onExcel}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-[#F2F8F5] px-3 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#087F5B] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-[#087F5B]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <Download className="h-3 w-3" />
                  এক্সেল (.xlsx)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
