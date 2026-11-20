import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { clampStr } from './grading';
import { BD_CLASSES, type StudentRecord } from '../types';

export interface PdfStudentEntry {
  docId: string;
  studentIdCode: string;
  rollNumber: string;
  name: string;
  className: (typeof BD_CLASSES)[number];
  gender: 'Male' | 'Female';
}

interface RawClassRoster {
  className: (typeof BD_CLASSES)[number];
  codePrefix: string;
  docPrefix: string;
  rows: Array<[roll: string, name: string, gender: 'Male' | 'Female']>;
}

const RAW_PDF_ROSTERS: RawClassRoster[] = [
  {
    className: 'Play Group',
    codePrefix: 'PG',
    docPrefix: 'pg',
    rows: [
      ['01', 'মোঃ আব্দুল্লাহ ইবনে ওমর', 'Male'],
      ['02', 'মোঃ আব্দুল্লা আল সুদাইস', 'Male'],
      ['03', 'মোঃ আহনাফ খালিদ রাফি', 'Male'],
      ['04', 'আঁইয়াদ ভূইয়া রুশদ', 'Male'],
      ['05', 'মোঃ বাইয়ান জারিফ', 'Male'],
      ['06', 'মুহাম্মদ রাইয়ান', 'Male'],
      ['08', 'মোছাঃ নাজিফা আক্তার', 'Female'],
      ['09', 'আব্দুল আহাদ', 'Male'],
      ['10', 'রুফাইদা জান্নাত রাইফা', 'Female'],
      ['11', 'সিদরাতুল মুনতাহা (সাফা)', 'Female'],
      ['12', 'সাফওয়াত রওহা সাজীম', 'Female'],
      ['13', 'শোয়াইব হাসান', 'Male'],
      ['14', 'সালেহ শুহাইব সাহাম', 'Male'],
      ['15', 'আব্রাহাম হাসান আয়াত', 'Male'],
      ['16', 'ইরফান হাসান ইউশা', 'Male'],
      ['17', 'ফাইরুজ সারাহ মনি', 'Female'],
      ['18', 'ফাহিম আহম্মেদ রাইয়ান', 'Male'],
      ['19', 'তাহমিদ হাসান নূর', 'Male'],
      ['20', 'আজওয়া তাসমিন', 'Female'],
      ['21', 'মোঃ তাওহীদ ওমর সরকার', 'Male'],
    ],
  },
  {
    className: 'Nursery',
    codePrefix: 'NR',
    docPrefix: 'nr',
    rows: [
      ['01', 'মোছাঃ আলিয়া জান্নাত', 'Female'],
      ['02', 'মোহাম্মদ তাইমুর ইসলাম', 'Male'],
      ['03', 'মোঃ রজব ইবনাত শুহাদ', 'Male'],
      ['04', 'মোছাঃ আরওয়া জান্নাত আরজা', 'Female'],
      ['05', 'মোছাঃ আসমাউল হুসনা আকসা', 'Female'],
      ['06', 'মোঃ জুনাইদ সরকার নুর', 'Male'],
      ['07', 'মোঃ শাহ ওয়ালি উল্লাহ', 'Male'],
      ['08', 'তায়্যিবা হুর সিজদাহ', 'Female'],
      ['09', 'মোঃ ফারহান সাদিক', 'Male'],
      ['10', 'মোঃ জান্নাতুল ফিরদাউস', 'Male'],
      ['11', 'মোছাঃ সাইয়ারা সরকার রওজা', 'Female'],
      ['12', 'মোছাঃ উম্মে আমারা রদীয়াহ', 'Female'],
      ['13', 'মুবাশ্বিরা মাহমুদ আতিক', 'Female'],
      ['14', 'সিদরাতুল মুনতাহা আভা', 'Female'],
      ['16', 'মোঃ আল বেরুনী সরকার', 'Male'],
      ['17', 'ইয়ানুর সরদার হাবিব', 'Male'],
      ['18', 'মোঃ সোলাইমান হাসান', 'Male'],
      ['19', 'মোছাঃ মাহিয়া আক্তার সূরা', 'Female'],
      ['20', 'শাহ্ ইসমাঈল', 'Male'],
      ['21', 'মোঃ আমির হামজা', 'Male'],
      ['22', 'মোঃ রিসালাত সরকার', 'Male'],
      ['23', 'মোছাঃ ওরিশা পিয়াল', 'Female'],
      ['24', 'মোঃ কুরাইশ ইবনে সাইম', 'Male'],
      ['25', 'মোছাঃ নুসরাত জাহান নুহা', 'Female'],
      ['26', 'মোছাঃ আইরা জান্নাত তাইবা', 'Female'],
    ],
  },
  {
    className: 'KG',
    codePrefix: 'KG',
    docPrefix: 'kg',
    rows: [
      ['01', 'মোছাঃ মনিকা আক্তার', 'Female'],
      ['02', 'মোঃ সিয়াম ইসলাম', 'Male'],
      ['03', 'মোছাঃ সামিয়া মেহেজাবিন', 'Female'],
      ['04', 'মোছাঃ মিফতাহুল জান্নাত', 'Female'],
      ['05', 'মোঃ আব্দুল্লাহ সরকার', 'Male'],
      ['06', 'নুসরাত জাহান মাইসা', 'Female'],
      ['07', 'মোঃ মুইন নাদিম', 'Male'],
      ['08', 'মোছাঃ মিম আক্তার', 'Female'],
      ['09', 'ইহসান আলী রেহান', 'Male'],
      ['10', 'রিয়াজুল ইসলাম জাবির', 'Male'],
      ['12', 'মোছাঃ আয়শা আক্তার সুমাইয়া', 'Female'],
    ],
  },
  {
    className: 'Class 1',
    codePrefix: 'C1',
    docPrefix: 'c1',
    rows: [
      ['01', 'মোছাঃ নুসরাত জাহান মারিয়া', 'Female'],
      ['02', 'মোছাঃ জান্নাতুল মাওয়া', 'Female'],
      ['03', 'কানিজ ফাতেমা', 'Female'],
      ['04', 'সালমান', 'Male'],
      ['05', 'আবু বকর সিদ্দিক', 'Male'],
      ['06', 'মোঃ আব্দুল আহাদ', 'Male'],
      ['07', 'কাওসার', 'Male'],
      ['08', 'উম্মে মনিরা জান্নাত', 'Female'],
      ['09', 'নাসির উদ্দীন', 'Male'],
      ['10', 'মোঃ ফারহান সাদিক আরাফ', 'Male'],
      ['11', 'মাহফুজ হোসেন সাদ', 'Male'],
      ['12', 'মোঃ তহা', 'Male'],
      ['13', 'রোদেলা তাবাসসুম রুম্পা', 'Female'],
      ['14', 'মোঃ বায়েজিদ সরকার', 'Male'],
      ['15', 'মোছাঃ তহমিনা আকতার', 'Female'],
      ['16', 'নাবির আল মাহমুদ', 'Male'],
      ['17', 'আব্দুল্লাহ আল সাফী', 'Male'],
    ],
  },
  {
    className: 'Class 2',
    codePrefix: 'C2',
    docPrefix: 'c2',
    rows: [
      ['01', 'মোছাঃ সাবিহা ইসলাম সিনতি', 'Female'],
      ['02', 'মোঃ আবু সাইদ সরকার', 'Male'],
      ['03', 'রিফাত আহমেদ', 'Male'],
      ['04', 'মোঃ ছাকিফ আহমাদ রাফিদ', 'Male'],
      ['05', 'তাসনুভা জান্নাত', 'Female'],
      ['06', 'মোঃ জোনায়েদ আহমেদ', 'Male'],
      ['07', 'মোঃ মোন্তাসিন বিল্লা (সিন)', 'Male'],
      ['08', 'মোঃ আদিল আহনাফ', 'Male'],
      ['09', 'মোঃ ইনসান হোসেন ফাহিম', 'Male'],
      ['10', 'মোঃ ফজাইল আহম্মদ ফাইজ', 'Male'],
      ['11', 'মোছাঃ শাহরিয়ার জাহান লাবন্য', 'Female'],
      ['12', 'মোঃ সোয়াইব হাসান সৌরভ', 'Male'],
      ['13', 'মোঃ জীম হোসেন প্রান্ত', 'Male'],
      ['14', 'শাহ্ নূরে সাবীলা প্রাপ্তি', 'Female'],
      ['15', 'হুমায়রা হাকিম', 'Female'],
      ['16', 'রেশমা আক্তার রুহি', 'Female'],
    ],
  },
  {
    className: 'Class 3',
    codePrefix: 'C3',
    docPrefix: 'c3',
    rows: [
      ['01', 'মোঃ আল আমিন', 'Male'],
      ['02', 'মোছাঃ মাহি আক্তার', 'Female'],
      ['03', 'মোঃ সিনান আহম্মেদ সিনান', 'Male'],
      ['04', 'মোঃ রিসালাত উম্মন রোহান', 'Male'],
      ['05', 'মোছাঃ মিফতাহুল জান্নাত', 'Female'],
      ['06', 'মোছাঃ হুমায়রা সরকার', 'Female'],
      ['07', 'মোঃ আলিফ সরকার', 'Male'],
      ['08', 'মোছাঃ মরিয়ম আক্তার মিম', 'Female'],
      ['09', 'মোছাঃ ফারিহা তাবাসসুম রুহি', 'Female'],
      ['10', 'মোঃ ইশা ইসলাম', 'Male'],
      ['11', 'মোছাঃ নুসরাত জাহান', 'Female'],
      ['12', 'মোঃ আব্দুর নূর শেখ', 'Male'],
      ['13', 'মোঃ স্পিতু প্রধাণ', 'Male'],
      ['14', 'মোঃ রাফি মিয়া', 'Male'],
      ['15', 'মোঃ মোরসালিন আকন্দ অন্তিম', 'Male'],
      ['16', 'মোছাঃ ইছামনি রুম্মানা', 'Female'],
      ['17', 'মোছাঃ জান্নাতুল মাওয়া', 'Female'],
      ['18', 'সাজেদুল ইসলাম তাওহীদ', 'Male'],
    ],
  },
  {
    className: 'Class 4',
    codePrefix: 'C4',
    docPrefix: 'c4',
    rows: [
      ['01', 'কাওছার ইসলাম কাছাছ', 'Male'],
      ['02', 'আবু হুজাইফা সিফাত', 'Male'],
      ['04', 'লামিয়া আক্তার সাফিয়া', 'Female'],
      ['05', 'খাদিজা আক্তার', 'Female'],
      ['06', 'জান্নাতুল ফেরদৌসি', 'Female'],
      ['07', 'সুবাত তাসনীম রাইসা', 'Female'],
      ['08', 'সুমাইয়া জান্নাত সুম', 'Female'],
      ['09', 'আদিবা জান্নাত', 'Female'],
      ['10', 'রাফিয়া তাবাচ্ছুম নিশি', 'Female'],
      ['11', 'আবু সাইদ হাওলাদার', 'Male'],
      ['12', 'আল আমিন', 'Male'],
    ],
  },
  {
    className: 'Class 5',
    codePrefix: 'C5',
    docPrefix: 'c5',
    rows: [
      ['01', 'মোছাঃ তাসনিমা আক্তার', 'Female'],
      ['02', 'মোঃ মুঈন মিয়া', 'Male'],
      ['03', 'মোঃ আল-আমিন', 'Male'],
      ['04', 'মোঃ খন্দকার তৌফিক', 'Male'],
      ['05', 'মোঃ দিদার খন্দকার', 'Male'],
      ['06', 'মোঃ হাসান মন্ডল', 'Male'],
      ['07', 'মোঃ জিন্নাতুল ইসলাম', 'Male'],
      ['08', 'মোঃ সাবিত আল হাসান', 'Male'],
      ['09', 'মোঃ রহিদ সরকার', 'Male'],
      ['10', 'মোছাঃ জোনাইনা তাসনিম', 'Female'],
      ['11', 'সিদরাতুর মুনতাহা তুণা', 'Female'],
      ['12', 'আব্দুল্লাহ আল জুনায়েদ', 'Male'],
      ['13', 'আব্দুল্লাহ আল আরাফাত', 'Male'],
    ],
  },
];

export const PDF_STUDENTS_ROSTER: PdfStudentEntry[] = RAW_PDF_ROSTERS.flatMap((cls) =>
  cls.rows.map(([roll, name, gender]) => ({
    docId: `stu_sisc_2026_${cls.docPrefix}_${roll}`,
    studentIdCode: `SISC-2026-${cls.codePrefix}-${roll}`,
    rollNumber: roll,
    name,
    className: cls.className,
    gender,
  }))
);

export const PDF_ROSTER_SYNC_KEY = 'sisc_pdf_students_synced_2026_v1';

export function compareStudentsAcademic(a: StudentRecord, b: StudentRecord): number {
  const idxA = BD_CLASSES.indexOf(a.className as (typeof BD_CLASSES)[number]);
  const idxB = BD_CLASSES.indexOf(b.className as (typeof BD_CLASSES)[number]);
  const orderA = idxA === -1 ? 999 : idxA;
  const orderB = idxB === -1 ? 999 : idxB;
  if (orderA !== orderB) return orderA - orderB;

  const numA = parseInt(a.rollNumber, 10);
  const numB = parseInt(b.rollNumber, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.rollNumber.localeCompare(b.rollNumber);
}

/**
 * Safely syncs all 131 verified students from the school's official PDF roster into Firestore.
 * Existing documents (matching docId or className + rollNumber + name) are skipped so
 * manual edits (guardian info, father/mother name, etc.) are never overwritten.
 */
export async function syncPdfStudentsToFirestore(): Promise<{
  added: number;
  skipped: number;
  total: number;
}> {
  try {
    const snap = await getDocs(collection(db, 'students'));
    const existingIds = new Set<string>();
    const existingFingerprints = new Set<string>();

    snap.docs.forEach((d) => {
      existingIds.add(d.id);
      const data = d.data() as Partial<StudentRecord>;
      const normRoll = String(parseInt(String(data.rollNumber || ''), 10) || data.rollNumber || '');
      existingFingerprints.add(`${data.className || ''}|${normRoll}|${(data.name || '').trim()}`);
    });

    const missing = PDF_STUDENTS_ROSTER.filter((entry) => {
      if (existingIds.has(entry.docId)) return false;
      const normRoll = String(parseInt(entry.rollNumber, 10) || entry.rollNumber);
      const fp = `${entry.className}|${normRoll}|${entry.name.trim()}`;
      return !existingFingerprints.has(fp);
    });

    if (missing.length === 0) {
      return { added: 0, skipped: PDF_STUDENTS_ROSTER.length, total: PDF_STUDENTS_ROSTER.length };
    }

    const CHUNK_SIZE = 400;
    for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
      const chunk = missing.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const entry of chunk) {
        batch.set(doc(db, 'students', entry.docId), {
          studentIdCode: clampStr(entry.studentIdCode, 32),
          rollNumber: clampStr(entry.rollNumber, 20),
          name: clampStr(entry.name, 120),
          nameBn: clampStr(entry.name, 120),
          fatherName: '',
          motherName: '',
          photoUrl: '',
          className: entry.className,
          section: 'Padma',
          shift: 'Morning',
          group: 'General',
          gender: entry.gender,
          dateOfBirth: '',
          guardianName: 'তথ্য হালনাগাদযোগ্য',
          guardianPhone: 'তথ্য নেই',
          address: '',
          bloodGroup: '',
          status: 'Active',
          admissionYear: '2026',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    return {
      added: missing.length,
      skipped: PDF_STUDENTS_ROSTER.length - missing.length,
      total: PDF_STUDENTS_ROSTER.length,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'students');
    throw err;
  }
}
