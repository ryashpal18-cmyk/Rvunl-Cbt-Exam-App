import { app } from 'electron';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface PinRecord {
  salt: string;
  hash: string;
}

interface Database {
  version: 1;
  pins: Partial<Record<'monika' | 'shivani', PinRecord>>;
  attempts: unknown[];
  papers: unknown[];
}

type UserId = 'monika' | 'shivani';
type ResetTarget = UserId | 'all';

const ADMIN_PIN_HASH = '3865e98e8d3fe3316c6b8cb24219bf0847bdd11b9f9b1940dda302111134c297';
const emptyDatabase = (): Database => ({ version: 1, pins: {}, attempts: [], papers: [] });
const databasePath = () => join(app.getPath('userData'), 'rvunl-cbt-data.json');

function loadDatabase(): Database {
  const path = databasePath();
  if (!existsSync(path)) return emptyDatabase();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<Database>;
    return {
      version: 1,
      pins: parsed.pins ?? {},
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      papers: Array.isArray(parsed.papers) ? parsed.papers : [],
    };
  } catch {
    return emptyDatabase();
  }
}

function saveDatabase(database: Database): void {
  const path = databasePath();
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, JSON.stringify(database, null, 2), 'utf8');
  renameSync(tempPath, path);
}

function assertUserId(value: unknown): asserts value is UserId {
  if (value !== 'monika' && value !== 'shivani') throw new Error('Invalid profile.');
}

function assertAdminPin(pin: unknown): asserts pin is string {
  if (!verifyAdminPin(pin)) throw new Error('Incorrect admin PIN.');
}

function assertPaper(paper: unknown): void {
  if (!paper || typeof paper !== 'object') throw new Error('Invalid paper.');
  const value = paper as Record<string, unknown>;
  if (typeof value.paperId !== 'string' || !Array.isArray(value.questions) || value.questions.length !== 70) {
    throw new Error('A paper must contain exactly 70 questions.');
  }
}

function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

export function verifyAdminPin(pin: unknown): boolean {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return false;
  const actual = Buffer.from(createHash('sha256').update(pin).digest('hex'), 'hex');
  const expected = Buffer.from(ADMIN_PIN_HASH, 'hex');
  return timingSafeEqual(actual, expected);
}

export function publicState(): unknown {
  const database = loadDatabase();
  return {
    profiles: [
      { id: 'monika', name: 'Monika', pinConfigured: Boolean(database.pins.monika) },
      { id: 'shivani', name: 'Shivani', pinConfigured: Boolean(database.pins.shivani) },
    ],
    attempts: database.attempts,
    papers: database.papers,
  };
}

export function saveAttempt(attempt: unknown): void {
  if (!attempt || typeof attempt !== 'object') throw new Error('Invalid attempt.');
  const value = attempt as Record<string, unknown>;
  assertUserId(value.userId);
  if (typeof value.attemptId !== 'string' || typeof value.paperId !== 'string') throw new Error('Invalid attempt.');
  const database = loadDatabase();
  database.attempts = [attempt, ...database.attempts.filter((item) => (item as Record<string, unknown>)?.attemptId !== value.attemptId)];
  saveDatabase(database);
}

export function savePapers(papers: unknown, adminPin: unknown): number {
  assertAdminPin(adminPin);
  if (!Array.isArray(papers) || papers.length === 0) throw new Error('Select at least one paper.');
  papers.forEach(assertPaper);
  const uniquePapers = Array.from(new Map(papers.map((paper) => [(paper as Record<string, unknown>).paperId as string, paper])).values());
  const database = loadDatabase();
  const incomingIds = new Set(uniquePapers.map((paper) => (paper as Record<string, unknown>).paperId as string));
  database.papers = [...uniquePapers, ...database.papers.filter((item) => !incomingIds.has((item as Record<string, unknown>)?.paperId as string))];
  saveDatabase(database);
  return uniquePapers.length;
}

export function deletePapers(paperIds: unknown, adminPin: unknown): number {
  assertAdminPin(adminPin);
  if (!Array.isArray(paperIds) || paperIds.some((id) => typeof id !== 'string')) throw new Error('Invalid paper selection.');
  const selected = new Set(paperIds as string[]);
  const database = loadDatabase();
  const before = database.papers.length;
  database.papers = database.papers.filter((item) => !selected.has((item as Record<string, unknown>)?.paperId as string));
  saveDatabase(database);
  return before - database.papers.length;
}

export function resetAttempts(target: unknown, adminPin: unknown): number {
  assertAdminPin(adminPin);
  if (target !== 'all') assertUserId(target);
  const resetTarget = target as ResetTarget;
  const database = loadDatabase();
  const before = database.attempts.length;
  database.attempts = resetTarget === 'all'
    ? []
    : database.attempts.filter((item) => (item as Record<string, unknown>)?.userId !== resetTarget);
  saveDatabase(database);
  return before - database.attempts.length;
}

export function setPin(userId: unknown, pin: unknown): void {
  assertUserId(userId);
  if (pin !== null && (typeof pin !== 'string' || !/^\d{4}$/.test(pin))) throw new Error('PIN must contain four digits.');
  const database = loadDatabase();
  if (pin === null) {
    delete database.pins[userId];
  } else {
    const salt = randomBytes(16).toString('hex');
    database.pins[userId] = { salt, hash: hashPin(pin, salt) };
  }
  saveDatabase(database);
}

export function verifyPin(userId: unknown, pin: unknown): boolean {
  assertUserId(userId);
  if (typeof pin !== 'string') return false;
  const record = loadDatabase().pins[userId];
  if (!record) return true;
  const actual = Buffer.from(hashPin(pin, record.salt), 'hex');
  const expected = Buffer.from(record.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
