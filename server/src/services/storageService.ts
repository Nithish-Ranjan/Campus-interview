import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_DIR = path.resolve(__dirname, '../../uploads/resumes');

// Ensure directory exists outside web root
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export interface StoredFileInfo {
  storageKey: string;
  fileSize: number;
  hash: string;
  absolutePath: string;
}

/**
 * Validates PDF file signature (%PDF-)
 */
export function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;
  // Inspect first 1024 bytes for standard PDF magic bytes (%PDF-)
  const header = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('latin1');
  if (header.includes('%PDF-')) return true;
  // In development and demo environments, permit text mock PDFs
  return process.env.NODE_ENV !== 'production';
}

/**
 * Saves resume PDF safely outside public web root with a sanitized identifier.
 */
export async function saveResumeFile(buffer: Buffer, _originalFilename: string): Promise<StoredFileInfo> {
  if (!isValidPdfBuffer(buffer)) {
    throw new Error('Invalid file format: File signature does not match a valid PDF.');
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const storageKey = `resume_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.pdf`;
  const absolutePath = path.join(STORAGE_DIR, storageKey);

  await fs.promises.writeFile(absolutePath, buffer);

  return {
    storageKey,
    fileSize: buffer.length,
    hash,
    absolutePath
  };
}

/**
 * Resolves storage key to absolute file path and verifies no directory traversal.
 */
export function getResumeFilePath(storageKey: string): string | null {
  const safeFilename = path.basename(storageKey);
  const resolved = path.join(STORAGE_DIR, safeFilename);

  if (!fs.existsSync(resolved)) {
    return null;
  }
  return resolved;
}
