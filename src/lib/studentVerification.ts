import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { clampStr } from './grading';
import { MAX_PORTRAIT_IMAGE_LEN, sanitizeImageUrlForFirestore } from './imageUpload';
import { PDF_STUDENTS_ROSTER } from './pdfStudentsRoster';
import type { StudentRecord } from '../types';

export interface PublicStudentVerificationRecord {
  studentIdCode: string;
  studentDocId: string;
  name: string;
  className: string;
  section: string;
  shift: string;
  group: string;
  rollNumber: string;
  status: 'Active' | 'Inactive' | 'Graduated';
  admissionYear: string;
  photoUrl: string;
  source?: 'firestore' | 'roster';
}

export type ExamShortCode = 'first' | 'half' | 'annual' | 'test';

const EXAM_SHORT_LABEL_BN: Record<ExamShortCode, string> = {
  first: '১ম সাময়িক পরীক্ষা',
  half: 'অর্ধবার্ষিক পরীক্ষা',
  annual: 'বার্ষিক পরীক্ষা',
  test: 'টেস্ট পরীক্ষা',
};

/**
 * Sanitizes a studentIdCode into a Firestore-safe document ID matching `isValidId`
 * in firestore.rules (`^[a-zA-Z0-9_-]{1,32}$`).
 */
export function sanitizeVerificationDocId(rawCode: string): string {
  const cleaned = String(rawCode || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.slice(0, 32);
}

/**
 * Maps an exam name (Bengali or English) to a compact ASCII query code so QR URLs stay
 * short, low-density, and effortlessly scannable even when printed at small sizes.
 */
export function encodeExamShortCode(examName?: string): ExamShortCode | null {
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

export function decodeExamLabel(shortCode?: string | null, rawExam?: string | null): string | null {
  if (shortCode && shortCode in EXAM_SHORT_LABEL_BN) {
    return EXAM_SHORT_LABEL_BN[shortCode as ExamShortCode];
  }
  if (rawExam && rawExam.trim()) {
    return rawExam.trim().slice(0, 80);
  }
  return null;
}

/**
 * Builds the relative app path for verifying a student online (for React Router `<Link>`).
 */
export function buildStudentVerificationPath(
  studentIdCode: string,
  extra?: { examName?: string; academicYear?: string }
): string {
  const codeId = sanitizeVerificationDocId(studentIdCode);
  const params = new URLSearchParams();
  if (codeId) params.set('id', codeId);

  const shortExam = encodeExamShortCode(extra?.examName);
  if (shortExam) {
    params.set('e', shortExam);
  }
  const yearClean = String(extra?.academicYear || '')
    .replace(/[^0-9]/g, '')
    .slice(0, 4);
  if (yearClean) {
    params.set('y', yearClean);
  }

  return `/verify?${params.toString()}`;
}

/**
 * Builds the full live absolute URL encoded inside scannable QR codes on Admit Cards & ID Cards.
 */
export function buildStudentVerificationUrl(
  studentIdCode: string,
  extra?: { examName?: string; academicYear?: string; fallbackOrigin?: string }
): string {
  const path = buildStudentVerificationPath(studentIdCode, extra);
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : (extra?.fallbackOrigin || 'https://shahislamicschool.com').replace(/\/+$/, '');
  return `${origin}${path}`;
}

function toZeroPiiVerificationPayload(student: StudentRecord, codeId: string) {
  return {
    studentIdCode: codeId,
    studentDocId: clampStr(student.id, 64),
    name: clampStr(student.name, 120),
    className: clampStr(student.className, 40),
    section: clampStr(student.section || 'Padma', 40),
    shift: clampStr(student.shift || 'Morning', 20),
    group: clampStr(student.group || 'General', 40),
    rollNumber: clampStr(student.rollNumber, 20),
    status:
      student.status === 'Graduated' || student.status === 'Inactive' ? student.status : 'Active',
    admissionYear: clampStr(student.admissionYear || '2026', 10),
    photoUrl: sanitizeImageUrlForFirestore(student.photoUrl, MAX_PORTRAIT_IMAGE_LEN),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Syncs a single student's public zero-PII verification record into Firestore.
 * Called automatically when admins create, update, or promote a student.
 */
export async function upsertStudentVerification(student: StudentRecord): Promise<void> {
  const codeId = sanitizeVerificationDocId(student.studentIdCode);
  if (!codeId || !student.id) return;
  try {
    await setDoc(
      doc(db, 'student_verifications', codeId),
      toZeroPiiVerificationPayload(student, codeId)
    );
  } catch {
    // Non-blocking: verification sync must not disrupt core student save UX
  }
}

/**
 * Removes a student's verification entry when the student record is deleted.
 */
export async function deleteStudentVerification(studentIdCode: string): Promise<void> {
  const codeId = sanitizeVerificationDocId(studentIdCode);
  if (!codeId) return;
  try {
    await deleteDoc(doc(db, 'student_verifications', codeId));
  } catch {
    // Ignore if verification doc never existed
  }
}

/**
 * Idempotently syncs all students into `student_verifications` in Firestore batches.
 * Ensures every existing student's QR code resolves live online.
 */
export async function syncAllStudentVerifications(students: StudentRecord[]): Promise<number> {
  const valid = students.filter((s) => Boolean(s.id && sanitizeVerificationDocId(s.studentIdCode)));
  if (valid.length === 0) return 0;

  let synced = 0;
  const CHUNK = 400;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const slice = valid.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    for (const stu of slice) {
      const codeId = sanitizeVerificationDocId(stu.studentIdCode);
      if (!codeId) continue;
      batch.set(
        doc(db, 'student_verifications', codeId),
        toZeroPiiVerificationPayload(stu, codeId)
      );
      synced += 1;
    }
    await batch.commit();
  }
  return synced;
}

/**
 * Public unauthenticated lookup by student ID code.
 * 1) Checks Firestore `student_verifications/{codeId}` (exact & uppercase)
 * 2) Falls back to official school roster (`PDF_STUDENTS_ROSTER`, zero-PII) so all 131
 *    enrolled students verify immediately even before first admin batch sync.
 */
export async function lookupStudentVerification(
  rawCode: string
): Promise<PublicStudentVerificationRecord | null> {
  const codeId = sanitizeVerificationDocId(rawCode);
  if (!codeId) return null;

  const candidates = Array.from(new Set([codeId, codeId.toUpperCase()]));

  for (const candidate of candidates) {
    try {
      const snap = await getDoc(doc(db, 'student_verifications', candidate));
      if (snap.exists()) {
        const d = snap.data();
        return {
          studentIdCode: String(d.studentIdCode || candidate),
          studentDocId: String(d.studentDocId || ''),
          name: String(d.name || ''),
          className: String(d.className || ''),
          section: String(d.section || 'Padma'),
          shift: String(d.shift || 'Morning'),
          group: String(d.group || 'General'),
          rollNumber: String(d.rollNumber || ''),
          status:
            d.status === 'Graduated' || d.status === 'Inactive' ? d.status : 'Active',
          admissionYear: String(d.admissionYear || '2026'),
          photoUrl: String(d.photoUrl || ''),
          source: 'firestore',
        };
      }
    } catch {
      // Continue to next candidate or fallback roster
    }
  }

  // Fallback to non-PII official roster
  const lower = codeId.toLowerCase();
  const rosterMatch = PDF_STUDENTS_ROSTER.find(
    (entry) => sanitizeVerificationDocId(entry.studentIdCode).toLowerCase() === lower
  );

  if (rosterMatch) {
    return {
      studentIdCode: rosterMatch.studentIdCode,
      studentDocId: rosterMatch.docId,
      name: rosterMatch.name,
      className: rosterMatch.className,
      section: 'Padma',
      shift: 'Morning',
      group: 'General',
      rollNumber: rosterMatch.rollNumber,
      status: 'Active',
      admissionYear: '2026',
      photoUrl: '',
      source: 'roster',
    };
  }

  return null;
}
