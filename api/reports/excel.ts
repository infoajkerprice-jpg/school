import * as XLSX from 'xlsx';

interface VercelRequest {
  method?: string;
  body?: {
    sheetName?: string;
    filename?: string;
    rows?: Record<string, string | number | boolean | null>[];
  };
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  send(body: Buffer): void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { sheetName, filename, rows } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'No rows provided for Excel export.' });
      return;
    }

    const safeSheet =
      String(sheetName || 'Report')
        .replace(/[\\/?*[\]:]/g, '')
        .slice(0, 31) || 'Report';
    const safeFile = String(filename || 'school-report.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_');

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
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Excel generation failed:', err);
    res.status(500).json({ error: 'Failed to generate Excel workbook.' });
  }
}
