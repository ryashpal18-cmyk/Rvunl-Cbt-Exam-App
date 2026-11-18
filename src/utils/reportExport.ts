import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { Attempt, ProfileRecord } from '../types/exam';
import { formatDuration } from './scoring';

const CSV_HEADERS = [
  'Profile Name',
  'Paper Title',
  'Date / Time',
  'Score / Max',
  'Percentage',
  'Time Taken',
  'Negative Marking',
] as const;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const FOOTER_HEIGHT = 24;
const TABLE_FONT_SIZE = 7;
const TABLE_LINE_HEIGHT = 9;
const CELL_PADDING = 4;

interface ReportRow {
  profileName: string;
  paperTitle: string;
  dateTime: string;
  score: string;
  percentage: string;
  timeTaken: string;
  negativeMarking: string;
}

interface Column {
  key: keyof ReportRow;
  label: string;
  width: number;
  maxLines: number;
}

const COLUMNS: Column[] = [
  { key: 'profileName', label: 'Profile', width: 72, maxLines: 2 },
  { key: 'paperTitle', label: 'Paper', width: 112, maxLines: 3 },
  { key: 'dateTime', label: 'Date / time', width: 96, maxLines: 2 },
  { key: 'score', label: 'Score / max', width: 58, maxLines: 2 },
  { key: 'percentage', label: 'Percent', width: 42, maxLines: 1 },
  { key: 'timeTaken', label: 'Time', width: 62, maxLines: 2 },
  { key: 'negativeMarking', label: 'Negative marking', width: 73, maxLines: 2 },
];

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return (Math.round((value + Number.EPSILON) * 100) / 100).toString();
}

function formatPercentage(attempt: Attempt): string {
  if (!Number.isFinite(attempt.maxScore) || attempt.maxScore === 0) return '0%';
  return `${formatNumber((attempt.totalScore / attempt.maxScore) * 100)}%`;
}

function formatLocalDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
}

function negativeMarkingLabel(attempt: Attempt): string {
  return attempt.negativeMarking === 'quarter' ? 'Quarter (25%)' : 'None';
}

function sortedRows(attempts: Attempt[], profiles: ProfileRecord[]): ReportRow[] {
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return [...attempts]
    .sort((left, right) => {
      const leftTime = new Date(left.timestamp).getTime();
      const rightTime = new Date(right.timestamp).getTime();
      const sortableLeftTime = Number.isNaN(leftTime) ? Number.NEGATIVE_INFINITY : leftTime;
      const sortableRightTime = Number.isNaN(rightTime) ? Number.NEGATIVE_INFINITY : rightTime;
      return sortableRightTime - sortableLeftTime;
    })
    .map((attempt) => ({
      profileName: profileNames.get(attempt.userId) ?? `Unknown profile (${attempt.userId})`,
      paperTitle: attempt.paperTitle,
      dateTime: formatLocalDateTime(attempt.timestamp),
      score: `${formatNumber(attempt.totalScore)} / ${formatNumber(attempt.maxScore)}`,
      percentage: formatPercentage(attempt),
      timeTaken: formatDuration(attempt.timeTakenSeconds),
      negativeMarking: negativeMarkingLabel(attempt),
    }));
}

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return /[",\r\n]/.test(value) ? `"${escaped}"` : escaped;
}

export function buildResultsCsv(attempts: Attempt[], profiles: ProfileRecord[]): Uint8Array {
  const lines = [
    CSV_HEADERS.map(escapeCsv).join(','),
    ...sortedRows(attempts, profiles).map((row) =>
      [
        row.profileName,
        row.paperTitle,
        row.dateTime,
        row.score,
        row.percentage,
        row.timeTaken,
        row.negativeMarking,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ];

  return new TextEncoder().encode(`\uFEFF${lines.join('\r\n')}`);
}

function safePdfText(font: PDFFont, value: string): string {
  let safe = '';
  for (const character of value) {
    try {
      font.encodeText(character);
      safe += character;
    } catch {
      throw new Error('To export this text as PDF, use the installed Windows app.');
    }
  }
  return safe;
}

function textWidth(font: PDFFont, value: string, size: number): number {
  return font.widthOfTextAtSize(value, size);
}

function splitLongWord(font: PDFFont, word: string, size: number, maxWidth: number): string[] {
  const chunks: string[] = [];
  let chunk = '';

  for (const character of word) {
    const candidate = chunk + character;
    if (chunk && textWidth(font, candidate, size) > maxWidth) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks.length ? chunks : [''];
}

function truncateToWidth(font: PDFFont, value: string, size: number, maxWidth: number): string {
  const suffix = '...';
  let result = value;
  while (result && textWidth(font, result + suffix, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + suffix;
}

function wrapText(
  font: PDFFont,
  value: string,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  const safeValue = safePdfText(font, normalizedValue);
  if (!safeValue) return [''];

  const lines: string[] = [];
  let current = '';
  for (const word of safeValue.split(' ')) {
    const pieces = textWidth(font, word, size) > maxWidth ? splitLongWord(font, word, size, maxWidth) : [word];
    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (current && textWidth(font, candidate, size) > maxWidth) {
        lines.push(current);
        current = piece;
      } else {
        current = candidate;
      }
    }
  }
  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = truncateToWidth(font, visible[maxLines - 1], size, maxWidth);
  return visible;
}

function drawTableHeader(page: PDFPage, boldFont: PDFFont, top: number): number {
  const height = 22;
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: top - height,
    width: COLUMNS.reduce((sum, column) => sum + column.width, 0),
    height,
    color: rgb(0.15, 0.24, 0.38),
  });

  let x = PAGE_MARGIN;
  for (const column of COLUMNS) {
    const lines = wrapText(boldFont, column.label, TABLE_FONT_SIZE, column.width - CELL_PADDING * 2, 2);
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: x + CELL_PADDING,
        y: top - CELL_PADDING - TABLE_FONT_SIZE - index * TABLE_LINE_HEIGHT,
        size: TABLE_FONT_SIZE,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
    });
    x += column.width;
  }

  return top - height;
}

function drawReportRow(page: PDFPage, font: PDFFont, row: ReportRow, top: number, shaded: boolean): number {
  const wrappedCells = COLUMNS.map((column) =>
    wrapText(font, row[column.key], TABLE_FONT_SIZE, column.width - CELL_PADDING * 2, column.maxLines),
  );
  const lineCount = Math.max(...wrappedCells.map((lines) => lines.length));
  const height = Math.max(18, lineCount * TABLE_LINE_HEIGHT + CELL_PADDING * 2);

  if (shaded) {
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: top - height,
      width: COLUMNS.reduce((sum, column) => sum + column.width, 0),
      height,
      color: rgb(0.95, 0.96, 0.98),
    });
  }

  let x = PAGE_MARGIN;
  wrappedCells.forEach((lines, columnIndex) => {
    lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: x + CELL_PADDING,
        y: top - CELL_PADDING - TABLE_FONT_SIZE - lineIndex * TABLE_LINE_HEIGHT,
        size: TABLE_FONT_SIZE,
        font,
        color: rgb(0.12, 0.14, 0.18),
      });
    });
    x += COLUMNS[columnIndex].width;
  });

  page.drawLine({
    start: { x: PAGE_MARGIN, y: top - height },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: top - height },
    thickness: 0.4,
    color: rgb(0.75, 0.78, 0.82),
  });
  return top - height;
}

export async function buildResultsPdf(
  attempts: Attempt[],
  profiles: ProfileRecord[],
): Promise<Uint8Array> {
  const reportRows = sortedRows(attempts, profiles);
  if (window.rvunlAPI?.createResultsPdf) {
    const bytes = await window.rvunlAPI.createResultsPdf({
      headers: ['Profile / नाम', 'Paper / पेपर', 'Date / तारीख', 'Score / अंक', 'Percent / प्रतिशत', 'Time / समय', 'Negative marking / ऋणात्मक अंक'],
      rows: reportRows.map((row) => COLUMNS.map((column) => row[column.key])),
      generatedAt: formatLocalDateTime(new Date().toISOString()),
    });
    return new Uint8Array(bytes);
  }
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const rows = sortedRows(attempts, profiles);
  const generatedAt = formatLocalDateTime(new Date().toISOString());

  document.setTitle('Exam Results Report');
  document.setSubject('Exam attempt results');
  document.setProducer('RVUNL CBT Exam App');
  document.setCreationDate(new Date());

  const startPage = (firstPage: boolean): { page: PDFPage; top: number } => {
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    if (firstPage) {
      page.drawText('Exam Results Report', {
        x: PAGE_MARGIN,
        y: PAGE_HEIGHT - PAGE_MARGIN - 18,
        size: 18,
        font: boldFont,
        color: rgb(0.1, 0.18, 0.3),
      });
      page.drawText(safePdfText(font, `Generated: ${generatedAt}`), {
        x: PAGE_MARGIN,
        y: PAGE_HEIGHT - PAGE_MARGIN - 38,
        size: 9,
        font,
        color: rgb(0.3, 0.34, 0.4),
      });
      page.drawText(`Total attempts: ${rows.length}`, {
        x: PAGE_MARGIN,
        y: PAGE_HEIGHT - PAGE_MARGIN - 52,
        size: 9,
        font,
        color: rgb(0.3, 0.34, 0.4),
      });
      return { page, top: drawTableHeader(page, boldFont, PAGE_HEIGHT - PAGE_MARGIN - 68) };
    }

    page.drawText('Exam Results Report (continued)', {
      x: PAGE_MARGIN,
      y: PAGE_HEIGHT - PAGE_MARGIN - 10,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.18, 0.3),
    });
    return { page, top: drawTableHeader(page, boldFont, PAGE_HEIGHT - PAGE_MARGIN - 24) };
  };

  let { page, top } = startPage(true);
  rows.forEach((row, index) => {
    const wrappedCells = COLUMNS.map((column) =>
      wrapText(font, row[column.key], TABLE_FONT_SIZE, column.width - CELL_PADDING * 2, column.maxLines),
    );
    const requiredHeight = Math.max(18, Math.max(...wrappedCells.map((lines) => lines.length)) * TABLE_LINE_HEIGHT + CELL_PADDING * 2);
    if (top - requiredHeight < FOOTER_HEIGHT + PAGE_MARGIN / 2) {
      ({ page, top } = startPage(false));
    }
    top = drawReportRow(page, font, row, top, index % 2 === 1);
  });

  const pages = document.getPages();
  pages.forEach((pdfPage, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    pdfPage.drawText(label, {
      x: (PAGE_WIDTH - textWidth(font, label, 8)) / 2,
      y: 16,
      size: 8,
      font,
      color: rgb(0.35, 0.38, 0.42),
    });
  });

  return document.save();
}
