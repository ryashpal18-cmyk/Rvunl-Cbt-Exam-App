import { useRef, useState } from 'react';
import JSZip from 'jszip';
import readSheet from 'read-excel-file/browser';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { DIFFICULTIES, PAPER_CATEGORIES, Paper, PaperCategory, Question, SUBJECTS, Subject } from '../types/exam';

interface Props {
  onImport: (papers: Paper[]) => Promise<void>;
  onDownloadTemplate: (data: Uint8Array) => Promise<void>;
}

const VALID_SUBJECTS = new Set<string>(SUBJECTS);
const MARKS_BY_SUBJECT: Record<Subject, number> = {
  'Rajasthan GK': 2,
  'World, India & Everyday Science': 2,
  'Reasoning & Mental Ability': 1,
  'Hindi General': 1,
  'English General': 1,
  'Mathematics': 1,
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim().length > 0)) rows.push(row);
  }
  return rows;
}

function validatePaper(raw: unknown, fallbackTitle: string): Paper {
  const p = raw as Partial<Paper>;
  if (!p || typeof p !== 'object' || !Array.isArray(p.questions) || p.questions.length === 0) {
    throw new Error(`${fallbackTitle}: Invalid JSON — missing non-empty questions array.`);
  }
  const questions: Question[] = p.questions.map((q, idx) => {
    if (!VALID_SUBJECTS.has(q.subject)) {
      throw new Error(`${fallbackTitle} Q${idx + 1}: Invalid subject "${q.subject}".`);
    }
    if (!Array.isArray(q.options_en) || q.options_en.length !== 5 || !Array.isArray(q.options_hi) || q.options_hi.length !== 5) {
      throw new Error(`${fallbackTitle} Q${idx + 1}: Must have exactly 5 English and 5 Hindi options.`);
    }
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 4) {
      throw new Error(`${fallbackTitle} Q${idx + 1}: correctIndex must be 0–4.`);
    }
    const subject = q.subject as Subject;
    return {
      id: typeof q.id === 'number' ? q.id : idx + 1,
      subject,
      marks: typeof q.marks === 'number' ? q.marks : MARKS_BY_SUBJECT[subject],
      question_en: String(q.question_en ?? ''),
      question_hi: String(q.question_hi ?? q.question_en ?? ''),
      options_en: q.options_en.map(String) as [string, string, string, string, string],
      options_hi: q.options_hi.map(String) as [string, string, string, string, string],
      correctIndex: q.correctIndex,
      explanation_en: String(q.explanation_en ?? ''),
      explanation_hi: String(q.explanation_hi ?? q.explanation_en ?? ''),
    };
  });

  const category: PaperCategory = p.category && (PAPER_CATEGORIES as readonly string[]).includes(p.category)
    ? p.category
    : 'Custom';
  const difficulty = p.difficulty && (DIFFICULTIES as readonly string[]).includes(p.difficulty)
    ? p.difficulty
    : 'Medium';

  return {
    paperId: p.paperId || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: p.title || fallbackTitle.replace(/\.[^.]+$/, ''),
    durationMinutes: typeof p.durationMinutes === 'number' && p.durationMinutes > 0 ? p.durationMinutes : 60,
    questions,
    imported: true,
    importedAt: new Date().toISOString(),
    category,
    difficulty,
    year: typeof p.year === 'number' ? p.year : undefined,
  };
}

function rowsToPaper(rows: unknown[][], title: string): Paper {
  if (rows.length < 2) throw new Error(`${title}: Empty sheet — add header + at least 1 question row.`);
  const headers = rows[0].map((h) => String(h ?? '').trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);
  const required = ['subject', 'question_en', 'option_a_en', 'option_b_en', 'option_c_en', 'option_d_en', 'option_e_en', 'correct'];
  for (const r of required) {
    if (col(r) === -1) throw new Error(`${title}: Missing required column "${r}".`);
  }

  const questions: Question[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    if (!r || r.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
    const get = (name: string) => {
      const idx = col(name);
      return idx >= 0 ? String(r[idx] ?? '').trim() : '';
    };
    const subjectRaw = get('subject');
    if (!VALID_SUBJECTS.has(subjectRaw)) {
      throw new Error(`${title} Row ${i + 1}: Invalid subject "${subjectRaw}".`);
    }
    const subject = subjectRaw as Subject;
    const corrRaw = get('correct').toUpperCase();
    const corrIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(corrRaw);
    const numIdx = Number(corrRaw);
    const correctIndex = corrIdx >= 0 ? corrIdx : (!Number.isNaN(numIdx) && numIdx >= 0 && numIdx <= 4 ? numIdx : -1);
    if (correctIndex < 0) {
      throw new Error(`${title} Row ${i + 1}: "correct" must be A–E (or 0–4).`);
    }
    const optsEn = [get('option_a_en'), get('option_b_en'), get('option_c_en'), get('option_d_en'), get('option_e_en')] as [string, string, string, string, string];
    const optsHi = [
      get('option_a_hi') || optsEn[0],
      get('option_b_hi') || optsEn[1],
      get('option_c_hi') || optsEn[2],
      get('option_d_hi') || optsEn[3],
      get('option_e_hi') || optsEn[4],
    ] as [string, string, string, string, string];

    questions.push({
      id: Number(get('id')) || questions.length + 1,
      subject,
      marks: Number(get('marks')) || MARKS_BY_SUBJECT[subject],
      question_en: get('question_en'),
      question_hi: get('question_hi') || get('question_en'),
      options_en: optsEn,
      options_hi: optsHi,
      correctIndex,
      explanation_en: get('explanation_en'),
      explanation_hi: get('explanation_hi') || get('explanation_en'),
    });
  }
  if (questions.length === 0) throw new Error(`${title}: No valid question rows found.`);
  return {
    paperId: `imported_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: title.replace(/\.[^.]+$/, ''),
    durationMinutes: 60,
    questions,
    imported: true,
    importedAt: new Date().toISOString(),
    category: 'Custom',
    difficulty: 'Medium',
  };
}

export default function Importer({ onImport, onDownloadTemplate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const parseFileBuffer = async (name: string, buffer: ArrayBuffer): Promise<Paper> => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'json') {
      const text = new TextDecoder().decode(buffer);
      return validatePaper(JSON.parse(text), name);
    }
    if (ext === 'csv') {
      const text = new TextDecoder().decode(buffer);
      return rowsToPaper(parseCsv(text), name);
    }
    if (ext === 'xlsx') {
      const rows = await readSheet(buffer);
      return rowsToPaper(rows as unknown[][], name);
    }
    throw new Error(`${name}: Unsupported file format.`);
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setStatus(null);
    const imported: Paper[] = [];
    const errors: string[] = [];

    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'zip') {
          try {
            const zip = await JSZip.loadAsync(await file.arrayBuffer());
            const entries = Object.values(zip.files).filter(
              (entry) => !entry.dir && /\.(json|csv|xlsx)$/i.test(entry.name) && !entry.name.startsWith('__MACOSX')
            );
            if (entries.length === 0) {
              errors.push(`${file.name}: No .json, .csv, or .xlsx files found inside archive.`);
              continue;
            }
            for (const entry of entries) {
              try {
                const buf = await entry.async('arraybuffer');
                const baseName = entry.name.split('/').pop() || entry.name;
                imported.push(await parseFileBuffer(baseName, buf));
              } catch (err) {
                errors.push(err instanceof Error ? err.message : `${entry.name}: Failed to parse.`);
              }
            }
          } catch (err) {
            errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Invalid ZIP archive.'}`);
          }
        } else {
          try {
            imported.push(await parseFileBuffer(file.name, await file.arrayBuffer()));
          } catch (err) {
            errors.push(err instanceof Error ? err.message : `${file.name}: Failed to parse.`);
          }
        }
      }

      if (imported.length > 0) {
        await onImport(imported);
      }

      if (imported.length > 0 && errors.length === 0) {
        setStatus({ ok: true, text: `Imported ${imported.length} paper${imported.length > 1 ? 's' : ''} successfully.` });
      } else if (imported.length > 0 && errors.length > 0) {
        setStatus({
          ok: true,
          text: `Imported ${imported.length} paper(s). Skipped ${errors.length}: ${errors.slice(0, 2).join(' | ')}`,
        });
      } else {
        setStatus({ ok: false, text: errors.slice(0, 3).join(' | ') || 'No valid papers found.' });
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const downloadCsvTemplate = async () => {
    const header = [
      'id', 'subject', 'marks', 'question_en', 'question_hi',
      'option_a_en', 'option_b_en', 'option_c_en', 'option_d_en', 'option_e_en',
      'option_a_hi', 'option_b_hi', 'option_c_hi', 'option_d_hi', 'option_e_hi',
      'correct', 'explanation_en', 'explanation_hi',
    ].join(',');
    const sample = [
      '1', 'Rajasthan GK', '2',
      '"Which city is known as the Blue City of Rajasthan?"',
      '"राजस्थान का कौन सा शहर ब्लू सिटी के नाम से जाना जाता है?"',
      '"Jaipur"', '"Jodhpur"', '"Udaipur"', '"Bikaner"', '"Ajmer"',
      '"जयपुर"', '"जोधपुर"', '"उदयपुर"', '"बीकानेर"', '"अजमेर"',
      'B', '"Jodhpur is known as the Blue City."', '"जोधपुर को ब्लू सिटी कहा जाता है।"',
    ].join(',');
    const bytes = new TextEncoder().encode(`${header}\n${sample}\n`);
    await onDownloadTemplate(bytes);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FileSpreadsheet className="h-5 w-5 text-blue-700" />
            Bulk Paper Importer (.json, .xlsx, .csv, .zip)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Select multiple mock paper files or a single .zip bundle containing up to 30+ papers at once.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> CSV Template
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> {busy ? 'Importing...' : 'Import Papers / ZIP'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.xlsx,.csv,.zip"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {status && (
        <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold ${
          status.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}>
          {status.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{status.text}</span>
        </div>
      )}
    </div>
  );
}
