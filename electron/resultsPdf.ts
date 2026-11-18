import { BrowserWindow } from 'electron';

export interface ResultsPdfData {
  headers: string[];
  rows: string[][];
  generatedAt: string;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export async function createResultsPdf(value: unknown): Promise<Buffer> {
  const data = value as ResultsPdfData | null;
  if (!data || !Array.isArray(data.headers) || data.headers.length !== 7 ||
      data.headers.some((text) => typeof text !== 'string') ||
      !Array.isArray(data.rows) || data.rows.some((row) =>
        !Array.isArray(row) || row.length !== 7 || row.some((text) => typeof text !== 'string')) ||
      typeof data.generatedAt !== 'string') {
    throw new Error('Invalid results report.');
  }
  const header = data.headers.map((text) => `<th>${escapeHtml(text)}</th>`).join('');
  const rows = data.rows.map((row) => `<tr>${row.map((text) => `<td>${escapeHtml(text)}</td>`).join('')}</tr>`).join('');
  const html = `<!doctype html><html lang="hi"><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
    <title>Exam Results Report</title><style>
      @page { size: A4; margin: 12mm; }
      body { font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", sans-serif; color: #172033; font-size: 10px; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 12px; }
      thead { display: table-header-group; }
      th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #e2e8f0; }
      tr { break-inside: avoid; }
    </style></head><body><h1>Exam Results Report / परीक्षा परिणाम</h1>
    <p>Generated / तैयार किया गया · ${escapeHtml(data.generatedAt)}</p>
    <p>Total attempts / कुल टेस्ट · ${data.rows.length}</p>
    <table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false },
  });
  printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return await printWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    printWindow.destroy();
  }
}
