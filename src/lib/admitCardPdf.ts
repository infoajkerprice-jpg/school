import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  AdmitCardBack,
  AdmitCardFront,
  type AdmitCardConfig,
} from '../components/AdmitCardTemplate';
import { ensureKalpurushLoaded, getKalpurushFontEmbedCss } from './marksheetPdf';
import type { RoutineItem, SiteSettings, StudentRecord } from '../types';

function sanitizeFilenamePart(str: string): string {
  return String(str || 'file')
    .replace(/[^\u0980-\u09FFa-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

// Symmetric A4 Portrait (210mm x 297mm) duplex geometry:
// 2 landscape cards per A4 sheet — Top slot & Bottom slot centered horizontally (8mm L/R margins)
// so Flip-on-Long-Edge double-sided printing aligns Front & Back millimeter-perfect!
const A4_WIDTH_MM = 210;
const CARD_DRAW_W_MM = 194;
const CARD_DRAW_H_MM = 128.5;
const CARD_X_MM = (A4_WIDTH_MM - CARD_DRAW_W_MM) / 2; // 8mm left & right
const TOP_SLOT_Y_MM = 9.5;
const BOTTOM_SLOT_Y_MM = 158.5;
const CUT_LINE_Y_MM = 148.5;

function drawCutLine(pdf: jsPDF) {
  pdf.setDrawColor(148, 175, 184);
  pdf.setLineWidth(0.25);
  pdf.setLineDashPattern([2.5, 2.5], 0);
  pdf.line(8, CUT_LINE_Y_MM, 202, CUT_LINE_Y_MM);
  pdf.setLineDashPattern([], 0);
}

/**
 * Exports a single student's Admit Card (Front + optional aligned Back page with Exam Schedule)
 * to an A4 Portrait PDF ready for duplex printing.
 * Optionally duplicates the card in both top & bottom slots (2 copies on 1 A4 sheet) if `twoCopiesOnSheet` is true.
 */
export async function exportAdmitCardElementToPdf(
  frontElement: HTMLElement,
  student: StudentRecord,
  config: AdmitCardConfig,
  backElement?: HTMLElement | null,
  twoCopiesOnSheet = false
): Promise<void> {
  const [, fontEmbedCSS] = await Promise.all([
    ensureKalpurushLoaded(),
    getKalpurushFontEmbedCss(),
  ]);

  const frontDataUrl = await toPng(frontElement, {
    pixelRatio: 2.5,
    backgroundColor: '#FFFFFF',
    cacheBust: true,
    width: frontElement.offsetWidth || 794,
    height: frontElement.offsetHeight || 526,
    fontEmbedCSS: fontEmbedCSS || undefined,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Page 1: Front Side
  pdf.addImage(
    frontDataUrl,
    'PNG',
    CARD_X_MM,
    TOP_SLOT_Y_MM,
    CARD_DRAW_W_MM,
    CARD_DRAW_H_MM,
    undefined,
    'FAST'
  );
  drawCutLine(pdf);
  if (twoCopiesOnSheet) {
    pdf.addImage(
      frontDataUrl,
      'PNG',
      CARD_X_MM,
      BOTTOM_SLOT_Y_MM,
      CARD_DRAW_W_MM,
      CARD_DRAW_H_MM,
      undefined,
      'FAST'
    );
  }

  // Page 2: Back Side (Exam Schedule + Rules) — exact aligned position for Flip-on-Long-Edge Duplex
  if (config.includeBackPage !== false && backElement) {
    const backDataUrl = await toPng(backElement, {
      pixelRatio: 2.5,
      backgroundColor: '#EBF5F8',
      cacheBust: true,
      width: backElement.offsetWidth || 794,
      height: backElement.offsetHeight || 526,
      fontEmbedCSS: fontEmbedCSS || undefined,
    });

    pdf.addPage();
    pdf.addImage(
      backDataUrl,
      'PNG',
      CARD_X_MM,
      TOP_SLOT_Y_MM,
      CARD_DRAW_W_MM,
      CARD_DRAW_H_MM,
      undefined,
      'FAST'
    );
    drawCutLine(pdf);
    if (twoCopiesOnSheet) {
      pdf.addImage(
        backDataUrl,
        'PNG',
        CARD_X_MM,
        BOTTOM_SLOT_Y_MM,
        CARD_DRAW_W_MM,
        CARD_DRAW_H_MM,
        undefined,
        'FAST'
      );
    }
  }

  const safeRoll = sanitizeFilenamePart(student.rollNumber || student.studentIdCode);
  const safeExam = sanitizeFilenamePart(config.examName || 'Exam');
  pdf.save(`AdmitCard_${safeRoll}_${safeExam}.pdf`);
}

/**
 * Generates a Duplex A4 Portrait PDF for an entire class:
 * - Every A4 sheet holds 2 students (Top + Bottom with center dashed cut line).
 * - Odd pages (1, 3, 5...): Front sides of Student pair (i, i+1).
 * - Even pages (2, 4, 6...): Aligned Back sides (Exam Schedule & Rules) for the same pair (i, i+1).
 * Printing double-sided (Flip on Long Edge) and cutting the center line yields 2 complete
 * front-and-back Admit Cards per A4 sheet!
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

  const renderNodeToPng = async (
    element: React.ReactElement,
    bgColor: string
  ): Promise<string> => {
    const ref = React.createRef<HTMLDivElement>();
    root.render(React.cloneElement(element, { ref } as Record<string, unknown>));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 35));
    const el = ref.current || (host.firstElementChild as HTMLElement | null);
    if (!el) throw new Error('Failed to render admit card node');
    return toPng(el, {
      pixelRatio: 2.2,
      backgroundColor: bgColor,
      cacheBust: true,
      width: el.offsetWidth || 794,
      height: el.offsetHeight || 526,
      fontEmbedCSS: fontEmbedCSS || undefined,
    });
  };

  try {
    // Cache back-side PNG per className so all students in the same class reuse one crisp render!
    const backCache = new Map<string, string>();
    const includeBack = config.includeBackPage !== false;

    const getBackPng = async (student: StudentRecord): Promise<string> => {
      const existing = backCache.get(student.className);
      if (existing) return existing;
      const png = await renderNodeToPng(
        React.createElement(AdmitCardBack, {
          student,
          settings,
          config,
          examRoutines,
        }),
        '#EBF5F8'
      );
      backCache.set(student.className, png);
      return png;
    };

    let pageCount = 0;

    for (let i = 0; i < students.length; i += 2) {
      const topStudent = students[i];
      const bottomStudent = students[i + 1] || null;

      onProgress?.(Math.min(i + 1, students.length), students.length);
      const topFrontPng = await renderNodeToPng(
        React.createElement(AdmitCardFront, {
          student: topStudent,
          settings,
          config,
          examRoutines,
        }),
        '#FFFFFF'
      );

      let bottomFrontPng: string | null = null;
      if (bottomStudent) {
        onProgress?.(Math.min(i + 2, students.length), students.length);
        bottomFrontPng = await renderNodeToPng(
          React.createElement(AdmitCardFront, {
            student: bottomStudent,
            settings,
            config,
            examRoutines,
          }),
          '#FFFFFF'
        );
      }

      // --- ODD PAGE: FRONT SIDES (2 per A4 sheet) ---
      if (pageCount > 0) pdf.addPage();
      pageCount++;

      pdf.addImage(
        topFrontPng,
        'PNG',
        CARD_X_MM,
        TOP_SLOT_Y_MM,
        CARD_DRAW_W_MM,
        CARD_DRAW_H_MM,
        undefined,
        'FAST'
      );
      drawCutLine(pdf);
      if (bottomFrontPng) {
        pdf.addImage(
          bottomFrontPng,
          'PNG',
          CARD_X_MM,
          BOTTOM_SLOT_Y_MM,
          CARD_DRAW_W_MM,
          CARD_DRAW_H_MM,
          undefined,
          'FAST'
        );
      }

      // --- EVEN PAGE: BACK SIDES (Aligned Exam Schedule + Rules) ---
      if (includeBack) {
        const topBackPng = await getBackPng(topStudent);
        const bottomBackPng = bottomStudent ? await getBackPng(bottomStudent) : null;

        pdf.addPage();
        pageCount++;

        pdf.addImage(
          topBackPng,
          'PNG',
          CARD_X_MM,
          TOP_SLOT_Y_MM,
          CARD_DRAW_W_MM,
          CARD_DRAW_H_MM,
          undefined,
          'FAST'
        );
        drawCutLine(pdf);
        if (bottomBackPng) {
          pdf.addImage(
            bottomBackPng,
            'PNG',
            CARD_X_MM,
            BOTTOM_SLOT_Y_MM,
            CARD_DRAW_W_MM,
            CARD_DRAW_H_MM,
            undefined,
            'FAST'
          );
        }
      }
    }

    const safeClass = sanitizeFilenamePart(classLabelBn);
    const safeExam = sanitizeFilenamePart(config.examName || 'Exam');
    const suffix = includeBack ? '_Duplex_2perA4' : '_FrontOnly';
    pdf.save(`AdmitCards_${safeClass}_${safeExam}${suffix}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
