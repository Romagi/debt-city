import type { Portfolio } from '../types/portfolio';

// ─── Types ───

export interface SessionMeta {
  slug: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───

const SESSIONS_KEY = 'debtcity_sessions';
const SAVE_PREFIX = 'debtcity_save_';

// ─── Helpers ───

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_debtcity_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Session CRUD ───

function getSessionIndex(): SessionMeta[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessionIndex(sessions: SessionMeta[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function listSessions(): SessionMeta[] {
  return getSessionIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createSession(
  name: string,
  password: string,
  initialPortfolio: Portfolio,
): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  const slug = slugify(name);
  if (!slug) return { success: false, error: 'Nom invalide' };

  const sessions = getSessionIndex();
  if (sessions.some(s => s.slug === slug)) {
    return { success: false, error: 'Une partie avec ce nom existe déjà' };
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const meta: SessionMeta = {
    slug,
    name,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  sessions.push(meta);
  saveSessionIndex(sessions);
  localStorage.setItem(SAVE_PREFIX + slug, JSON.stringify(initialPortfolio));

  return { success: true, slug };
}

export async function loadSession(
  slug: string,
  password: string,
): Promise<{ success: true; portfolio: Portfolio } | { success: false; error: string }> {
  const sessions = getSessionIndex();
  const meta = sessions.find(s => s.slug === slug);
  if (!meta) return { success: false, error: 'Partie introuvable' };

  const passwordHash = await hashPassword(password);
  if (passwordHash !== meta.passwordHash) {
    return { success: false, error: 'Mot de passe incorrect' };
  }

  const raw = localStorage.getItem(SAVE_PREFIX + slug);
  if (!raw) return { success: false, error: 'Sauvegarde corrompue' };

  try {
    const portfolio = JSON.parse(raw) as Portfolio;
    return { success: true, portfolio };
  } catch {
    return { success: false, error: 'Sauvegarde corrompue' };
  }
}

export function savePortfolio(slug: string, portfolio: Portfolio): void {
  localStorage.setItem(SAVE_PREFIX + slug, JSON.stringify(portfolio));

  // Update the updatedAt timestamp
  const sessions = getSessionIndex();
  const idx = sessions.findIndex(s => s.slug === slug);
  if (idx !== -1) {
    sessions[idx] = { ...sessions[idx], updatedAt: new Date().toISOString() };
    saveSessionIndex(sessions);
  }
}

export function deleteSession(slug: string): void {
  const sessions = getSessionIndex().filter(s => s.slug !== slug);
  saveSessionIndex(sessions);
  localStorage.removeItem(SAVE_PREFIX + slug);
}

export function exportSession(slug: string): string | null {
  return localStorage.getItem(SAVE_PREFIX + slug);
}

export async function importSession(
  name: string,
  password: string,
  portfolioJson: string,
): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  try {
    const portfolio = JSON.parse(portfolioJson) as Portfolio;
    return await createSession(name, password, portfolio);
  } catch {
    return { success: false, error: 'Fichier invalide' };
  }
}
