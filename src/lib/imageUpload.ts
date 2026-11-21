/**
 * Client-side image compression & safe URL utilities for Computer & Mobile uploads.
 * Resizes and compresses photos directly in the browser via HTML5 Canvas so that:
 *  - High-megapixel mobile camera photos (5MB–15MB) compress cleanly in <1 second
 *  - Transparent PNG logos keep alpha transparency
 *  - Uploaded images persist reliably in Firestore and render offline/in PDFs with zero CORS errors
 */

export type ImageUploadPreset = 'portrait' | 'logo' | 'banner';

export const MAX_PORTRAIT_IMAGE_LEN = 150000;
export const MAX_LOGO_IMAGE_LEN = 180000;
export const MAX_BANNER_IMAGE_LEN = 260000;

const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024; // 15 MB raw input ceiling

interface PresetSpec {
  maxDimension: number;
  maxDataUrlLength: number;
  preserveTransparency: boolean;
}

const PRESET_SPECS: Record<ImageUploadPreset, PresetSpec> = {
  portrait: {
    maxDimension: 420,
    maxDataUrlLength: 142000,
    preserveTransparency: false,
  },
  logo: {
    maxDimension: 512,
    maxDataUrlLength: 172000,
    preserveTransparency: true,
  },
  banner: {
    maxDimension: 1200,
    maxDataUrlLength: 248000,
    preserveTransparency: false,
  },
};

export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  approxKb: number;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('ছবিটি পড়া যায়নি। অনুগ্রহ করে JPG, PNG বা WebP ফরম্যাটের ছবি নির্বাচন করুন।'));
    };
    img.src = objectUrl;
  });
}

function renderToCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  fillWhite: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ব্রাউজার ইমেজ প্রসেসিং সাপোর্ট করছে না।');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (fillWhite) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Validates, resizes, and compresses a File chosen from computer or mobile camera/gallery
 * into a crisp, Firestore-safe raster Data URL (`data:image/jpeg|png|webp;base64,...`).
 */
export async function processUploadedImage(
  file: File,
  preset: ImageUploadPreset = 'portrait'
): Promise<ProcessedImageResult> {
  if (!file) {
    throw new Error('কোনো ফাইল পাওয়া যায়নি।');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('শুধুমাত্র ছবি ফাইল (JPG, PNG, WebP) আপলোড করা যাবে।');
  }
  if (file.type === 'image/svg+xml') {
    throw new Error('নিরাপত্তার স্বার্থে SVG ফাইল অনুমোদিত নয়। অনুগ্রহ করে PNG বা JPG ছবি দিন।');
  }
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error('ছবির আকার ১৫ মেগাবাইটের কম হতে হবে।');
  }

  const spec = PRESET_SPECS[preset];
  const img = await loadImageFromFile(file);

  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;

  const scaleToDim = (maxDim: number) => {
    const ratio = Math.min(1, maxDim / Math.max(naturalW, naturalH));
    return {
      w: Math.max(1, Math.round(naturalW * ratio)),
      h: Math.max(1, Math.round(naturalH * ratio)),
    };
  };

  // Logo mode: try keeping alpha transparency via PNG first, then WebP, then scaled PNG
  if (spec.preserveTransparency) {
    const dims = [spec.maxDimension, 360, 256];
    for (const dim of dims) {
      const { w, h } = scaleToDim(dim);
      const canvas = renderToCanvas(img, w, h, false);

      const pngUrl = canvas.toDataURL('image/png');
      if (pngUrl.length <= spec.maxDataUrlLength) {
        return {
          dataUrl: pngUrl,
          width: w,
          height: h,
          approxKb: Math.max(1, Math.round((pngUrl.length * 3) / 4 / 1024)),
        };
      }

      for (const q of [0.9, 0.8, 0.7]) {
        const webpUrl = canvas.toDataURL('image/webp', q);
        if (webpUrl.startsWith('data:image/webp;base64,') && webpUrl.length <= spec.maxDataUrlLength) {
          return {
            dataUrl: webpUrl,
            width: w,
            height: h,
            approxKb: Math.max(1, Math.round((webpUrl.length * 3) / 4 / 1024)),
          };
        }
      }
    }
  }

  // Portrait & Banner modes (and fallback for ultra-complex logos): crisp progressive JPEG
  const dimSteps =
    preset === 'banner'
      ? [spec.maxDimension, 960, 760, 600]
      : [spec.maxDimension, 340, 260];
  const qualitySteps = [0.85, 0.78, 0.7, 0.6, 0.5];

  for (const dim of dimSteps) {
    const { w, h } = scaleToDim(dim);
    const canvas = renderToCanvas(img, w, h, true);
    for (const q of qualitySteps) {
      const jpegUrl = canvas.toDataURL('image/jpeg', q);
      if (jpegUrl.length <= spec.maxDataUrlLength) {
        return {
          dataUrl: jpegUrl,
          width: w,
          height: h,
          approxKb: Math.max(1, Math.round((jpegUrl.length * 3) / 4 / 1024)),
        };
      }
    }
  }

  throw new Error('ছবিটি অনেক বড় হওয়ায় অপটিমাইজ করা যায়নি। অনুগ্রহ করে অন্য একটি ছবি নির্বাচন করুন।');
}

/**
 * Validates and bounds an image URL or compressed raster Data URL before writing to Firestore.
 * Prevents truncating a base64 Data URL mid-stream and blocks unsafe URI schemes.
 */
export function sanitizeImageUrlForFirestore(
  value: string | undefined | null,
  maxLen: number
): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const isAllowedPrefix =
    trimmed.startsWith('/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/jpeg;base64,') ||
    trimmed.startsWith('data:image/png;base64,') ||
    trimmed.startsWith('data:image/webp;base64,');

  if (!isAllowedPrefix) {
    return '';
  }

  if (trimmed.length > maxLen) {
    // Never corrupt a base64 image by slicing it; reject oversized payloads cleanly
    return trimmed.startsWith('data:image/') ? '' : trimmed.slice(0, maxLen);
  }

  return trimmed;
}

export function isDataImageUrl(value?: string | null): boolean {
  return Boolean(value && value.startsWith('data:image/'));
}
