import React from 'react';
import { labelClass, labelSection, toBnDigits } from '../i18n';
import type { ExamResult, SubjectMark } from '../types';

export interface MarksheetRenderOptions {
  schoolNameBn?: string;
  schoolAddress?: string;
  highestMarksBySubject?: Record<string, number>;
  workingDays?: number | null;
  presentDays?: number | null;
  absentDays?: number | null;
}

const GRADE_SCALE = [
  { grade: 'A+', range: '৮০-১০০', gpa: '৫.০০' },
  { grade: 'A', range: '৭০-৭৯', gpa: '৪.০০' },
  { grade: 'A-', range: '৬০-৬৯', gpa: '৩.৫০' },
  { grade: 'B', range: '৫০-৫৯', gpa: '৩.০০' },
  { grade: 'C', range: '৪০-৪৯', gpa: '২.০০' },
  { grade: 'D', range: '৩৩-৩৯', gpa: '১.০০' },
  { grade: 'F', range: '০০-৩২', gpa: '০.০০' },
];

function bnSerial(index: number): string {
  return toBnDigits(String(index + 1).padStart(2, '0'));
}

/**
 * Single-Exam A4 (794px x 1123px) Bengali Marksheet rendered in Kalpurush font.
 * Displays ONLY the selected exam's subjects, marks, highest marks, grade, and GPA,
 * preserving the classic blue-bordered Bangladesh school report card design.
 */
export const MarksheetTemplate = React.forwardRef<
  HTMLDivElement,
  { result: ExamResult; options?: MarksheetRenderOptions }
>(({ result, options }, ref) => {
  const schoolName = options?.schoolNameBn?.trim() || 'শাহ ইসলামিক স্কুল এন্ড কলেজ';
  const highestMap = options?.highestMarksBySubject ?? {};

  const subjects: SubjectMark[] = result.subjects || [];
  const totalFullMarks = subjects.reduce((sum, s) => sum + (s.fullMarks || 0), 0);

  const examName = result.examName?.trim() || 'পরীক্ষার ফলাফল';
  const examBannerTitle = result.academicYear
    ? `${examName} - ${toBnDigits(result.academicYear)}`
    : examName;

  const workingDaysText =
    typeof options?.workingDays === 'number' && options.workingDays > 0
      ? toBnDigits(options.workingDays)
      : '';
  const presentDaysText =
    typeof options?.presentDays === 'number' && options.presentDays >= 0
      ? toBnDigits(options.presentDays)
      : '';
  const absentDaysText =
    typeof options?.absentDays === 'number' && options.absentDays >= 0
      ? toBnDigits(options.absentDays)
      : '';

  // Adapt row height gracefully based on subject count so A4 stays balanced
  const rowHeight = subjects.length > 12 ? '27px' : subjects.length > 9 ? '31px' : '37px';
  const cellFontSize = subjects.length > 12 ? '13px' : '14.5px';

  const borderColor = '#2579B8';
  const headerBlue = '#006BB3';
  const darkBlue = '#005696';
  const lightCellTint = '#EBF4FB';
  const kalpurushFont = "'Kalpurush', 'Noto Sans Bengali', sans-serif";

  return (
    <div
      ref={ref}
      style={{
        width: '794px',
        minHeight: '1123px',
        height: '1123px',
        backgroundColor: '#FFFFFF',
        color: '#0D4A7B',
        fontFamily: kalpurushFont,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '44px 40px 38px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* ==================== TOP-LEFT BOTANICAL CORNER SVG ==================== */}
      <svg
        viewBox="0 0 260 220"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '250px',
          height: '210px',
          pointerEvents: 'none',
          opacity: 0.45,
        }}
      >
        <g fill="#A8CBE8" stroke="#6FA6D6" strokeWidth="1">
          <path d="M-10,10 C40,0 75,30 85,75 C40,70 10,45 -10,10 Z" opacity="0.65" />
          <path d="M18,-10 C60,15 70,65 50,110 C22,85 8,40 18,-10 Z" opacity="0.5" />
          <path d="M68,-12 C110,10 135,45 142,88 C100,72 78,42 68,-12 Z" opacity="0.45" />
          <path d="M-12,72 C32,68 62,92 72,132 C35,126 10,106 -12,72 Z" opacity="0.55" />
          <path d="M108,40 C145,50 172,78 182,118 C142,108 118,82 108,40 Z" opacity="0.32" />
          <path d="M148,-8 C182,18 200,48 205,82 C172,66 155,38 148,-8 Z" opacity="0.28" />
          <path d="M-8,132 C25,135 46,158 50,192 C20,180 2,162 -8,132 Z" opacity="0.4" />
        </g>
        <g fill="none" stroke="#5A96CC" strokeWidth="1.2" opacity="0.55">
          <path d="M0,15 Q65,55 155,115" />
          <path d="M25,0 Q80,55 125,130" />
          <path d="M0,85 Q45,115 70,175" />
        </g>
      </svg>

      {/* ==================== TOP-RIGHT BOTANICAL CORNER SVG ==================== */}
      <svg
        viewBox="0 0 260 220"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '250px',
          height: '210px',
          pointerEvents: 'none',
          opacity: 0.42,
          transform: 'scaleX(-1)',
        }}
      >
        <g fill="#A8CBE8" stroke="#6FA6D6" strokeWidth="1">
          <path d="M-10,10 C40,0 75,30 85,75 C40,70 10,45 -10,10 Z" opacity="0.65" />
          <path d="M18,-10 C60,15 70,65 50,110 C22,85 8,40 18,-10 Z" opacity="0.5" />
          <path d="M68,-12 C110,10 135,45 142,88 C100,72 78,42 68,-12 Z" opacity="0.45" />
          <path d="M-12,72 C32,68 62,92 72,132 C35,126 10,106 -12,72 Z" opacity="0.5" />
          <path d="M108,40 C145,50 172,78 182,118 C142,108 118,82 108,40 Z" opacity="0.28" />
        </g>
        <g fill="none" stroke="#5A96CC" strokeWidth="1.2" opacity="0.5">
          <path d="M0,15 Q65,55 155,115" />
          <path d="M25,0 Q80,55 125,130" />
        </g>
      </svg>

      {/* ==================== BOTTOM-LEFT SOFT FLORAL CORNER SVG ==================== */}
      <svg
        viewBox="0 0 240 180"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '230px',
          height: '175px',
          pointerEvents: 'none',
          opacity: 0.35,
          transform: 'scaleY(-1)',
        }}
      >
        <g fill="#B9D7EF" stroke="#7FB2DC" strokeWidth="1">
          <path d="M-10,10 C40,0 75,30 85,75 C40,70 10,45 -10,10 Z" opacity="0.65" />
          <path d="M25,-5 C68,20 82,62 68,108 C35,88 18,45 25,-5 Z" opacity="0.5" />
          <path d="M75,8 C115,28 138,58 148,96 C108,82 85,54 75,8 Z" opacity="0.38" />
          <path d="M-5,75 C38,72 68,94 78,132 C42,124 14,104 -5,75 Z" opacity="0.45" />
        </g>
      </svg>

      {/* ==================== BOTTOM-RIGHT SCHOOL SUPPLIES ILLUSTRATION SVG ==================== */}
      <svg
        viewBox="0 0 260 190"
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '14px',
          width: '225px',
          height: '165px',
          pointerEvents: 'none',
          opacity: 0.88,
        }}
      >
        <g fill="#E3F0FA" stroke="#1E73B5" strokeWidth="2.2" strokeLinejoin="round">
          <rect x="20" y="96" width="22" height="58" rx="3" transform="rotate(-12 31 125)" />
          <rect x="44" y="88" width="22" height="66" rx="3" transform="rotate(-4 55 121)" />
          <rect x="68" y="94" width="20" height="60" rx="3" />
          <rect x="155" y="42" width="52" height="62" rx="3" fill="#EEF6FC" />
          <line x1="168" y1="104" x2="158" y2="152" />
          <line x1="196" y1="104" x2="206" y2="152" />
          <line x1="181" y1="24" x2="181" y2="42" />
        </g>
        <g fill="#D5E9F8" stroke="#0E63A6" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M118,54 C118,38 144,38 144,54" fill="none" strokeWidth="3.5" />
          <rect x="92" y="54" width="78" height="98" rx="18" fill="#CBE4F7" />
          <path d="M98,84 Q131,96 164,84" fill="none" strokeWidth="2.4" />
          <rect x="104" y="102" width="54" height="38" rx="9" fill="#EBF5FC" />
          <line x1="112" y1="114" x2="150" y2="114" strokeWidth="2" />
          <circle cx="131" cy="114" r="3" fill="#0E63A6" />
          <rect x="115" y="68" width="32" height="10" rx="4" fill="#FFFFFF" />
        </g>
        <g fill="#E6F2FB" stroke="#0E63A6" strokeWidth="2.2" strokeLinejoin="round">
          <rect x="214" y="96" width="26" height="40" rx="3" fill="#CBE4F7" />
          <line x1="220" y1="74" x2="222" y2="96" strokeWidth="2.4" />
          <line x1="228" y1="68" x2="228" y2="96" strokeWidth="2.4" />
          <line x1="236" y1="76" x2="233" y2="96" strokeWidth="2.4" />
          <polygon points="168,144 218,132 246,154 194,168" fill="#CBE4F7" />
          <polygon points="184,116 226,108 218,132 174,142" fill="#FFFFFF" />
          <circle cx="172" cy="128" r="16" fill="#D9ECFA" />
          <path d="M160,120 Q172,128 184,120" fill="none" strokeWidth="1.5" />
          <path d="M160,136 Q172,128 184,136" fill="none" strokeWidth="1.5" />
        </g>
      </svg>

      {/* ==================== FAINT CENTER INSTITUTIONAL SEAL WATERMARK ==================== */}
      <svg
        viewBox="0 0 260 260"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -44%)',
          width: '295px',
          height: '295px',
          pointerEvents: 'none',
          opacity: 0.075,
        }}
      >
        <circle cx="130" cy="130" r="122" fill="none" stroke="#006BB3" strokeWidth="5" />
        <circle cx="130" cy="130" r="108" fill="none" stroke="#006BB3" strokeWidth="2" />
        <circle cx="130" cy="130" r="72" fill="none" stroke="#006BB3" strokeWidth="2" />
        <path
          d="M88,136 Q109,122 130,134 Q151,122 172,136 L172,164 Q151,150 130,162 Q109,150 88,164 Z"
          fill="none"
          stroke="#006BB3"
          strokeWidth="3.5"
        />
        <line x1="130" y1="134" x2="130" y2="162" stroke="#006BB3" strokeWidth="2.5" />
        <text
          x="130"
          y="96"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fontFamily={kalpurushFont}
          fill="#006BB3"
        >
          স্থাপিত · ২০১৯
        </text>
        <text
          x="130"
          y="206"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fontFamily={kalpurushFont}
          fill="#006BB3"
        >
          {schoolName}
        </text>
      </svg>

      {/* ==================== FOREGROUND CONTENT ==================== */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* 1. TOP INSTITUTION NAME & SINGLE EXAM RIBBON */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '36px',
              fontWeight: 700,
              color: darkBlue,
              letterSpacing: '0.2px',
              lineHeight: 1.25,
              fontFamily: kalpurushFont,
            }}
          >
            {schoolName}
          </h1>
          <div
            style={{
              display: 'inline-block',
              marginTop: '8px',
              backgroundColor: headerBlue,
              color: '#FFFFFF',
              padding: '6px 38px',
              fontSize: '20px',
              fontWeight: 700,
              borderRadius: '2px',
              letterSpacing: '0.2px',
              fontFamily: kalpurushFont,
            }}
          >
            {examBannerTitle}
          </div>
        </div>

        {/* 2. STUDENT DETAILS BANDS (LEFT) + GRADING SCALE TABLE (RIGHT) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            marginTop: '8px',
            marginBottom: '18px',
          }}
        >
          {/* Left Student Info Strips */}
          <div style={{ flex: 1, paddingTop: '14px' }}>
            {/* Row 1: পরীক্ষার্থীর নাম */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#EDF4FA',
                borderTop: '1px solid #D5E6F5',
                borderBottom: '1px solid #D5E6F5',
                minHeight: '38px',
                marginBottom: '7px',
              }}
            >
              <div
                style={{
                  width: '136px',
                  padding: '6px 12px',
                  textAlign: 'right',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: darkBlue,
                  borderRight: '2.5px solid #9FC4E2',
                  flexShrink: 0,
                }}
              >
                পরীক্ষার্থীর নাম
              </div>
              <div
                style={{
                  padding: '6px 14px',
                  fontSize: '16.5px',
                  fontWeight: 700,
                  color: '#0A2E4D',
                }}
              >
                {result.studentName}
              </div>
            </div>

            {/* Row 2: শ্রেণি ও রোল */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#EDF4FA',
                borderTop: '1px solid #D5E6F5',
                borderBottom: '1px solid #D5E6F5',
                minHeight: '38px',
                marginBottom: '7px',
              }}
            >
              <div
                style={{
                  width: '136px',
                  padding: '6px 12px',
                  textAlign: 'right',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: darkBlue,
                  borderRight: '2.5px solid #9FC4E2',
                  flexShrink: 0,
                }}
              >
                শ্রেণি
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '6px 14px',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: '#0A2E4D',
                }}
              >
                {labelClass(result.className)} ({labelSection(result.section)})
              </div>
              <div
                style={{
                  width: '66px',
                  padding: '6px 10px',
                  textAlign: 'right',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: darkBlue,
                  borderRight: '2.5px solid #9FC4E2',
                  flexShrink: 0,
                }}
              >
                রোল
              </div>
              <div
                style={{
                  width: '88px',
                  padding: '6px 12px',
                  fontSize: '16.5px',
                  fontWeight: 700,
                  color: '#0A2E4D',
                }}
              >
                {toBnDigits(result.studentRoll)}
              </div>
            </div>

            {/* Row 3: পরীক্ষার নাম ও শিক্ষাবর্ষ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#EDF4FA',
                borderTop: '1px solid #D5E6F5',
                borderBottom: '1px solid #D5E6F5',
                minHeight: '38px',
              }}
            >
              <div
                style={{
                  width: '136px',
                  padding: '6px 12px',
                  textAlign: 'right',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: darkBlue,
                  borderRight: '2.5px solid #9FC4E2',
                  flexShrink: 0,
                }}
              >
                পরীক্ষা
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '6px 14px',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: '#0A2E4D',
                }}
              >
                {examName}
              </div>
              <div
                style={{
                  width: '66px',
                  padding: '6px 10px',
                  textAlign: 'right',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: darkBlue,
                  borderRight: '2.5px solid #9FC4E2',
                  flexShrink: 0,
                }}
              >
                সাল
              </div>
              <div
                style={{
                  width: '88px',
                  padding: '6px 12px',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: '#0A2E4D',
                }}
              >
                {toBnDigits(result.academicYear)}
              </div>
            </div>
          </div>

          {/* Right Grading Scale Reference Box */}
          <table
            style={{
              width: '205px',
              borderCollapse: 'collapse',
              fontSize: '12.5px',
              textAlign: 'center',
              flexShrink: 0,
              backgroundColor: '#FFFFFF',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: headerBlue, color: '#FFFFFF' }}>
                <th
                  style={{
                    border: `1px solid ${borderColor}`,
                    padding: '4px 6px',
                    fontWeight: 700,
                  }}
                >
                  গ্রেডের নাম
                </th>
                <th
                  style={{
                    border: `1px solid ${borderColor}`,
                    padding: '4px 6px',
                    fontWeight: 700,
                  }}
                >
                  প্রাপ্য গ্রেড নম্বর
                </th>
              </tr>
            </thead>
            <tbody>
              {GRADE_SCALE.map((g) => (
                <tr key={g.grade}>
                  <td
                    style={{
                      border: '1px solid #99C2E3',
                      padding: '2px 6px',
                      fontWeight: 700,
                      color: darkBlue,
                    }}
                  >
                    {g.grade}
                  </td>
                  <td
                    style={{
                      border: '1px solid #99C2E3',
                      padding: '2px 6px',
                      fontWeight: 700,
                      color: darkBlue,
                    }}
                  >
                    {g.range}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. SINGLE FULL-WIDTH MARKS TABLE FOR THIS EXAM ONLY */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: cellFontSize,
            backgroundColor: 'rgba(255, 255, 255, 0.88)',
          }}
        >
          <thead>
            <tr>
              <th
                rowSpan={2}
                style={{
                  border: `1.3px solid ${borderColor}`,
                  width: '56px',
                  padding: '6px 4px',
                  color: darkBlue,
                  fontWeight: 700,
                  fontSize: '13.5px',
                  lineHeight: 1.25,
                }}
              >
                ক্রমিক
                <br />
                নং
              </th>
              <th
                rowSpan={2}
                style={{
                  border: `1.3px solid ${borderColor}`,
                  padding: '8px 12px',
                  color: darkBlue,
                  fontWeight: 700,
                  fontSize: '16.5px',
                  textAlign: 'center',
                }}
              >
                বিষয়
              </th>
              <th
                colSpan={5}
                style={{
                  border: `1.3px solid ${borderColor}`,
                  backgroundColor: headerBlue,
                  color: '#FFFFFF',
                  padding: '6px 8px',
                  fontWeight: 700,
                  fontSize: '16px',
                }}
              >
                {examName}
              </th>
            </tr>
            <tr>
              <th
                style={{
                  border: `1.3px solid ${borderColor}`,
                  width: '74px',
                  padding: '5px 4px',
                  color: darkBlue,
                  fontWeight: 700,
                  fontSize: '13.5px',
                  lineHeight: 1.25,
                }}
              >
                পূর্ণ
                <br />
                নম্বর
              </th>
              <th
                style={{
                  border: `1.3px solid ${borderColor}`,
                  backgroundColor: lightCellTint,
                  width: '82px',
                  padding: '5px 4px',
                  color: darkBlue,
                  fontWeight: 700,
                  fontSize: '13.5px',
                  lineHeight: 1.25,
                }}
              >
                প্রাপ্ত
                <br />
                নম্বর
              </th>
              <th
                style={{
                  border: `1.3px solid ${borderColor}`,
                  width: '78px',
                  padding: '5px 4px',
                  color: darkBlue,
                  fontWeight: 700,
                  fontSize: '13.5px',
                  lineHeight: 1.25,
                }}
              >
                সর্বোচ্চ
                <br />
                নম্বর
              </th>
              <th
                style={{
                  border: `1.3px solid ${borderColor}`,
                  width: '72px',
                  padding: '5px 4px',
                  color: darkBlue,
                  fontWeight: 700,
                  fontSize: '13.5px',
                  lineHeight: 1.25,
                }}
              >
                লেটার
                <br />
                গ্রেড
              </th>
              <th
                style={{
                  border: `1.3px solid ${borderColor}`,
                  width: '74px',
                  padding: '5px 4px',
                  color: darkBlue,
                  fontWeight: 700,
                  fontSize: '13.5px',
                  lineHeight: 1.25,
                }}
              >
                গ্রেড
                <br />
                পয়েন্ট
              </th>
            </tr>
          </thead>

          <tbody>
            {subjects.map((sub, idx) => {
              const highVal = highestMap[sub.subject.trim().toLowerCase()];
              return (
                <tr key={`${sub.subject}-${idx}`} style={{ height: rowHeight }}>
                  <td
                    style={{
                      border: `1px solid ${borderColor}`,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: darkBlue,
                      padding: '4px 4px',
                    }}
                  >
                    {bnSerial(idx)}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${borderColor}`,
                      padding: '4px 12px',
                      fontWeight: 600,
                      color: '#0D4A7B',
                    }}
                  >
                    {sub.subject}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${borderColor}`,
                      textAlign: 'center',
                      fontWeight: 600,
                      color: darkBlue,
                      padding: '4px 4px',
                    }}
                  >
                    {toBnDigits(sub.fullMarks)}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: lightCellTint,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#08355C',
                      padding: '4px 4px',
                      fontSize: '15.5px',
                    }}
                  >
                    {toBnDigits(sub.marks)}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${borderColor}`,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: darkBlue,
                      padding: '4px 4px',
                    }}
                  >
                    {typeof highVal === 'number' ? toBnDigits(highVal) : toBnDigits(sub.marks)}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${borderColor}`,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: sub.grade === 'F' ? '#C0392B' : darkBlue,
                      padding: '4px 4px',
                    }}
                  >
                    {sub.grade}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${borderColor}`,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: darkBlue,
                      padding: '4px 4px',
                    }}
                  >
                    {toBnDigits(sub.point.toFixed(2))}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr style={{ height: '38px', backgroundColor: '#F5FAFE' }}>
              <td
                style={{
                  border: `1.3px solid ${borderColor}`,
                  padding: '4px',
                }}
              />
              <td
                style={{
                  border: `1.3px solid ${borderColor}`,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: darkBlue,
                  padding: '5px 8px',
                }}
              >
                মোট নম্বর
              </td>
              <td
                style={{
                  border: `1.3px solid ${borderColor}`,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '15.5px',
                  color: darkBlue,
                  padding: '5px 4px',
                }}
              >
                {toBnDigits(totalFullMarks)}
              </td>
              <td
                style={{
                  border: `1.3px solid ${borderColor}`,
                  backgroundColor: lightCellTint,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '16.5px',
                  color: '#08355C',
                  padding: '5px 4px',
                }}
              >
                {toBnDigits(result.totalMarks)}
              </td>
              <td
                style={{
                  border: `1.3px solid ${borderColor}`,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: darkBlue,
                  padding: '5px 4px',
                }}
              >
                —
              </td>
              <td
                style={{
                  border: `1.3px solid ${borderColor}`,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '15.5px',
                  color: result.grade === 'F' ? '#C0392B' : darkBlue,
                  padding: '5px 4px',
                }}
              >
                {result.grade}
              </td>
              <td
                style={{
                  border: `1.3px solid ${borderColor}`,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '15.5px',
                  color: darkBlue,
                  padding: '5px 4px',
                }}
              >
                {toBnDigits(result.gpa.toFixed(2))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 4. FULL-WIDTH GRAND SUMMARY STRIP */}
        <div
          style={{
            marginTop: '10px',
            border: `1.4px solid ${borderColor}`,
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '15px',
            fontWeight: 700,
            color: darkBlue,
          }}
        >
          <span>
            সর্বমোট নম্বর :{' '}
            <strong style={{ color: '#08355C' }}>
              {toBnDigits(result.totalMarks)} / {toBnDigits(totalFullMarks)}
            </strong>
          </span>
          <span>
            {examName}-এর মেধাস্থান :{' '}
            <strong style={{ color: '#08355C' }}>{result.meritPosition || 'উত্তীর্ণ'}</strong>
          </span>
          <span>
            জিপিএ :{' '}
            <strong style={{ color: '#08355C' }}>{toBnDigits(result.gpa.toFixed(2))}</strong>
          </span>
          <span>
            গ্রেড : <strong style={{ color: '#08355C' }}>{result.grade}</strong>
          </span>
        </div>

        {/* 5. CENTERED ATTENDANCE SUMMARY STRIP */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <div
            style={{
              width: '76%',
              border: '1.2px solid #7FB3D5',
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14.5px',
              fontWeight: 700,
              color: darkBlue,
            }}
          >
            <span>
              মোট কার্য দিবস :{' '}
              <strong style={{ color: '#08355C' }}>{workingDaysText || '...........'}</strong>
            </span>
            <span>
              উপস্থিতি :{' '}
              <strong style={{ color: '#08355C' }}>{presentDaysText || '...........'}</strong>
            </span>
            <span>
              অনুপস্থিতি :{' '}
              <strong style={{ color: '#08355C' }}>{absentDaysText || '...........'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ==================== 6. SIGNATURES SECTION (BOTTOM) ==================== */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          paddingTop: '28px',
          paddingBottom: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingLeft: '14px',
            paddingRight: '14px',
          }}
        >
          <div style={{ width: '185px', textAlign: 'center' }}>
            <div style={{ borderTop: '1.5px solid #7FB3D5', paddingTop: '6px' }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: darkBlue }}>
                শ্রেণি শিক্ষকের মন্তব্য
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '14.5px', fontWeight: 600, color: darkBlue }}>
                স্বাক্ষর
              </p>
            </div>
          </div>

          <div style={{ width: '185px', textAlign: 'center' }}>
            <div style={{ borderTop: '1.5px solid #7FB3D5', paddingTop: '6px' }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: darkBlue }}>
                অভিভাবকের স্বাক্ষর
              </p>
            </div>
          </div>
        </div>

        {/* Centered Principal Signature */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
          <div style={{ width: '250px', textAlign: 'center' }}>
            <div style={{ borderTop: '1.5px solid #7FB3D5', paddingTop: '6px' }}>
              <p style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: darkBlue }}>
                প্রিন্সিপাল
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 700, color: darkBlue }}>
                {schoolName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MarksheetTemplate.displayName = 'MarksheetTemplate';
