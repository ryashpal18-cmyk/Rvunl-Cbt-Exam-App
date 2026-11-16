import { ChangeEvent, useRef, useState } from 'react';
import { CheckCircle2, FileJson2, FileSpreadsheet, UploadCloud, XCircle } from 'lucide-react';
import { readSheet } from 'read-excel-file/browser';
import { Paper, Question, SUBJECTS } from '../types/exam';

interface Props { onImport: (papers: Paper[]) => Promise<void>; }
interface ImportMessage { imported: string[]; errors: string[]; }

const optionKeys = ['a', 'b', 'c', 'd', 'e'];

function tableToRows(table: unknown[][]): Record<string, unknown>[] {
  const [headerRow, ...dataRows] = table;
  if (!headerRow) return [];
  const headers = headerRow.map((cell) => String(cell ?? '').replace(/^\uFEFF/, '').trim());
  return dataRows
    .filter((row) => row.some((cell) => cell !== null && cell !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function parseCsv(text: string): Record<string, unknown>[] {
  const table: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); table.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); table.push(row); }
  return tableToRows(table);
}

function value(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
  return '';
}

function rowsToPaper(rows: Record<string, unknown>[], fileName: string): Paper {
  const questions: Question[] = rows.map((row, index) => {
    const correctRaw = value(row, 'correctIndex', 'correct_index', 'correctAnswer', 'correct_answer').toUpperCase();
    const correctIndex = correctRaw === '' ? -1 : /^[A-E]$/.test(correctRaw) ? correctRaw.charCodeAt(0) - 65 : Number(correctRaw);
    return {
      id: Number(value(row, 'id', 'question_id')) || index + 1,
      subject: value(row, 'subject') as Question['subject'],
      marks: Number(value(row, 'marks')),
      question_en: value(row, 'question_en', 'questionEnglish'),
      question_hi: value(row, 'question_hi', 'questionHindi'),
      options_en: optionKeys.map((key) => value(row, `option_${key}_en`, `option${key.toUpperCase()}_en`)) as Question['options_en'],
      options_hi: optionKeys.map((key) => value(row, `option_${key}_hi`, `option${key.toUpperCase()}_hi`)) as Question['options_hi'],
      correctIndex,
      explanation_en: value(row, 'explanation_en', 'explanationEnglish'),
      explanation_hi: value(row, 'explanation_hi', 'explanationHindi'),
    };
  });
  const slug = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'imported-paper';
  return { paperId: `${slug}-${crypto.randomUUID().slice(0, 8)}`, title: fileName.replace(/\.[^.]+$/, ''), durationMinutes: 60, questions, imported: true, importedAt: new Date().toISOString() };
}

function validatePaper(input: unknown): Paper {
  if (!input || typeof input !== 'object') throw new Error('The file does not contain a paper object.');
  const paper = input as Paper;
  if (!paper.paperId || !paper.title) throw new Error('paperId and title are required.');
  if (!Array.isArray(paper.questions) || paper.questions.length !== 70) throw new Error('A paper must contain exactly 70 questions.');
  const ids = new Set<number>();
  for (const [index, question] of paper.questions.entries()) {
    if (!Number.isInteger(question.id) || ids.has(question.id)) throw new Error(`Question ${index + 1} has an invalid or duplicate id.`);
    ids.add(question.id);
    if (!SUBJECTS.includes(question.subject)) throw new Error(`Question ${question.id} has an unsupported subject.`);
    if (![1, 2].includes(Number(question.marks))) throw new Error(`Question ${question.id} marks must be 1 or 2.`);
    if (!question.question_en || !question.question_hi || !question.explanation_en || !question.explanation_hi) throw new Error(`Question ${question.id} is missing bilingual text or an explanation.`);
    if (!Array.isArray(question.options_en) || !Array.isArray(question.options_hi) || question.options_en.length !== 5 || question.options_hi.length !== 5 || question.options_en.some((item) => !item) || question.options_hi.some((item) => !item)) throw new Error(`Question ${question.id} must have five options in both languages.`);
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 4) throw new Error(`Question ${question.id} correctIndex must be 0–4 (or A–E in a spreadsheet).`);
  }
  const maxScore = paper.questions.reduce((sum, question) => sum + Number(question.marks), 0);
  if (maxScore !== 100) throw new Error(`Question marks total ${maxScore}; an RVUNL Phase-I paper must total 100.`);
  return { ...paper, durationMinutes: Number(paper.durationMinutes) || 60, imported: true, importedAt: new Date().toISOString() };
}

async function parseFile(file: File): Promise<Paper> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.json')) return validatePaper(JSON.parse(await file.text()));
  if (lowerName.endsWith('.csv')) return validatePaper(rowsToPaper(parseCsv(await file.text()), file.name));
  if (lowerName.endsWith('.xlsx')) return validatePaper(rowsToPaper(tableToRows(await readSheet(file)), file.name));
  throw new Error('Only JSON, XLSX, and CSV files are supported.');
}

export default function Importer({ onImport }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<ImportMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    setBusy(true); setMessage(null);
    const papers: Paper[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        papers.push(await parseFile(file));
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Could not read this file.'}`);
      }
    }
    try {
      if (papers.length) await onImport(papers);
      setMessage({ imported: papers.map((paper) => paper.title), errors });
    } catch (error) {
      setMessage({ imported: [], errors: [error instanceof Error ? error.message : 'Could not save the selected papers.'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 p-[1px] shadow-lg shadow-violet-200/60">
        <div className="rounded-2xl bg-white p-6">
          <p className="eyebrow">Bulk paper uploader</p>
          <h2 className="mt-2 text-2xl font-bold">Import many mock papers together</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Select as many valid 70-question files as you want in one step. Every file is checked separately, so one invalid file does not block the valid papers.</p>
          <input ref={input} multiple className="hidden" type="file" accept=".json,.xlsx,.csv" onChange={(event) => void pickFiles(event)} />
          <button disabled={busy} className="mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-violet-300 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-orange-50 p-10 text-center transition hover:border-violet-600 hover:shadow-md" onClick={() => input.current?.click()}>
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg"><UploadCloud size={34} /></span>
            <b className="mt-4 text-xl text-slate-900">{busy ? 'Checking selected papers…' : 'Choose one or many paper files'}</b>
            <span className="mt-2 text-sm text-slate-500">Use Ctrl/Shift to select multiple files · JSON · XLSX · CSV</span>
          </button>
        </div>
      </div>

      {message && <div className="mt-5 space-y-3">
        {message.imported.length > 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><p className="flex items-center gap-2 font-bold"><CheckCircle2 size={19} /> {message.imported.length} paper{message.imported.length === 1 ? '' : 's'} imported</p><p className="mt-1 text-sm">{message.imported.join(', ')}</p></div>}
        {message.errors.length > 0 && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"><p className="flex items-center gap-2 font-bold"><XCircle size={19} /> {message.errors.length} file{message.errors.length === 1 ? '' : 's'} could not be imported</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{message.errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      </div>}

      <div className="mt-5 grid grid-cols-2 gap-5">
        <div className="card border-l-4 border-l-orange-400 p-5"><FileJson2 className="text-orange-500" /><h3 className="mt-3 font-bold">JSON format</h3><p className="mt-2 text-sm leading-6 text-slate-500">Use the built-in paper schema: paperId, title, durationMinutes, and a questions array with bilingual fields.</p></div>
        <div className="card border-l-4 border-l-emerald-500 p-5"><FileSpreadsheet className="text-emerald-600" /><h3 className="mt-3 font-bold">Spreadsheet columns</h3><p className="mt-2 text-sm leading-6 text-slate-500">id, subject, marks, question_en, question_hi, option_a_en through option_e_hi, correctIndex, explanation_en, explanation_hi.</p></div>
      </div>
    </section>
  );
}
