import os from 'node:os';
import path from 'node:path';

/**
 * Alphabet letters used to name import subdirectories (a, b, c...).
 */
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Expands a leading tilde (~) in a path to the user's home directory.
 * Handles both `~` alone and `~/...` prefixes.
 */
export function expandTilde(filePath: string): string {
  if (filePath === '~' || filePath.startsWith('~/') || filePath.startsWith('~\\')) {
    return path.join(os.homedir(), filePath.slice(1));
  }

  return filePath;
}

/**
 * Formats a Date as a path segment in the form `YYYY/MM/DD`.
 * Uses local time (not UTC) to match the camera/device timezone.
 */
export function formatDatePath(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

/**
 * Returns the Unix timestamp in seconds for a given Date.
 */
export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
