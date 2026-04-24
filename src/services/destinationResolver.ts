import fs from 'node:fs';
import type { Stats } from 'node:fs';
import path from 'node:path';
import type { AppConfig, MediaTypeConfig } from '../models/config.js';
import type { FileOperation, FileTimes } from '../models/fileOperation.js';
import { ALPHABET, formatDatePath, toUnixSeconds } from '../utils/path.js';

/**
 * A per-run cache that maps a date-path key to the chosen import letter.
 * Key format: `<baseDestPath>/<YYYY>/<MM>/<DD>`
 *
 * This ensures all files with the same media type and capture date that are
 * processed in a single archiver run land in the same letter subdirectory.
 * The next run will find that letter already on disk and pick the next one.
 */
export type LetterCache = Map<string, string>;

/**
 * Creates a fresh, empty LetterCache. One instance should be created per
 * archiver run and passed down to every `resolveNewDestination` call.
 */
export function createLetterCache(): LetterCache {
  return new Map();
}

/**
 * Finds the media type configuration that matches a given file extension.
 * Returns undefined if no type matches (file will be skipped).
 */
export function resolveMediaType(
  ext: string,
  config: AppConfig
): MediaTypeConfig | undefined {
  const normalizedExt = ext.startsWith('.') ? ext.slice(1).toLowerCase() : ext.toLowerCase();

  return config.media.types.find((type) =>
    type.extensions.includes(normalizedExt)
  );
}

/**
 * Extracts FileTimes from a file's Stats.
 * atime and mtime are intentionally set to the same value (atime)
 * so that archiving preserves the original capture date.
 */
export function buildFileTimes(stats: Stats): FileTimes {
  return {
    atime: stats.atime,
    atimeMs: toUnixSeconds(stats.atime),
    // Intentional: mtime is set to atime to preserve capture date
    mtime: stats.atime,
    mtimeMs: toUnixSeconds(stats.atime),
    btime: stats.birthtime,
    btimeMs: toUnixSeconds(stats.birthtime),
  };
}

/**
 * For `copy` and `move` modes: computes the destination path under
 * `baseDestPath/YYYY/MM/DD/<letter>/filename`.
 *
 * The letter is determined once per `(baseDestPath, date)` combination per run:
 * - On first encounter, the next available letter is found on disk and cached.
 * - On subsequent encounters for the same key, the cached letter is reused,
 *   so all files of the same type and date in a single run share one folder.
 *
 * @throws If all 26 letters are already taken.
 */
export function resolveNewDestination(
  baseDestPath: string,
  fileName: string,
  stats: Stats,
  letterCache: LetterCache
): string {
  const datePath = formatDatePath(stats.mtime);
  const fullDatePath = path.join(baseDestPath, datePath);

  let letter = letterCache.get(fullDatePath);

  if (letter === undefined) {
    let idx = 0;

    if (fs.existsSync(fullDatePath)) {
      // ALPHABET[idx] is always defined here: idx starts at 0 and is bounded
      // by the idx >= ALPHABET.length guard below before it can go out of range.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      while (fs.existsSync(path.join(fullDatePath, ALPHABET[idx]!))) {
        idx++;

        if (idx >= ALPHABET.length) {
          throw new Error(
            `All import letters (a-z) are already used in ${fullDatePath}. Cannot create a new import folder.`
          );
        }
      }
    }

    const chosen = ALPHABET[idx];

    // ALPHABET[idx] is guaranteed to be defined: idx < ALPHABET.length is enforced
    // by the while-loop guard above. The non-null assertion avoids a dead branch.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    letter = chosen!;
    letterCache.set(fullDatePath, letter);
  }

  return path.join(fullDatePath, letter, fileName);
}

/**
 * For `date` mode: searches for an existing file by name and size within
 * `baseDestPath/YYYY/MM/DD/`. Returns the full path if found, undefined otherwise.
 */
export function findExistingDestination(
  baseDestPath: string,
  fileName: string,
  stats: Stats
): string | undefined {
  const datePath = formatDatePath(stats.mtime);
  const fullDatePath = path.join(baseDestPath, datePath);

  return findFileRecursive(fullDatePath, fileName, stats.size);
}

/**
 * Recursively searches a directory for a file matching name and size.
 */
function findFileRecursive(
  dirPath: string,
  targetName: string,
  targetSize: number
): string | undefined {
  if (!fs.existsSync(dirPath)) {
    return undefined;
  }

  const stat = fs.statSync(dirPath);

  if (stat.isDirectory()) {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
      const found = findFileRecursive(path.join(dirPath, entry), targetName, targetSize);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  const name = path.basename(dirPath);

  if (name === targetName && stat.size === targetSize) {
    return dirPath;
  }

  return undefined;
}

/**
 * Builds a FileOperation for a given source file.
 *
 * Returns undefined if:
 * - The file extension is not matched by any configured media type.
 * - Mode is `date` and no existing destination file is found (caller receives a warning).
 */
export function buildFileOperation(
  filePath: string,
  stats: Stats,
  config: AppConfig,
  targetDir: string,
  mode: 'copy' | 'move' | 'date',
  letterCache: LetterCache,
  onDateModeNotFound?: (src: string) => void
): FileOperation | undefined {
  const parsed = path.parse(filePath);
  const mediaType = resolveMediaType(parsed.ext, config);

  if (mediaType === undefined) {
    return undefined;
  }

  const baseDestPath = path.join(targetDir, mediaType.directory);
  const times = buildFileTimes(stats);

  let destFile: string;

  if (mode === 'date') {
    const existing = findExistingDestination(baseDestPath, parsed.base, stats);

    if (existing === undefined) {
      onDateModeNotFound?.(filePath);

      return undefined;
    }

    destFile = existing;
  } else {
    destFile = resolveNewDestination(baseDestPath, parsed.base, stats, letterCache);
  }

  return {
    file: parsed.base,
    src: filePath,
    destDir: path.dirname(destFile),
    destFile,
    times,
  };
}
