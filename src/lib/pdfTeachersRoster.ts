import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { clampStr } from './grading';
import type { FacultyPublic, TeacherHRRecord } from '../types';

export interface PdfTeacherEntry {
  order: number;
  facId: string;
  hrId: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  subject: string;
  qualification: string;
  bloodGroup: string;
  phone: string;
  email: string;
  shift: 'Morning' | 'Day' | 'Both';
}

export const PDF_TEACHERS_ROSTER: PdfTeacherEntry[] = [
  // Leadership & Department Heads
  {
    order: 1,
    facId: 'fac_sisc_2026_01',
    hrId: 'hr_sisc_2026_01',
    employeeId: 'SISC-AHT-01',
    name: 'Md. Monjurul Haque Sarker',
    designation: 'সহকারী প্রধান শিক্ষক',
    department: 'প্রশাসন ও একাডেমিক',
    subject: 'সাধারণ বিষয় ও একাডেমিক তত্ত্বাবধান',
    qualification: 'B.A, M.A',
    bloodGroup: 'O+',
    phone: '01723807256',
    email: 'তথ্য নেই',
    shift: 'Both',
  },
  {
    order: 2,
    facId: 'fac_sisc_2026_02',
    hrId: 'hr_sisc_2026_02',
    employeeId: '2025110803',
    name: 'Md. Shafiul Alam',
    designation: 'বিভাগীয় প্রধান (সাধারণ বিভাগ)',
    department: 'সাধারণ বিভাগ',
    subject: 'সাধারণ বিষয়',
    qualification: 'M.S.S, D.F.A',
    bloodGroup: 'O+',
    phone: '01728680141',
    email: 'mdshafiul621@gmail.com',
    shift: 'Both',
  },
  {
    order: 3,
    facId: 'fac_sisc_2026_03',
    hrId: 'hr_sisc_2026_03',
    employeeId: '2025110802',
    name: 'Md. Faysal Mahmud',
    designation: 'বিভাগীয় প্রধান (ইসলামিক বিভাগ)',
    department: 'ইসলামিক ও আরবি বিভাগ',
    subject: 'ইসলামিক স্টাডিজ ও কুরআন শিক্ষা',
    qualification: '',
    bloodGroup: 'A+',
    phone: '01630-139815',
    email: 'faysalmahmud863@gmail.com',
    shift: 'Both',
  },
  {
    order: 4,
    facId: 'fac_sisc_2026_04',
    hrId: 'hr_sisc_2026_04',
    employeeId: '2025110804',
    name: 'Md. Samiul Hakim',
    designation: 'প্রধান, প্রশাসন ও হিসাব বিভাগ',
    department: 'প্রশাসন ও হিসাব বিভাগ',
    subject: 'প্রশাসন ও হিসাব',
    qualification: 'M.B.A',
    bloodGroup: 'O+',
    phone: '01712872823',
    email: 'samiulhakim77@gmail.com',
    shift: 'Both',
  },
  {
    order: 5,
    facId: 'fac_sisc_2026_05',
    hrId: 'hr_sisc_2026_05',
    employeeId: '2025110805',
    name: 'Md. Noman Arifen',
    designation: 'বিভাগীয় প্রধান (আইটি বিভাগ)',
    department: 'আইটি বিভাগ',
    subject: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
    qualification: 'Daora Hadith / M.A',
    bloodGroup: 'O+',
    phone: '01306709064',
    email: 'mdsharon22@gmail.com',
    shift: 'Both',
  },

  // Assistant Teachers (General / Subject)
  {
    order: 6,
    facId: 'fac_sisc_2026_06',
    hrId: 'hr_sisc_2026_06',
    employeeId: '2025112001',
    name: 'Md. Asraful Islam',
    designation: 'সহকারী শিক্ষক',
    department: 'সাধারণ বিভাগ',
    subject: 'সাধারণ বিষয়',
    qualification: 'B.A, M.A',
    bloodGroup: 'O+',
    phone: '01749706254',
    email: 'asrafuldk01@gmail.com',
    shift: 'Both',
  },
  {
    order: 7,
    facId: 'fac_sisc_2026_07',
    hrId: 'hr_sisc_2026_07',
    employeeId: '2025112002',
    name: 'Md. Sazzad Jahir',
    designation: 'সহকারী শিক্ষক',
    department: 'বিজ্ঞান ও গণিত বিভাগ',
    subject: 'গণিত ও পরিসংখ্যান',
    qualification: 'B.Sc Honours (Statistics)',
    bloodGroup: 'O+',
    phone: '01789608481',
    email: 'sazzadjahir39@gmail.com',
    shift: 'Both',
  },
  {
    order: 8,
    facId: 'fac_sisc_2026_08',
    hrId: 'hr_sisc_2026_08',
    employeeId: '2025112004',
    name: 'Md. Mazedul Islam',
    designation: 'সহকারী শিক্ষক',
    department: 'হিসাব ও সাধারণ বিভাগ',
    subject: 'হিসাববিজ্ঞান ও গণিত',
    qualification: 'M.B.S (Accounting)',
    bloodGroup: 'A+',
    phone: '01720619262',
    email: 'mazedulsalman@gmail.com',
    shift: 'Both',
  },
  {
    order: 9,
    facId: 'fac_sisc_2026_09',
    hrId: 'hr_sisc_2026_09',
    employeeId: '2025112005',
    name: 'Md. Milon Hossain',
    designation: 'সহকারী শিক্ষক',
    department: 'বাংলা বিভাগ',
    subject: 'বাংলা',
    qualification: 'B.A Honours (Bangla)',
    bloodGroup: 'A+',
    phone: '01311-631729',
    email: 'iammilonhossain01@gmail.com',
    shift: 'Both',
  },
  {
    order: 10,
    facId: 'fac_sisc_2026_10',
    hrId: 'hr_sisc_2026_10',
    employeeId: '2025112007',
    name: 'Most. Mahafuza Sarker',
    designation: 'সহকারী শিক্ষক',
    department: 'সাধারণ বিভাগ',
    subject: 'সমাজবিজ্ঞান ও সাধারণ বিষয়',
    qualification: 'B.S.S (Honours)',
    bloodGroup: 'B+',
    phone: '01727-989103',
    email: 'fd.mahafuza@gmail.com',
    shift: 'Both',
  },
  {
    order: 11,
    facId: 'fac_sisc_2026_11',
    hrId: 'hr_sisc_2026_11',
    employeeId: '2025112008',
    name: 'Mst. Ripan Begum',
    designation: 'সহকারী শিক্ষক',
    department: 'সাধারণ বিভাগ',
    subject: 'সাধারণ বিষয়',
    qualification: 'B.A, B.Ed',
    bloodGroup: 'AB+',
    phone: '01732-305882',
    email: 'riponsiddk79@gmail.com',
    shift: 'Both',
  },
  {
    order: 12,
    facId: 'fac_sisc_2026_12',
    hrId: 'hr_sisc_2026_12',
    employeeId: '2025112009',
    name: 'Jannaty Ferdouce Limu',
    designation: 'সহকারী শিক্ষক',
    department: 'বাংলা বিভাগ',
    subject: 'বাংলা',
    qualification: 'M.A (Bangla)',
    bloodGroup: 'A+',
    phone: '01701333543',
    email: 'limonlimu543@gmail.com',
    shift: 'Both',
  },
  {
    order: 13,
    facId: 'fac_sisc_2026_13',
    hrId: 'hr_sisc_2026_13',
    employeeId: '20251120010',
    name: 'Nahida Akter',
    designation: 'সহকারী শিক্ষক',
    department: 'সাধারণ বিভাগ',
    subject: 'সাধারণ বিষয়',
    qualification: 'B.A (Honours)',
    bloodGroup: 'B+',
    phone: '01705653041',
    email: 'nahidaakterdina844@gmail.com',
    shift: 'Both',
  },
  {
    order: 14,
    facId: 'fac_sisc_2026_14',
    hrId: 'hr_sisc_2026_14',
    employeeId: '20251120011',
    name: 'Mst. Tithe Akter',
    designation: 'সহকারী শিক্ষক',
    department: 'সাধারণ বিভাগ',
    subject: 'সাধারণ বিষয়',
    qualification: 'B.A (Honours)',
    bloodGroup: 'B+',
    phone: '01709741665',
    email: 'etisorder5@gmail.com',
    shift: 'Both',
  },
  {
    order: 15,
    facId: 'fac_sisc_2026_15',
    hrId: 'hr_sisc_2026_15',
    employeeId: '2025111903',
    name: 'Most. Kamrunnaher Akter',
    designation: 'সহকারী শিক্ষক',
    department: 'সাধারণ বিভাগ',
    subject: 'সাধারণ বিষয়',
    qualification: 'B.A',
    bloodGroup: 'A+',
    phone: '01756-733617',
    email: 'kamrunnaharakter733617@gmail.com',
    shift: 'Both',
  },
  {
    order: 16,
    facId: 'fac_sisc_2026_16',
    hrId: 'hr_sisc_2026_16',
    employeeId: 'SISC-TCH-16',
    name: 'Riyad Hasan',
    designation: 'সহকারী শিক্ষক',
    department: 'সাধারণ বিভাগ',
    subject: 'সমাজবিজ্ঞান ও সাধারণ বিষয়',
    qualification: 'B.S.S (Honours)',
    bloodGroup: 'B+',
    phone: '01571122492',
    email: 'riyad40385@gmail.com',
    shift: 'Both',
  },

  // Assistant Arabic Teachers
  {
    order: 17,
    facId: 'fac_sisc_2026_17',
    hrId: 'hr_sisc_2026_17',
    employeeId: '20251120012',
    name: 'Most. Nurema Sultana',
    designation: 'সহকারী আরবি শিক্ষক',
    department: 'ইসলামিক ও আরবি বিভাগ',
    subject: 'আরবি ও ইসলামিক শিক্ষা',
    qualification: 'Daora Hadith / M.A',
    bloodGroup: '',
    phone: '01312944527',
    email: 'তথ্য নেই',
    shift: 'Both',
  },
  {
    order: 18,
    facId: 'fac_sisc_2026_18',
    hrId: 'hr_sisc_2026_18',
    employeeId: '20251120013',
    name: 'Most. Asha Moni',
    designation: 'সহকারী আরবি শিক্ষক',
    department: 'ইসলামিক ও আরবি বিভাগ',
    subject: 'আরবি ও ইসলামিক শিক্ষা',
    qualification: 'Daora Hadith / M.A',
    bloodGroup: 'B+',
    phone: '01701426313',
    email: 'akhimomi52565@gmail.com',
    shift: 'Both',
  },
  {
    order: 19,
    facId: 'fac_sisc_2026_19',
    hrId: 'hr_sisc_2026_19',
    employeeId: '20251120014',
    name: 'Md. Rayhan Mahmud',
    designation: 'সহকারী আরবি শিক্ষক',
    department: 'ইসলামিক ও আরবি বিভাগ',
    subject: 'আরবি ও ইসলামিক শিক্ষা',
    qualification: 'Daora Hadith / M.A',
    bloodGroup: 'A+',
    phone: '01614428780',
    email: 'mahmudr87699@gmail.com',
    shift: 'Both',
  },
  {
    order: 20,
    facId: 'fac_sisc_2026_20',
    hrId: 'hr_sisc_2026_20',
    employeeId: '20251120015',
    name: 'Md. Monirul Huda',
    designation: 'সহকারী আরবি শিক্ষক',
    department: 'ইসলামিক ও আরবি বিভাগ',
    subject: 'আরবি ও ইসলামিক শিক্ষা',
    qualification: 'Daora Hadith / M.A',
    bloodGroup: 'A+',
    phone: '01855289740',
    email: 'তথ্য নেই',
    shift: 'Both',
  },
  {
    order: 21,
    facId: 'fac_sisc_2026_21',
    hrId: 'hr_sisc_2026_21',
    employeeId: '20251120016',
    name: 'Md. Ruhul Amin',
    designation: 'সহকারী আরবি শিক্ষক',
    department: 'ইসলামিক ও আরবি বিভাগ',
    subject: 'আরবি ও ইসলামিক শিক্ষা',
    qualification: 'Daora Hadith / M.A',
    bloodGroup: 'AB+',
    phone: '01763648628',
    email: 'ruhulamin86829@gmail.com',
    shift: 'Both',
  },

  // Office & Support Staff
  {
    order: 22,
    facId: 'fac_sisc_2026_22',
    hrId: 'hr_sisc_2026_22',
    employeeId: '2025111901',
    name: 'Md. Omur Faruk',
    designation: 'অফিস সহকারী',
    department: 'অফিস ও সহায়ক বিভাগ',
    subject: 'দাপ্তরিক ও প্রশাসনিক সহায়তা',
    qualification: 'Alim (Running)',
    bloodGroup: 'O+',
    phone: '01885-944271',
    email: 'mdomurrfaruk0177@gmail.com',
    shift: 'Both',
  },
  {
    order: 23,
    facId: 'fac_sisc_2026_23',
    hrId: 'hr_sisc_2026_23',
    employeeId: '2025111902',
    name: 'Most. Sarmin Akter',
    designation: 'শিশু পরিচর্যাকারী (বেবি সিটার)',
    department: 'অফিস ও সহায়ক বিভাগ',
    subject: 'প্রাক-প্রাথমিক শিক্ষার্থী পরিচর্যা',
    qualification: 'S.S.C',
    bloodGroup: 'B+',
    phone: '01798-823765',
    email: 'bs.sarminakter@gmail.com',
    shift: 'Both',
  },
];

export const PDF_TEACHERS_SYNC_KEY = 'sisc_pdf_teachers_synced_2026_v1';

const ORDER_BY_FAC_ID = new Map(PDF_TEACHERS_ROSTER.map((t) => [t.facId, t.order]));

export function compareFacultyHierarchy(a: FacultyPublic, b: FacultyPublic): number {
  const oa = ORDER_BY_FAC_ID.get(a.id) ?? 999;
  const ob = ORDER_BY_FAC_ID.get(b.id) ?? 999;
  if (oa !== ob) return oa - ob;
  return (a.nameBn || a.name).localeCompare(b.nameBn || b.name);
}

/**
 * Public (non-PII) fallback list for visitors before an Admin runs the initial Firestore sync.
 */
export const DEFAULT_FALLBACK_FACULTY: FacultyPublic[] = PDF_TEACHERS_ROSTER.map((t) => ({
  id: t.facId,
  name: t.name,
  nameBn: t.name,
  designation: t.designation,
  department: t.department,
  subject: t.subject,
  qualification: t.qualification,
  responsibility: t.bloodGroup ? `আইডি: ${t.employeeId} · রক্তের গ্রুপ: ${t.bloodGroup}` : `আইডি: ${t.employeeId}`,
  bio: '',
  photoUrl: '',
  experienceYears: 0,
  shift: t.shift,
  status: 'Active',
}));

/**
 * Safely syncs all 23 verified teachers & staff from the ID card PDF into Firestore.
 * Commits `faculty` docs first, then `teacher_records` docs in a second batch so
 * `exists(/databases/.../faculty/$(facultyId))` in firestore.rules succeeds cleanly.
 * Existing documents are skipped so admin edits are never overwritten.
 */
export async function syncPdfTeachersToFirestore(): Promise<{
  added: number;
  skipped: number;
  total: number;
}> {
  try {
    const [facSnap, hrSnap] = await Promise.all([
      getDocs(collection(db, 'faculty')),
      getDocs(collection(db, 'teacher_records')),
    ]);

    const existingFacIds = new Set<string>();
    const existingFacNames = new Map<string, string>(); // lowercase name -> facId
    facSnap.docs.forEach((d) => {
      existingFacIds.add(d.id);
      const data = d.data() as Partial<FacultyPublic>;
      if (data.name) existingFacNames.set(data.name.trim().toLowerCase(), d.id);
    });

    const existingHrIds = new Set<string>();
    const existingHrByFaculty = new Set<string>();
    hrSnap.docs.forEach((d) => {
      existingHrIds.add(d.id);
      const data = d.data() as Partial<TeacherHRRecord>;
      if (data.facultyId) existingHrByFaculty.add(data.facultyId);
    });

    const facToCreate: PdfTeacherEntry[] = [];
    const hrToCreate: Array<{ entry: PdfTeacherEntry; targetFacId: string }> = [];

    for (const entry of PDF_TEACHERS_ROSTER) {
      const matchedFacId = existingFacIds.has(entry.facId)
        ? entry.facId
        : existingFacNames.get(entry.name.trim().toLowerCase());

      if (!matchedFacId) {
        facToCreate.push(entry);
        if (!existingHrIds.has(entry.hrId)) {
          hrToCreate.push({ entry, targetFacId: entry.facId });
        }
      } else if (!existingHrIds.has(entry.hrId) && !existingHrByFaculty.has(matchedFacId)) {
        hrToCreate.push({ entry, targetFacId: matchedFacId });
      }
    }

    // Step 1: Commit public faculty documents first
    if (facToCreate.length > 0) {
      const facBatch = writeBatch(db);
      for (const t of facToCreate) {
        const resp = t.bloodGroup
          ? `আইডি: ${t.employeeId} · রক্তের গ্রুপ: ${t.bloodGroup}`
          : `আইডি: ${t.employeeId}`;
        facBatch.set(doc(db, 'faculty', t.facId), {
          name: clampStr(t.name, 120),
          nameBn: clampStr(t.name, 120),
          designation: clampStr(t.designation, 80),
          department: clampStr(t.department, 80),
          subject: clampStr(t.subject, 80),
          qualification: clampStr(t.qualification, 140),
          responsibility: clampStr(resp, 160),
          bio: '',
          photoUrl: '',
          experienceYears: 0,
          shift: t.shift,
          status: 'Active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await facBatch.commit();
    }

    // Step 2: Commit private HR teacher_records referencing committed faculty IDs
    if (hrToCreate.length > 0) {
      const hrBatch = writeBatch(db);
      for (const { entry: t, targetFacId } of hrToCreate) {
        hrBatch.set(doc(db, 'teacher_records', t.hrId), {
          employeeId: clampStr(t.employeeId, 32),
          facultyId: targetFacId,
          name: clampStr(t.name, 120),
          designation: clampStr(t.designation, 80),
          department: clampStr(t.department, 80),
          phone: clampStr(t.phone, 25),
          email: clampStr(t.email || 'তথ্য নেই', 160),
          salaryBdt: 0,
          joiningDate: '',
          status: 'Active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await hrBatch.commit();
    }

    const added = Math.max(facToCreate.length, hrToCreate.length);
    return {
      added,
      skipped: PDF_TEACHERS_ROSTER.length - added,
      total: PDF_TEACHERS_ROSTER.length,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'faculty');
    throw err;
  }
}
