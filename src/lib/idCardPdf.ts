import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  ID_CARD_HEIGHT_PX,
  ID_CARD_WIDTH_PX,
  StudentIdCardBack,
  StudentIdCardFront,
  type StudentIdCardConfig,
} from '../components/StudentIdCardTemplate';
import { toEnglishName } from './idCardEnglish';
import type { SiteSettings, StudentRecord } from '../types';

function sanitizeFilePart(str: string): string {
  return String(str || 'student')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);
}

// Standard ISO/IEC 7810 ID-1 (CR80 Portrait) physical dimensions in millimeters
const CR80_W_MM = 54;
const CR80_H_MM = 86;

// A4 Portrait (210mm x 297mm) symmetric 3x3 grid = 9 CR80 cards per sheet:
// Horizontal: 14 + 54 + 10 + 54 + 10 + 54 + 14 = 210mm (perfect left/right symmetry for Flip-on-Long-Edge!)
// Vertical:   11.5 + 86 + 8 + 86 + 8 + 86 + 11.5 = 297mm (perfect top/bottom symmetry!)
const GRID_MARGIN_X_MM = 14;
const GRID_MARGIN_Y_MM = 11.5;
const GRID_GAP_X_MM = 10;
const GRID_GAP_Y_MM = 8;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const CARDS_PER_SHEET = GRID_COLS * GRID_ROWS;

function getGridSlotRect(col: number, row: number): { x: number; y: number } {
  return {
    x: GRID_MARGIN_X_MM + col * (CR80_W_MM + GRID_GAP_X_MM),
    y: GRID_MARGIN_Y_MM + row * (CR80_H_MM + GRID_GAP_Y_MM),
  };
}

/** Subtle corner crop marks around a CR80 card slot for clean trimming */
function drawCropMarks(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  const len = 3;
  const off = 1;
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.2);

  // Top-left
  pdf.line(x - off - len, y, x - off, y);
  pdf.line(x, y - off - len, x, y - off);
  // Top-right
  pdf.line(x + w + off, y, x + w + off + len, y);
  pdf.line(x + w, y - off - len, x + w, y - off);
  // Bottom-left
  pdf.line(x - off - len, y + h, x - off, y + h);
  pdf.line(x, y + h + off, x, y + h + off + len);
  // Bottom-right
  pdf.line(x + w + off, y + h, x + w + off + len, y + h);
  pdf.line(x + w, y + h + off, x + w, y + h + off + len);
}

async function ensureFontsReady(): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font loading timeout
    }
  }
}

async function captureIdCardElement(el: HTMLElement, pixelRatio = 3): Promise<string> {
  await ensureFontsReady();
  return toPng(el, {
    pixelRatio,
    backgroundColor: 'transparent',
    cacheBust: true,
    width: el.offsetWidth || ID_CARD_WIDTH_PX,
    height: el.offsetHeight || ID_CARD_HEIGHT_PX,
  });
}

/** Downloads a single card side (Front or Back) as a crisp 3x PNG */
export async function downloadSingleIdCardSidePng(
  el: HTMLElement,
  student: StudentRecord,
  side: 'Front' | 'Back'
): Promise<void> {
  const dataUrl = await captureIdCardElement(el, 3);
  const link = document.createElement('a');
  const safeId = sanitizeFilePart(student.studentIdCode || toEnglishName(student.name));
  link.download = `Student_ID_${safeId}_${side}.png`;
  link.href = dataUrl;
  link.click();
}

/** Downloads both Front & Back side-by-side in one high-resolution presentation PNG */
export async function downloadDualIdCardPng(
  frontEl: HTMLElement,
  backEl: HTMLElement,
  student: StudentRecord
): Promise<void> {
  const [frontUrl, backUrl] = await Promise.all([
    captureIdCardElement(frontEl, 3),
    captureIdCardElement(backEl, 3),
  ]);

  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const [frontImg, backImg] = await Promise.all([loadImg(frontUrl), loadImg(backUrl)]);

  const pad = 72;
  const gap = 84;
  const cardW = frontImg.width;
  const cardH = frontImg.height;
  const canvas = document.createElement('canvas');
  canvas.width = pad * 2 + cardW * 2 + gap;
  canvas.height = pad * 2 + cardH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Soft studio neutral backdrop so both colorful cards pop cleanly
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#F0F7F5');
  bgGrad.addColorStop(1, '#E6EFF5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.shadowColor = 'rgba(13, 46, 92, 0.22)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(frontImg, pad, pad, cardW, cardH);
  ctx.drawImage(backImg, pad + cardW + gap, pad, cardW, cardH);

  const link = document.createElement('a');
  const safeId = sanitizeFilePart(student.studentIdCode || toEnglishName(student.name));
  link.download = `Student_ID_${safeId}_Front_Back.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Exports a single student's Front & Back ID Card at exact CR80 physical size (54mm x 86mm)
 * on an A4 Portrait print sheet with trim crop marks (ready for PVC printing or lamination).
 */
export async function downloadSingleIdCardPdf(
  frontEl: HTMLElement,
  backEl: HTMLElement,
  student: StudentRecord
): Promise<void> {
  const [frontUrl, backUrl] = await Promise.all([
    captureIdCardElement(frontEl, 3),
    captureIdCardElement(backEl, 3),
  ]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Page 1: Side-by-side Front & Back (great for fold-and-laminate or visual proof)
  const pairGap = 14;
  const pairTotalW = CR80_W_MM * 2 + pairGap;
  const startX = (210 - pairTotalW) / 2;
  const startY = 34;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(18, 59, 103);
  pdf.text(
    `Student ID Card (CR80 Standard 54mm x 86mm) — ${toEnglishName(student.name)} (${student.studentIdCode})`,
    105,
    20,
    { align: 'center' }
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(90, 110, 125);
  pdf.text('FRONT SIDE', startX + CR80_W_MM / 2, startY - 4, { align: 'center' });
  pdf.text('BACK SIDE', startX + CR80_W_MM + pairGap + CR80_W_MM / 2, startY - 4, {
    align: 'center',
  });

  pdf.addImage(frontUrl, 'PNG', startX, startY, CR80_W_MM, CR80_H_MM, undefined, 'FAST');
  drawCropMarks(pdf, startX, startY, CR80_W_MM, CR80_H_MM);

  const backX = startX + CR80_W_MM + pairGap;
  pdf.addImage(backUrl, 'PNG', backX, startY, CR80_W_MM, CR80_H_MM, undefined, 'FAST');
  drawCropMarks(pdf, backX, startY, CR80_W_MM, CR80_H_MM);

  pdf.setFontSize(8);
  pdf.setTextColor(115, 130, 145);
  pdf.text(
    'Print at 100% scale (Actual Size / Do Not Scale) on A4 PVC or 300gsm glossy card paper and trim along crop marks.',
    105,
    startY + CR80_H_MM + 16,
    { align: 'center' }
  );

  const safeId = sanitizeFilePart(student.studentIdCode || toEnglishName(student.name));
  pdf.save(`Student_ID_${safeId}_CR80.pdf`);
}

/**
 * Generates a Duplex-Aligned A4 Print Sheet PDF for an entire class (9 CR80 cards per A4 sheet):
 * - Odd pages: Front Sides in 3x3 symmetric grid (cols 0, 1, 2).
 * - Even pages: Back Sides horizontally mirrored (cols 2, 1, 0) so Flip-on-Long-Edge double-sided
 *   printing aligns every student's Back side millimeter-perfectly behind their Front side!
 */
export async function downloadClassIdCardsPdf(
  students: StudentRecord[],
  settings: SiteSettings,
  baseConfig: StudentIdCardConfig,
  classLabelEn: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (students.length === 0) return;
  await ensureFontsReady();

  // Strip per-student manual overrides when exporting a whole class
  const batchConfig: StudentIdCardConfig = {
    themeId: baseConfig.themeId,
    sessionLabel: baseConfig.sessionLabel,
    validThru: baseConfig.validThru,
    authorityTitle: baseConfig.authorityTitle,
    addressOverride: baseConfig.addressOverride,
  };

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${ID_CARD_WIDTH_PX}px`;
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const renderCardToPng = async (element: React.ReactElement): Promise<string> => {
    const ref = React.createRef<HTMLDivElement>();
    root.render(React.cloneElement(element, { ref } as Record<string, unknown>));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    const el = ref.current || (host.firstElementChild as HTMLElement | null);
    if (!el) throw new Error('Failed to render ID card element');
    return toPng(el, {
      pixelRatio: 2.5,
      backgroundColor: 'transparent',
      cacheBust: true,
      width: ID_CARD_WIDTH_PX,
      height: ID_CARD_HEIGHT_PX,
    });
  };

  try {
    let pageCount = 0;

    for (let start = 0; start < students.length; start += CARDS_PER_SHEET) {
      const batch = students.slice(start, start + CARDS_PER_SHEET);
      const rendered: Array<{ front: string; back: string }> = [];

      for (let idx = 0; idx < batch.length; idx++) {
        const student = batch[idx];
        onProgress?.(start + idx + 1, students.length);
        const front = await renderCardToPng(
          React.createElement(StudentIdCardFront, {
            student,
            settings,
            config: batchConfig,
          })
        );
        const back = await renderCardToPng(
          React.createElement(StudentIdCardBack, {
            student,
            settings,
            config: batchConfig,
          })
        );
        rendered.push({ front, back });
      }

      // ODD PAGE: FRONT SIDES (left-to-right columns 0, 1, 2)
      if (pageCount > 0) pdf.addPage();
      pageCount++;

      rendered.forEach((item, idx) => {
        const col = idx % GRID_COLS;
        const row = Math.floor(idx / GRID_COLS);
        const { x, y } = getGridSlotRect(col, row);
        pdf.addImage(item.front, 'PNG', x, y, CR80_W_MM, CR80_H_MM, undefined, 'FAST');
        drawCropMarks(pdf, x, y, CR80_W_MM, CR80_H_MM);
      });

      // EVEN PAGE: BACK SIDES (mirrored columns 2, 1, 0 for Flip-on-Long-Edge Duplex!)
      pdf.addPage();
      pageCount++;

      rendered.forEach((item, idx) => {
        const col = idx % GRID_COLS;
        const mirroredCol = GRID_COLS - 1 - col;
        const row = Math.floor(idx / GRID_COLS);
        const { x, y } = getGridSlotRect(mirroredCol, row);
        pdf.addImage(item.back, 'PNG', x, y, CR80_W_MM, CR80_H_MM, undefined, 'FAST');
        drawCropMarks(pdf, x, y, CR80_W_MM, CR80_H_MM);
      });
    }

    const safeClass = sanitizeFilePart(classLabelEn);
    pdf.save(`Student_ID_Cards_${safeClass}_Duplex_9perA4.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
