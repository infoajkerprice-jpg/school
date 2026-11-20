import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));

// Institution metadata & health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    institution: {
      name: 'Shah Islamic School And College',
      nameBn: 'শাহ ইসলামিক স্কুল এন্ড কলেজ',
      established: 2019,
      location: 'তুলসীঘাট (পল্লী বিদ্যুৎ অফিসের পশ্চিম পার্শ্বে), গাইবান্ধা সদর, গাইবান্ধা-৫৭০০।',
      phone: '+880 1711-759705',
      website: 'https://shahislamicschool.com',
      highestClass: 'অষ্টম শ্রেণি',
    },
    timestamp: new Date().toISOString(),
  });
});

// Bangladesh NCTB GPA 5.00 calculation endpoint
interface SubjectInput {
  subject: string;
  marks: number;
  fullMarks?: number;
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

app.post('/api/grading/calculate', (req, res) => {
  const { subjects } = req.body as { subjects?: SubjectInput[] };
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

  res.json({
    subjects: evaluated,
    totalMarks,
    gpa,
    grade: overallGrade,
  });
});

// Server-side Excel (.xlsx) workbook generator
app.post('/api/reports/excel', (req, res) => {
  try {
    const { sheetName, filename, rows } = req.body as {
      sheetName?: string;
      filename?: string;
      rows?: Record<string, string | number | boolean | null>[];
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'No rows provided for Excel export.' });
      return;
    }

    const safeSheet = String(sheetName || 'Report')
      .replace(/[\\/?*[\]:]/g, '')
      .slice(0, 31) || 'Report';
    const safeFile = String(filename || 'school-report.xlsx')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.min(
        40,
        Math.max(
          key.length + 4,
          ...rows.slice(0, 100).map((r) => String(r[key] ?? '').length + 2)
        )
      ),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheet);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFile.endsWith('.xlsx') ? safeFile : `${safeFile}.xlsx`}"`
    );
    res.send(buffer);
  } catch (err) {
    console.error('Excel generation failed:', err);
    res.status(500).json({ error: 'Failed to generate Excel workbook.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shah Islamic School And College server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
