import * as XLSX from 'xlsx';
import {
  renderBengaliAdmissionPdf,
  renderBengaliAttendancePdf,
  renderBengaliFeeLedgerPdf,
  renderBengaliFeeReceiptPdf,
  renderBengaliNoticePdf,
  renderBengaliStudentsPdf,
  renderBengaliTeachersPdf,
} from './bengaliReportPdf';
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

export async function downloadNoticePdf(notice: NoticeItem): Promise<void> {
  await renderBengaliNoticePdf(notice);
}

export async function downloadMarksheetPdf(
  result: ExamResult,
  options?: MarksheetRenderOptions
): Promise<void> {
  await downloadBengaliMarksheetPdf(result, options);
}

export async function downloadFeeReceiptPdf(invoice: FeeInvoice): Promise<void> {
  await renderBengaliFeeReceiptPdf(invoice);
}

export async function downloadAdmissionAdmitCardPdf(app: AdmissionApplication): Promise<void> {
  await renderBengaliAdmissionPdf(app);
}

export async function downloadStudentsPdf(students: StudentRecord[]): Promise<void> {
  await renderBengaliStudentsPdf(students);
}

export async function downloadAttendancePdf(
  records: AttendanceRecord[],
  subtitle: string
): Promise<void> {
  await renderBengaliAttendancePdf(records, subtitle);
}

export async function downloadFeeLedgerPdf(invoices: FeeInvoice[]): Promise<void> {
  await renderBengaliFeeLedgerPdf(invoices);
}

export async function downloadTeachersPdf(records: TeacherHRRecord[]): Promise<void> {
  await renderBengaliTeachersPdf(records);
}
