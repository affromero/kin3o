import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const AUTH_DIR = join(homedir(), '.kin3o');
const AUTH_FILE = join(AUTH_DIR, 'auth.json');

interface AuthData {
  accessToken: string;
  expiresAt: string;
}

export function loadAuthToken(): string | null {
  if (!existsSync(AUTH_FILE)) return null;

  try {
    const raw = readFileSync(AUTH_FILE, 'utf-8');
    const data = JSON.parse(raw) as Partial<AuthData>;

    if (!data.accessToken || !data.expiresAt) return null;

    const expires = new Date(data.expiresAt);
    if (expires.getTime() <= Date.now()) return null;

    return data.accessToken;
  } catch {
    return null;
  }
}

export function loadAuthExpiry(): string | null {
  if (!existsSync(AUTH_FILE)) return null;

  try {
    const raw = readFileSync(AUTH_FILE, 'utf-8');
    const data = JSON.parse(raw) as Partial<AuthData>;
    return data.expiresAt ?? null;
  } catch {
    return null;
  }
}

export function saveAuthToken(token: string, expiresAt: string): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  const data: AuthData = { accessToken: token, expiresAt };
  writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function clearAuthToken(): void {
  if (existsSync(AUTH_FILE)) {
    unlinkSync(AUTH_FILE);
  }
}
