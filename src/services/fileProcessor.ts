import fs from 'node:fs';
import type { Logger } from 'pino';
import type { FileOperation , ArchiveMode } from '../models/fileOperation.js';

/**
 * Ensures the destination directory exists, creating it if necessary.
 * In dry-run mode, only logs the action without touching the filesystem.
 */
export function ensureDestinationDir(
  operation: FileOperation,
  dryRun: boolean,
  logger: Logger
): void {
  if (!fs.existsSync(operation.destDir)) {
    logger.debug(`Create directory: ${operation.destDir}`);

    if (!dryRun) {
      fs.mkdirSync(operation.destDir, { recursive: true });
    }
  }
}

/**
 * Applies the atime and mtime from the operation to the destination file.
 * In dry-run mode, only logs the intended action.
 */
export function fixDates(
  operation: FileOperation,
  dryRun: boolean,
  logger: Logger
): void {
  logger.debug(
    `Fix dates on: ${operation.destFile}\n` +
    `  atime: ${operation.times.atime.toISOString()} (${operation.times.atimeMs}s)\n` +
    `  mtime: ${operation.times.mtime.toISOString()} (${operation.times.mtimeMs}s)\n` +
    `  btime: ${operation.times.btime.toISOString()} (${operation.times.btimeMs}s, not settable)`
  );

  if (!dryRun) {
    fs.utimesSync(operation.destFile, operation.times.atime, operation.times.mtime);
  }
}

/**
 * Copies the source file to the destination and fixes its timestamps.
 * In dry-run mode, only logs the intended actions.
 */
export function copyFile(
  operation: FileOperation,
  dryRun: boolean,
  logger: Logger
): void {
  logger.debug(`Copy: ${operation.src} → ${operation.destFile}`);

  if (!dryRun) {
    fs.copyFileSync(operation.src, operation.destFile);
    fixDates(operation, dryRun, logger);
  }
}

/**
 * Moves the source file to the destination and fixes its timestamps.
 * In dry-run mode, only logs the intended actions.
 */
export function moveFile(
  operation: FileOperation,
  dryRun: boolean,
  logger: Logger
): void {
  logger.debug(`Move: ${operation.src} → ${operation.destFile}`);

  if (!dryRun) {
    fs.renameSync(operation.src, operation.destFile);
    fixDates(operation, dryRun, logger);
  }
}

/**
 * Processes a single file operation according to the current mode.
 * Ensures the destination directory exists before performing any file action.
 *
 * @throws If an unknown mode is provided.
 */
export function processFileOperation(
  operation: FileOperation,
  mode: ArchiveMode,
  dryRun: boolean,
  logger: Logger
): void {
  ensureDestinationDir(operation, dryRun, logger);

  switch (mode) {
    case 'copy':
      copyFile(operation, dryRun, logger);
      break;
    case 'move':
      moveFile(operation, dryRun, logger);
      break;
    case 'date':
      fixDates(operation, dryRun, logger);
      break;
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unknown mode: ${exhaustive}`);
    }
  }
}
