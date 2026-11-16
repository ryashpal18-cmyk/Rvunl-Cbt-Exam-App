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

function assertUserId(value: unknown): asserts value is 'monika' | 'shivani' {
  if (value !== 'monika' && value !== 'shivani') throw new Error('Invalid profile.');
}

function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex');
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

export function savePaper(paper: unknown): void {
  if (!paper || typeof paper !== 'object') throw new Error('Invalid paper.');
  const value = paper as Record<string, unknown>;
  if (typeof value.paperId !== 'string' || !Array.isArray(value.questions) || value.questions.length !== 70) {
    throw new Error('A paper must contain exactly 70 questions.');
  }
  const database = loadDatabase();
  database.papers = [paper, ...database.papers.filter((item) => (item as Record<string, unknown>)?.paperId !== value.paperId)];
  saveDatabase(database);
}

export function deletePaper(paperId: unknown): void {
  if (typeof paperId !== 'string') throw new Error('Invalid paper ID.');
  const database = loadDatabase();
  database.papers = database.papers.filter((item) => (item as Record<string, unknown>)?.paperId !== paperId);
  saveDatabase(database);
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
