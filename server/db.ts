import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store DB outside dist/ so it persists across deploys
const APP_ROOT = path.join(__dirname, "..", "..");
const DB_PATH = path.join(APP_ROOT, "data", "social-agency.db");

// Ensure data dir exists
import fs from "fs";
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --- Schema ---

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    accountType TEXT DEFAULT 'individual',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    accountType TEXT NOT NULL DEFAULT 'individual',
    onboardingComplete INTEGER NOT NULL DEFAULT 0,

    -- Business Info (stored as JSON)
    business TEXT NOT NULL DEFAULT '{}',

    -- Brand Identity (stored as JSON)
    brand TEXT NOT NULL DEFAULT '{}',

    -- Brand Voice (stored as JSON)
    voice TEXT NOT NULL DEFAULT '{}',

    -- Compliance (stored as JSON)
    compliance TEXT NOT NULL DEFAULT '{}',

    -- Platform Setup (stored as JSON)
    platforms TEXT NOT NULL DEFAULT '{}',

    -- Blotato API key per client
    blotatoApiKey TEXT,

    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_clients_userId ON clients(userId);

  CREATE TABLE IF NOT EXISTS content_plans (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    userId TEXT NOT NULL,
    topic TEXT NOT NULL,
    generatedAt TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    planData TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_plans_clientId ON content_plans(clientId);
  CREATE INDEX IF NOT EXISTS idx_plans_userId ON content_plans(userId);

  CREATE TABLE IF NOT EXISTS active_client (
    userId TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  );
`);

// --- Migrations ---

// Add referencePhotos column if it doesn't exist
try {
  db.exec(`ALTER TABLE clients ADD COLUMN referencePhotos TEXT NOT NULL DEFAULT '[]'`);
} catch {
  // Column already exists — ignore
}

// --- User operations ---

export function createUser(id: string, email: string, name: string, passwordHash: string): void {
  db.prepare("INSERT INTO users (id, email, name, passwordHash) VALUES (?, ?, ?, ?)").run(id, email, name, passwordHash);
}

export function getUserByEmail(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as { id: string; email: string; name: string; passwordHash: string } | undefined;
}

export function getUserById(id: string) {
  return db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(id) as { id: string; email: string; name: string } | undefined;
}

// --- Client operations ---

interface ClientRow {
  id: string;
  userId: string;
  accountType: string;
  onboardingComplete: number;
  business: string;
  brand: string;
  voice: string;
  compliance: string;
  platforms: string;
  blotatoApiKey: string | null;
  referencePhotos: string;
  createdAt: string;
  updatedAt: string;
}

function rowToClient(row: ClientRow) {
  return {
    id: row.id,
    userId: row.userId,
    accountType: row.accountType,
    onboardingComplete: !!row.onboardingComplete,
    business: JSON.parse(row.business),
    brand: JSON.parse(row.brand),
    voice: JSON.parse(row.voice),
    compliance: JSON.parse(row.compliance),
    platforms: JSON.parse(row.platforms),
    blotatoApiKey: row.blotatoApiKey,
    referencePhotos: JSON.parse(row.referencePhotos || '[]'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getClientsByUser(userId: string) {
  const rows = db.prepare("SELECT * FROM clients WHERE userId = ? ORDER BY createdAt").all(userId) as ClientRow[];
  return rows.map(rowToClient);
}

export function getClientById(id: string) {
  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow | undefined;
  return row ? rowToClient(row) : null;
}

export function createClient(data: {
  id: string;
  userId: string;
  accountType: string;
  onboardingComplete: boolean;
  business: unknown;
  brand: unknown;
  voice: unknown;
  compliance: unknown;
  platforms: unknown;
  blotatoApiKey?: string;
  referencePhotos?: unknown[];
}) {
  db.prepare(`
    INSERT INTO clients (id, userId, accountType, onboardingComplete, business, brand, voice, compliance, platforms, blotatoApiKey, referencePhotos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.userId,
    data.accountType,
    data.onboardingComplete ? 1 : 0,
    JSON.stringify(data.business),
    JSON.stringify(data.brand),
    JSON.stringify(data.voice),
    JSON.stringify(data.compliance),
    JSON.stringify(data.platforms),
    data.blotatoApiKey || null,
    JSON.stringify(data.referencePhotos || []),
  );
  return getClientById(data.id);
}

export function updateClient(id: string, updates: {
  business?: unknown;
  brand?: unknown;
  voice?: unknown;
  compliance?: unknown;
  platforms?: unknown;
  blotatoApiKey?: string;
  onboardingComplete?: boolean;
  accountType?: string;
  referencePhotos?: unknown[];
}) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.business !== undefined) { fields.push("business = ?"); values.push(JSON.stringify(updates.business)); }
  if (updates.brand !== undefined) { fields.push("brand = ?"); values.push(JSON.stringify(updates.brand)); }
  if (updates.voice !== undefined) { fields.push("voice = ?"); values.push(JSON.stringify(updates.voice)); }
  if (updates.compliance !== undefined) { fields.push("compliance = ?"); values.push(JSON.stringify(updates.compliance)); }
  if (updates.platforms !== undefined) { fields.push("platforms = ?"); values.push(JSON.stringify(updates.platforms)); }
  if (updates.blotatoApiKey !== undefined) { fields.push("blotatoApiKey = ?"); values.push(updates.blotatoApiKey); }
  if (updates.onboardingComplete !== undefined) { fields.push("onboardingComplete = ?"); values.push(updates.onboardingComplete ? 1 : 0); }
  if (updates.accountType !== undefined) { fields.push("accountType = ?"); values.push(updates.accountType); }
  if (updates.referencePhotos !== undefined) { fields.push("referencePhotos = ?"); values.push(JSON.stringify(updates.referencePhotos)); }

  if (fields.length === 0) return getClientById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE clients SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getClientById(id);
}

export function deleteClient(id: string, userId: string) {
  db.prepare("DELETE FROM clients WHERE id = ? AND userId = ?").run(id, userId);
}

// --- Active client ---

export function getActiveClientId(userId: string): string | null {
  const row = db.prepare("SELECT clientId FROM active_client WHERE userId = ?").get(userId) as { clientId: string } | undefined;
  return row?.clientId || null;
}

export function setActiveClientId(userId: string, clientId: string) {
  db.prepare("INSERT OR REPLACE INTO active_client (userId, clientId) VALUES (?, ?)").run(userId, clientId);
}

// --- Content plan operations ---

interface PlanRow {
  id: string;
  clientId: string;
  userId: string;
  topic: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  status: string;
  planData: string;
  createdAt: string;
  updatedAt: string;
}

function rowToPlan(row: PlanRow) {
  return {
    id: row.id,
    clientId: row.clientId,
    userId: row.userId,
    topic: row.topic,
    generatedAt: row.generatedAt,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    days: JSON.parse(row.planData),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getPlansByClient(clientId: string, userId: string) {
  const rows = db.prepare("SELECT * FROM content_plans WHERE clientId = ? AND userId = ? ORDER BY createdAt DESC").all(clientId, userId) as PlanRow[];
  return rows.map(rowToPlan);
}

export function getPlanById(id: string) {
  const row = db.prepare("SELECT * FROM content_plans WHERE id = ?").get(id) as PlanRow | undefined;
  return row ? rowToPlan(row) : null;
}

export function savePlan(data: {
  id: string;
  clientId: string;
  userId: string;
  topic: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  status: string;
  days: unknown;
}) {
  const existing = getPlanById(data.id);
  if (existing) {
    db.prepare(`
      UPDATE content_plans SET topic = ?, status = ?, planData = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(data.topic, data.status, JSON.stringify(data.days), data.id);
  } else {
    db.prepare(`
      INSERT INTO content_plans (id, clientId, userId, topic, generatedAt, startDate, endDate, status, planData)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.id, data.clientId, data.userId, data.topic, data.generatedAt, data.startDate, data.endDate, data.status, JSON.stringify(data.days));
  }
  return getPlanById(data.id);
}

export function deletePlan(id: string, userId: string) {
  db.prepare("DELETE FROM content_plans WHERE id = ? AND userId = ?").run(id, userId);
}

export default db;
