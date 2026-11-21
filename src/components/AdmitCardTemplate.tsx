import React, { forwardRef } from 'react';
import { GROUP_BN, labelClass, labelSection, toBnDigits } from '../i18n';
import { buildStudentVerificationUrl } from '../lib/studentVerification';
import { ScannableQrCode } from './ScannableQrCode';
import type { RoutineItem, SiteSettings, StudentRecord } from '../types';

export interface AdmitScheduleRow {
  id: string;
  date: string;
  day: string;
  time: string;
  subject: string;
}

export interface AdmitCardConfig {
  examName: string;
  academicYear: string;
  examStartDate?: string;
  examCenter?: string;
  roomNo?: string;
  includeSchedule?: boolean;
  includeBackPage?: boolean;
  customSchedule?: AdmitScheduleRow[];
}

export interface AdmitCardTemplateProps {
  student: StudentRecord;
  settings: SiteSettings;
  config: AdmitCardConfig;
  examRoutines?: RoutineItem[];
}

function formatBnDate(iso?: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return toBnDigits(`${parts[2]}/${parts[1]}/${parts[0]}`);
  }
  return toBnDigits(iso);
}

type ExamSlotKey = 'first' | 'half' | 'annual' | 'test';

function detectActiveExamSlot(examName: string): ExamSlotKey | null {
  const n = (examName || '').trim().toLowerCase();
  if (!n) return null;
  if (n.includes('১ম') || n.includes('প্রথম') || n.includes('1st') || n.includes('first')) {
    return 'first';
  }
  if (
    n.includes('২য়') ||
    n.includes('২য়') ||
    n.includes('দ্বিতীয়') ||
    n.includes('অর্ধবার্ষিক') ||
    n.includes('half') ||
    n.includes('2nd')
  ) {
    return 'half';
  }
  if (n.includes('বার্ষিক') || n.includes('annual') || n.includes('final')) {
    return 'annual';
  }
  if (n.includes('টেস্ট') || n.includes('মডেল') || n.includes('test') || n.includes('model')) {
    return 'test';
  }
  return null;
}

/** Razor-sharp inline SVG checkmark (never shifts baseline in Kalpurush PDF rendering) */
const CheckSvg: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
    <path
      d="M3 8.5L6.5 12L13.5 4.2"
      stroke="#C81D25"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Razor-sharp inline SVG orange-crimson chevron bullet (matches reference theme cleanly) */
const RuleChevronSvg: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    style={{ display: 'block', marginTop: '3.5px', flexShrink: 0 }}
  >
    <path d="M1.5 1.5L10.5 6L1.5 10.5L3.8 6L1.5 1.5Z" fill="#E35017" />
  </svg>
);



/** Official transparent PNG logo watermark centered softly behind card content */
const LogoWatermark: React.FC<{ logoSrc: string; opacity?: number; size?: number }> = ({
  logoSrc,
  opacity = 0.075,
  size = 218,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  >
    <img
      src={logoSrc}
      alt=""
      referrerPolicy="no-referrer"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        opacity,
      }}
    />
  </div>
);

/** Fine metallic-gold ornamental corner bracket SVG */
const CornerFiligree: React.FC<{ position: 'bl' | 'br' }> = ({ position }) => {
  const isRight = position === 'br';
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      style={{
        position: 'absolute',
        bottom: '5px',
        left: isRight ? undefined : '6px',
        right: isRight ? '6px' : undefined,
        transform: isRight ? 'scaleX(-1)' : undefined,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.72,
      }}
    >
      <path d="M2,2 L2,27 L27,27" fill="none" stroke="#C98A1B" strokeWidth="1.5" />
      <path d="M6,9 L6,23 L20,23" fill="none" stroke="#086A82" strokeWidth="1" opacity="0.6" />
      <circle cx="6" cy="23" r="2" fill="#E3A42B" />
    </svg>
  );
};

/**
 * FRONT SIDE: মূল প্রবেশপত্র — Ultra-Premium Print-Safe Edition
 * Exact 794 x 526 px landscape card designed for 2-per-A4 duplex printing.
 * Every text pill uses explicit whiteSpace: 'nowrap' and generous lineHeight so
 * html-to-image + Kalpurush font embedding NEVER wraps or clips Bengali glyphs.
 */
export const AdmitCardFront = forwardRef<HTMLDivElement, AdmitCardTemplateProps>(
  ({ student, settings, config }, ref) => {
    const logoSrc = settings.logoUrl || '/school-logo.png';
    const schoolNameBn = settings.schoolNameBn || 'শাহ ইসলামিক স্কুল এন্ড কলেজ';
    const schoolNameEn = (settings.schoolNameEn || 'SHAH ISLAMIC SCHOOL & COLLEGE').toUpperCase();
    const activeSlot = detectActiveExamSlot(config.examName);
    const yearBn = toBnDigits(config.academicYear || String(new Date().getFullYear()));
    const dateDisplay = formatBnDate(config.examStartDate);
    const groupOrSection =
      student.group && student.group !== 'General'
        ? `${GROUP_BN[student.group] || student.group} (${labelSection(student.section)})`
        : labelSection(student.section);

    const qrVerifyUrl = buildStudentVerificationUrl(student.studentIdCode, {
      examName: config.examName,
      academicYear: config.academicYear,
      fallbackOrigin: settings.websiteUrl,
    });

    const examCheckboxes: Array<{
      key: ExamSlotKey;
      label: string;
      gradient: string;
      border: string;
      extra?: string;
    }> = [
      {
        key: 'first',
        label: '১ম সাময়িক',
        gradient: 'linear-gradient(180deg, #BA2364 0%, #8E144A 100%)',
        border: '#7A103E',
      },
      {
        key: 'half',
        label: 'অর্ধবার্ষিক',
        gradient: 'linear-gradient(180deg, #244FA8 0%, #153375 100%)',
        border: '#10285C',
      },
      {
        key: 'annual',
        label: 'বার্ষিক',
        gradient: 'linear-gradient(180deg, #EE5C30 0%, #C93A14 100%)',
        border: '#A82F0F',
      },
      {
        key: 'test',
        label: 'টেস্ট পরীক্ষা',
        gradient: 'linear-gradient(180deg, #6BB836 0%, #4C9120 100%)',
        border: '#3C7618',
        extra: `${yearBn} ইং`,
      },
    ];

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          height: '526px',
          backgroundColor: '#FFFFFF',
          color: '#0E2836',
          fontFamily: "'Kalpurush', 'Hind Siliguri', sans-serif",
          boxSizing: 'border-box',
          padding: '5px',
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid #054E63',
          borderRadius: '6px',
        }}
      >
        {/* Inner Metallic Gold Hairline Security Frame */}
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '1.25px solid #D99B24',
            borderRadius: '4px',
            background:
              'radial-gradient(ellipse at 50% 44%, #FFFFFF 0%, #F1F8FB 58%, #D8ECF2 100%)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* ==================== LUXURY TEAL-EMERALD HEADER BANNER ==================== */}
          <div
            style={{
              position: 'relative',
              background:
                'linear-gradient(110deg, #04475C 0%, #076982 52%, #0A684D 100%)',
              padding: '10px 18px 14px',
              color: '#FFFFFF',
              zIndex: 2,
              flexShrink: 0,
            }}
          >
            {/* Subtle Islamic Geometric Lattice Pattern */}
            <svg
              width="794"
              height="112"
              viewBox="0 0 794 112"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                opacity: 0.085,
              }}
            >
              <defs>
                <pattern id="admitGeo" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path
                    d="M16 0 L32 16 L16 32 L0 16 Z M16 6 L26 16 L16 26 L6 16 Z"
                    fill="none"
                    stroke="#FCE29C"
                    strokeWidth="0.9"
                  />
                </pattern>
              </defs>
              <rect width="794" height="112" fill="url(#admitGeo)" />
            </svg>

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              {/* Luminous Gold-Halo Circular Emblem with Official Transparent PNG Logo */}
              <div
                style={{
                  width: '78px',
                  height: '78px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  border: '2.5px solid #F4BE3C',
                  boxShadow:
                    '0 0 0 2px rgba(255,255,255,0.22), 0 4px 10px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  flexShrink: 0,
                }}
              >
                <img
                  src={logoSrc}
                  alt={schoolNameBn}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '999px',
                    display: 'block',
                  }}
                />
              </div>

              {/* Right Institution Lockup */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: '26px',
                        lineHeight: 1.2,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        textShadow: '0 1.5px 3px rgba(0,0,0,0.26)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {schoolNameBn}
                    </h1>
                    <div
                      style={{
                        marginTop: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#FDE8AD',
                          letterSpacing: '0.8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {schoolNameEn}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#04475C',
                          backgroundColor: '#F5C449',
                          padding: '1px 8px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.35,
                        }}
                      >
                        স্থাপিত {toBnDigits(settings.establishedYear || '২০১৯')}
                      </span>
                    </div>
                  </div>

                  {/* Gold Vertical Divider + Academic Year */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '3px',
                        height: '40px',
                        borderRadius: '4px',
                        background: 'linear-gradient(180deg, #FDE28A 0%, #DE8F16 100%)',
                      }}
                    />
                    <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
                      <div
                        style={{
                          fontSize: '15.5px',
                          fontWeight: 700,
                          color: '#FFE599',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        শিক্ষাবর্ষ {yearBn}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: '#D3EEF4',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {settings.eiin
                          ? `EIIN: ${toBnDigits(settings.eiin)}`
                          : 'আধুনিক ও ইসলামিক শিক্ষাঙ্গন'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Crisp White Address & Red Hotline Bar (generous vertical padding so tall Bengali matras NEVER clip) */}
                <div
                  style={{
                    marginTop: '6px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '5px',
                    borderLeft: '4px solid #F2AE28',
                    padding: '4.5px 11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontSize: '11.5px',
                    lineHeight: 1.4,
                    fontWeight: 700,
                    color: '#0E2836',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.14)',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {settings.address || 'তুলসীঘাট, গাইবান্ধা সদর, গাইবান্ধা-৫৭০০।'}
                  </span>
                  <span
                    style={{
                      color: '#C81D25',
                      whiteSpace: 'nowrap',
                      borderLeft: '2px solid #C81D25',
                      paddingLeft: '9px',
                      flexShrink: 0,
                    }}
                  >
                    মোবাইল : {toBnDigits(settings.phone || '+880 1711-759705')}
                  </span>
                </div>
              </div>
            </div>

            {/* Double-Layered Gold & Teal Scalloped Wave Divider */}
            <svg
              viewBox="0 0 794 18"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '-10px',
                width: '100%',
                height: '13px',
                display: 'block',
              }}
            >
              <path
                d="M0,4 Q100,15 200,7 T400,7 T600,7 T794,4 L794,0 L0,0 Z"
                fill="#065E76"
              />
              <path
                d="M0,5.5 Q100,16.5 200,8.5 T400,8.5 T600,8.5 T794,5.5"
                fill="none"
                stroke="#E8A928"
                strokeWidth="2.2"
              />
            </svg>
          </div>

          {/* ==================== MAIN BODY AREA ==================== */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              padding: '11px 24px 7px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <LogoWatermark logoSrc={logoSrc} opacity={0.075} size={215} />
            <CornerFiligree position="bl" />
            <CornerFiligree position="br" />

            {/* 1. Sculpted Metallic-Gold & Royal-Teal Title Medallion (Strictly single-line!) */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  background:
                    'linear-gradient(90deg, #C77E11 0%, #F8C43F 30%, #FDE084 50%, #F8C43F 70%, #C77E11 100%)',
                  borderRadius: '999px',
                  padding: '3.5px 14px',
                  boxShadow: '0 3px 8px rgba(6, 77, 99, 0.22)',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(180deg, #0D628F 0%, #063C5E 100%)',
                    color: '#FFFFFF',
                    padding: '3px 28px',
                    borderRadius: '999px',
                    border: '1px solid rgba(253, 224, 132, 0.55)',
                    fontSize: '19px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ color: '#F7C948', fontSize: '11px', lineHeight: 1 }}>✦</span>
                  <span style={{ whiteSpace: 'nowrap' }}>প্রবেশ পত্র</span>
                  <span style={{ color: '#F7C948', fontSize: '11px', lineHeight: 1 }}>✦</span>
                </div>
              </div>

              {/* 2. Print-Safe Single-Line 4-Exam Checkbox Strip (NEVER wraps!) */}
              <div
                style={{
                  marginTop: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'nowrap',
                  gap: '10px',
                }}
              >
                {examCheckboxes.map((item) => {
                  const checked = activeSlot === item.key;
                  return (
                    <div
                      key={item.key}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: `2px solid ${checked ? '#076148' : '#D97B72'}`,
                          backgroundColor: '#FFFFFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: checked
                            ? '0 0 0 2px rgba(244, 190, 60, 0.45)'
                            : '0 1px 2px rgba(0,0,0,0.08)',
                        }}
                      >
                        {checked ? <CheckSvg /> : null}
                      </span>
                      <span
                        style={{
                          background: item.gradient,
                          border: `1px solid ${item.border}`,
                          color: '#FFFFFF',
                          padding: '3px 12px',
                          borderRadius: '5px',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          boxShadow: checked
                            ? '0 0 0 2px #FFFFFF, 0 0 0 3.5px #E5A020, 0 2px 5px rgba(0,0,0,0.16)'
                            : '0 1.5px 3px rgba(0,0,0,0.14)',
                        }}
                      >
                        <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                        {item.extra && (
                          <span
                            style={{
                              borderLeft: '1px solid rgba(255,255,255,0.45)',
                              paddingLeft: '7px',
                              color: '#FFF7CE',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.extra}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!activeSlot && config.examName && (
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#06576E',
                    whiteSpace: 'nowrap',
                  }}
                >
                  পরীক্ষা: {config.examName} ({yearBn} ইং)
                </div>
              )}
            </div>

            {/* 3. Frosted Executive Student Details Card */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                marginTop: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                border: '1px solid rgba(6, 102, 128, 0.2)',
                borderRadius: '10px',
                padding: '9px 16px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Meta Row: ID / Room Chips + Dotted Date Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      backgroundColor: '#EBF5F8',
                      border: '1px solid #B5D5E0',
                      color: '#054E63',
                      padding: '2.5px 10px',
                      borderRadius: '5px',
                      fontSize: '12.5px',
                      lineHeight: 1.35,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    আইডি নং : {student.studentIdCode}
                  </span>
                  {config.roomNo ? (
                    <span
                      style={{
                        backgroundColor: '#FFF7E4',
                        border: '1px solid #E8B84B',
                        color: '#8A4E04',
                        padding: '2.5px 10px',
                        borderRadius: '5px',
                        fontSize: '12.5px',
                        lineHeight: 1.35,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      কক্ষ নং : {toBnDigits(config.roomNo)}
                    </span>
                  ) : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0E2836',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    তারিখ :
                  </span>
                  <div
                    style={{
                      minWidth: '156px',
                      padding: '2px 10px',
                      border: '1.25px dashed #4E7887',
                      borderRadius: '5px',
                      backgroundColor: '#FFFFFF',
                      textAlign: 'center',
                      fontSize: '13.5px',
                      lineHeight: 1.4,
                      fontWeight: 700,
                      color: '#064B63',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dateDisplay || '....../....../২০২৬'}
                  </div>
                </div>
              </div>

              {/* Row 1: Student Name (Full-Width Dotted Line, No Student Photo) */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '15.5px',
                    fontWeight: 700,
                    color: '#0E2836',
                    whiteSpace: 'nowrap',
                  }}
                >
                  পরীক্ষার্থীর নাম :
                </span>
                <div
                  style={{
                    flex: 1,
                    borderBottom: '1.5px dotted #2B5E70',
                    paddingBottom: '2px',
                    paddingLeft: '8px',
                    fontSize: '18.5px',
                    lineHeight: 1.35,
                    fontWeight: 700,
                    color: '#063C5E',
                  }}
                >
                  {student.name}
                </div>
              </div>

              {/* Row 2: Class + Division/Section + Highlighted Roll Pill */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.08fr 1.24fr 0.88fr',
                  gap: '14px',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    শ্রেণি :
                  </span>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: '1.5px dotted #2B5E70',
                      paddingBottom: '2px',
                      paddingLeft: '6px',
                      fontSize: '16px',
                      lineHeight: 1.35,
                      fontWeight: 700,
                      color: '#076148',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {labelClass(student.className)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    বিভাগ / শাখা :
                  </span>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: '1.5px dotted #2B5E70',
                      paddingBottom: '2px',
                      paddingLeft: '6px',
                      fontSize: '15px',
                      lineHeight: 1.35,
                      fontWeight: 700,
                      color: '#0E2836',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {groupOrSection}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    রোল :
                  </span>
                  <div
                    style={{
                      flex: 1,
                      border: '2px solid #D99B24',
                      backgroundColor: '#FFFDF0',
                      borderRadius: '6px',
                      padding: '2px 10px',
                      textAlign: 'center',
                      fontSize: '18.5px',
                      lineHeight: 1.3,
                      fontWeight: 700,
                      color: '#C81D25',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(217, 155, 36, 0.22)',
                    }}
                  >
                    {toBnDigits(student.rollNumber)}
                  </div>
                </div>
              </div>

              {/* Row 3: Father Name & Exam Center */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  alignItems: 'baseline',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    পিতার নাম :
                  </span>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: '1.25px dotted #4B7482',
                      paddingBottom: '1px',
                      paddingLeft: '6px',
                      fontSize: '14px',
                      lineHeight: 1.35,
                      fontWeight: 600,
                      color: '#173744',
                    }}
                  >
                    {student.fatherName || student.guardianName || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    কেন্দ্র :
                  </span>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: '1.25px dotted #4B7482',
                      paddingBottom: '1px',
                      paddingLeft: '6px',
                      fontSize: '13.5px',
                      lineHeight: 1.35,
                      fontWeight: 600,
                      color: '#173744',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {config.examCenter || schoolNameBn}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Signature Row + Center QR Verification Seal (pushed neatly to bottom) */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                paddingTop: '6px',
                paddingLeft: '10px',
                paddingRight: '10px',
              }}
            >
              <div style={{ textAlign: 'center', width: '164px' }}>
                <div
                  style={{
                    borderTop: '1.4px dotted #08546B',
                    paddingTop: '3px',
                    fontSize: '14px',
                    lineHeight: 1.35,
                    fontWeight: 700,
                    color: '#0E2836',
                    whiteSpace: 'nowrap',
                  }}
                >
                  শ্রেণি শিক্ষকের স্বাক্ষর
                </div>
              </div>

              {/* High-Contrast Scannable ISO QR Verification Seal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #086A82',
                  borderRadius: '8px',
                  padding: '4px 11px 4px 5px',
                  boxShadow: '0 2px 6px rgba(6, 77, 99, 0.14)',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '4px',
                    border: '1px solid #D4E6EC',
                    padding: '1px',
                    flexShrink: 0,
                  }}
                >
                  <ScannableQrCode
                    value={qrVerifyUrl}
                    size={72}
                    level="M"
                    quietZoneModules={2}
                    fgColor="#000000"
                    bgColor="#FFFFFF"
                  />
                </div>
                <div style={{ lineHeight: 1.35, textAlign: 'left', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#065F46' }}>
                    অনলাইন QR যাচাই
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#0C4A6E' }}>
                    স্ক্যান করে বৈধতা দেখুন
                  </div>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#8A5205', marginTop: '1px' }}>
                    {student.studentIdCode}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', width: '164px' }}>
                <div
                  style={{
                    borderTop: '1.4px dotted #08546B',
                    paddingTop: '3px',
                    fontSize: '14px',
                    lineHeight: 1.35,
                    fontWeight: 700,
                    color: '#0E2836',
                    whiteSpace: 'nowrap',
                  }}
                >
                  অধ্যক্ষের স্বাক্ষর
                </div>
              </div>
            </div>
          </div>

          {/* ==================== METALLIC GOLD TRIM + ROYAL TEAL FOOTER ==================== */}
          <div
            style={{
              height: '2.5px',
              background:
                'linear-gradient(90deg, #C77E11 0%, #F9CA4B 50%, #C77E11 100%)',
              zIndex: 2,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              background: 'linear-gradient(90deg, #04475C 0%, #07637A 50%, #065743 100%)',
              color: '#FFFFFF',
              textAlign: 'center',
              padding: '6px 16px',
              fontSize: '14.5px',
              lineHeight: 1.35,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              zIndex: 2,
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#F6C445', marginRight: '8px' }}>✦</span>
            বিঃ দ্রঃ - পরীক্ষার হলে প্রতিদিন প্রবেশপত্র অবশ্যই আনতে হবে।
            <span style={{ color: '#F6C445', marginLeft: '8px' }}>✦</span>
          </div>
        </div>
      </div>
    );
  }
);

AdmitCardFront.displayName = 'AdmitCardFront';

/**
 * BACK SIDE: পরীক্ষার সময়সূচি ও পরীক্ষার্থীর জন্য পালনীয় বিধি-নিষেধ — Ultra-Premium Edition
 * Exact 794 x 526 px matching Front Side for millimeter-accurate 2-per-A4 duplex printing.
 * Tight, balanced vertical spacing — zero awkward gaps!
 */
export const AdmitCardBack = forwardRef<HTMLDivElement, AdmitCardTemplateProps>(
  ({ student, settings, config, examRoutines = [] }, ref) => {
    const logoSrc = settings.logoUrl || '/school-logo.png';
    const yearBn = toBnDigits(config.academicYear || String(new Date().getFullYear()));

    const scheduleRows: AdmitScheduleRow[] =
      config.customSchedule && config.customSchedule.length > 0
        ? config.customSchedule
        : examRoutines
            .filter((r) => r.type === 'exam' && r.className === student.className)
            .map((r, idx) => ({
              id: r.id || String(idx),
              date: r.dayOrDate || '',
              day: '',
              time: r.timeSlot || '',
              subject: r.subject || '',
            }));

    const showSchedule = config.includeSchedule !== false;
    const useTwoColumnSchedule = scheduleRows.length > 5;

    const rules = [
      'সকল পরীক্ষার্থীকে পরীক্ষা কেন্দ্রে প্রবেশের সময় প্রবেশপত্র অবশ্যই আনতে হবে।',
      'বিদ্যালয়ের বকেয়া বেতন ও পরীক্ষার ফি পরিশোধ না করে পরীক্ষায় অংশগ্রহণ করা যাবে না।',
      'পরীক্ষার হলে কোনো প্রকার অবৈধ পন্থা, মোবাইল ফোন বা অননুমোদিত কাগজপত্র আনা সম্পূর্ণ নিষিদ্ধ।',
      'পরীক্ষা শুরুর অন্তত ১৫ মিনিট পূর্বে আসন গ্রহণ করতে হবে এবং উত্তরপত্রে অবশ্যই স্বাক্ষর করতে হবে।',
    ];

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          height: '526px',
          background: 'linear-gradient(180deg, #E8F4F7 0%, #F4FAFC 50%, #E3F1F5 100%)',
          color: '#0E2836',
          fontFamily: "'Kalpurush', 'Hind Siliguri', sans-serif",
          boxSizing: 'border-box',
          padding: '12px 15px',
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid #054E63',
          borderRadius: '6px',
        }}
      >
        {/* Luxury 3-Tone Woven Metallic Gold Ornamental Outer Frame */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '18px',
            padding: '8px',
            boxSizing: 'border-box',
            background:
              'repeating-linear-gradient(45deg, #F7BE38 0px, #F7BE38 6px, #D98612 6px, #D98612 12px, #B86B09 12px, #B86B09 14px)',
            boxShadow:
              'inset 0 0 0 1.5px #9F5B06, 0 3px 10px rgba(133, 76, 8, 0.22)',
            position: 'relative',
          }}
        >
          {/* Inner Pearl-White Security Card (Structured top flow — NO awkward empty gaps!) */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '11px',
              background:
                'radial-gradient(ellipse at 50% 45%, #FFFFFF 0%, #F6FBFC 70%, #EAF4F7 100%)',
              border: '1.5px solid #E5A020',
              boxShadow: 'inset 0 0 0 3px #FFFFFF, inset 0 0 0 4px rgba(6, 102, 128, 0.2)',
              boxSizing: 'border-box',
              padding: '12px 24px 12px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <LogoWatermark logoSrc={logoSrc} opacity={0.075} size={232} />

            {/* Top-Left Refined Botanical Floral SVG Ornament */}
            <svg
              width="94"
              height="68"
              viewBox="0 0 100 72"
              style={{
                position: 'absolute',
                top: '0px',
                left: '0px',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0.92,
              }}
            >
              <path
                d="M8,62 C20,38 35,20 62,12"
                fill="none"
                stroke="#7D4F22"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <ellipse cx="28" cy="24" rx="12" ry="5.5" transform="rotate(-32 28 24)" fill="#E9912C" />
              <ellipse cx="47" cy="14" rx="11" ry="5" transform="rotate(-16 47 14)" fill="#D65230" />
              <ellipse cx="18" cy="42" rx="11" ry="5" transform="rotate(-55 18 42)" fill="#F3B335" />
              <ellipse cx="38" cy="36" rx="9" ry="4" transform="rotate(14 38 36)" fill="#0B7D5A" opacity="0.82" />
              <circle cx="35" cy="31" r="6.5" fill="#CF3F28" />
              <circle cx="35" cy="31" r="2.6" fill="#FCE080" />
              <circle cx="59" cy="21" r="5" fill="#EA8D24" />
              <circle cx="59" cy="21" r="2" fill="#FFF4C8" />
            </svg>

            {/* Top-Right Metallic Golden Fountain Pen + Cobalt Flourish SVG */}
            <svg
              width="124"
              height="70"
              viewBox="0 0 132 76"
              style={{
                position: 'absolute',
                top: '0px',
                right: '6px',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0.94,
              }}
            >
              <defs>
                <linearGradient id="penGoldBack" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FBE082" />
                  <stop offset="55%" stopColor="#E19A1B" />
                  <stop offset="100%" stopColor="#A66509" />
                </linearGradient>
              </defs>
              <path
                d="M10,16 C28,36 42,60 57,54 C69,49 70,30 57,28 C44,26 43,46 59,56 C72,64 85,59 95,48"
                fill="none"
                stroke="#0F6C99"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              <g transform="translate(90, 4) rotate(28)">
                <rect x="6" y="0" width="9.5" height="44" rx="2.5" fill="#4E3828" />
                <rect x="6" y="33" width="9.5" height="4.5" fill="url(#penGoldBack)" />
                <polygon points="6,44 15.5,44 10.75,59" fill="url(#penGoldBack)" />
                <circle cx="10.75" cy="51.5" r="1.2" fill="#3B2613" />
              </g>
            </svg>

            {/* ==================== 1. HEADER MEDALLION ==================== */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', flexShrink: 0 }}>
              <div
                style={{
                  display: 'inline-block',
                  background:
                    'linear-gradient(90deg, #C77E11 0%, #F8C43F 50%, #C77E11 100%)',
                  borderRadius: '999px',
                  padding: '3.5px 14px',
                  boxShadow: '0 2.5px 7px rgba(6, 77, 99, 0.2)',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(180deg, #0D628F 0%, #063C5E 100%)',
                    color: '#FFFFFF',
                    padding: '3px 24px',
                    borderRadius: '999px',
                    border: '1px solid rgba(253, 224, 132, 0.5)',
                    fontSize: '16.5px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#F7C948', fontSize: '11px', lineHeight: 1 }}>✦</span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {showSchedule
                      ? 'পরীক্ষার সময়সূচি ও পালনীয় বিধি-নিষেধ'
                      : 'পরীক্ষার্থীর জন্য পালনীয় বিধি-নিষেধ'}
                  </span>
                  <span style={{ color: '#F7C948', fontSize: '11px', lineHeight: 1 }}>✦</span>
                </div>
              </div>

              {showSchedule && (
                <div style={{ marginTop: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#EBF5F8',
                      border: '1px solid #B5D5E0',
                      borderRadius: '999px',
                      padding: '2px 16px',
                      fontSize: '12.5px',
                      lineHeight: 1.35,
                      fontWeight: 700,
                      color: '#054E63',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {config.examName || 'অর্ধবার্ষিক পরীক্ষা'} - {yearBn} · শ্রেণি:{' '}
                    {labelClass(student.className)}
                  </span>
                </div>
              )}
            </div>

            {/* ==================== 2. EXECUTIVE EXAM SCHEDULE TABLE (Tight 8px below sub-pill!) ==================== */}
            {showSchedule && (
              <div style={{ position: 'relative', zIndex: 2, marginTop: '8px' }}>
                {scheduleRows.length > 0 ? (
                  useTwoColumnSchedule ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                      }}
                    >
                      {[
                        scheduleRows.slice(0, Math.ceil(scheduleRows.length / 2)),
                        scheduleRows.slice(Math.ceil(scheduleRows.length / 2)),
                      ].map((chunk, tableIdx) => (
                        <div
                          key={tableIdx}
                          style={{
                            borderRadius: '7px',
                            overflow: 'hidden',
                            border: '1px solid #9EC5D2',
                          }}
                        >
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '12px',
                            }}
                          >
                            <thead>
                              <tr
                                style={{
                                  background:
                                    'linear-gradient(90deg, #054E63 0%, #076A82 60%, #076148 100%)',
                                  color: '#FFFFFF',
                                  borderBottom: '2px solid #F2B129',
                                }}
                              >
                                <th style={backThStyle}>তারিখ / বার</th>
                                <th style={backThStyle}>সময়</th>
                                <th style={backThStyle}>বিষয়</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chunk.map((row, rIdx) => (
                                <tr
                                  key={row.id || rIdx}
                                  style={{
                                    backgroundColor:
                                      rIdx % 2 === 0
                                        ? 'rgba(255,255,255,0.94)'
                                        : 'rgba(229,243,248,0.82)',
                                  }}
                                >
                                  <td style={backTdStyle}>
                                    {toBnDigits(row.date)}
                                    {row.day ? ` (${row.day})` : ''}
                                  </td>
                                  <td style={backTdStyle}>{toBnDigits(row.time)}</td>
                                  <td style={{ ...backTdStyle, fontWeight: 700, color: '#063C5E' }}>
                                    {row.subject}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: '7px',
                        overflow: 'hidden',
                        border: '1px solid #9EC5D2',
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '13px',
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background:
                                'linear-gradient(90deg, #054E63 0%, #076A82 60%, #076148 100%)',
                              color: '#FFFFFF',
                              borderBottom: '2px solid #F2B129',
                            }}
                          >
                            <th style={{ ...backThStyle, width: '42px', textAlign: 'center' }}>
                              ক্রম
                            </th>
                            <th style={{ ...backThStyle, width: '195px' }}>তারিখ ও বার</th>
                            <th style={{ ...backThStyle, width: '165px' }}>সময়</th>
                            <th style={backThStyle}>বিষয়ের নাম</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleRows.slice(0, 6).map((row, idx) => (
                            <tr
                              key={row.id || idx}
                              style={{
                                backgroundColor:
                                  idx % 2 === 0
                                    ? 'rgba(255,255,255,0.94)'
                                    : 'rgba(229,243,248,0.82)',
                              }}
                            >
                              <td
                                style={{
                                  ...backTdStyle,
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  color: '#076148',
                                }}
                              >
                                {toBnDigits(String(idx + 1).padStart(2, '0'))}
                              </td>
                              <td style={backTdStyle}>
                                {toBnDigits(row.date)}
                                {row.day ? ` · ${row.day}` : ''}
                              </td>
                              <td style={backTdStyle}>{toBnDigits(row.time)}</td>
                              <td style={{ ...backTdStyle, fontWeight: 700, color: '#063C5E' }}>
                                {row.subject}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div
                    style={{
                      borderRadius: '7px',
                      overflow: 'hidden',
                      border: '1px solid #9EC5D2',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background:
                              'linear-gradient(90deg, #054E63 0%, #076A82 60%, #076148 100%)',
                            color: '#FFFFFF',
                            borderBottom: '2px solid #F2B129',
                          }}
                        >
                          <th style={{ ...backThStyle, width: '42px', textAlign: 'center' }}>
                            ক্রম
                          </th>
                          <th style={{ ...backThStyle, width: '175px' }}>তারিখ ও বার</th>
                          <th style={{ ...backThStyle, width: '155px' }}>সময়</th>
                          <th style={backThStyle}>বিষয়ের নাম</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <tr
                            key={num}
                            style={{
                              backgroundColor:
                                num % 2 === 1
                                  ? 'rgba(255,255,255,0.94)'
                                  : 'rgba(229,243,248,0.78)',
                            }}
                          >
                            <td
                              style={{
                                ...backTdStyle,
                                textAlign: 'center',
                                fontWeight: 700,
                                color: '#076148',
                              }}
                            >
                              {toBnDigits(String(num).padStart(2, '0'))}
                            </td>
                            <td style={{ ...backTdStyle, height: '24px' }} />
                            <td style={backTdStyle} />
                            <td style={backTdStyle} />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ==================== 3. STRUCTURED RULES BOX ==================== */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                marginTop: showSchedule ? '9px' : '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                border: '1px solid #CBE0E8',
                borderRadius: '8px',
                padding: showSchedule ? '7px 13px' : '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: showSchedule ? '3.5px' : '9px',
              }}
            >
              {showSchedule && (
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#054E63',
                    borderBottom: '1px dashed #BFD8E0',
                    paddingBottom: '2.5px',
                    marginBottom: '1px',
                  }}
                >
                  পরীক্ষার্থীর জন্য পালনীয় বিধি-নিষেধ :
                </div>
              )}
              {rules.map((rule, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    fontSize: showSchedule ? '12.5px' : '15px',
                    lineHeight: showSchedule ? 1.4 : 1.55,
                    fontWeight: 600,
                    color: '#0E2836',
                  }}
                >
                  <RuleChevronSvg />
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            {/* ==================== 4. SCULPTED CRIMSON WARNING BANNER (Pinned neatly at bottom) ==================== */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                textAlign: 'center',
                marginTop: 'auto',
                paddingTop: '8px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  background:
                    'linear-gradient(90deg, #B5161D 0%, #DF222A 50%, #B5161D 100%)',
                  color: '#FFFFFF',
                  padding: '4.5px 30px',
                  borderRadius: '7px',
                  border: '1px solid #F7C948',
                  fontSize: '14px',
                  lineHeight: 1.35,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2.5px 6px rgba(181, 22, 29, 0.28)',
                }}
              >
                উল্লেখিত কোনো বিধি লঙ্ঘন করলে, শাস্তির যোগ্য বিবেচিত হবে।
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AdmitCardBack.displayName = 'AdmitCardBack';

/** Backwards-compatible alias pointing to the Front Admit Card */
export const AdmitCardTemplate = AdmitCardFront;

const backThStyle: React.CSSProperties = {
  borderRight: '1px solid rgba(255,255,255,0.2)',
  padding: '5px 10px',
  textAlign: 'left',
  fontWeight: 700,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
};

const backTdStyle: React.CSSProperties = {
  borderTop: '1px solid #C2DCE5',
  borderRight: '1px solid #C2DCE5',
  padding: '4.5px 10px',
  color: '#0E2836',
  lineHeight: 1.35,
};
