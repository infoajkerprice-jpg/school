import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { downloadBengaliMarksheetPdf } from './marksheetPdf';
import type { MarksheetRenderOptions } from '../components/MarksheetTemplate';
import type {
  AdmissionApplication,
  AttendanceRecord,
  ExamResult,
  FeeInvoice,
  NoticeItem,
  StudentRecord,
  TeacherHRRecord,
} from '../types';

const INSTITUTION_NAME = 'SHAH ISLAMIC SCHOOL AND COLLEGE';
const INSTITUTION_META = 'Tulshighat (West of Palli Bidyut Office), Gaibandha Sadar, Gaibandha-5700 | +880 1711-759705 | shahislamicschool.com';

function drawPdfHeader(doc: jsPDF, reportTitle: string, subtitle?: string) {
  doc.setFillColor(0, 106, 78); // Bangladesh School Deep Green #006A4E
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(INSTITUTION_NAME, 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(INSTITUTION_META, 14, 18);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, doc.internal.pageSize.getWidth() - 14, 18, {
    align: 'right',
  });

  doc.setTextColor(20, 32, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(reportTitle, 14, 38);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 96, 88);
    doc.text(subtitle, 14, 44);
  }
}

export async function exportToExcel(
  rows: Record<string, string | number | boolean | null | undefined>[],
  sheetName: string,
  filename: string
): Promise<void> {
  if (!rows.length) return;
  const cleanRows = rows.map((row) => {
    const out: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v === undefined ? '' : v;
    }
    return out;
  });

  try {
    const response = await fetch('/api/reports/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetName, filename, rows: cleanRows }),
    });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('spreadsheetml')) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
  } catch {
    // Fallback to client-side XLSX generation
  }

  const ws = XLSX.utils.json_to_sheet(cleanRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function downloadNoticePdf(notice: NoticeItem) {
  const doc = new jsPDF();
  drawPdfHeader(
    doc,
    `OFFICIAL NOTICE — ${notice.category.toUpperCase()}`,
    `Published Date: ${notice.publishedDate} | Audience: ${notice.audience}`
  );

  doc.setTextColor(20, 32, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const titleLines = doc.splitTextToSize(notice.title, 180);
  doc.text(titleLines, 14, 56);

  const afterTitle = 56 + titleLines.length * 6 + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const bodyLines = doc.splitTextToSize(notice.content, 180);
  doc.text(bodyLines, 14, afterTitle);

  const sigY = Math.min(260, afterTitle + bodyLines.length * 6 + 26);
  doc.setFontSize(9.5);
  doc.setTextColor(80, 96, 88);
  doc.text('By Order of Principal', 145, sigY);
  doc.text('Shah Islamic School And College', 128, sigY + 6);

  doc.save(`Notice_${notice.publishedDate}_${notice.id.slice(0, 12)}.pdf`);
}

export async function downloadMarksheetPdf(
  result: ExamResult,
  options?: MarksheetRenderOptions
): Promise<void> {
  await downloadBengaliMarksheetPdf(result, options);
}

export function downloadFeeReceiptPdf(invoice: FeeInvoice) {
  const doc = new jsPDF();
  drawPdfHeader(
    doc,
    `TUITION & FEE PAYMENT RECEIPT — ${invoice.invoiceNo}`,
    `Academic Year ${invoice.academicYear} | Billing Month: ${invoice.month}`
  );

  doc.setFontSize(10);
  doc.setTextColor(20, 32, 26);
  doc.text(`Student Name: ${invoice.studentName}`, 14, 54);
  doc.text(`Class / Roll: ${invoice.className} / Roll ${invoice.rollNumber}`, 14, 60);
  doc.text(`Payment Method: ${invoice.paymentMethod}`, 115, 54);
  doc.text(`Transaction ID: ${invoice.transactionId || 'N/A'}`, 115, 60);
  doc.text(`Due Date: ${invoice.dueDate}`, 14, 66);
  doc.text(`Paid Date: ${invoice.paidDate || 'Pending'}`, 115, 66);

  autoTable(doc, {
    startY: 75,
    head: [['Fee Category', 'Billing Period', 'Total (BDT)', 'Paid (BDT)', 'Due (BDT)', 'Status']],
    body: [
      [
        invoice.feeCategory,
        `${invoice.month} ${invoice.academicYear}`,
        `BDT ${invoice.amountBdt.toLocaleString()}`,
        `BDT ${invoice.paidAmountBdt.toLocaleString()}`,
        `BDT ${(invoice.amountBdt - invoice.paidAmountBdt).toLocaleString()}`,
        invoice.status,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 106, 78], textColor: 255 },
    styles: { fontSize: 9.5, cellPadding: 4 },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  doc.setFontSize(9);
  doc.setTextColor(80, 96, 88);
  doc.text('Electronically generated official receipt — Shah Islamic School And College.', 14, finalY + 14);
  doc.text('Accounts Officer', 155, finalY + 38);

  doc.save(`Fee_Receipt_${invoice.invoiceNo}.pdf`);
}

export function downloadAdmissionAdmitCardPdf(app: AdmissionApplication) {
  const doc = new jsPDF();
  drawPdfHeader(
    doc,
    'ADMISSION APPLICATION ACKNOWLEDGEMENT & ADMIT CARD',
    `Application No: ${app.applicationNo} | Status: ${app.status}`
  );

  autoTable(doc, {
    startY: 52,
    head: [['Field', 'Applicant Information']],
    body: [
      ['Application Number', app.applicationNo],
      ['Applicant Full Name', `${app.applicantName}${app.applicantNameBn ? ` (${app.applicantNameBn})` : ''}`],
      ['Father / Mother Name', `${app.fatherName || '—'} / ${app.motherName || '—'}`],
      ['Birth Registration No', app.birthRegNo || '—'],
      ['Applying Class / Group / Shift', `${app.applyingClass} | ${app.group} | ${app.shift}`],
      ['Date of Birth / Gender', `${app.dateOfBirth} | ${app.gender}`],
      ['Previous School', app.previousSchool || 'N/A'],
      ['Guardian Name & Phone', `${app.guardianName} (${app.guardianPhone})`],
      ['Address', app.address],
      ['Application Status', app.status],
      ['Committee Remarks', app.remarks || 'Pending review'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 106, 78], textColor: 255 },
    styles: { fontSize: 9.5, cellPadding: 3.5 },
  });

  doc.save(`Admission_${app.applicationNo}.pdf`);
}

export function downloadStudentsPdf(students: StudentRecord[]) {
  const doc = new jsPDF('landscape');
  drawPdfHeader(doc, 'STUDENT ENROLLMENT DIRECTORY', `Total Records: ${students.length}`);
  autoTable(doc, {
    startY: 50,
    head: [['Student ID', 'Roll', 'Name', 'Class', 'Section', 'Shift', 'Group', 'Guardian', 'Phone', 'Status']],
    body: students.map((s) => [
      s.studentIdCode,
      s.rollNumber,
      s.name,
      s.className,
      s.section,
      s.shift,
      s.group,
      s.guardianName,
      s.guardianPhone,
      s.status,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 106, 78], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });
  doc.save(`Student_Directory_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadAttendancePdf(records: AttendanceRecord[], subtitle: string) {
  const doc = new jsPDF();
  drawPdfHeader(doc, 'ATTENDANCE REGISTER REPORT', subtitle);
  autoTable(doc, {
    startY: 50,
    head: [['Date', 'Class', 'Section', 'Roll', 'Student Name', 'Status', 'Remarks']],
    body: records.map((r) => [r.date, r.className, r.section, r.rollNumber, r.studentName, r.status, r.remarks || '—']),
    theme: 'striped',
    headStyles: { fillColor: [0, 106, 78], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });
  doc.save(`Attendance_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadFeeLedgerPdf(invoices: FeeInvoice[]) {
  const doc = new jsPDF('landscape');
  const totalBilled = invoices.reduce((sum, i) => sum + i.amountBdt, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + i.paidAmountBdt, 0);
  drawPdfHeader(
    doc,
    'TUITION FEE & COLLECTION LEDGER',
    `Invoices: ${invoices.length} | Billed: BDT ${totalBilled.toLocaleString()} | Collected: BDT ${totalCollected.toLocaleString()}`
  );
  autoTable(doc, {
    startY: 50,
    head: [['Invoice No', 'Student', 'Class / Roll', 'Month', 'Category', 'Amount (BDT)', 'Paid (BDT)', 'Method', 'Status']],
    body: invoices.map((inv) => [
      inv.invoiceNo,
      inv.studentName,
      `${inv.className} (${inv.rollNumber})`,
      `${inv.month} ${inv.academicYear}`,
      inv.feeCategory,
      inv.amountBdt.toLocaleString(),
      inv.paidAmountBdt.toLocaleString(),
      inv.paymentMethod,
      inv.status,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 106, 78], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });
  doc.save(`Fee_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadTeachersPdf(records: TeacherHRRecord[]) {
  const doc = new jsPDF('landscape');
  drawPdfHeader(doc, 'FACULTY & HR DIRECTORY', `Total Faculty Records: ${records.length}`);
  autoTable(doc, {
    startY: 50,
    head: [['Emp ID', 'Name', 'Designation', 'Department', 'Phone', 'Email', 'Salary (BDT)', 'Status']],
    body: records.map((t) => [
      t.employeeId,
      t.name,
      t.designation,
      t.department,
      t.phone,
      t.email,
      t.salaryBdt.toLocaleString(),
      t.status,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 106, 78], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });
  doc.save(`Faculty_HR_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
