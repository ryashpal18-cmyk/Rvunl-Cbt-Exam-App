import { ChangeEvent, useRef, useState } from 'react';
import { FileJson2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { readSheet } from 'read-excel-file/browser';
import { Paper, Question, SUBJECTS } from '../types/exam';

interface Props { onImport: (paper: Paper) => Promise<void>; }

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
  return { paperId: `${slug}-${Date.now()}`, title: fileName.replace(/\.[^.]+$/, ''), durationMinutes: 60, questions, imported: true, importedAt: new Date().toISOString() };
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

export default function Importer({ onImport }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setMessage(null);
    try {
      let paper: Paper;
      if (file.name.toLowerCase().endsWith('.json')) {
        paper = validatePaper(JSON.parse(await file.text()));
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        paper = validatePaper(rowsToPaper(parseCsv(await file.text()), file.name));
      } else {
        paper = validatePaper(rowsToPaper(tableToRows(await readSheet(file)), file.name));
      }
      await onImport(paper);
      setMessage({ type: 'success', text: `“${paper.title}” was imported and is ready to use.` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not import this file.' });
    } finally { setBusy(false); }
  };

  return (
    <section>
      <p className="eyebrow">No-code question bank</p><h2 className="mt-2 text-3xl font-bold">Import a mock paper</h2><p className="mt-2 max-w-2xl text-slate-600">Add a 70-question JSON, Excel, or CSV paper. Imported data stays on this computer and does not require an application rebuild.</p>
      <input ref={input} className="hidden" type="file" accept=".json,.xlsx,.csv" onChange={(event) => void pickFile(event)} />
      <button disabled={busy} className="mt-7 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center transition hover:border-navy hover:bg-blue-50" onClick={() => input.current?.click()}><UploadCloud className="text-navy" size={44} /><b className="mt-4 text-xl">{busy ? 'Validating paper…' : 'Choose a paper file'}</b><span className="mt-2 text-sm text-slate-500">JSON · XLSX · CSV</span></button>
      {message && <p className={`mt-4 rounded-xl px-4 py-3 font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message.text}</p>}
      <div className="mt-7 grid grid-cols-2 gap-5">
        <div className="card p-5"><FileJson2 className="text-saffron" /><h3 className="mt-3 font-bold">JSON format</h3><p className="mt-2 text-sm leading-6 text-slate-500">Use the built-in paper schema: paperId, title, durationMinutes, and a questions array with bilingual fields.</p></div>
        <div className="card p-5"><FileSpreadsheet className="text-emerald-600" /><h3 className="mt-3 font-bold">Spreadsheet columns</h3><p className="mt-2 text-sm leading-6 text-slate-500">id, subject, marks, question_en, question_hi, option_a_en through option_e_hi, correctIndex, explanation_en, explanation_hi.</p></div>
      </div>
    </section>
  );
}
