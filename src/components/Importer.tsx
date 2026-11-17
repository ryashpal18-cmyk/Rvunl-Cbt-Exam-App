import { useTranslation } from '../uiLanguage';
import { questionKey } from '../utils/questionBank';
import { useRef, useState } from 'react';
import JSZip from 'jszip';
import { readSheet } from 'read-excel-file/browser';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { DIFFICULTIES, PAPER_CATEGORIES, Paper, PaperCategory, Question, SUBJECTS, Subject } from '../types/exam';

interface Props {
  existingPapers: Paper[];
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

function parseCsv(text: string): { rows: string[][]; lines: number[] } {
  const rows: string[][] = [];
  const lines: number[] = [];
  let line = 1;
  let rowStart = 1;
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '\n') line += 1;
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
      rows.push(row);
      lines.push(rowStart);
      line += 1;
      rowStart = line;
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
    lines.push(rowStart);
  }
  if (inQuotes) throw new Error(`Row ${rowStart}: Closing quote is missing.`);
  return { rows, lines };
}

function validateQuestion(question: Question, location: string, seen: Set<number>): void {
  const { id, subject, marks, question_en, question_hi, options_en, options_hi } = question;
  if (!Number.isInteger(id) || seen.has(id)) throw new Error(`${location}: Question ID must be a unique integer.`);
  if (marks !== MARKS_BY_SUBJECT[subject]) throw new Error(`${location}: Invalid marks for ${subject}.`);
  if (!question_en.trim() || !question_hi.trim()) throw new Error(`${location}: Question text is missing.`);
  for (const [language, options] of [['en', options_en], ['hi', options_hi]] as const) {
    const missing = options.findIndex((option) => !option.trim());
    if (missing >= 0) throw new Error(`${location}: Option ${'ABCDE'[missing]} (${language}) is missing.`);
  }
  seen.add(id);
}

function validatePaper(raw: unknown, fallbackTitle: string): Paper {
  const p = raw as Partial<Paper>;
  if (!p || typeof p !== 'object' || !Array.isArray(p.questions) || p.questions.length === 0) {
    throw new Error(`${fallbackTitle}: Invalid JSON — missing non-empty questions array.`);
  }
  const ids = new Set<number>();
  const questions: Question[] = p.questions.map((q, idx) => {
    if (!q || !VALID_SUBJECTS.has(q.subject)) {
      throw new Error(`${fallbackTitle} Q${idx + 1}: Invalid subject "${q?.subject ?? ''}".`);
    }
    if (!Array.isArray(q.options_en) || q.options_en.length !== 5 || !Array.isArray(q.options_hi) || q.options_hi.length !== 5) {
      throw new Error(`${fallbackTitle} Q${idx + 1}: Must have exactly 5 English and 5 Hindi options.`);
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 4) {
      throw new Error(`${fallbackTitle} Q${idx + 1}: correctIndex must be 0–4.`);
    }
    const subject = q.subject as Subject;
    const question: Question = {
      id: typeof q.id === 'number' ? q.id : idx + 1,
      subject,
      marks: typeof q.marks === 'number' ? q.marks : MARKS_BY_SUBJECT[subject],
      question_en: String(q.question_en ?? ''),
      question_hi: String(q.question_hi ?? q.question_en ?? ''),
      options_en: q.options_en.map((value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '') as [string, string, string, string, string],
      options_hi: q.options_hi.map((value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '') as [string, string, string, string, string],
      correctIndex: q.correctIndex,
      explanation_en: String(q.explanation_en ?? ''),
      explanation_hi: String(q.explanation_hi ?? q.explanation_en ?? ''),
      topic: typeof q.topic === 'string' ? q.topic.trim() : undefined,
      difficulty: DIFFICULTIES.find((value) => value === q.difficulty),
      source: typeof q.source?.title === 'string' ? { title: q.source.title, year: Number.isInteger(q.source.year) ? q.source.year : undefined } : undefined,
      optionExplanations_en: Array.isArray(q.optionExplanations_en) ? q.optionExplanations_en.slice(0, 5).map((note) => typeof note === 'string' ? note.trim() : '') : undefined,
      optionExplanations_hi: Array.isArray(q.optionExplanations_hi) ? q.optionExplanations_hi.slice(0, 5).map((note) => typeof note === 'string' ? note.trim() : '') : undefined,
    };
    validateQuestion(question, `${fallbackTitle}, question ${idx + 1}`, ids);
    return question;
  });

  const category: PaperCategory = p.category && (PAPER_CATEGORIES as readonly string[]).includes(p.category)
    ? p.category
    : 'Custom';
  const difficulty = p.difficulty && (DIFFICULTIES as readonly string[]).includes(p.difficulty)
    ? p.difficulty
    : 'Medium';

  return {
    paperId: typeof p.paperId === 'string' && p.paperId.trim() ? p.paperId : `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

function rowsToPaper(rows: unknown[][], title: string, lines?: number[]): Paper {
  if (rows.length < 2) throw new Error(`${title}: Empty sheet — add header + at least 1 question row.`);
  const headers = rows[0].map((h) => String(h ?? '').trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);
  const required = ['subject', 'question_en', 'option_a_en', 'option_b_en', 'option_c_en', 'option_d_en', 'option_e_en'];
  for (const r of required) {
    if (col(r) === -1) throw new Error(`${title}: Missing required column "${r}".`);
  }

  const questions: Question[] = [];
  const ids = new Set<number>();
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    const location = `${title}, row ${lines?.[i] ?? i + 1}`;
    if (!r || r.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
    const get = (name: string) => {
      const idx = col(name);
      return idx >= 0 ? String(r[idx] ?? '').trim() : '';
    };
    const subjectRaw = get('subject');
    if (!VALID_SUBJECTS.has(subjectRaw)) {
      throw new Error(`${location}: Invalid subject "${subjectRaw}".`);
    }
    const subject = subjectRaw as Subject;
    const corrRaw = (get('correct') || get('correctindex')).toUpperCase();
    const corrIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(corrRaw);
    const numIdx = Number(corrRaw);
    const correctIndex = corrIdx >= 0 ? corrIdx : (corrRaw !== '' && Number.isInteger(numIdx) && numIdx >= 0 && numIdx <= 4 ? numIdx : -1);
    if (correctIndex < 0) {
      throw new Error(`${location}: "correct" must be A–E (or 0–4).`);
    }
    const optsEn = [get('option_a_en'), get('option_b_en'), get('option_c_en'), get('option_d_en'), get('option_e_en')] as [string, string, string, string, string];
    const optsHi = [
      get('option_a_hi') || optsEn[0],
      get('option_b_hi') || optsEn[1],
      get('option_c_hi') || optsEn[2],
      get('option_d_hi') || optsEn[3],
      get('option_e_hi') || optsEn[4],
    ] as [string, string, string, string, string];

    const question: Question = {
      id: get('id') ? Number(get('id')) : questions.length + 1,
      subject,
      marks: get('marks') ? Number(get('marks')) : MARKS_BY_SUBJECT[subject],
      question_en: get('question_en'),
      question_hi: get('question_hi') || get('question_en'),
      options_en: optsEn,
      options_hi: optsHi,
      correctIndex,
      explanation_en: get('explanation_en'),
      explanation_hi: get('explanation_hi') || get('explanation_en'),
      topic: get('topic') || undefined,
      difficulty: DIFFICULTIES.find((value) => value.toLowerCase() === get('difficulty').toLowerCase()),
      source: get('source') || get('year') ? { title: get('source') || title.replace(/\.[^.]+$/, ''), year: Number(get('year')) || undefined } : undefined,
      optionExplanations_en: Array.from('abcde', (letter) => get(`explanation_${letter}_en`)),
      optionExplanations_hi: Array.from('abcde', (letter) => get(`explanation_${letter}_hi`)),
    };
    validateQuestion(question, location, ids);
    questions.push(question);
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

export default function Importer({ existingPapers, onImport, onDownloadTemplate }: Props) {
  const t = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const parseFileBuffer = async (name: string, buffer: ArrayBuffer): Promise<Paper> => {
    const ext = name.split('.').pop()?.toLowerCase();
    const decode = () => new TextDecoder().decode(buffer);
    let paper: Paper;
    switch (ext) {
      case 'json': paper = validatePaper(JSON.parse(decode()), name); break;
      case 'csv': {
        const { rows, lines } = parseCsv(decode());
        paper = rowsToPaper(rows, name, lines);
        break;
      }
      case 'xlsx': paper = rowsToPaper(await readSheet(buffer), name); break;
      default: throw new Error(`${name}: Unsupported file format.`);
    }
    const totalMarks = paper.questions.reduce((total, question) => total + question.marks, 0);
    if (paper.questions.length !== 70 || totalMarks !== 100 || !Number.isFinite(paper.durationMinutes)) {
      throw new Error(`${name}: A mock paper must contain 70 questions totaling 100 marks and a valid duration.`);
    }
    return paper;
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
                errors.push(`${file.name} / ${entry.name}: ${err instanceof Error ? err.message : 'Failed to parse.'}`);
              }
            }
          } catch (err) {
            errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Invalid ZIP archive.'}`);
          }
        } else {
          try {
            imported.push(await parseFileBuffer(file.name, await file.arrayBuffer()));
          } catch (err) {
            errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Failed to parse.'}`);
          }
        }
      }

      const known = new Set(existingPapers.flatMap((paper) => paper.questions.map(questionKey)));
      const duplicates: string[] = [];
      for (const paper of imported) {
        let count = 0;
        for (const question of paper.questions) {
          const key = questionKey(question);
          if (known.has(key)) count += 1;
          known.add(key);
        }
        if (count) duplicates.push(`${paper.title}: ${count} duplicate question(s)`);
      }
      if (imported.length > 0) await onImport(imported);
      const report = duplicates.length ? ` | ${duplicates.join(' | ')}` : '';

      if (imported.length > 0 && errors.length === 0) {
        setStatus({ ok: true, text: `Imported ${imported.length} paper${imported.length > 1 ? 's' : ''} successfully.${report}` });
      } else if (imported.length > 0 && errors.length > 0) {
        setStatus({
          ok: true,
          text: `Imported ${imported.length} paper(s). Skipped ${errors.length}: ${errors.join(' | ')}${report}`,
        });
      } else {
        setStatus({ ok: false, text: errors.join(' | ') || 'No valid papers found.' });
      }
    } catch (error) {
      setStatus({ ok: false, text: error instanceof Error ? error.message : 'Could not save imported papers.' });
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
      'correct', 'explanation_en', 'explanation_hi', 'topic', 'difficulty', 'source', 'year',
      ...Array.from('abcde', (letter) => `explanation_${letter}_en`),
      ...Array.from('abcde', (letter) => `explanation_${letter}_hi`),
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
            {t("Bulk Paper Importer (.json, .xlsx, .csv, .zip)", "पेपर इम्पोर्ट करें (.json, .xlsx, .csv, .zip)")}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            {t("Select multiple mock paper files or a single .zip bundle containing up to 30+ papers at once.", "कई मॉक पेपर फ़ाइलें या एक ZIP चुनें।")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> {t("CSV Template", "CSV का नमूना")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> {busy ? t('Importing…', 'इम्पोर्ट हो रहा है…') : t('Import Papers / ZIP', 'पेपर / ZIP इम्पोर्ट करें')}
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
