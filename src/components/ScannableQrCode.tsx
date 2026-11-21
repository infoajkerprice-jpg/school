import React, { useMemo } from 'react';
import QRCode from 'qrcode';

export interface ScannableQrCodeProps {
  /** Exact URL or text payload to encode as a real ISO/IEC 18004 QR Code */
  value: string;
  /** Rendered square pixel dimension */
  size?: number;
  /** Error correction level: 'L' | 'M' | 'Q' | 'H' (default 'M' balances density & resilience) */
  level?: 'L' | 'M' | 'Q' | 'H';
  /** Quiet-zone margin in QR modules (standard recommends >= 2 for reliable camera scans) */
  quietZoneModules?: number;
  /** Foreground module color (pure black '#000000' gives best scan reliability on print & screens) */
  fgColor?: string;
  /** Background color (pure white '#FFFFFF' gives highest contrast) */
  bgColor?: string;
  /** Optional inline wrapper style overrides */
  style?: React.CSSProperties;
}

/**
 * Synchronous, ISO/IEC 18004 compliant QR code rendered as a single crisp SVG path.
 * Renders immediately on frame 1 (critical for offscreen html-to-image PDF exports)
 * and scans reliably with native iOS/Android camera apps and QR scanners.
 */
export const ScannableQrCode: React.FC<ScannableQrCodeProps> = ({
  value,
  size = 68,
  level = 'M',
  quietZoneModules = 2,
  fgColor = '#000000',
  bgColor = '#FFFFFF',
  style,
}) => {
  const { pathD, totalModules } = useMemo(() => {
    const safePayload = (value || 'https://shahislamicschool.com/verify').trim();
    try {
      const qr = QRCode.create(safePayload, { errorCorrectionLevel: level });
      const count = qr.modules.size;
      const qz = Math.max(1, quietZoneModules);
      const segments: string[] = [];

      for (let y = 0; y < count; y++) {
        for (let x = 0; x < count; x++) {
          if (qr.modules.get(y, x)) {
            segments.push(`M${x + qz},${y + qz}h1v1h-1z`);
          }
        }
      }

      return {
        pathD: segments.join(''),
        totalModules: count + qz * 2,
      };
    } catch {
      return { pathD: '', totalModules: 25 };
    }
  }, [value, level, quietZoneModules]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalModules} ${totalModules}`}
      role="img"
      aria-label={`QR Code: ${value}`}
      shapeRendering="crispEdges"
      style={{
        display: 'block',
        backgroundColor: bgColor,
        flexShrink: 0,
        ...style,
      }}
    >
      <rect width={totalModules} height={totalModules} fill={bgColor} />
      {pathD ? <path d={pathD} fill={fgColor} /> : null}
    </svg>
  );
};
