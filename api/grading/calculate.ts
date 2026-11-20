interface SubjectInput {
  subject: string;
  marks: number;
  fullMarks?: number;
}

interface VercelRequest {
  method?: string;
  body?: { subjects?: SubjectInput[] };
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

function getBangladeshGrade(percentage: number): { grade: string; point: number } {
  if (percentage >= 80) return { grade: 'A+', point: 5.0 };
  if (percentage >= 70) return { grade: 'A', point: 4.0 };
  if (percentage >= 60) return { grade: 'A-', point: 3.5 };
  if (percentage >= 50) return { grade: 'B', point: 3.0 };
  if (percentage >= 40) return { grade: 'C', point: 2.0 };
  if (percentage >= 33) return { grade: 'D', point: 1.0 };
  return { grade: 'F', point: 0.0 };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const subjects = req.body?.subjects;
  if (!Array.isArray(subjects) || subjects.length === 0 || subjects.length > 15) {
    res.status(400).json({ error: 'Provide between 1 and 15 valid subjects.' });
    return;
  }

  let totalMarks = 0;
  let totalPoints = 0;
  let hasFailed = false;

  const evaluated = subjects.map((item) => {
    const fullMarks = Number(item.fullMarks) > 0 ? Number(item.fullMarks) : 100;
    const marks = Math.max(0, Math.min(fullMarks, Number(item.marks) || 0));
    const pct = (marks / fullMarks) * 100;
    const { grade, point } = getBangladeshGrade(pct);
    totalMarks += marks;
    totalPoints += point;
    if (point === 0) hasFailed = true;
    return {
      subject: String(item.subject || '').slice(0, 80),
      marks,
      fullMarks,
      grade,
      point,
    };
  });

  const gpa = hasFailed ? 0.0 : Number((totalPoints / evaluated.length).toFixed(2));
  let overallGrade = 'F';
  if (!hasFailed) {
    if (gpa >= 5.0) overallGrade = 'A+';
    else if (gpa >= 4.0) overallGrade = 'A';
    else if (gpa >= 3.5) overallGrade = 'A-';
    else if (gpa >= 3.0) overallGrade = 'B';
    else if (gpa >= 2.0) overallGrade = 'C';
    else if (gpa >= 1.0) overallGrade = 'D';
  }

  res.status(200).json({
    subjects: evaluated,
    totalMarks,
    gpa,
    grade: overallGrade,
  });
}
