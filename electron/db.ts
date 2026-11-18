import { app } from 'electron';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface PinRecord { salt: string; hash: string; }
interface LocalProfile { id: string; name: string; builtIn?: boolean; }
interface Database {
  version: 2;
  profiles: LocalProfile[];
  pins: Partial<Record<string, PinRecord>>;
  adminPin?: PinRecord;
  attempts: unknown[];
  papers: unknown[];
}
interface BackupData {
  format: 'rvunl-cbt-backup';
  version: 1;
  exportedAt: string;
  profiles: LocalProfile[];
  pins: Partial<Record<string, PinRecord>>;
  attempts: unknown[];
  papers: unknown[];
}

const DEFAULT_ADMIN_PIN_HASH = '3865e98e8d3fe3316c6b8cb24219bf0847bdd11b9f9b1940dda302111134c297';
const defaultProfiles = (): LocalProfile[] => [
  { id: 'monika', name: 'Monika', builtIn: true },
  { id: 'shivani', name: 'Shivani', builtIn: true },
];
const emptyDatabase = (): Database => ({ version: 2, profiles: defaultProfiles(), pins: {}, attempts: [], papers: [] });
const databasePath = () => join(app.getPath('userData'), 'rvunl-cbt-data.json');

function readDatabase(path: string): Database {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<Database>;
  if (!parsed || !Array.isArray(parsed.profiles) || !parsed.profiles.length ||
      !Array.isArray(parsed.attempts) || !Array.isArray(parsed.papers) ||
      parsed.profiles.some((profile) => !profile || typeof profile.id !== 'string' || typeof profile.name !== 'string')) {
    throw new Error('Invalid database structure.');
  }
  return {
    version: 2,
    profiles: parsed.profiles,
    pins: parsed.pins ?? {},
    adminPin: parsed.adminPin,
    attempts: parsed.attempts,
    papers: parsed.papers,
  };
}

function loadDatabase(): Database {
  const path = databasePath();
  const backup = `${path}.bak`;
  if (!existsSync(path) && !existsSync(backup)) return emptyDatabase();
  try {
    return readDatabase(path);
  } catch {
    try {
      return readDatabase(backup);
    } catch {
      throw new Error('Saved data could not be read. The original files have been preserved. Restore a valid backup or contact support.');
    }
  }
}

function saveDatabase(database: Database): void {
  const path = databasePath();
  const backup = `${path}.bak`;
  if (existsSync(path)) {
    let readable = true;
    try { readDatabase(path); } catch { readable = false; }
    if (readable) {
      copyFileSync(path, `${backup}.tmp`);
      renameSync(`${backup}.tmp`, backup);
    } else {
      // A recovered backup may be saved without discarding the damaged original.
      copyFileSync(path, `${path}.corrupt-${Date.now()}-${randomBytes(4).toString('hex')}`);
    }
  }
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, JSON.stringify(database, null, 2), 'utf8');
  renameSync(tempPath, path);
  if (!existsSync(backup)) {
    copyFileSync(path, `${backup}.tmp`);
    renameSync(`${backup}.tmp`, backup);
  }
}

function hashPin(pin: string, salt = ''): string {
  return createHash('sha256').update(salt ? `${salt}:${pin}` : pin).digest('hex');
}

function pinMatches(pin: unknown, record?: PinRecord, defaultHash?: string): boolean {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return false;
  const actualHash = record ? hashPin(pin, record.salt) : hashPin(pin);
  const expectedHash = record?.hash ?? defaultHash;
  if (!expectedHash) return false;
  const actual = Buffer.from(actualHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function assertAdminPin(database: Database, pin: unknown): asserts pin is string {
  if (!pinMatches(pin, database.adminPin, DEFAULT_ADMIN_PIN_HASH)) throw new Error('Incorrect admin PIN.');
}

function assertKnownUser(database: Database, userId: unknown): asserts userId is string {
  if (typeof userId !== 'string' || !database.profiles.some((profile) => profile.id === userId)) throw new Error('Invalid profile.');
}

const ALLOWED_SUBJECTS = new Set(['Rajasthan GK', 'World, India & Everyday Science', 'Reasoning & Mental Ability', 'Hindi General', 'English General', 'Mathematics']);
function assertPaper(paper: unknown): void {
  if (!paper || typeof paper !== 'object') throw new Error('Invalid paper.');
  const value = paper as Record<string, unknown>;
  if (typeof value.paperId !== 'string' || typeof value.title !== 'string' || typeof value.durationMinutes !== 'number' || !Array.isArray(value.questions) || value.questions.length !== 70) throw new Error('A paper must contain a title, duration, and exactly 70 questions.');
  const ids = new Set<number>();
  let totalMarks = 0;
  for (const item of value.questions) {
    if (!item || typeof item !== 'object') throw new Error('Invalid question data.');
    const question = item as Record<string, unknown>;
    if (!Number.isInteger(question.id) || ids.has(question.id as number) || !ALLOWED_SUBJECTS.has(String(question.subject)) || (question.marks !== 1 && question.marks !== 2)) throw new Error('A question has invalid identity, subject, or marks.');
    ids.add(question.id as number); totalMarks += question.marks as number;
    if (typeof question.question_en !== 'string' || typeof question.question_hi !== 'string' || typeof question.explanation_en !== 'string' || typeof question.explanation_hi !== 'string' || !Array.isArray(question.options_en) || !Array.isArray(question.options_hi) || question.options_en.length !== 5 || question.options_hi.length !== 5 || !Number.isInteger(question.correctIndex) || (question.correctIndex as number) < 0 || (question.correctIndex as number) > 4) throw new Error(`Question ${String(question.id)} is incomplete.`);
  }
  if (totalMarks !== 100) throw new Error('A paper must total exactly 100 marks.');
}

function assertAttempt(attempt: unknown, profileIds: Set<string>): void {
  if (!attempt || typeof attempt !== 'object') throw new Error('Invalid attempt in backup.');
  const value = attempt as Record<string, unknown>;
  if (typeof value.attemptId !== 'string' || typeof value.userId !== 'string' || !profileIds.has(value.userId) || typeof value.paperId !== 'string' || typeof value.timestamp !== 'string' || typeof value.totalScore !== 'number' || !value.responses || typeof value.responses !== 'object') throw new Error('The backup contains an invalid result record.');
}

export function verifyAdminPin(pin: unknown): boolean {
  const database = loadDatabase();
  return pinMatches(pin, database.adminPin, DEFAULT_ADMIN_PIN_HASH);
}

export function publicState(): unknown {
  const database = loadDatabase();
  return {
    profiles: database.profiles.map((profile) => ({ ...profile, pinConfigured: Boolean(database.pins[profile.id]) })),
    attempts: database.attempts,
    papers: database.papers,
  };
}

export function saveAttempt(attempt: unknown): void {
  if (!attempt || typeof attempt !== 'object') throw new Error('Invalid attempt.');
  const value = attempt as Record<string, unknown>;
  const database = loadDatabase();
  assertKnownUser(database, value.userId);
  if (typeof value.attemptId !== 'string' || typeof value.paperId !== 'string') throw new Error('Invalid attempt.');
  database.attempts = [attempt, ...database.attempts.filter((item) => (item as Record<string, unknown>)?.attemptId !== value.attemptId)];
  saveDatabase(database);
}

export function savePapers(papers: unknown, adminPin: unknown): number {
  const database = loadDatabase();
  assertAdminPin(database, adminPin);
  if (!Array.isArray(papers) || papers.length === 0) throw new Error('Select at least one paper.');
  papers.forEach(assertPaper);
  const uniquePapers = Array.from(new Map(papers.map((paper) => [(paper as Record<string, unknown>).paperId as string, paper])).values());
  const incomingIds = new Set(uniquePapers.map((paper) => (paper as Record<string, unknown>).paperId as string));
  database.papers = [...uniquePapers, ...database.papers.filter((item) => !incomingIds.has((item as Record<string, unknown>)?.paperId as string))];
  saveDatabase(database);
  return uniquePapers.length;
}

export function deletePapers(paperIds: unknown, adminPin: unknown): number {
  const database = loadDatabase();
  assertAdminPin(database, adminPin);
  if (!Array.isArray(paperIds) || paperIds.some((id) => typeof id !== 'string')) throw new Error('Invalid paper selection.');
  const selected = new Set(paperIds as string[]);
  const before = database.papers.length;
  database.papers = database.papers.filter((item) => !selected.has((item as Record<string, unknown>)?.paperId as string));
  saveDatabase(database);
  return before - database.papers.length;
}

export function resetAttempts(target: unknown, adminPin: unknown): number {
  const database = loadDatabase();
  assertAdminPin(database, adminPin);
  if (target !== 'all') assertKnownUser(database, target);
  const before = database.attempts.length;
  database.attempts = target === 'all' ? [] : database.attempts.filter((item) => (item as Record<string, unknown>)?.userId !== target);
  saveDatabase(database);
  return before - database.attempts.length;
}

export function addProfile(name: unknown, adminPin: unknown): LocalProfile {
  const database = loadDatabase();
  assertAdminPin(database, adminPin);
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 30) throw new Error('Name must contain 2–30 characters.');
  const normalizedName = name.trim();
  if (database.profiles.some((profile) => profile.name.toLowerCase() === normalizedName.toLowerCase())) throw new Error('A profile with this name already exists.');
  const slug = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student';
  const profile = { id: `${slug}-${randomBytes(3).toString('hex')}`, name: normalizedName, builtIn: false };
  database.profiles.push(profile);
  saveDatabase(database);
  return profile;
}

export function deleteProfile(userId: unknown, adminPin: unknown): number {
  const database = loadDatabase();
  assertAdminPin(database, adminPin);
  assertKnownUser(database, userId);
  const profile = database.profiles.find((item) => item.id === userId)!;
  if (profile.builtIn || profile.id === 'monika' || profile.id === 'shivani') throw new Error('Monika and Shivani profiles cannot be deleted.');
  const removedAttempts = database.attempts.filter((item) => (item as Record<string, unknown>)?.userId === userId).length;
  database.profiles = database.profiles.filter((item) => item.id !== userId);
  database.attempts = database.attempts.filter((item) => (item as Record<string, unknown>)?.userId !== userId);
  delete database.pins[userId];
  saveDatabase(database);
  return removedAttempts;
}

export function changeAdminPin(currentPin: unknown, newPin: unknown): void {
  const database = loadDatabase();
  assertAdminPin(database, currentPin);
  if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) throw new Error('New admin PIN must contain four digits.');
  const salt = randomBytes(16).toString('hex');
  database.adminPin = { salt, hash: hashPin(newPin, salt) };
  saveDatabase(database);
}

export function createBackup(adminPin: unknown): BackupData {
  const database = loadDatabase();
  assertAdminPin(database, adminPin);
  return { format: 'rvunl-cbt-backup', version: 1, exportedAt: new Date().toISOString(), profiles: database.profiles, pins: database.pins, attempts: database.attempts, papers: database.papers };
}

export function restoreBackup(value: unknown, adminPin: unknown): void {
  const database = loadDatabase();
  assertAdminPin(database, adminPin);
  if (!value || typeof value !== 'object') throw new Error('Invalid backup file.');
  const backup = value as Partial<BackupData>;
  if (backup.format !== 'rvunl-cbt-backup' || backup.version !== 1 || !Array.isArray(backup.profiles) || !Array.isArray(backup.attempts) || !Array.isArray(backup.papers)) throw new Error('This is not a valid RVUNL CBT backup.');
  const profiles = backup.profiles.filter((profile) => profile && typeof profile.id === 'string' && typeof profile.name === 'string' && profile.name.trim().length >= 2 && profile.name.trim().length <= 30);
  const profileIds = new Set(profiles.map((profile) => profile.id));
  if (!profiles.length || profileIds.size !== profiles.length) throw new Error('The backup contains invalid or duplicate profiles.');
  backup.papers.forEach(assertPaper);
  backup.attempts.forEach((attempt) => assertAttempt(attempt, profileIds));
  database.profiles = profiles;
  database.pins = backup.pins && typeof backup.pins === 'object' ? backup.pins : {};
  database.attempts = backup.attempts;
  database.papers = backup.papers;
  saveDatabase(database);
}

export function setPin(userId: unknown, pin: unknown): void {
  const database = loadDatabase();
  assertKnownUser(database, userId);
  if (pin !== null && (typeof pin !== 'string' || !/^\d{4}$/.test(pin))) throw new Error('PIN must contain four digits.');
  if (pin === null) delete database.pins[userId];
  else {
    const salt = randomBytes(16).toString('hex');
    database.pins[userId] = { salt, hash: hashPin(pin, salt) };
  }
  saveDatabase(database);
}

export function verifyPin(userId: unknown, pin: unknown): boolean {
  const database = loadDatabase();
  if (typeof userId !== 'string' || !database.profiles.some((profile) => profile.id === userId)) return false;
  const record = database.pins[userId];
  return record ? pinMatches(pin, record) : true;
}
