import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Local mounted storage adapter for development.
 * Production: swap with Q Storage / Quilibrium adapter.
 *
 * IMPORTANT: This is a local dev implementation only.
 * Do not use for production durable storage.
 */

function safePath(baseDir: string, relPath: string): string {
  const resolved = path.resolve(baseDir, relPath);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function writeJson(
  baseDir: string,
  relPath: string,
  data: unknown
): Promise<void> {
  const full = safePath(baseDir, relPath);
  await ensureDir(full);
  await fs.writeFile(full, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readJson<T = unknown>(
  baseDir: string,
  relPath: string
): Promise<T> {
  const full = safePath(baseDir, relPath);
  const content = await fs.readFile(full, 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeText(
  baseDir: string,
  relPath: string,
  content: string
): Promise<void> {
  const full = safePath(baseDir, relPath);
  await ensureDir(full);
  await fs.writeFile(full, content, 'utf-8');
}

export async function readText(baseDir: string, relPath: string): Promise<string> {
  const full = safePath(baseDir, relPath);
  return fs.readFile(full, 'utf-8');
}

export async function writeBuffer(
  baseDir: string,
  relPath: string,
  buf: Buffer
): Promise<void> {
  const full = safePath(baseDir, relPath);
  await ensureDir(full);
  await fs.writeFile(full, buf);
}

export async function readBuffer(baseDir: string, relPath: string): Promise<Buffer> {
  const full = safePath(baseDir, relPath);
  return fs.readFile(full);
}
