import React, { forwardRef } from 'react';
import { ScannableQrCode } from './ScannableQrCode';
import { buildStudentVerificationUrl } from '../lib/studentVerification';
import { labelClass, toBnDigits } from '../i18n';
import type { CertificateRecord, SiteSettings, StudentRecord } from '../types';

export interface CertificateTemplateProps {
  certificate: CertificateRecord;
  student?: StudentRecord | null;
  settings: SiteSettings;
}

const CERT_META: Record<
  CertificateRecord['certificateType'],
  { titleBn: string; subtitleEn: string; accentBg: string }
> = {
  TC: {
    titleBn: 'ছাড়পত্র',
    subtitleEn: 'TRANSFER CERTIFICATE',
    accentBg: 'linear-gradient(135deg, #066C44 0%, #0A9459 100%)',
  },
  Testimonial: {
    titleBn: 'প্রশংসাপত্র',
    subtitleEn: 'TESTIMONIAL',
    accentBg: 'linear-gradient(135deg, #077A4B 0%, #0DA463 100%)',
  },
  Character: {
    titleBn: 'চারিত্রিক সনদপত্র',
    subtitleEn: 'CHARACTER CERTIFICATE',
    accentBg: 'linear-gradient(135deg, #096B59 0%, #0E967C 100%)',
  },
  Bonafide: {
    titleBn: 'অধ্যয়নরত সনদপত্র',
    subtitleEn: 'STUDENTSHIP CERTIFICATE',
    accentBg: 'linear-gradient(135deg, #087F5B 0%, #10A370 100%)',
  },
};

const CRISP_BN_FONT = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif";
const MONO_FONT = "'JetBrains Mono', 'Hind Siliguri', monospace";

/** Crisp inline highlighted field with tidy gold-bronze dotted underline (no forced huge gaps) */
const InlineField: React.FC<{
  value?: string;
  placeholderDots?: string;
  color?: string;
}> = ({ value, placeholderDots = '....................', color = '#0D3559' }) => {
  const text = value?.trim();
  return (
    <span
      style={{
        display: 'inline',
        borderBottom: '1.5px dotted #8C7340',
        padding: '0 5px 1px',
        margin: '0 0 0 4px',
        fontWeight: 700,
        color: text ? color : '#7B7468',
      }}
    >
      {text || placeholderDots}
    </span>
  );
};

/** Ornate SVG corner filigree ornament for all 4 corners of the certificate */
const CornerOrnament: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br' }> = ({ position }) => {
  const transforms: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
    tl: 'none',
    tr: 'scaleX(-1)',
    bl: 'scaleY(-1)',
    br: 'scale(-1, -1)',
  };
  const posStyle: Record<'tl' | 'tr' | 'bl' | 'br', React.CSSProperties> = {
    tl: { top: '6px', left: '6px' },
    tr: { top: '6px', right: '6px' },
    bl: { bottom: '6px', left: '6px' },
    br: { bottom: '6px', right: '6px' },
  };
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 64 64"
      fill="none"
      style={{
        position: 'absolute',
        ...posStyle[position],
        transform: transforms[position],
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <path d="M4 4H56V10H10V56H4V4Z" fill="#B58A3C" />
      <path d="M13 13H44V16H16V44H13V13Z" fill="#087F5B" fillOpacity="0.88" />
      <path d="M4 4L22 22" stroke="#DFC07A" strokeWidth="1.5" />
      <circle cx="22" cy="22" r="3.5" fill="#D4A64A" stroke="#087F5B" strokeWidth="1.2" />
      <path
        d="M28 10C34 10 38 14 38 20M10 28C10 34 14 38 20 38"
        stroke="#B58A3C"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Premium Official Bangladeshi School Certificate Template (A4 Landscape: 960px x 678px)
 * Supports all 4 types: ছাড়পত্র (TC), প্রশংসাপত্র, চারিত্রিক সনদপত্র, অধ্যয়নরত সনদপত্র.
 *
 * Refined for crystal-clear Bangla readability:
 * - Zero `text-align: justify` word-spacing rivers (clean natural spacing!)
 * - Crisp `Hind Siliguri` high-contrast typography on bright warm-ivory paper (`#FFFDF9`)
 * - Subtle low-opacity watermark (`0.055`) that never blurs or competes with text
 * - Metallic antique-gold security frame + 4 corner emerald/gold filigree ornaments
 * - Royal plum-purple institution header + emerald & gold title capsule
 */
export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ certificate, student, settings }, ref) => {
    const schoolNameBn = settings.schoolNameBn || 'শাহ ইসলামিক স্কুল এন্ড কলেজ';
    const schoolNameEn = (settings.schoolNameEn || 'SHAH ISLAMIC SCHOOL & COLLEGE').toUpperCase();
    const establishedBn = toBnDigits(settings.establishedYear || '২০১৯');
    const addressBn =
      settings.address ||
      'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০।';
    const phoneBn = toBnDigits(settings.phone || '+880 1711-759705');
    const logoSrc = settings.logoUrl || '/school-logo.png';

    const classBn = labelClass(certificate.className);
    const rollBn = toBnDigits(certificate.rollNumber || student?.rollNumber || '—');
    const dobBn = student?.dateOfBirth ? toBnDigits(student.dateOfBirth) : '';
    const academicYearBn = toBnDigits(
      student?.admissionYear || certificate.issueDate?.slice(0, 4) || String(new Date().getFullYear())
    );
    const issueDateBn = toBnDigits(certificate.issueDate || new Date().toISOString().slice(0, 10));
    const serialNo = certificate.certificateNo || 'SISC-2026-0001';

    const fatherName = certificate.fatherName || student?.fatherName || student?.guardianName || '';
    const motherName = certificate.motherName || student?.motherName || '';

    const qrPayload = student?.studentIdCode
      ? buildStudentVerificationUrl(student.studentIdCode, {
          fallbackOrigin: settings.websiteUrl,
        })
      : `${serialNo}|${certificate.studentName}`;

    const meta = CERT_META[certificate.certificateType] || CERT_META.Bonafide;

    return (
      <div
        ref={ref}
        style={{
          width: '960px',
          height: '678px',
          position: 'relative',
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, #D5B97B 0%, #C6A45F 50%, #D9BF85 100%)',
          padding: '22px',
          fontFamily: CRISP_BN_FONT,
          color: '#16242E',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* ANTIQUE GOLD-BRONZE ORNAMENTAL SECURITY FRAME */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            boxSizing: 'border-box',
            padding: '11px',
            backgroundColor: '#9D7F43',
            boxShadow: 'inset 0 0 0 1.5px #6E5422, 0 4px 16px rgba(56, 40, 12, 0.22)',
          }}
        >
          {/* Crisp Geometric Braided Security Border Pattern */}
          <svg
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <pattern
                id="cert_royal_border"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <rect width="16" height="16" fill="#9A7C40" />
                <path
                  d="M0 8L8 0L16 8L8 16Z"
                  fill="#C4A460"
                  stroke="#6F5624"
                  strokeWidth="0.9"
                />
                <circle cx="8" cy="8" r="2.2" fill="#F2DFB0" stroke="#087F5B" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cert_royal_border)" />
          </svg>

          {/* BRIGHT WARM-IVORY CERTIFICATE SHEET (Ultra-Clean Contrast for Crisp Bangla Text) */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #FFFDFB 0%, #FFF9F5 55%, #FDF5F0 100%)',
              border: '2px solid #087F5B',
              boxShadow: 'inset 0 0 0 4px #FFFDFB, inset 0 0 0 5.5px #D4AE60',
              padding: '24px 52px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              overflow: 'hidden',
            }}
          >
            {/* 4 Ornate Emerald & Gold Corner Medallions */}
            <CornerOrnament position="tl" />
            <CornerOrnament position="tr" />
            <CornerOrnament position="bl" />
            <CornerOrnament position="br" />

            {/* ULTRA-SUBTLE CENTERED SCHOOL CREST WATERMARK (Never interferes with text legibility) */}
            <div
              style={{
                position: 'absolute',
                top: '55%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '250px',
                height: '250px',
                opacity: 0.055,
                pointerEvents: 'none',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={logoSrc}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            {/* ==================== HEADER BLOCK ==================== */}
            <div style={{ position: 'relative', zIndex: 4 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '999px',
                    backgroundColor: '#FFFFFF',
                    padding: '3px',
                    border: '2px solid #D4AE60',
                    boxShadow: '0 3px 10px rgba(13, 53, 89, 0.12)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={logoSrc}
                    alt={schoolNameBn}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: '33px',
                      fontWeight: 700,
                      color: '#7E136E',
                      lineHeight: 1.16,
                      letterSpacing: '0.005em',
                    }}
                  >
                    {schoolNameBn}
                  </h1>
                  <div
                    style={{
                      marginTop: '2px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.16em',
                      color: '#087F5B',
                    }}
                  >
                    {schoolNameEn}
                  </div>
                  <p
                    style={{
                      margin: '3px 0 0',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#2B3A42',
                      lineHeight: 1.35,
                    }}
                  >
                    স্থাপিতঃ {establishedBn} খ্রি. · {addressBn}
                  </p>
                </div>

                {/* Invisible right balance spacer for dead-center alignment */}
                <div style={{ width: '68px', flexShrink: 0 }} aria-hidden="true" />
              </div>

              {/* Elegant Ornamental Header Rule */}
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    height: '1.5px',
                    background: 'linear-gradient(90deg, transparent, #C6A052, #087F5B)',
                  }}
                />
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#D4A64A',
                    transform: 'rotate(45deg)',
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    height: '1.5px',
                    background: 'linear-gradient(90deg, #087F5B, #C6A052, transparent)',
                  }}
                />
              </div>

              {/* Serial No (Left) · Emerald & Gold Certificate Capsule (Center) · Date (Right) */}
              <div
                style={{
                  marginTop: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#24343D',
                    display: 'flex',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>সিরিয়াল নং :</span>
                  <span
                    style={{
                      marginLeft: '6px',
                      borderBottom: '1.5px dotted #8C7340',
                      padding: '0 7px 1px',
                      fontSize: '12.8px',
                      fontWeight: 700,
                      color: '#123B67',
                      fontFamily: MONO_FONT,
                    }}
                  >
                    {serialNo}
                  </span>
                </div>

                {/* Regal Emerald & Gold Title Capsule */}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      background: meta.accentBg,
                      color: '#FFFFFF',
                      padding: '6px 34px 7px',
                      borderRadius: '999px',
                      fontSize: '22px',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      boxShadow:
                        '0 4px 12px rgba(8, 127, 91, 0.25), inset 0 0 0 1.5px rgba(244, 198, 96, 0.72)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: '#FCD36A', fontSize: '11px' }}>✦</span>
                    <span>{meta.titleBn}</span>
                    <span style={{ color: '#FCD36A', fontSize: '11px' }}>✦</span>
                  </div>
                  <div
                    style={{
                      marginTop: '3px',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      color: '#8C6B2D',
                    }}
                  >
                    {meta.subtitleEn}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#24343D',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>তারিখ :</span>
                  <span
                    style={{
                      marginLeft: '6px',
                      minWidth: '114px',
                      textAlign: 'center',
                      borderBottom: '1.5px dotted #8C7340',
                      padding: '0 8px 1px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#16242E',
                    }}
                  >
                    {issueDateBn}
                  </span>
                </div>
              </div>
            </div>

            {/* ==================== BODY PROSE (TIGHT TOP SPACING, CRISP READABILITY) ==================== */}
            <div
              style={{
                position: 'relative',
                zIndex: 4,
                marginTop: '18px',
                padding: '0 10px',
                fontSize: '17.5px',
                fontWeight: 500,
                lineHeight: 1.9,
                color: '#14222B',
                textAlign: 'left',
              }}
            >
              {/* Clean Structured Identity Summary Box */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.78)',
                  border: '1px solid #E8D9B8',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  fontSize: '16.5px',
                  lineHeight: 1.65,
                }}
              >
                <div>
                  এই মর্মে{' '}
                  {certificate.certificateType === 'Testimonial'
                    ? 'প্রশংসাপত্র প্রদান'
                    : certificate.certificateType === 'Character'
                    ? 'চারিত্রিক সনদপত্র প্রদান'
                    : 'প্রত্যয়ন'}{' '}
                  করা যাচ্ছে যে, শিক্ষার্থী
                  <InlineField value={certificate.studentName} color="#0C3559" />
                  , পিতা:
                  <InlineField value={fatherName} color="#1E2F3A" />
                  {motherName ? (
                    <>
                      , মাতা:
                      <InlineField value={motherName} color="#1E2F3A" />
                    </>
                  ) : null}
                  ।
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
                  <span>
                    শ্রেণি: <InlineField value={classBn} color="#087F5B" />
                  </span>
                  <span>
                    রোল নং: <InlineField value={rollBn} color="#087F5B" />
                  </span>
                  <span>
                    শিক্ষাবর্ষ: <InlineField value={academicYearBn} color="#123B67" />
                  </span>
                  {dobBn && (
                    <span>
                      জন্ম তারিখ: <InlineField value={dobBn} color="#123B67" />
                    </span>
                  )}
                </div>
              </div>

              {/* Crisp Formal Certificate Statement (Natural Word Spacing — No Justify Rivers!) */}
              <p style={{ margin: 0, padding: '0 4px', fontSize: '17.5px', lineHeight: 1.9 }}>
                {certificate.certificateType === 'TC' && (
                  <>
                    সে অত্র <strong style={{ color: '#123B67' }}>{schoolNameBn}</strong>-এর{' '}
                    <strong style={{ color: '#087F5B' }}>{classBn}</strong>-এর একজন নিয়মিত শিক্ষার্থী
                    ছিল। অভিভাবকের আবেদনের প্রেক্ষিতে এবং প্রতিষ্ঠানের সকল পাওনা পরিশোধ সাপেক্ষে
                    তাকে অত্র প্রতিষ্ঠান হতে{' '}
                    <strong style={{ color: '#7E136E' }}>ছাড়পত্র (Transfer Certificate)</strong>{' '}
                    প্রদান করা হলো। প্রতিষ্ঠানে অধ্যয়নকালে তার আচার-আচরণ, শৃঙ্খলা ও চরিত্র অত্যন্ত
                    সন্তোষজনক ছিল।
                  </>
                )}
                {certificate.certificateType === 'Testimonial' && (
                  <>
                    সে অত্র <strong style={{ color: '#123B67' }}>{schoolNameBn}</strong>-এর{' '}
                    <strong style={{ color: '#087F5B' }}>{classBn}</strong>-এর একজন নিয়মিত, মেধাবী ও
                    শৃঙ্খলাপরায়ণ শিক্ষার্থী। প্রতিষ্ঠানে অধ্যয়নকালে তার পাঠ্য ও সহ-পাঠ্যক্রমিক
                    অগ্রগতি, নিয়মানুবর্তিতা, নৈতিকতা এবং আচার-আচরণ অত্যন্ত প্রশংসনীয়।
                  </>
                )}
                {certificate.certificateType === 'Character' && (
                  <>
                    সে অত্র <strong style={{ color: '#123B67' }}>{schoolNameBn}</strong>-এর{' '}
                    <strong style={{ color: '#087F5B' }}>{classBn}</strong>-এ অধ্যয়নরত একজন নিয়মিত
                    শিক্ষার্থী। আমার জানামতে তার স্বভাব-চরিত্র, নৈতিক মূল্যবোধ ও শৃঙ্খলাবোধ অত্যন্ত
                    উত্তম। সে শৃঙ্খলা পরিপন্থী কোনো কর্মকাণ্ডের সাথে জড়িত নয়।
                  </>
                )}
                {certificate.certificateType === 'Bonafide' && (
                  <>
                    সে অত্র <strong style={{ color: '#123B67' }}>{schoolNameBn}</strong>-এ{' '}
                    <strong style={{ color: '#123B67' }}>{academicYearBn}</strong> শিক্ষাবর্ষে{' '}
                    <strong style={{ color: '#087F5B' }}>{classBn}</strong>-তে নিয়মিত অধ্যয়ন করছে।
                    প্রতিষ্ঠানে তার নিয়মিত উপস্থিতি, শিখন মূল্যায়ন এবং আচার-আচরণ সন্তোষজনক।
                  </>
                )}
                {certificate.reasonOrRemarks ? (
                  <>
                    {' '}
                    বিশেষ মন্তব্য:{' '}
                    <strong style={{ color: '#123B67' }}>{certificate.reasonOrRemarks}</strong>।
                  </>
                ) : null}
              </p>

              {/* Closing Blessing */}
              <p
                style={{
                  margin: '14px 0 0',
                  paddingLeft: '4px',
                  fontSize: '17.5px',
                  fontWeight: 700,
                  color: '#087F5B',
                }}
              >
                আমি তার সর্বাঙ্গীণ সাফল্য ও উজ্জ্বল ভবিষ্যৎ কামনা করি।
              </p>
            </div>

            {/* ==================== FOOTER: CLASS TEACHER · SEAL & QR · PRINCIPAL ==================== */}
            <div
              style={{
                position: 'relative',
                zIndex: 4,
                marginTop: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1.25fr',
                alignItems: 'flex-end',
                gap: '16px',
                padding: '16px 10px 2px',
              }}
            >
              {/* Bottom-Left: Class Teacher Signature */}
              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    width: '158px',
                    borderTop: '1.5px dotted #5A4D35',
                    paddingTop: '6px',
                    textAlign: 'center',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#16242E',
                  }}
                >
                  শ্রেণি শিক্ষক
                </div>
              </div>

              {/* Bottom-Center: Official Seal Ring + Live Scannable Verification QR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '62px',
                    height: '62px',
                    borderRadius: '999px',
                    border: '1.5px dashed #B59555',
                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#6E5A35',
                  }}
                >
                  সীল
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    padding: '4px',
                    borderRadius: '7px',
                    border: '1.2px solid #C8B07C',
                    boxShadow: '0 2px 6px rgba(18, 59, 103, 0.08)',
                  }}
                >
                  <ScannableQrCode
                    value={qrPayload}
                    size={54}
                    level="M"
                    quietZoneModules={2}
                    fgColor="#0B1F3A"
                    bgColor="#FFFFFF"
                  />
                </div>
              </div>

              {/* Bottom-Right: Principal Signature Block */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ width: '256px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      borderTop: '1.5px dotted #5A4D35',
                      paddingTop: '5px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '15.5px',
                        fontWeight: 700,
                        color: '#123B67',
                        lineHeight: 1.35,
                      }}
                    >
                      প্রধান শিক্ষক / অধ্যক্ষ
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#374854' }}>
                      {schoolNameBn}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#51636F' }}>
                      মোবাইল : {phoneBn}
                    </div>
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

CertificateTemplate.displayName = 'CertificateTemplate';
