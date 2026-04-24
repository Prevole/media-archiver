import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';

/**
 * Recursively collects all file paths under a directory,
 * returned as paths relative to that directory, sorted alphabetically.
 */
function collectFiles(dir: string, base: string = dir): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const result: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath, base));
    } else {
      result.push(path.relative(base, fullPath));
    }
  }

  return result;
}

/**
 * Tolerance in seconds for timestamp comparisons.
 * Some filesystems have 1-second resolution.
 */
const TIMESTAMP_TOLERANCE_MS = 1500;

/**
 * Asserts that the target directory matches the expected directory:
 * - Same set of files (relative paths)
 * - Same file content
 * - atime and mtime within tolerance of expected values
 *
 * Expected file timestamps are read from the files in the `expected` directory itself,
 * since those are pre-populated with `utimesSync` during test setup.
 */
export function assertDirectoryMatchesExpected(
  targetDir: string,
  expectedDir: string
): void {
  const targetFiles = collectFiles(targetDir);
  const expectedFiles = collectFiles(expectedDir);

  expect(targetFiles).toEqual(expectedFiles);

  for (const relPath of expectedFiles) {
    const targetPath = path.join(targetDir, relPath);
    const expectedPath = path.join(expectedDir, relPath);

    // Content
    const targetContent = fs.readFileSync(targetPath, 'utf-8');
    const expectedContent = fs.readFileSync(expectedPath, 'utf-8');
    expect(targetContent, `Content mismatch for ${relPath}`).toBe(expectedContent);

    // Timestamps
    const targetStat = fs.statSync(targetPath);
    const expectedStat = fs.statSync(expectedPath);

    const atimeDiff = Math.abs(targetStat.atimeMs - expectedStat.atimeMs);
    const mtimeDiff = Math.abs(targetStat.mtimeMs - expectedStat.mtimeMs);

    expect(
      atimeDiff,
      `atime mismatch for ${relPath}: target=${targetStat.atime.toISOString()} expected=${expectedStat.atime.toISOString()}`
    ).toBeLessThanOrEqual(TIMESTAMP_TOLERANCE_MS);

    expect(
      mtimeDiff,
      `mtime mismatch for ${relPath}: target=${targetStat.mtime.toISOString()} expected=${expectedStat.mtime.toISOString()}`
    ).toBeLessThanOrEqual(TIMESTAMP_TOLERANCE_MS);
  }
}

/**
 * Asserts that a directory is empty (no files anywhere in the tree).
 */
export function assertDirectoryIsEmpty(dir: string): void {
  const files = collectFiles(dir);
  expect(files, `Expected ${dir} to be empty but found: ${files.join(', ')}`).toHaveLength(0);
}
