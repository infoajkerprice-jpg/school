import type { SubjectMark } from '../types';

export function calculateBangladeshSubjectGrade(marks: number, fullMarks = 100): { grade: string; point: number } {
  const pct = fullMarks > 0 ? (marks / fullMarks) * 100 : 0;
  if (pct >= 80) return { grade: 'A+', point: 5.0 };
  if (pct >= 70) return { grade: 'A', point: 4.0 };
  if (pct >= 60) return { grade: 'A-', point: 3.5 };
  if (pct >= 50) return { grade: 'B', point: 3.0 };
  if (pct >= 40) return { grade: 'C', point: 2.0 };
  if (pct >= 33) return { grade: 'D', point: 1.0 };
  return { grade: 'F', point: 0.0 };
}

export function evaluateExamResult(
  rawSubjects: { subject: string; marks: number; fullMarks?: number }[]
): {
  subjects: SubjectMark[];
  totalMarks: number;
  gpa: number;
  grade: 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | 'F';
} {
  let totalMarks = 0;
  let totalPoints = 0;
  let hasFailed = false;

  const subjects: SubjectMark[] = rawSubjects.slice(0, 15).map((item) => {
    const fullMarks = item.fullMarks && item.fullMarks > 0 ? item.fullMarks : 100;
    const marks = Math.max(0, Math.min(fullMarks, Number(item.marks) || 0));
    const { grade, point } = calculateBangladeshSubjectGrade(marks, fullMarks);
    totalMarks += marks;
    totalPoints += point;
    if (point === 0) hasFailed = true;
    return {
      subject: item.subject.trim().slice(0, 80),
      marks,
      fullMarks,
      grade,
      point,
    };
  });

  if (subjects.length === 0) {
    return { subjects: [], totalMarks: 0, gpa: 0, grade: 'F' };
  }

  const gpa = hasFailed ? 0.0 : Number((totalPoints / subjects.length).toFixed(2));
  let grade: 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (!hasFailed) {
    if (gpa >= 5.0) grade = 'A+';
    else if (gpa >= 4.0) grade = 'A';
    else if (gpa >= 3.5) grade = 'A-';
    else if (gpa >= 3.0) grade = 'B';
    else if (gpa >= 2.0) grade = 'C';
    else if (gpa >= 1.0) grade = 'D';
  }

  return { subjects, totalMarks, gpa, grade };
}

export function clampStr(val: string | undefined | null, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}
