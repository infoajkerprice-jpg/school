import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  MarksheetTemplate,
  type MarksheetRenderOptions,
} from '../components/MarksheetTemplate';
import type { ExamResult } from '../types';

let cachedKalpurushEmbedCss: string | null = null;

export async function getKalpurushFontEmbedCss(): Promise<string> {
  if (cachedKalpurushEmbedCss) return cachedKalpurushEmbedCss;
  try {
    const res = await fetch('/fonts/kalpurush.ttf');
    if (!res.ok) return '';
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    cachedKalpurushEmbedCss = `
      @font-face {
        font-family: 'Kalpurush';
        src: url(data:font/truetype;base64,${base64}) format('truetype');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'Kalpurush';
        src: url(data:font/truetype;base64,${base64}) format('truetype');
        font-weight: 600 800;
        font-style: normal;
      }
    `;
    return cachedKalpurushEmbedCss;
  } catch (err) {
    console.warn('Could not inline Kalpurush font for PDF:', err);
    return '';
  }
}

export async function ensureKalpurushLoaded(): Promise<void> {
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load("400 16px 'Kalpurush'"),
        document.fonts.load("700 16px 'Kalpurush'"),
      ]);
      await document.fonts.ready;
    } catch {
      await document.fonts.ready;
    }
  }
}

export function computeMarksheetContext(
  target: ExamResult,
  allResults: ExamResult[],
  schoolNameBn?: string
): MarksheetRenderOptions {
  const sameExamPeers = allResults.filter(
    (r) =>
      r.className === target.className &&
      r.examName === target.examName &&
      r.academicYear === target.academicYear
  );

  const highestMarksBySubject: Record<string, number> = {};
  for (const peer of sameExamPeers) {
    for (const sub of peer.subjects) {
      const key = sub.subject.trim().toLowerCase();
      if (highestMarksBySubject[key] === undefined || sub.marks > highestMarksBySubject[key]) {
        highestMarksBySubject[key] = sub.marks;
      }
    }
  }

  return {
    schoolNameBn: schoolNameBn || 'শাহ ইসলামিক স্কুল এন্ড কলেজ',
    highestMarksBySubject,
  };
}

function makeSafePdfFilename(result: ExamResult): string {
  const safeRoll = String(result.studentRoll || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = String(result.examName || 'Marksheet')
    .replace(/[^\u0980-\u09FFa-zA-Z0-9_-]+/g, '_')
    .slice(0, 40);
  return `Marksheet_${safeRoll}_${safeExam}.pdf`;
}

export async function exportMarksheetElementToPdf(
  element: HTMLElement,
  result: ExamResult
): Promise<void> {
  const [, fontEmbedCSS] = await Promise.all([
    ensureKalpurushLoaded(),
    getKalpurushFontEmbedCss(),
  ]);

  const dataUrl = await toPng(element, {
    pixelRatio: 2.5,
    backgroundColor: '#FFFFFF',
    cacheBust: true,
    width: 794,
    height: 1123,
    fontEmbedCSS: fontEmbedCSS || undefined,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  pdf.save(makeSafePdfFilename(result));
}

export async function downloadBengaliMarksheetPdf(
  result: ExamResult,
  options?: MarksheetRenderOptions
): Promise<void> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '794px';
  host.style.height = '1123px';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);
  const templateRef = React.createRef<HTMLDivElement>();

  try {
    await ensureKalpurushLoaded();

    root.render(
      React.createElement(MarksheetTemplate, {
        ref: templateRef,
        result,
        options,
      })
    );

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 60));

    const targetEl = templateRef.current || (host.firstElementChild as HTMLElement | null);
    if (!targetEl) {
      throw new Error('Marksheet element failed to render.');
    }

    await exportMarksheetElementToPdf(targetEl, result);
  } finally {
    root.unmount();
    host.remove();
  }
}
