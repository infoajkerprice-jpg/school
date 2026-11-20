import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { AdmitCardTemplate, type AdmitCardConfig } from '../components/AdmitCardTemplate';
import { ensureKalpurushLoaded, getKalpurushFontEmbedCss } from './marksheetPdf';
import type { RoutineItem, SiteSettings, StudentRecord } from '../types';

function sanitizeFilenamePart(str: string): string {
  return String(str || 'file')
    .replace(/[^\u0980-\u09FFa-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/**
 * Exports a single mounted AdmitCardTemplate DOM node to an A4 Portrait PDF
 * with embedded Kalpurush Bengali font.
 */
export async function exportAdmitCardElementToPdf(
  element: HTMLElement,
  student: StudentRecord,
  config: AdmitCardConfig
): Promise<void> {
  const [, fontEmbedCSS] = await Promise.all([
    ensureKalpurushLoaded(),
    getKalpurushFontEmbedCss(),
  ]);

  const width = element.offsetWidth || 794;
  const height = element.offsetHeight || 518;

  const dataUrl = await toPng(element, {
    pixelRatio: 2.5,
    backgroundColor: '#FFFFFF',
    cacheBust: true,
    width,
    height,
    fontEmbedCSS: fontEmbedCSS || undefined,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Fit horizontally within A4 width (210mm) with 8mm side margins
  const marginX = 8;
  const maxWidthMm = 210 - marginX * 2; // 194mm
  const renderedHeightMm = (height / width) * maxWidthMm;
  const maxHeightMm = 281;
  const finalHeightMm = Math.min(renderedHeightMm, maxHeightMm);
  const finalWidthMm =
    renderedHeightMm > maxHeightMm ? (width / height) * maxHeightMm : maxWidthMm;
  const offsetX = (210 - finalWidthMm) / 2;

  pdf.addImage(dataUrl, 'PNG', offsetX, 10, finalWidthMm, finalHeightMm, undefined, 'FAST');

  const safeRoll = sanitizeFilenamePart(student.rollNumber || student.studentIdCode);
  const safeExam = sanitizeFilenamePart(config.examName || 'Exam');
  pdf.save(`AdmitCard_${safeRoll}_${safeExam}.pdf`);
}

/**
 * Generates a single bulk A4 Portrait PDF containing all students of a selected class,
 * packed 2 admit cards per page with a dashed cut line between them.
 */
export async function downloadClassAdmitCardsPdf(
  students: StudentRecord[],
  settings: SiteSettings,
  config: AdmitCardConfig,
  examRoutines: RoutineItem[],
  classLabelBn: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (students.length === 0) return;

  const [, fontEmbedCSS] = await Promise.all([
    ensureKalpurushLoaded(),
    getKalpurushFontEmbedCss(),
  ]);

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '794px';
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

  // Slot geometry: 2 cards per A4 Portrait (210 x 297 mm)
  const slotMaxWidthMm = 194;
  const slotMaxHeightMm = 136;
  const topSlotY = 7;
  const bottomSlotY = 154;
  const cutLineY = 148.5;

  try {
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      onProgress?.(i + 1, students.length);

      const templateRef = React.createRef<HTMLDivElement>();
      root.render(
        React.createElement(AdmitCardTemplate, {
          ref: templateRef,
          student,
          settings,
          config,
          examRoutines,
        })
      );

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 35));

      const targetEl = templateRef.current || (host.firstElementChild as HTMLElement | null);
      if (!targetEl) continue;

      const width = targetEl.offsetWidth || 794;
      const height = targetEl.offsetHeight || 518;

      const dataUrl = await toPng(targetEl, {
        pixelRatio: 2.2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        width,
        height,
        fontEmbedCSS: fontEmbedCSS || undefined,
      });

      const isTopSlot = i % 2 === 0;
      if (i > 0 && isTopSlot) {
        pdf.addPage();
      }

      // Compute proportional fit inside the half-page slot
      const scaleW = slotMaxWidthMm / width;
      const scaleH = slotMaxHeightMm / height;
      const scale = Math.min(scaleW, scaleH);
      const drawW = width * scale;
      const drawH = height * scale;
      const drawX = (210 - drawW) / 2;
      const drawY = isTopSlot ? topSlotY : bottomSlotY;

      pdf.addImage(dataUrl, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');

      // Draw dashed cut line after the top card if there is a bottom card on this page
      if (isTopSlot && i + 1 < students.length) {
        pdf.setDrawColor(160, 180, 170);
        pdf.setLineWidth(0.25);
        pdf.setLineDashPattern([2.5, 2.5], 0);
        pdf.line(10, cutLineY, 200, cutLineY);
        pdf.setLineDashPattern([], 0);
      }
    }

    const safeClass = sanitizeFilenamePart(classLabelBn);
    const safeExam = sanitizeFilenamePart(config.examName || 'Exam');
    pdf.save(`AdmitCards_${safeClass}_${safeExam}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
