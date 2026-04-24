import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from 'pino';
import type { AppConfig } from '../models/config.js';
import type { ArchiveMode, FileOperation } from '../models/fileOperation.js';
import { buildFileOperation, createLetterCache } from './destinationResolver.js';
import type { LetterCache } from './destinationResolver.js';

/** Files to always ignore regardless of extension */
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

/**
 * Scans a source directory and returns the list of FileOperations to execute.
 *
 * - Regular files are matched against configured media types.
 * - Directories are recursed into only if `recurse` is true.
 * - Unknown extensions and unmatched files are silently skipped
 *   (except `date` mode where a warning is emitted for missing destinations).
 *
 * A shared `LetterCache` ensures all files of the same media type and capture
 * date processed in a single run land in the same letter subdirectory.
 */
export function scanDirectory(
  srcDir: string,
  config: AppConfig,
  targetDir: string,
  mode: ArchiveMode,
  recurse: boolean,
  logger: Logger,
  letterCache: LetterCache = createLetterCache()
): FileOperation[] {
  const entries = fs.readdirSync(srcDir);
  const operations: FileOperation[] = [];

  logger.info(`Scanning ${srcDir} — ${entries.length} entries found`);

  for (const entry of entries) {
    if (IGNORED_FILES.has(entry)) {
      continue;
    }

    const fullPath = path.join(srcDir, entry);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (recurse) {
        logger.info(`Entering subdirectory: ${fullPath}`);
        // Pass the same cache down so the letter is shared across the whole run
        const subOps = scanDirectory(fullPath, config, targetDir, mode, recurse, logger, letterCache);
        operations.push(...subOps);
      }

      continue;
    }

    if (!stats.isFile()) {
      continue;
    }

    const operation = buildFileOperation(
      fullPath,
      stats,
      config,
      targetDir,
      mode,
      letterCache,
      (src) => {
        logger.warn(`[date mode] No existing destination found for: ${src} — skipping`);
      }
    );

    if (operation !== undefined) {
      operations.push(operation);
    }
  }

  return operations;
}
