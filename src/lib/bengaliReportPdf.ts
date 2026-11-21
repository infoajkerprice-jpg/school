import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { ensureKalpurushLoaded, getKalpurushFontEmbedCss } from './marksheetPdf';
import {
  ADMISSION_STATUS_BN,
  ATTENDANCE_STATUS_BN,
  AUDIENCE_BN,
  FEE_CATEGORY_BN,
  FEE_STATUS_BN,
  formatBdtBn,
  GENDER_BN,
  GROUP_BN,
  labelClass,
  labelSection,
  NOTICE_CATEGORY_BN,
  PAYMENT_METHOD_BN,
  SHIFT_BN,
  STUDENT_STATUS_BN,
  TEACHER_STATUS_BN,
  toBnDigits,
} from '../i18n';
import type {
  AdmissionApplication,
  AttendanceRecord,
  FeeInvoice,
  NoticeItem,
  StudentRecord,
  TeacherHRRecord,
} from '../types';

const SCHOOL_NAME_BN = 'শাহ ইসলামিক স্কুল এন্ড কলেজ';
const SCHOOL_NAME_EN = 'SHAH ISLAMIC SCHOOL & COLLEGE';
const SCHOOL_ADDRESS_BN =
  'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০';
const SCHOOL_CONTACT_BN = 'মোবাইল: +৮৮০ ১৭১১-৭৫৯৭০৫ · ওয়েবসাইট: shahislamicschool.com';
const LOGO_SRC = '/school-logo.png';
const KALPURUSH_FONT = "'Kalpurush', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif";

function esc(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function todayBn(): string {
  return toBnDigits(new Date().toLocaleDateString('en-GB'));
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ensures all <img> elements inside an offscreen page finish decoding before PNG capture */
async function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 1500);
        })
    )
  );
}

/**
 * Renders one or more fully-styled HTML pages in Kalpurush Bengali font
 * via browser OpenType shaping (zero broken conjuncts/kar-fola!) into a crisp A4 PDF.
 */
async function renderHtmlPagesToPdf(options: {
  pagesHtml: string[];
  orientation: 'portrait' | 'landscape';
  filename: string;
}): Promise<void> {
  const { pagesHtml, orientation, filename } = options;
  if (!pagesHtml.length) return;

  const [, fontEmbedCSS] = await Promise.all([
    ensureKalpurushLoaded(),
    getKalpurushFontEmbedCss(),
  ]);

  const pageW = orientation === 'landscape' ? 1123 : 794;
  const pageH = orientation === 'landscape' ? 794 : 1123;
  const mmW = orientation === 'landscape' ? 297 : 210;
  const mmH = orientation === 'landscape' ? 210 : 297;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-12000px';
  host.style.top = '0';
  host.style.width = `${pageW}px`;
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  try {
    for (let i = 0; i < pagesHtml.length; i++) {
      host.innerHTML = pagesHtml[i];
      const pageEl = host.firstElementChild as HTMLElement | null;
      if (!pageEl) continue;

      await waitForImages(pageEl);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      const dataUrl = await toPng(pageEl, {
        pixelRatio: 2.1,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        width: pageW,
        height: pageH,
        fontEmbedCSS: fontEmbedCSS || undefined,
      });

      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, 0, mmW, mmH, undefined, 'FAST');
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    host.remove();
  }
}

/** Shared Shah Islamic School & College branded page header (full on Page 1, compact on Page 2+) */
function buildBrandedHeader(params: {
  reportTitleBn: string;
  reportBadgeBn: string;
  pageNumber: number;
  totalPages: number;
  compact?: boolean;
}): string {
  const { reportTitleBn, reportBadgeBn, pageNumber, totalPages, compact } = params;

  if (compact) {
    return `
      <div style="
        background: linear-gradient(115deg, #123B67 0%, #087F5B 100%);
        color: #FFFFFF;
        padding: 12px 28px;
        border-bottom: 3px solid #F4A62A;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      ">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:999px;background:#FFFFFF;padding:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <img src="${LOGO_SRC}" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" />
          </div>
          <div>
            <div style="font-size:16px;font-weight:700;line-height:1.15;">${esc(SCHOOL_NAME_BN)}</div>
            <div style="font-size:11.5px;color:#D6F3E8;">${esc(reportTitleBn)}</div>
          </div>
        </div>
        <div style="text-align:right;font-size:12px;color:#FFF4D6;font-weight:700;">
          তারিখ: ${esc(todayBn())} · পৃষ্ঠা ${esc(toBnDigits(pageNumber))} / ${esc(toBnDigits(totalPages))}
        </div>
      </div>
    `;
  }

  return `
    <div style="
      background: linear-gradient(120deg, #123B67 0%, #0A5E63 52%, #087F5B 100%);
      color: #FFFFFF;
      padding: 18px 28px 16px;
      border-bottom: 4px solid #F4A62A;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    ">
      <div style="display:flex;align-items:center;gap:14px;min-width:0;">
        <div style="
          width: 60px;
          height: 60px;
          border-radius: 999px;
          background: #FFFFFF;
          padding: 3px;
          border: 2px solid #F4A62A;
          box-shadow: 0 4px 12px rgba(0,0,0,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <img src="${LOGO_SRC}" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" />
        </div>
        <div style="min-width:0;">
          <div style="font-size:25px;font-weight:700;line-height:1.15;letter-spacing:0.01em;">
            ${esc(SCHOOL_NAME_BN)}
          </div>
          <div style="font-size:10.5px;font-weight:700;letter-spacing:0.14em;color:#FFD57E;margin-top:2px;">
            ${esc(SCHOOL_NAME_EN)}
          </div>
          <div style="font-size:12.5px;color:rgba(255,255,255,0.92);margin-top:3px;line-height:1.3;">
            ${esc(SCHOOL_ADDRESS_BN)} · ${esc(SCHOOL_CONTACT_BN)}
          </div>
        </div>
      </div>

      <div style="
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.28);
        border-radius: 10px;
        padding: 9px 14px;
        text-align: right;
        flex-shrink: 0;
      ">
        <div style="
          display: inline-block;
          background: #F4A62A;
          color: #123B67;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 6px;
          margin-bottom: 4px;
        ">
          ${esc(reportBadgeBn)}
        </div>
        <div style="font-size:12.5px;font-weight:700;color:#FFFFFF;">
          তারিখ: ${esc(todayBn())}
        </div>
        <div style="font-size:11.5px;color:#D4F2E7;margin-top:1px;">
          পৃষ্ঠা ${esc(toBnDigits(pageNumber))} / ${esc(toBnDigits(totalPages))}
        </div>
      </div>
    </div>
  `;
}

function buildBrandedFooter(params: {
  pageNumber: number;
  totalPages: number;
  signatureLabel?: string;
}): string {
  const { pageNumber, totalPages, signatureLabel } = params;
  const isLast = pageNumber === totalPages;

  return `
    <div style="
      margin-top: auto;
      padding: 10px 28px 14px;
      border-top: 1.5px solid #D3E4DC;
      background: #F7FBF9;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      font-size: 11.5px;
      color: #46605A;
    ">
      <div>
        <strong style="color:#123B67;">${esc(SCHOOL_NAME_BN)}</strong> · অফিসিয়াল ডিজিটাল প্রতিবেদন
      </div>
      <div style="font-weight:700;color:#087F5B;">
        পৃষ্ঠা ${esc(toBnDigits(pageNumber))} / ${esc(toBnDigits(totalPages))}
      </div>
      ${
        isLast && signatureLabel
          ? `<div style="text-align:center;min-width:170px;">
               <div style="border-top:1.3px dotted #123B67;padding-top:3px;font-weight:700;color:#123B67;font-size:12px;">
                 ${esc(signatureLabel)}
               </div>
             </div>`
          : `<div style="color:#5E7670;">তারিখ: ${esc(todayBn())}</div>`
      }
    </div>
  `;
}

interface ReportColumn {
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface KpiItem {
  label: string;
  value: string;
  accent?: string;
}

async function measureRowChunks(params: {
  pageW: number;
  columns: ReportColumn[];
  rows: string[][];
  maxFirstPageBodyH: number;
  maxNextPageBodyH: number;
}): Promise<string[][][]> {
  const { pageW, columns, rows, maxFirstPageBodyH, maxNextPageBodyH } = params;
  if (rows.length === 0) return [[]];

  await ensureKalpurushLoaded();

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.left = '-12000px';
  probe.style.top = '0';
  probe.style.width = `${pageW - 56}px`;
  probe.style.fontFamily = KALPURUSH_FONT;
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';

  const colgroup = columns
    .map((c) => `<col ${c.width ? `style="width:${c.width};"` : ''} />`)
    .join('');

  probe.innerHTML = `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <colgroup>${colgroup}</colgroup>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            ${row
              .map(
                (cell, cIdx) => `
              <td style="
                padding: 5.5px 8px;
                text-align: ${columns[cIdx]?.align || 'left'};
                font-size: 12.8px;
                line-height: 1.32;
                border: 1px solid #D8E7DF;
                vertical-align: middle;
                word-break: break-word;
              ">${cell}</td>
            `
              )
              .join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  document.body.appendChild(probe);

  try {
    const trEls = Array.from(probe.querySelectorAll('tbody > tr'));
    const chunks: string[][][] = [];
    let currentChunk: string[][] = [];
    let currentH = 0;
    let limit = maxFirstPageBodyH;

    for (let i = 0; i < rows.length; i++) {
      const rowH = Math.ceil(trEls[i]?.getBoundingClientRect().height || 30);
      if (currentChunk.length > 0 && currentH + rowH > limit) {
        chunks.push(currentChunk);
        currentChunk = [rows[i]];
        currentH = rowH;
        limit = maxNextPageBodyH;
      } else {
        currentChunk.push(rows[i]);
        currentH += rowH;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
  } finally {
    probe.remove();
  }
}

async function buildPaginatedTablePages(params: {
  orientation: 'portrait' | 'landscape';
  reportTitleBn: string;
  reportSubtitleBn: string;
  reportBadgeBn: string;
  kpis?: KpiItem[];
  columns: ReportColumn[];
  rows: string[][];
  signatureLabel: string;
}): Promise<string[]> {
  const {
    orientation,
    reportTitleBn,
    reportSubtitleBn,
    reportBadgeBn,
    kpis,
    columns,
    rows,
    signatureLabel,
  } = params;

  const pageW = orientation === 'landscape' ? 1123 : 794;
  const pageH = orientation === 'landscape' ? 794 : 1123;

  // Exact usable tbody heights (excluding full/compact header, title+KPI, thead, and footer)
  const maxFirstPageBodyH = orientation === 'landscape' ? 475 : 805;
  const maxNextPageBodyH = orientation === 'landscape' ? 610 : 940;

  const chunks = await measureRowChunks({
    pageW,
    columns,
    rows,
    maxFirstPageBodyH,
    maxNextPageBodyH,
  });

  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNumber = pageIdx + 1;
    const isFirst = pageIdx === 0;

    const kpiStripHtml =
      isFirst && kpis && kpis.length > 0
        ? `
        <div style="
          display: flex;
          gap: 10px;
          margin-top: 10px;
        ">
          ${kpis
            .map(
              (k) => `
            <div style="
              flex: 1;
              background: #F2F8F5;
              border: 1px solid #CFE3D9;
              border-radius: 9px;
              padding: 7px 12px;
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              gap: 8px;
            ">
              <span style="font-size:12.5px;font-weight:600;color:#47615A;">${esc(k.label)}</span>
              <span style="font-size:16px;font-weight:700;color:${k.accent || '#123B67'};">${esc(k.value)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `
        : '';

    const titleSectionHtml = isFirst
      ? `
      <div style="padding: 14px 28px 10px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;">
          <h2 style="margin:0;font-size:20px;font-weight:700;color:#123B67;">
            ${esc(reportTitleBn)}
          </h2>
          <span style="font-size:13px;font-weight:600;color:#087F5B;">
            ${esc(reportSubtitleBn)}
          </span>
        </div>
        ${kpiStripHtml}
      </div>
    `
      : `<div style="height:14px;"></div>`;

    const headerCells = columns
      .map(
        (col) => `
      <th style="
        padding: 7px 8px;
        text-align: ${col.align || 'left'};
        font-size: 13px;
        font-weight: 700;
        color: #FFFFFF;
        border: 1px solid rgba(255,255,255,0.2);
        ${col.width ? `width:${col.width};` : ''}
        white-space: nowrap;
      ">${esc(col.header)}</th>
    `
      )
      .join('');

    const bodyRowsHtml =
      chunk.length === 0
        ? `<tr><td colspan="${columns.length}" style="padding:28px;text-align:center;color:#5B7069;font-size:15px;">কোনো তথ্য পাওয়া যায়নি।</td></tr>`
        : chunk
            .map(
              (row, rIdx) => `
          <tr style="background:${rIdx % 2 === 0 ? '#FFFFFF' : '#F4FAF7'};">
            ${row
              .map(
                (cell, cIdx) => `
              <td style="
                padding: 5.5px 8px;
                text-align: ${columns[cIdx]?.align || 'left'};
                font-size: 12.8px;
                line-height: 1.32;
                color: #1B2D28;
                border: 1px solid #D8E7DF;
                vertical-align: middle;
                word-break: break-word;
              ">${cell}</td>
            `
              )
              .join('')}
          </tr>
        `
            )
            .join('');

    return `
      <div style="
        width: ${pageW}px;
        height: ${pageH}px;
        background: #FFFFFF;
        font-family: ${KALPURUSH_FONT};
        color: #1B2D28;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        ${buildBrandedHeader({
          reportTitleBn,
          reportBadgeBn,
          pageNumber,
          totalPages,
          compact: !isFirst,
        })}
        ${titleSectionHtml}
        <div style="padding: 0 28px 10px; flex: 1; overflow: hidden;">
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <thead>
              <tr style="background:linear-gradient(90deg, #123B67 0%, #087F5B 100%);">
                ${headerCells}
              </tr>
            </thead>
            <tbody>
              ${bodyRowsHtml}
            </tbody>
          </table>
        </div>
        ${buildBrandedFooter({ pageNumber, totalPages, signatureLabel })}
      </div>
    `;
  });
}

function statusChipHtml(text: string, tone: 'green' | 'amber' | 'red' | 'blue'): string {
  const palette = {
    green: { bg: '#E6F7F0', text: '#087F5B', border: '#B9E6D3' },
    amber: { bg: '#FFF7E6', text: '#A86200', border: '#F5D596' },
    red: { bg: '#FEECEF', text: '#B91C3A', border: '#F6C2CC' },
    blue: { bg: '#EAF6FC', text: '#0E6B92', border: '#BDE3F3' },
  }[tone];
  return `<span style="display:inline-block;padding:1px 7px;border-radius:5px;font-size:11.5px;font-weight:700;background:${palette.bg};color:${palette.text};border:1px solid ${palette.border};white-space:nowrap;">${esc(text)}</span>`;
}

/** 1. STUDENT ENROLLMENT DIRECTORY (A4 Landscape · Kalpurush Bengali) */
export async function renderBengaliStudentsPdf(students: StudentRecord[]): Promise<void> {
  const activeCount = students.filter((s) => s.status === 'Active').length;
  const classCount = new Set(students.map((s) => s.className)).size;

  const rows = students.map((s, idx) => [
    esc(toBnDigits(idx + 1)),
    `<span style="font-family:'JetBrains Mono','Kalpurush',monospace;font-size:11px;font-weight:700;color:#123B67;">${esc(s.studentIdCode)}</span>`,
    `<strong style="color:#087F5B;">${esc(toBnDigits(s.rollNumber))}</strong>`,
    `<strong style="color:#123B67;">${esc(s.name)}</strong>`,
    esc(labelClass(s.className)),
    esc(labelSection(s.section)),
    esc(SHIFT_BN[s.shift] || s.shift),
    esc(s.guardianName || s.fatherName || '—'),
    esc(toBnDigits(s.guardianPhone || '—')),
    statusChipHtml(
      STUDENT_STATUS_BN[s.status] || s.status,
      s.status === 'Active' ? 'green' : s.status === 'Graduated' ? 'blue' : 'amber'
    ),
  ]);

  const pagesHtml = await buildPaginatedTablePages({
    orientation: 'landscape',
    reportTitleBn: 'শিক্ষার্থী নিবন্ধন তালিকা (Student Enrollment Directory)',
    reportSubtitleBn: `মোট শিক্ষার্থী: ${toBnDigits(students.length)} জন`,
    reportBadgeBn: 'শিক্ষার্থী তালিকা',
    kpis: [
      { label: 'মোট শিক্ষার্থী', value: `${toBnDigits(students.length)} জন`, accent: '#123B67' },
      { label: 'সক্রিয় শিক্ষার্থী', value: `${toBnDigits(activeCount)} জন`, accent: '#087F5B' },
      { label: 'মোট শ্রেণি', value: `${toBnDigits(classCount)}টি`, accent: '#21A9D6' },
    ],
    columns: [
      { header: 'ক্রম', width: '4.5%', align: 'center' },
      { header: 'আইডি কোড', width: '12.5%' },
      { header: 'রোল', width: '5.5%', align: 'center' },
      { header: 'শিক্ষার্থীর নাম', width: '19.5%' },
      { header: 'শ্রেণি', width: '10%' },
      { header: 'শাখা', width: '7%' },
      { header: 'শিফট', width: '9.5%' },
      { header: 'অভিভাবকের নাম', width: '13.5%' },
      { header: 'মোবাইল নম্বর', width: '10.5%' },
      { header: 'অবস্থা', width: '7.5%', align: 'center' },
    ],
    rows,
    signatureLabel: 'অধ্যক্ষ, শাহ ইসলামিক স্কুল এন্ড কলেজ',
  });

  await renderHtmlPagesToPdf({
    pagesHtml,
    orientation: 'landscape',
    filename: `Student_Directory_${isoDate()}.pdf`,
  });
}

/** 2. FACULTY & HR DIRECTORY (A4 Landscape · Kalpurush Bengali) */
export async function renderBengaliTeachersPdf(records: TeacherHRRecord[]): Promise<void> {
  const activeCount = records.filter((t) => t.status === 'Active').length;
  const totalSalary = records.reduce((sum, t) => sum + (Number(t.salaryBdt) || 0), 0);

  const rows = records.map((t, idx) => [
    esc(toBnDigits(idx + 1)),
    `<span style="font-family:'JetBrains Mono','Kalpurush',monospace;font-size:11px;font-weight:700;color:#123B67;">${esc(t.employeeId)}</span>`,
    `<strong style="color:#123B67;">${esc(t.name)}</strong>`,
    esc(t.designation),
    esc(t.department),
    esc(toBnDigits(t.phone)),
    `<span style="font-size:11.5px;">${esc(t.email || '—')}</span>`,
    `<strong style="color:#087F5B;">${esc(formatBdtBn(Number(t.salaryBdt) || 0))}</strong>`,
    statusChipHtml(
      TEACHER_STATUS_BN[t.status] || t.status,
      t.status === 'Active' ? 'green' : t.status === 'OnLeave' ? 'amber' : 'red'
    ),
  ]);

  const pagesHtml = await buildPaginatedTablePages({
    orientation: 'landscape',
    reportTitleBn: 'শিক্ষকমণ্ডলী ও মানবসম্পদ তালিকা (Faculty & HR Directory)',
    reportSubtitleBn: `মোট শিক্ষক: ${toBnDigits(records.length)} জন`,
    reportBadgeBn: 'শিক্ষক তালিকা',
    kpis: [
      { label: 'মোট শিক্ষক', value: `${toBnDigits(records.length)} জন`, accent: '#123B67' },
      { label: 'কর্মরত শিক্ষক', value: `${toBnDigits(activeCount)} জন`, accent: '#087F5B' },
      { label: 'মাসিক বেতন ব্যয়', value: formatBdtBn(totalSalary), accent: '#C67B05' },
    ],
    columns: [
      { header: 'ক্রম', width: '4.5%', align: 'center' },
      { header: 'আইডি', width: '10%' },
      { header: 'শিক্ষকের নাম', width: '18%' },
      { header: 'পদবি', width: '13.5%' },
      { header: 'বিভাগ', width: '12%' },
      { header: 'মোবাইল', width: '11.5%' },
      { header: 'ইমেইল', width: '13.5%' },
      { header: 'বেতন (টাকা)', width: '9%', align: 'right' },
      { header: 'অবস্থা', width: '8%', align: 'center' },
    ],
    rows,
    signatureLabel: 'অধ্যক্ষ, শাহ ইসলামিক স্কুল এন্ড কলেজ',
  });

  await renderHtmlPagesToPdf({
    pagesHtml,
    orientation: 'landscape',
    filename: `Faculty_HR_Report_${isoDate()}.pdf`,
  });
}

/** 3. ATTENDANCE REGISTER REPORT (A4 Portrait · Kalpurush Bengali) */
export async function renderBengaliAttendancePdf(
  records: AttendanceRecord[],
  subtitle: string
): Promise<void> {
  const present = records.filter((r) => r.status === 'Present').length;
  const absent = records.filter((r) => r.status === 'Absent').length;
  const lateOrLeave = records.length - present - absent;

  const rows = records.map((r, idx) => [
    esc(toBnDigits(idx + 1)),
    esc(toBnDigits(r.date)),
    esc(`${labelClass(r.className)} (${labelSection(r.section)})`),
    `<strong style="color:#123B67;">${esc(toBnDigits(r.rollNumber))}</strong>`,
    `<strong style="color:#123B67;">${esc(r.studentName)}</strong>`,
    statusChipHtml(
      ATTENDANCE_STATUS_BN[r.status] || r.status,
      r.status === 'Present' ? 'green' : r.status === 'Absent' ? 'red' : 'amber'
    ),
    esc(r.remarks || '—'),
  ]);

  const pagesHtml = await buildPaginatedTablePages({
    orientation: 'portrait',
    reportTitleBn: 'শিক্ষার্থী হাজিরা প্রতিবেদন (Attendance Register)',
    reportSubtitleBn: toBnDigits(subtitle || `মোট রেকর্ড: ${records.length}`),
    reportBadgeBn: 'হাজিরা রেজিস্টার',
    kpis: [
      { label: 'মোট রেকর্ড', value: toBnDigits(records.length), accent: '#123B67' },
      { label: 'উপস্থিত', value: toBnDigits(present), accent: '#087F5B' },
      { label: 'অনুপস্থিত', value: toBnDigits(absent), accent: '#B91C3A' },
      { label: 'বিলম্ব / ছুটি', value: toBnDigits(lateOrLeave), accent: '#B4690E' },
    ],
    columns: [
      { header: 'ক্রম', width: '6%', align: 'center' },
      { header: 'তারিখ', width: '13%' },
      { header: 'শ্রেণি ও শাখা', width: '18%' },
      { header: 'রোল', width: '8%', align: 'center' },
      { header: 'শিক্ষার্থীর নাম', width: '26%' },
      { header: 'উপস্থিতি', width: '13%', align: 'center' },
      { header: 'মন্তব্য', width: '16%' },
    ],
    rows,
    signatureLabel: 'শ্রেণি শিক্ষক / অধ্যক্ষ',
  });

  await renderHtmlPagesToPdf({
    pagesHtml,
    orientation: 'portrait',
    filename: `Attendance_Report_${isoDate()}.pdf`,
  });
}

/** 4. TUITION FEE & COLLECTION LEDGER (A4 Landscape · Kalpurush Bengali) */
export async function renderBengaliFeeLedgerPdf(invoices: FeeInvoice[]): Promise<void> {
  const totalBilled = invoices.reduce((sum, i) => sum + (Number(i.amountBdt) || 0), 0);
  const totalCollected = invoices.reduce((sum, i) => sum + (Number(i.paidAmountBdt) || 0), 0);
  const totalDue = Math.max(0, totalBilled - totalCollected);

  const rows = invoices.map((inv, idx) => [
    esc(toBnDigits(idx + 1)),
    `<span style="font-family:'JetBrains Mono','Kalpurush',monospace;font-size:11px;font-weight:700;color:#123B67;">${esc(inv.invoiceNo)}</span>`,
    `<strong style="color:#123B67;">${esc(inv.studentName)}</strong>`,
    esc(`${labelClass(inv.className)} (রোল ${toBnDigits(inv.rollNumber)})`),
    esc(`${inv.month} ${toBnDigits(inv.academicYear)}`),
    esc(FEE_CATEGORY_BN[inv.feeCategory] || inv.feeCategory),
    `<span style="font-weight:700;">${esc(formatBdtBn(inv.amountBdt))}</span>`,
    `<span style="font-weight:700;color:#087F5B;">${esc(formatBdtBn(inv.paidAmountBdt))}</span>`,
    esc(PAYMENT_METHOD_BN[inv.paymentMethod] || inv.paymentMethod),
    statusChipHtml(
      FEE_STATUS_BN[inv.status] || inv.status,
      inv.status === 'Paid' ? 'green' : inv.status === 'Partial' ? 'amber' : 'red'
    ),
  ]);

  const pagesHtml = await buildPaginatedTablePages({
    orientation: 'landscape',
    reportTitleBn: 'বেতন ও ফি আদায় খতিয়ান (Tuition Fee & Collection Ledger)',
    reportSubtitleBn: `মোট ভাউচার: ${toBnDigits(invoices.length)}টি`,
    reportBadgeBn: 'আর্থিক খতিয়ান',
    kpis: [
      { label: 'মোট বিল', value: formatBdtBn(totalBilled), accent: '#123B67' },
      { label: 'মোট আদায়', value: formatBdtBn(totalCollected), accent: '#087F5B' },
      { label: 'মোট বকেয়া', value: formatBdtBn(totalDue), accent: '#B91C3A' },
    ],
    columns: [
      { header: 'ক্রম', width: '4.5%', align: 'center' },
      { header: 'রসিদ নং', width: '11.5%' },
      { header: 'শিক্ষার্থীর নাম', width: '17%' },
      { header: 'শ্রেণি ও রোল', width: '14%' },
      { header: 'মাস / বর্ষ', width: '10.5%' },
      { header: 'খাত', width: '10%' },
      { header: 'মোট ফি', width: '8%', align: 'right' },
      { header: 'পরিশোধিত', width: '8.5%', align: 'right' },
      { header: 'মাধ্যম', width: '8%' },
      { header: 'অবস্থা', width: '8%', align: 'center' },
    ],
    rows,
    signatureLabel: 'হিসাবরক্ষক / অধ্যক্ষ',
  });

  await renderHtmlPagesToPdf({
    pagesHtml,
    orientation: 'landscape',
    filename: `Fee_Ledger_${isoDate()}.pdf`,
  });
}

/** 5. OFFICIAL FEE PAYMENT RECEIPT (A4 Portrait · Kalpurush Bengali) */
export async function renderBengaliFeeReceiptPdf(invoice: FeeInvoice): Promise<void> {
  const dueAmount = Math.max(0, invoice.amountBdt - invoice.paidAmountBdt);
  const statusLabel = FEE_STATUS_BN[invoice.status] || invoice.status;
  const statusTone =
    invoice.status === 'Paid' ? 'green' : invoice.status === 'Partial' ? 'amber' : 'red';

  const pageHtml = `
    <div style="
      width: 794px;
      height: 1123px;
      background: #FFFFFF;
      font-family: ${KALPURUSH_FONT};
      color: #1B2D28;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      ${buildBrandedHeader({
        reportTitleBn: 'বেতন ও ফি পরিশোধের রসিদ',
        reportBadgeBn: 'অফিসিয়াল রসিদ',
        pageNumber: 1,
        totalPages: 1,
      })}

      <div style="padding: 26px 34px; flex: 1;">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #087F5B;
          padding-bottom: 12px;
          margin-bottom: 18px;
        ">
          <div>
            <h2 style="margin:0;font-size:23px;font-weight:700;color:#123B67;">
              বেতন ও ফি পরিশোধের রসিদ (Money Receipt)
            </h2>
            <div style="font-size:14px;color:#4C645E;margin-top:2px;">
              রসিদ নম্বর: <strong style="color:#087F5B;font-family:'JetBrains Mono','Kalpurush',monospace;">${esc(invoice.invoiceNo)}</strong>
              · শিক্ষাবর্ষ: <strong>${esc(toBnDigits(invoice.academicYear))}</strong>
            </div>
          </div>
          <div>${statusChipHtml(statusLabel, statusTone)}</div>
        </div>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 24px;
          background: #F2F8F5;
          border: 1.5px solid #CFE3D9;
          border-radius: 12px;
          padding: 16px 20px;
          font-size: 15px;
          line-height: 1.75;
          margin-bottom: 22px;
        ">
          <div><strong style="color:#123B67;">শিক্ষার্থীর নাম :</strong> ${esc(invoice.studentName)}</div>
          <div><strong style="color:#123B67;">পরিশোধের মাধ্যম :</strong> ${esc(PAYMENT_METHOD_BN[invoice.paymentMethod] || invoice.paymentMethod)}</div>
          <div><strong style="color:#123B67;">শ্রেণি ও রোল :</strong> ${esc(labelClass(invoice.className))} (রোল ${esc(toBnDigits(invoice.rollNumber))})</div>
          <div><strong style="color:#123B67;">ট্রানজেকশন আইডি :</strong> ${esc(invoice.transactionId || 'প্রযোজ্য নয়')}</div>
          <div><strong style="color:#123B67;">নির্ধারিত তারিখ :</strong> ${esc(toBnDigits(invoice.dueDate))}</div>
          <div><strong style="color:#123B67;">পরিশোধের তারিখ :</strong> ${esc(invoice.paidDate ? toBnDigits(invoice.paidDate) : 'অপেক্ষমাণ')}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <thead>
            <tr style="background:linear-gradient(90deg, #123B67 0%, #087F5B 100%);color:#FFFFFF;">
              <th style="padding:10px 12px;text-align:left;border:1px solid #0E5C4A;">ফি-এর খাত</th>
              <th style="padding:10px 12px;text-align:left;border:1px solid #0E5C4A;">মাস / বর্ষ</th>
              <th style="padding:10px 12px;text-align:right;border:1px solid #0E5C4A;">মোট টাকা</th>
              <th style="padding:10px 12px;text-align:right;border:1px solid #0E5C4A;">পরিশোধিত</th>
              <th style="padding:10px 12px;text-align:right;border:1px solid #0E5C4A;">বকেয়া</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#FFFFFF;">
              <td style="padding:12px;border:1px solid #D3E4DC;font-weight:700;color:#123B67;">
                ${esc(FEE_CATEGORY_BN[invoice.feeCategory] || invoice.feeCategory)}
              </td>
              <td style="padding:12px;border:1px solid #D3E4DC;">
                ${esc(invoice.month)} ${esc(toBnDigits(invoice.academicYear))}
              </td>
              <td style="padding:12px;border:1px solid #D3E4DC;text-align:right;font-weight:700;">
                ${esc(formatBdtBn(invoice.amountBdt))}
              </td>
              <td style="padding:12px;border:1px solid #D3E4DC;text-align:right;font-weight:700;color:#087F5B;">
                ${esc(formatBdtBn(invoice.paidAmountBdt))}
              </td>
              <td style="padding:12px;border:1px solid #D3E4DC;text-align:right;font-weight:700;color:${dueAmount > 0 ? '#B91C3A' : '#087F5B'};">
                ${esc(formatBdtBn(dueAmount))}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="
          margin-top: 24px;
          padding: 14px 18px;
          border-radius: 10px;
          background: #FFFBF0;
          border: 1px solid #F3D999;
          font-size: 13.5px;
          color: #6B4B0A;
        ">
          <strong>বিশেষ দ্রষ্টব্য:</strong> এটি শাহ ইসলামিক স্কুল এন্ড কলেজ-এর স্বয়ংক্রিয় ডিজিটাল রসিদ। ভবিষ্যতে যাচাইয়ের জন্য রসিদটি সংরক্ষণ করুন।
        </div>
      </div>

      ${buildBrandedFooter({
        pageNumber: 1,
        totalPages: 1,
        signatureLabel: 'হিসাবরক্ষক কর্মকর্তা',
      })}
    </div>
  `;

  await renderHtmlPagesToPdf({
    pagesHtml: [pageHtml],
    orientation: 'portrait',
    filename: `Fee_Receipt_${invoice.invoiceNo}.pdf`,
  });
}

/** 6. OFFICIAL NOTICE PDF (A4 Portrait · Kalpurush Bengali) */
export async function renderBengaliNoticePdf(notice: NoticeItem): Promise<void> {
  const titleText = notice.titleBn || notice.title;
  const bodyText = (notice.contentBn || notice.content || '').trim();
  const paragraphs = bodyText
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.95;font-size:16.5px;color:#1D2E29;">${esc(p)}</p>`)
    .join('');

  const pageHtml = `
    <div style="
      width: 794px;
      height: 1123px;
      background: #FFFFFF;
      font-family: ${KALPURUSH_FONT};
      color: #1B2D28;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      ${buildBrandedHeader({
        reportTitleBn: 'অফিসিয়াল বিজ্ঞপ্তি / নোটিশ',
        reportBadgeBn: NOTICE_CATEGORY_BN[notice.category] || 'নোটিশ',
        pageNumber: 1,
        totalPages: 1,
      })}

      <div style="padding: 26px 40px; flex: 1; display: flex; flex-direction: column;">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid #CFE3D9;
          padding-bottom: 10px;
          font-size: 14px;
          font-weight: 700;
          color: #46605A;
        ">
          <span>বিজ্ঞপ্তি শ্রেণি: <strong style="color:#087F5B;">${esc(NOTICE_CATEGORY_BN[notice.category] || notice.category)}</strong></span>
          <span>প্রাপক: <strong style="color:#123B67;">${esc(AUDIENCE_BN[notice.audience] || notice.audience)}</strong></span>
          <span>প্রকাশের তারিখ: <strong style="color:#123B67;">${esc(toBnDigits(notice.publishedDate))}</strong></span>
        </div>

        <div style="text-align:center;margin:24px 0 20px;">
          <div style="
            display: inline-block;
            background: linear-gradient(135deg, #087F5B 0%, #123B67 100%);
            color: #FFFFFF;
            padding: 5px 28px;
            border-radius: 999px;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 14px;
          ">
            জরুরি / অফিসিয়াল বিজ্ঞপ্তি
          </div>
          <h2 style="margin:0;font-size:23px;font-weight:700;color:#123B67;line-height:1.45;">
            ${esc(titleText)}
          </h2>
        </div>

        <div style="
          background: #FAFCFB;
          border: 1.5px solid #DCEBE3;
          border-radius: 12px;
          padding: 24px 26px;
          flex: 1;
        ">
          ${paragraphs || `<p style="font-size:16px;color:#4B635C;">বিস্তারিত তথ্য সংযুক্ত নেই।</p>`}
        </div>
      </div>

      ${buildBrandedFooter({
        pageNumber: 1,
        totalPages: 1,
        signatureLabel: 'আদেশক্রমে — অধ্যক্ষ, শাহ ইসলামিক স্কুল এন্ড কলেজ',
      })}
    </div>
  `;

  await renderHtmlPagesToPdf({
    pagesHtml: [pageHtml],
    orientation: 'portrait',
    filename: `Notice_${notice.publishedDate}_${notice.id.slice(0, 12)}.pdf`,
  });
}

/** 7. ONLINE ADMISSION ACKNOWLEDGEMENT & ADMIT CARD (A4 Portrait · Kalpurush Bengali) */
export async function renderBengaliAdmissionPdf(app: AdmissionApplication): Promise<void> {
  const statusBn = ADMISSION_STATUS_BN[app.status] || app.status;
  const statusTone =
    app.status === 'Approved' ? 'green' : app.status === 'Rejected' ? 'red' : 'amber';

  const detailRows: Array<[string, string]> = [
    ['আবেদন নম্বর', app.applicationNo],
    ['আবেদনকারীর নাম', `${app.applicantName}${app.applicantNameBn ? ` (${app.applicantNameBn})` : ''}`],
    ['পিতা ও মাতার নাম', `${app.fatherName || '—'} / ${app.motherName || '—'}`],
    ['জন্ম নিবন্ধন নম্বর', toBnDigits(app.birthRegNo || '—')],
    [
      'আবেদনকৃত শ্রেণি ও শিফট',
      `${labelClass(app.applyingClass)} · ${GROUP_BN[app.group] || app.group} · ${SHIFT_BN[app.shift] || app.shift}`,
    ],
    ['জন্ম তারিখ ও লিঙ্গ', `${toBnDigits(app.dateOfBirth)} · ${GENDER_BN[app.gender] || app.gender}`],
    ['পূর্ববর্তী শিক্ষাপ্রতিষ্ঠান', app.previousSchool || 'প্রযোজ্য নয়'],
    ['অভিভাবকের নাম ও মোবাইল', `${app.guardianName} (${toBnDigits(app.guardianPhone)})`],
    ['ঠিকানা', app.address],
    ['আবেদনের অবস্থা', statusBn],
    ['ভর্তি কমিটির মন্তব্য', app.remarks || 'যাচাই প্রক্রিয়াধীন'],
  ];

  const pageHtml = `
    <div style="
      width: 794px;
      height: 1123px;
      background: #FFFFFF;
      font-family: ${KALPURUSH_FONT};
      color: #1B2D28;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      ${buildBrandedHeader({
        reportTitleBn: 'ভর্তি আবেদন প্রাপ্তিস্বীকার ও প্রবেশপত্র',
        reportBadgeBn: 'ভর্তি আবেদনপত্র',
        pageNumber: 1,
        totalPages: 1,
      })}

      <div style="padding: 22px 34px; flex: 1;">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 2px solid #087F5B;
        ">
          <div>
            <h2 style="margin:0;font-size:21px;font-weight:700;color:#123B67;">
              অনলাইন ভর্তি আবেদন প্রাপ্তিস্বীকার ও প্রবেশপত্র
            </h2>
            <div style="font-size:14px;color:#47615A;margin-top:4px;">
              আবেদন নং: <strong style="color:#087F5B;font-family:'JetBrains Mono','Kalpurush',monospace;">${esc(app.applicationNo)}</strong>
              &nbsp;·&nbsp; অবস্থা: ${statusChipHtml(statusBn, statusTone)}
            </div>
          </div>
          ${
            app.photoUrl
              ? `<div style="width:76px;height:88px;border-radius:10px;overflow:hidden;border:2px solid #087F5B;flex-shrink:0;background:#F2F8F5;">
                   <img src="${esc(app.photoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;" />
                 </div>`
              : ''
          }
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14.5px;">
          <thead>
            <tr style="background:linear-gradient(90deg, #123B67 0%, #087F5B 100%);color:#FFFFFF;">
              <th style="padding:9px 12px;text-align:left;width:32%;border:1px solid #0E5C4A;">তথ্যের বিবরণ</th>
              <th style="padding:9px 12px;text-align:left;border:1px solid #0E5C4A;">আবেদনকারীর তথ্য</th>
            </tr>
          </thead>
          <tbody>
            ${detailRows
              .map(
                ([label, val], idx) => `
              <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F4FAF7'};">
                <td style="padding:8.5px 12px;border:1px solid #D8E7DF;font-weight:700;color:#123B67;">${esc(label)}</td>
                <td style="padding:8.5px 12px;border:1px solid #D8E7DF;color:#1E302A;">${esc(val)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="
          margin-top: 18px;
          padding: 12px 16px;
          border-radius: 10px;
          background: #F2F8F5;
          border: 1px solid #CFE3D9;
          font-size: 13.5px;
          line-height: 1.65;
          color: #263B35;
        ">
          <strong style="color:#087F5B;">ভর্তি পরীক্ষার নির্দেশনা:</strong> সাক্ষাৎকার বা ভর্তি পরীক্ষার সময় এই প্রাপ্তিস্বীকারপত্রের প্রিন্ট কপি, শিক্ষার্থীর জন্ম নিবন্ধনের ফটোকপি এবং ২ কপি পাসপোর্ট সাইজ ছবি সঙ্গে আনতে হবে।
        </div>
      </div>

      ${buildBrandedFooter({
        pageNumber: 1,
        totalPages: 1,
        signatureLabel: 'ভর্তি কমিটি / অধ্যক্ষ',
      })}
    </div>
  `;

  await renderHtmlPagesToPdf({
    pagesHtml: [pageHtml],
    orientation: 'portrait',
    filename: `Admission_${app.applicationNo}.pdf`,
  });
}
