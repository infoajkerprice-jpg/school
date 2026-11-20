import React, { forwardRef } from 'react';
import { labelClass, labelSection, SHIFT_BN, toBnDigits } from '../i18n';
import type { RoutineItem, SiteSettings, StudentRecord } from '../types';

export interface AdmitCardConfig {
  examName: string;
  academicYear: string;
  examStartDate?: string;
  examCenter?: string;
  roomNo?: string;
  includeSchedule?: boolean;
}

export interface AdmitCardTemplateProps {
  student: StudentRecord;
  settings: SiteSettings;
  config: AdmitCardConfig;
  examRoutines?: RoutineItem[];
}

/** Deterministic SVG verification QR matrix (self-contained to avoid circular module imports) */
const AdmitQrSvg: React.FC<{ value: string; size?: number }> = ({ value, size = 66 }) => {
  const grid = 21;
  const cells: boolean[][] = Array.from({ length: grid }, () => Array(grid).fill(false));

  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const border = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[oy + y][ox + x] = border || inner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(grid - 7, 0);
  drawFinder(0, grid - 7);

  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x >= grid - 8 && y < 8) || (x < 8 && y >= grid - 8);
      if (!inFinder) {
        hash ^= (x * 31 + y * 17 + value.length) & 0xff;
        hash = Math.imul(hash, 16777619);
        cells[y][x] = (hash & 1) === 1;
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      role="img"
      aria-label={`Admit Card QR ${value}`}
      style={{
        backgroundColor: '#FFFFFF',
        padding: '3px',
        borderRadius: '4px',
        border: '1px solid #CBE0D3',
      }}
    >
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#123B67" /> : null
        )
      )}
    </svg>
  );
};

function formatBnDate(iso?: string): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return toBnDigits(`${parts[2]}/${parts[1]}/${parts[0]}`);
  }
  return toBnDigits(iso);
}

export const AdmitCardTemplate = forwardRef<HTMLDivElement, AdmitCardTemplateProps>(
  ({ student, settings, config, examRoutines = [] }, ref) => {
    const classExamSchedule = config.includeSchedule
      ? examRoutines
          .filter((r) => r.type === 'exam' && r.className === student.className)
          .slice(0, 6)
      : [];

    const schoolNameBn = settings.schoolNameBn || 'শাহ ইসলামিক স্কুল এন্ড কলেজ';
    const schoolNameEn = settings.schoolNameEn || 'Shah Islamic School And College';
    const examTitle = `${config.examName || 'অর্ধবার্ষিক পরীক্ষা'} - ${toBnDigits(
      config.academicYear || String(new Date().getFullYear())
    )}`;
    const qrPayload = `ADMIT|${student.studentIdCode}|${student.className}|${student.rollNumber}|${config.examName}|${config.academicYear}`;

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '518px',
          backgroundColor: '#FFFFFF',
          color: '#1E2F2A',
          fontFamily: "'Kalpurush', 'Hind Siliguri', sans-serif",
          padding: '16px 20px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Outer Institutional Double Border */}
        <div
          style={{
            border: '2.5px solid #123B67',
            borderRadius: '10px',
            padding: '4px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div
            style={{
              border: '1.5px solid #087F5B',
              borderRadius: '7px',
              padding: '14px 18px 12px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle Watermark */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                opacity: 0.045,
                fontSize: '46px',
                fontWeight: 700,
                color: '#087F5B',
                transform: 'rotate(-16deg)',
                whiteSpace: 'nowrap',
              }}
            >
              {schoolNameBn}
            </div>

            {/* Header Section */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderBottom: '2px solid #087F5B',
                paddingBottom: '10px',
              }}
            >
              {/* School Emblem / Logo */}
              <div
                style={{
                  width: '66px',
                  height: '66px',
                  borderRadius: '10px',
                  border: '1.5px solid #CFE0D6',
                  backgroundColor: '#F2F8F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={schoolNameBn}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                  />
                ) : (
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#087F5B' }}>SISC</span>
                )}
              </div>

              {/* Center Institution Title */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '26px',
                    lineHeight: 1.15,
                    fontWeight: 700,
                    color: '#123B67',
                  }}
                >
                  {schoolNameBn}
                </h1>
                <p
                  style={{
                    margin: '1px 0 0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#087F5B',
                    letterSpacing: '0.3px',
                  }}
                >
                  {schoolNameEn}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#4B6359' }}>
                  {settings.address || 'ক্যাম্পাস ঠিকানা'}
                  {settings.eiin ? ` · EIIN: ${toBnDigits(settings.eiin)}` : ''}
                  {settings.phone ? ` · মোবাইল: ${settings.phone}` : ''}
                </p>

                {/* Ribbon Badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    backgroundColor: '#123B67',
                    color: '#FFFFFF',
                    padding: '3px 18px',
                    borderRadius: '5px',
                    borderBottom: '2.5px solid #F4A62A',
                    fontSize: '15px',
                    fontWeight: 700,
                  }}
                >
                  <span>প্রবেশপত্র (ADMIT CARD)</span>
                  <span style={{ color: '#F4A62A' }}>•</span>
                  <span style={{ color: '#FDE6B1' }}>{examTitle}</span>
                </div>
              </div>

              {/* Student Photo Box */}
              <div
                style={{
                  width: '74px',
                  height: '86px',
                  borderRadius: '7px',
                  border: '1.5px solid #123B67',
                  backgroundColor: '#F8FBF9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  textAlign: 'center',
                }}
              >
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ padding: '4px', fontSize: '10.5px', color: '#647C72', lineHeight: 1.3 }}>
                    শিক্ষার্থীর
                    <br />
                    পাসপোর্ট
                    <br />
                    ছবি
                  </div>
                )}
              </div>
            </div>

            {/* Student Details Table + QR */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                gap: '14px',
                marginTop: '12px',
                alignItems: 'stretch',
              }}
            >
              <table
                style={{
                  flex: 1,
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                  lineHeight: 1.45,
                }}
              >
                <tbody>
                  <tr>
                    <td style={labelCellStyle}>শিক্ষার্থীর নাম</td>
                    <td style={{ ...valueCellStyle, fontWeight: 700, fontSize: '15.5px', color: '#123B67' }} colSpan={3}>
                      {student.name}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCellStyle}>শ্রেণি</td>
                    <td style={{ ...valueCellStyle, fontWeight: 700 }}>
                      {labelClass(student.className)}
                    </td>
                    <td style={labelCellStyle}>রোল নম্বর</td>
                    <td style={{ ...valueCellStyle, fontWeight: 700, fontSize: '15.5px', color: '#087F5B' }}>
                      {toBnDigits(student.rollNumber)}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCellStyle}>শাখা ও শিফট</td>
                    <td style={valueCellStyle}>
                      {labelSection(student.section)} · {SHIFT_BN[student.shift] || student.shift}
                    </td>
                    <td style={labelCellStyle}>আইডি কোড</td>
                    <td style={{ ...valueCellStyle, fontWeight: 700 }}>{student.studentIdCode}</td>
                  </tr>
                  <tr>
                    <td style={labelCellStyle}>পিতার নাম</td>
                    <td style={valueCellStyle}>{student.fatherName || student.guardianName || '—'}</td>
                    <td style={labelCellStyle}>মাতার নাম</td>
                    <td style={valueCellStyle}>{student.motherName || '—'}</td>
                  </tr>
                  <tr>
                    <td style={labelCellStyle}>পরীক্ষা কেন্দ্র</td>
                    <td style={valueCellStyle}>{config.examCenter || schoolNameBn}</td>
                    <td style={labelCellStyle}>
                      {config.roomNo ? 'কক্ষ নম্বর' : 'পরীক্ষা শুরু'}
                    </td>
                    <td style={valueCellStyle}>
                      {config.roomNo
                        ? toBnDigits(config.roomNo)
                        : formatBnDate(config.examStartDate)}
                    </td>
                  </tr>
                  {config.roomNo && config.examStartDate && (
                    <tr>
                      <td style={labelCellStyle}>পরীক্ষা শুরুর তারিখ</td>
                      <td style={valueCellStyle} colSpan={3}>
                        {formatBnDate(config.examStartDate)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Verification QR Box */}
              <div
                style={{
                  width: '92px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F2F8F5',
                  border: '1px solid #D5E8DC',
                  borderRadius: '8px',
                  padding: '8px 6px',
                  textAlign: 'center',
                }}
              >
                <AdmitQrSvg value={qrPayload} size={68} />
                <span
                  style={{
                    marginTop: '5px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#087F5B',
                    lineHeight: 1.25,
                  }}
                >
                  QR যাচাইকৃত
                </span>
                <span style={{ fontSize: '9.5px', color: '#526B78' }}>
                  শিক্ষাবর্ষ {toBnDigits(config.academicYear || '2026')}
                </span>
              </div>
            </div>

            {/* Optional Exam Routine Table */}
            {classExamSchedule.length > 0 && (
              <div style={{ position: 'relative', zIndex: 1, marginTop: '10px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#123B67',
                    marginBottom: '4px',
                  }}
                >
                  পরীক্ষার সময়সূচি ({labelClass(student.className)}):
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#123B67', color: '#FFFFFF' }}>
                      <th style={routineThStyle}>তারিখ / বার</th>
                      <th style={routineThStyle}>সময়</th>
                      <th style={routineThStyle}>বিষয়</th>
                      <th style={routineThStyle}>কক্ষ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classExamSchedule.map((item, i) => (
                      <tr
                        key={item.id || i}
                        style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F6FBF8' }}
                      >
                        <td style={routineTdStyle}>{toBnDigits(item.dayOrDate)}</td>
                        <td style={routineTdStyle}>{toBnDigits(item.timeSlot)}</td>
                        <td style={{ ...routineTdStyle, fontWeight: 700 }}>{item.subject}</td>
                        <td style={routineTdStyle}>{item.room ? toBnDigits(item.room) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Instructions + Signatures */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px dashed #B9D4C5',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              {/* Instructions */}
              <div style={{ flex: 1, fontSize: '11.5px', lineHeight: 1.5, color: '#395248' }}>
                <strong style={{ color: '#123B67' }}>পরীক্ষার্থীর জন্য নির্দেশাবলি:</strong>
                <div style={{ marginTop: '2px' }}>
                  ১. পরীক্ষা শুরুর অন্তত ১৫ মিনিট পূর্বে প্রবেশপত্রসহ নির্ধারিত কক্ষে উপস্থিত হতে হবে।
                </div>
                <div>
                  ২. প্রবেশপত্র ব্যতীত কোনো শিক্ষার্থীকে পরীক্ষার হলে প্রবেশ করতে দেওয়া হবে না।
                </div>
                <div>
                  ৩. মোবাইল ফোন, স্মার্ট ওয়াচ বা অননুমোদিত কাগজপত্র বহন সম্পূর্ণ নিষিদ্ধ।
                </div>
              </div>

              {/* Signature Lines */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  flexShrink: 0,
                  paddingTop: '22px',
                }}
              >
                <div style={{ textAlign: 'center', width: '125px' }}>
                  <div
                    style={{
                      borderTop: '1.2px solid #123B67',
                      paddingTop: '3px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: '#123B67',
                    }}
                  >
                    শ্রেণি শিক্ষক
                  </div>
                </div>
                <div style={{ textAlign: 'center', width: '140px' }}>
                  <div
                    style={{
                      borderTop: '1.2px solid #087F5B',
                      paddingTop: '3px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: '#087F5B',
                    }}
                  >
                    প্রিন্সিপাল / অধ্যক্ষ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AdmitCardTemplate.displayName = 'AdmitCardTemplate';

const labelCellStyle: React.CSSProperties = {
  border: '1px solid #CFE0D6',
  backgroundColor: '#F2F8F5',
  padding: '5px 9px',
  fontWeight: 700,
  color: '#123B67',
  width: '108px',
  whiteSpace: 'nowrap',
};

const valueCellStyle: React.CSSProperties = {
  border: '1px solid #CFE0D6',
  backgroundColor: '#FFFFFF',
  padding: '5px 9px',
  color: '#263B35',
};

const routineThStyle: React.CSSProperties = {
  border: '1px solid #123B67',
  padding: '4px 8px',
  textAlign: 'left',
  fontWeight: 700,
};

const routineTdStyle: React.CSSProperties = {
  border: '1px solid #CFE0D6',
  padding: '3.5px 8px',
  color: '#263B35',
};
