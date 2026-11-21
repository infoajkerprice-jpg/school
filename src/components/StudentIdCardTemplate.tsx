import React, { forwardRef } from 'react';
import { ScannableQrCode } from './ScannableQrCode';
import {
  getEnglishSchoolName,
  getEnglishShortAddress,
  getEnglishStudentSummary,
  toEnDigits,
} from '../lib/idCardEnglish';
import { buildStudentVerificationUrl } from '../lib/studentVerification';
import type { SiteSettings, StudentRecord } from '../types';

export type IdCardThemeId =
  | 'emerald-royal'
  | 'sapphire-sunset'
  | 'imperial-violet'
  | 'crimson-navy';

export interface IdCardThemePalette {
  id: IdCardThemeId;
  labelBn: string;
  labelEn: string;
  swatch: [string, string, string, string];
  deepDark: string;
  primary: string;
  bright: string;
  accentGold: string;
  accentGoldLight: string;
  softAura: string;
  bodyTop: string;
  bodyBottom: string;
  nameColor: string;
  labelColor: string;
  valueColor: string;
  dividerColor: string;
  badgeBg: string;
  badgeText: string;
}

export const ID_CARD_THEMES: Record<IdCardThemeId, IdCardThemePalette> = {
  'emerald-royal': {
    id: 'emerald-royal',
    labelBn: 'রয়েল এমারেল্ড ও গোল্ড',
    labelEn: 'Royal Emerald & Gold',
    swatch: ['#0D2E5C', '#087F5B', '#18B6D8', '#F5A623'],
    deepDark: '#0D2E5C',
    primary: '#087F5B',
    bright: '#18B6D8',
    accentGold: '#F5A623',
    accentGoldLight: '#FFD369',
    softAura: '#B8EFE2',
    bodyTop: '#F5FDF9',
    bodyBottom: '#EDF8F4',
    nameColor: '#077353',
    labelColor: '#123B67',
    valueColor: '#1E2F3A',
    dividerColor: '#CFE7DD',
    badgeBg: '#E6F7F1',
    badgeText: '#087F5B',
  },
  'sapphire-sunset': {
    id: 'sapphire-sunset',
    labelBn: 'ওশান স্যাফায়ার ও গোল্ড',
    labelEn: 'Ocean Sapphire & Gold',
    swatch: ['#0F2A66', '#1B65D0', '#24B9E6', '#F97316'],
    deepDark: '#0F2A66',
    primary: '#1B65D0',
    bright: '#24B9E6',
    accentGold: '#F97316',
    accentGoldLight: '#FDBA74',
    softAura: '#BFE8FA',
    bodyTop: '#F4FAFF',
    bodyBottom: '#EBF5FE',
    nameColor: '#1554B8',
    labelColor: '#0F2A66',
    valueColor: '#1E2D3D',
    dividerColor: '#CEE4F6',
    badgeBg: '#E7F3FE',
    badgeText: '#1554B8',
  },
  'imperial-violet': {
    id: 'imperial-violet',
    labelBn: 'ইম্পেরিয়াল ভায়োলেট ও টিল',
    labelEn: 'Imperial Violet & Teal',
    swatch: ['#251B6B', '#6D28D9', '#0EA5A4', '#F5B731'],
    deepDark: '#251B6B',
    primary: '#6D28D9',
    bright: '#0EA5A4',
    accentGold: '#F5B731',
    accentGoldLight: '#FDE68A',
    softAura: '#DDD6FE',
    bodyTop: '#FAF7FF',
    bodyBottom: '#EFF8F8',
    nameColor: '#5B21B6',
    labelColor: '#251B6B',
    valueColor: '#242038',
    dividerColor: '#DDD6F2',
    badgeBg: '#F1EBFE',
    badgeText: '#5B21B6',
  },
  'crimson-navy': {
    id: 'crimson-navy',
    labelBn: 'রয়েল ক্রিমসন ও নেভি',
    labelEn: 'Royal Crimson & Navy',
    swatch: ['#112A56', '#BE185D', '#EC4899', '#F5A623'],
    deepDark: '#112A56',
    primary: '#BE185D',
    bright: '#EC4899',
    accentGold: '#F5A623',
    accentGoldLight: '#FCD34D',
    softAura: '#FBCFE8',
    bodyTop: '#FFF8FA',
    bodyBottom: '#F2F6FC',
    nameColor: '#A61452',
    labelColor: '#112A56',
    valueColor: '#292233',
    dividerColor: '#F0D5E3',
    badgeBg: '#FCE8F1',
    badgeText: '#A61452',
  },
};

export interface StudentIdCardConfig {
  themeId: IdCardThemeId;
  sessionLabel: string;
  validThru: string;
  authorityTitle: string;
  /** Optional manual English overrides for the currently selected student */
  studentNameOverride?: string;
  fatherNameOverride?: string;
  divisionOverride?: string;
  addressOverride?: string;
}

export interface StudentIdCardProps {
  student: StudentRecord;
  settings: SiteSettings;
  config: StudentIdCardConfig;
}

export const ID_CARD_WIDTH_PX = 336;
export const ID_CARD_HEIGHT_PX = 534;

const CARD_FONT_STACK = "'Plus Jakarta Sans', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif";
const MONO_FONT_STACK = "'JetBrains Mono', 'Plus Jakarta Sans', monospace";

/** Dynamic font size for student name so short and long names stay crisp & balanced */
function getStudentNameFontSize(name: string): string {
  if (name.length > 28) return '15px';
  if (name.length > 22) return '16.5px';
  return '18.5px';
}

/**
 * FRONT SIDE — Standard CR80 Portrait (54mm x 86mm ratio = 336px x 534px)
 * 100% English, colorful multi-layered wave header, enlarged clean SQUARE student photo
 * (zero badges overlapping the photo), balanced info rows, and well-spaced school footer.
 */
export const StudentIdCardFront = forwardRef<HTMLDivElement, StudentIdCardProps>(
  ({ student, settings, config }, ref) => {
    const theme = ID_CARD_THEMES[config.themeId] || ID_CARD_THEMES['emerald-royal'];
    const summary = getEnglishStudentSummary(student);
    const schoolName = getEnglishSchoolName(settings);
    const shortAddress = (config.addressOverride || getEnglishShortAddress(settings)).trim();
    const logoSrc = settings.logoUrl || '/school-logo.png';

    const displayName = (config.studentNameOverride ?? '').trim() || summary.nameEn;
    const displayFather = (config.fatherNameOverride ?? '').trim() || summary.fatherEn || '—';
    const displayDivision = (config.divisionOverride ?? '').trim() || summary.divisionEn;
    const sessionText = toEnDigits(config.sessionLabel || summary.sessionEn || '2026');

    const gradPrefix = `idfront_${theme.id}`;

    const rows: Array<{ label: string; value: string; mono?: boolean; highlight?: string }> = [
      { label: 'ID No', value: summary.idCodeEn, mono: true },
      { label: 'Father', value: displayFather },
      { label: 'Division', value: displayDivision },
      { label: 'Class', value: `${summary.classEn} (${summary.sectionEn})` },
      { label: 'Roll No', value: `${summary.rollEn}  ·  ${summary.shiftEn} Shift` },
      ...(summary.bloodEn
        ? [{ label: 'Blood', value: summary.bloodEn, highlight: '#C81E3A' }]
        : []),
      { label: 'Mobile', value: summary.phoneEn, mono: true },
    ];

    return (
      <div
        ref={ref}
        style={{
          width: `${ID_CARD_WIDTH_PX}px`,
          height: `${ID_CARD_HEIGHT_PX}px`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          background: `linear-gradient(180deg, ${theme.bodyTop} 0%, #FFFFFF 52%, ${theme.bodyBottom} 100%)`,
          fontFamily: CARD_FONT_STACK,
          color: theme.valueColor,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          border: `1.5px solid ${theme.dividerColor}`,
          userSelect: 'none',
        }}
      >
        {/* TOP MULTI-LAYER COLORFUL WAVE ARTWORK */}
        <svg
          width={ID_CARD_WIDTH_PX}
          height="186"
          viewBox="0 0 336 186"
          fill="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <defs>
            <linearGradient id={`${gradPrefix}_navy`} x1="0" y1="0" x2="336" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={theme.deepDark} />
              <stop offset="100%" stopColor={theme.primary} />
            </linearGradient>
            <linearGradient id={`${gradPrefix}_mid`} x1="336" y1="0" x2="20" y2="175" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={theme.bright} />
              <stop offset="58%" stopColor={theme.primary} />
              <stop offset="100%" stopColor={theme.deepDark} />
            </linearGradient>
            <linearGradient id={`${gradPrefix}_gold`} x1="0" y1="138" x2="336" y2="108" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={theme.accentGold} />
              <stop offset="50%" stopColor={theme.accentGoldLight} />
              <stop offset="100%" stopColor={theme.accentGold} />
            </linearGradient>
            <pattern id={`${gradPrefix}_geo`} width="28" height="28" patternUnits="userSpaceOnUse">
              <path
                d="M14 2L17 11L26 14L17 17L14 26L11 17L2 14L11 11Z"
                stroke="#FFFFFF"
                strokeOpacity="0.065"
                strokeWidth="0.9"
                fill="none"
              />
            </pattern>
          </defs>

          {/* Soft translucent pastel aura wave underneath */}
          <path
            d="M0 0H336V124C284 166 212 180 134 170C78 164 34 146 0 128V0Z"
            fill={theme.softAura}
            fillOpacity="0.55"
          />

          {/* Main vivid primary-to-cyan sweeping wave */}
          <path
            d="M0 0H336V110C288 154 218 170 136 160C82 153 40 134 0 118V0Z"
            fill={`url(#${gradPrefix}_mid)`}
          />

          {/* Deep royal corner sweep */}
          <path
            d="M0 0H214C182 52 126 102 46 136C28 144 13 148 0 150V0Z"
            fill={`url(#${gradPrefix}_navy)`}
            fillOpacity="0.92"
          />

          {/* Right luminous bright highlight swoosh */}
          <path
            d="M158 0H336V102C298 134 248 146 196 134C234 98 208 36 158 0Z"
            fill={theme.bright}
            fillOpacity="0.3"
          />

          {/* Subtle Islamic geometric star lattice overlay */}
          <path
            d="M0 0H336V110C288 154 218 170 136 160C82 153 40 134 0 118V0Z"
            fill={`url(#${gradPrefix}_geo)`}
          />

          {/* Gleaming gold accent ribbon curve */}
          <path
            d="M-6 120C44 142 92 159 148 164C222 170 288 148 342 109"
            stroke={`url(#${gradPrefix}_gold)`}
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* TOP HEADER STRIP */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px 0',
          }}
        >
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#FFFFFF',
              textTransform: 'uppercase',
              textShadow: '0 1px 2px rgba(0,0,0,0.28)',
            }}
          >
            STUDENT ID CARD
          </span>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: theme.accentGoldLight,
              fontFamily: MONO_FONT_STACK,
              textShadow: '0 1px 2px rgba(0,0,0,0.28)',
            }}
          >
            SESSION {sessionText}
          </span>
        </div>

        {/* ENLARGED CLEAN SQUARE STUDENT PHOTO (152px x 152px — ZERO OVERLAPPING BADGES) */}
        <div
          style={{
            position: 'relative',
            zIndex: 4,
            display: 'flex',
            justifyContent: 'center',
            marginTop: '13px',
          }}
        >
          <div
            style={{
              width: '152px',
              height: '152px',
              borderRadius: '14px',
              padding: '4.5px',
              background: `linear-gradient(135deg, ${theme.accentGold} 0%, ${theme.bright} 52%, ${theme.primary} 100%)`,
              boxShadow: '0 12px 26px rgba(13, 46, 92, 0.24)',
              boxSizing: 'border-box',
            }}
          >
            {/* Crisp white inner mat */}
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '10px',
                padding: '3.5px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            >
              {/* Clean square photo viewport */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '7.5px',
                  overflow: 'hidden',
                  background: `linear-gradient(180deg, ${theme.softAura} 0%, #E0F2FE 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      display: 'block',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '48px',
                      fontWeight: 800,
                      color: theme.deepDark,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {displayName.slice(0, 1).toUpperCase() || 'S'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STUDENT NAME & BALANCED ENGLISH DETAILS */}
        <div
          style={{
            position: 'relative',
            zIndex: 4,
            padding: '15px 24px 10px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Student Full Name */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: getStudentNameFontSize(displayName),
                fontWeight: 800,
                color: theme.nameColor,
                lineHeight: 1.22,
                letterSpacing: '0.01em',
                wordSpacing: '2px',
                wordBreak: 'break-word',
              }}
            >
              {displayName}
            </h2>
            {/* Sleek 3-color signature accent divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                marginTop: '6px',
              }}
            >
              <span
                style={{
                  width: '18px',
                  height: '3px',
                  borderRadius: '999px',
                  backgroundColor: theme.accentGold,
                }}
              />
              <span
                style={{
                  width: '42px',
                  height: '3px',
                  borderRadius: '999px',
                  backgroundColor: theme.primary,
                }}
              />
              <span
                style={{
                  width: '18px',
                  height: '3px',
                  borderRadius: '999px',
                  backgroundColor: theme.bright,
                }}
              />
            </div>
          </div>

          {/* Clean Colon-Aligned Info Table */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: rows.length >= 7 ? '5.5px' : '7px',
              fontSize: '12.2px',
              lineHeight: 1.35,
            }}
          >
            {rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    width: '72px',
                    flexShrink: 0,
                    fontWeight: 700,
                    color: theme.labelColor,
                    fontSize: '11.8px',
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    width: '14px',
                    flexShrink: 0,
                    fontWeight: 800,
                    color: theme.primary,
                    textAlign: 'center',
                  }}
                >
                  :
                </span>
                <span
                  style={{
                    flex: 1,
                    fontWeight: row.label === 'ID No' || row.highlight ? 700 : 600,
                    color:
                      row.highlight || (row.label === 'ID No' ? theme.deepDark : theme.valueColor),
                    fontFamily: row.mono ? MONO_FONT_STACK : CARD_FONT_STACK,
                    fontSize: row.mono ? '11.5px' : '12.1px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM MULTI-WAVE SCHOOL BRANDING FOOTER (Properly Spaced School Name + Address, NO Phone) */}
        <div
          style={{
            position: 'relative',
            height: '78px',
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <svg
            width={ID_CARD_WIDTH_PX}
            height="82"
            viewBox="0 0 336 82"
            fill="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <defs>
              <linearGradient id={`${gradPrefix}_foot`} x1="0" y1="82" x2="336" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={theme.deepDark} />
                <stop offset="56%" stopColor={theme.primary} />
                <stop offset="100%" stopColor={theme.bright} />
              </linearGradient>
              <linearGradient id={`${gradPrefix}_footGold`} x1="0" y1="18" x2="336" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={theme.accentGold} />
                <stop offset="55%" stopColor={theme.accentGoldLight} />
                <stop offset="100%" stopColor={theme.accentGold} />
              </linearGradient>
            </defs>
            <path
              d="M0 21C86 0 194 4 336 19V82H0V21Z"
              fill={theme.softAura}
              fillOpacity="0.62"
            />
            <path
              d="M0 24C92 4 196 10 336 24V82H0V24Z"
              fill={`url(#${gradPrefix}_foot)`}
            />
            <path
              d="M-4 24C92 4 196 10 340 24"
              stroke={`url(#${gradPrefix}_footGold)`}
              strokeWidth="2.8"
              fill="none"
            />
          </svg>

          <div
            style={{
              position: 'relative',
              zIndex: 3,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '0 16px 11px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '43px',
                height: '43px',
                borderRadius: '999px',
                backgroundColor: '#FFFFFF',
                padding: '2.5px',
                flexShrink: 0,
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={logoSrc}
                alt={schoolName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            <div style={{ minWidth: 0, flex: 1, color: '#FFFFFF' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.015em',
                  wordSpacing: '2.5px',
                  lineHeight: 1.22,
                  textShadow: '0 1px 2px rgba(0,0,0,0.22)',
                }}
              >
                {schoolName}
              </div>
              <div
                style={{
                  marginTop: '3px',
                  fontSize: '8.4px',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  wordSpacing: '1.2px',
                  color: 'rgba(255, 255, 255, 0.92)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {shortAddress}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

StudentIdCardFront.displayName = 'StudentIdCardFront';

/**
 * BACK SIDE — Standard CR80 Portrait (54mm x 86mm ratio = 336px x 534px)
 * Styled faithfully after the user's attached executive reference layout in our active school theme:
 * - Bold solid theme outer frame with subtle golden inner trim
 * - Centered TERMS & CONDITIONS heading + 3 clean bullet points
 * - Academic Laurel Wreath cradling the School Logo (left) + Signature Authority / Principal & ink signature (right)
 * - Clean icon-led campus address, email, validity, and website rows (no school phone)
 * - Bottom-left corner-bracketed real scannable Verification QR + bottom-right stylized Open Book graphic
 */
export const StudentIdCardBack = forwardRef<HTMLDivElement, StudentIdCardProps>(
  ({ student, settings, config }, ref) => {
    const theme = ID_CARD_THEMES[config.themeId] || ID_CARD_THEMES['emerald-royal'];
    const schoolName = getEnglishSchoolName(settings);
    const shortAddress = (config.addressOverride || getEnglishShortAddress(settings)).trim();
    const schoolEmail = (settings.email || 'info@shahislamicschool.com').trim();
    const websiteDisplay = (settings.websiteUrl || 'https://shahislamicschool.com').trim();
    const logoSrc = settings.logoUrl || '/school-logo.png';
    const validThru = (config.validThru || `Dec ${new Date().getFullYear()}`).trim();
    const authorityTitle = (config.authorityTitle || 'Principal').trim();

    const verificationUrl = buildStudentVerificationUrl(student.studentIdCode, {
      fallbackOrigin: settings.websiteUrl,
    });

    const terms = [
      `This card is the official property of ${schoolName} and is non-transferable.`,
      'Students must wear this identity card visibly inside the school campus.',
      'If found lost anywhere, please kindly return it to the school office.',
    ];

    return (
      <div
        ref={ref}
        style={{
          width: `${ID_CARD_WIDTH_PX}px`,
          height: `${ID_CARD_HEIGHT_PX}px`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          backgroundColor: theme.deepDark,
          padding: '10px',
          fontFamily: CARD_FONT_STACK,
          color: theme.valueColor,
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        {/* Crisp White Inner Card Surface with Subtle Golden Accent Border */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '8px',
            background: `linear-gradient(180deg, #FFFFFF 0%, ${theme.bodyTop} 100%)`,
            border: `1.5px solid ${theme.accentGold}`,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Subtle top color bar inside the white canvas */}
          <div
            style={{
              height: '4px',
              width: '100%',
              background: `linear-gradient(90deg, ${theme.deepDark} 0%, ${theme.primary} 52%, ${theme.bright} 100%)`,
              flexShrink: 0,
            }}
          />

          {/* SECTION 1: TERMS & CONDITIONS + 3 BULLETS */}
          <div style={{ padding: '18px 20px 0', position: 'relative', zIndex: 2 }}>
            <h3
              style={{
                margin: 0,
                textAlign: 'center',
                fontSize: '15px',
                fontWeight: 800,
                letterSpacing: '0.07em',
                wordSpacing: '2px',
                color: theme.primary,
                textTransform: 'uppercase',
              }}
            >
              TERMS &amp; CONDITIONS
            </h3>
            <div
              style={{
                width: '48px',
                height: '2.5px',
                borderRadius: '999px',
                backgroundColor: theme.accentGold,
                margin: '6px auto 12px',
              }}
            />

            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '6.5px',
              }}
            >
              {terms.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '10.1px',
                    fontWeight: 500,
                    lineHeight: 1.46,
                    color: '#253847',
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '999px',
                      backgroundColor: theme.deepDark,
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 2: LAUREL WREATH CREST (LEFT) + SIGNATURE AUTHORITY & SIGNATURE (RIGHT) */}
          <div
            style={{
              marginTop: '16px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* Academic Laurel Wreath cradling the School Logo */}
            <div
              style={{
                position: 'relative',
                width: '104px',
                height: '94px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="104"
                height="94"
                viewBox="0 0 110 100"
                fill="none"
                style={{ position: 'absolute', inset: 0 }}
              >
                {/* Left curved laurel stem */}
                <path
                  d="M49 88C24 82 14 62 16 40C18 22 30 11 45 7"
                  stroke={theme.deepDark}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                {/* Left laurel leaves */}
                <g fill={theme.deepDark}>
                  <ellipse cx="38" cy="11" rx="6" ry="2.6" transform="rotate(-22 38 11)" />
                  <ellipse cx="27" cy="18" rx="6.2" ry="2.7" transform="rotate(-40 27 18)" />
                  <ellipse cx="20" cy="28" rx="6.3" ry="2.7" transform="rotate(-60 20 28)" />
                  <ellipse cx="16" cy="40" rx="6.4" ry="2.8" transform="rotate(-80 16 40)" />
                  <ellipse cx="17" cy="53" rx="6.4" ry="2.8" transform="rotate(-100 17 53)" />
                  <ellipse cx="22" cy="66" rx="6.3" ry="2.7" transform="rotate(-122 22 66)" />
                  <ellipse cx="31" cy="77" rx="6.2" ry="2.7" transform="rotate(-145 31 77)" />
                  <ellipse cx="42" cy="84" rx="5.8" ry="2.5" transform="rotate(-165 42 84)" />
                </g>
                <g fill={theme.primary}>
                  <ellipse cx="33" cy="24" rx="5" ry="2.2" transform="rotate(14 33 24)" />
                  <ellipse cx="27" cy="36" rx="5.2" ry="2.3" transform="rotate(-4 27 36)" />
                  <ellipse cx="26" cy="49" rx="5.2" ry="2.3" transform="rotate(-22 26 49)" />
                  <ellipse cx="30" cy="61" rx="5.1" ry="2.3" transform="rotate(-42 30 61)" />
                  <ellipse cx="38" cy="71" rx="4.9" ry="2.2" transform="rotate(-62 38 71)" />
                </g>

                {/* Right curved laurel stem */}
                <path
                  d="M61 88C86 82 96 62 94 40C92 22 80 11 65 7"
                  stroke={theme.deepDark}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                {/* Right laurel leaves */}
                <g fill={theme.deepDark}>
                  <ellipse cx="72" cy="11" rx="6" ry="2.6" transform="rotate(22 72 11)" />
                  <ellipse cx="83" cy="18" rx="6.2" ry="2.7" transform="rotate(40 83 18)" />
                  <ellipse cx="90" cy="28" rx="6.3" ry="2.7" transform="rotate(60 90 28)" />
                  <ellipse cx="94" cy="40" rx="6.4" ry="2.8" transform="rotate(80 94 40)" />
                  <ellipse cx="93" cy="53" rx="6.4" ry="2.8" transform="rotate(100 93 53)" />
                  <ellipse cx="88" cy="66" rx="6.3" ry="2.7" transform="rotate(122 88 66)" />
                  <ellipse cx="79" cy="77" rx="6.2" ry="2.7" transform="rotate(145 79 77)" />
                  <ellipse cx="68" cy="84" rx="5.8" ry="2.5" transform="rotate(165 68 84)" />
                </g>
                <g fill={theme.primary}>
                  <ellipse cx="77" cy="24" rx="5" ry="2.2" transform="rotate(-14 77 24)" />
                  <ellipse cx="83" cy="36" rx="5.2" ry="2.3" transform="rotate(4 83 36)" />
                  <ellipse cx="84" cy="49" rx="5.2" ry="2.3" transform="rotate(22 84 49)" />
                  <ellipse cx="80" cy="61" rx="5.1" ry="2.3" transform="rotate(42 80 61)" />
                  <ellipse cx="72" cy="71" rx="4.9" ry="2.2" transform="rotate(62 72 71)" />
                </g>

                {/* Gold bottom star accent */}
                <circle cx="55" cy="89" r="3" fill={theme.accentGold} />
              </svg>

              {/* School Logo nestled inside the laurel wreath */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '48px',
                  height: '48px',
                  borderRadius: '999px',
                  backgroundColor: '#FFFFFF',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                }}
              >
                <img
                  src={logoSrc}
                  alt={schoolName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            </div>

            {/* Right: Signature Authority + Principal + Flowing Dark-Ink Signature */}
            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: theme.deepDark,
                  letterSpacing: '0.01em',
                }}
              >
                Signature Authority
              </div>
              <div
                style={{
                  marginTop: '1px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: theme.primary,
                }}
              >
                {authorityTitle}
              </div>

              {/* Expressive calligraphic vector ink signature */}
              <svg
                width="136"
                height="48"
                viewBox="0 0 144 50"
                fill="none"
                style={{ margin: '4px auto 0', display: 'block' }}
              >
                <path
                  d="M14 34C10 21 28 7 45 9C55 10 50 25 36 30C24 35 16 32 23 24C30 17 44 19 42 29C40 37 51 20 57 23C62 25 56 33 64 28C71 23 76 17 79 25C82 32 88 21 95 25C101 29 108 18 117 21C124 23 116 33 107 32C98 31 114 29 128 24"
                  stroke={theme.deepDark}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M28 41C54 35 88 33 122 36"
                  stroke={theme.primary}
                  strokeWidth="1.15"
                  strokeLinecap="round"
                  strokeOpacity="0.85"
                />
              </svg>
            </div>
          </div>

          {/* SECTION 3: ICON-LED INSTITUTION CONTACT DETAILS (NO SCHOOL PHONE NUMBER) */}
          <div
            style={{
              marginTop: '16px',
              padding: '0 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '7.5px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* Campus Address */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: theme.primary,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10z" />
                  <circle cx="12" cy="11" r="2.2" />
                </svg>
              </span>
              <span
                style={{
                  fontSize: '9.6px',
                  fontWeight: 600,
                  color: '#253847',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {shortAddress}
              </span>
            </div>

            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: theme.bright,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </span>
              <span
                style={{
                  fontSize: '9.6px',
                  fontWeight: 600,
                  color: '#253847',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {schoolEmail}
              </span>
            </div>

            {/* Validity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: theme.accentGold,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M8 2v4M16 2v4M3 10h18" />
                </svg>
              </span>
              <span style={{ fontSize: '9.6px', fontWeight: 700, color: theme.deepDark }}>
                Valid Thru: {validThru}
              </span>
            </div>

            {/* Website */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: theme.deepDark,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                </svg>
              </span>
              <span
                style={{
                  fontSize: '9.6px',
                  fontWeight: 600,
                  color: theme.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {websiteDisplay}
              </span>
            </div>
          </div>

          {/* SECTION 4: BOTTOM-LEFT VIEWFINDER QR CODE + BOTTOM-RIGHT OPEN BOOK GRAPHIC */}
          <div
            style={{
              marginTop: 'auto',
              position: 'relative',
              height: '122px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: '0 0 14px 20px',
              boxSizing: 'border-box',
            }}
          >
            {/* Bottom-Left: Real Scannable QR inside 4 Viewfinder Corner Brackets */}
            <div
              style={{
                position: 'relative',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  padding: '7px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {/* 4 L-shaped viewfinder corner brackets */}
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '13px',
                    height: '13px',
                    borderTop: `2.5px solid ${theme.deepDark}`,
                    borderLeft: `2.5px solid ${theme.deepDark}`,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '13px',
                    height: '13px',
                    borderTop: `2.5px solid ${theme.deepDark}`,
                    borderRight: `2.5px solid ${theme.deepDark}`,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '13px',
                    height: '13px',
                    borderBottom: `2.5px solid ${theme.deepDark}`,
                    borderLeft: `2.5px solid ${theme.deepDark}`,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '13px',
                    height: '13px',
                    borderBottom: `2.5px solid ${theme.deepDark}`,
                    borderRight: `2.5px solid ${theme.deepDark}`,
                  }}
                />

                <ScannableQrCode
                  value={verificationUrl}
                  size={74}
                  level="M"
                  quietZoneModules={2}
                  fgColor="#0B1F3A"
                  bgColor="#FFFFFF"
                />
              </div>
              <span
                style={{
                  marginTop: '4px',
                  fontSize: '7.4px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: theme.primary,
                  textTransform: 'uppercase',
                }}
              >
                SCAN TO VERIFY
              </span>
            </div>

            {/* Bottom-Right: Iconic Stylized Open Book Vector Graphic in Active Theme */}
            <svg
              width="162"
              height="112"
              viewBox="0 0 170 116"
              fill="none"
              style={{
                position: 'absolute',
                right: '-6px',
                bottom: '-6px',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {/* Soft tinted book page fill */}
              <path
                d="M32 114L14 48C38 35 68 33 90 48C108 26 138 14 166 18L172 116H32Z"
                fill={theme.softAura}
                fillOpacity="0.45"
              />
              {/* Crisp open book bold outline (matching reference silhouette in theme colors) */}
              <path
                d="M30 114L12 46C38 31 70 29 92 46C110 22 140 10 168 15"
                stroke={theme.deepDark}
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Center book spine crease */}
              <path
                d="M92 46L108 114"
                stroke={theme.primary}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Gold subtle bookmark accent */}
              <path
                d="M114 38L124 72L130 62L139 68L128 32"
                fill={theme.accentGold}
                fillOpacity="0.9"
              />
              {/* Lower curved accent hill inside book */}
              <path
                d="M114 114C124 94 146 84 172 86V116H114Z"
                fill={theme.deepDark}
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }
);

StudentIdCardBack.displayName = 'StudentIdCardBack';
