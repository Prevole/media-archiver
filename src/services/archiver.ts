import fs from 'node:fs';
import type { Logger } from 'pino';
import pino from 'pino';
import type { AppConfig } from '../models/config.js';
import type { ArchiveOptions } from '../models/fileOperation.js';
import { processFileOperation } from './fileProcessor.js';
import { scanDirectory } from './fileScanner.js';
import { ProgressReporter } from './progressReporter.js';

/**
 * Writes a line directly to stdout synchronously.
 * Used in non-verbose mode to avoid interleaving with the async pino-pretty
 * worker thread.
 */
function print(line: string): void {
  process.stdout.write(`${line}\n`);
}

/**
 * Main orchestrator: scans the source directory, builds the list of file
 * operations, and executes each one respecting the configured mode and
 * dry-run flag.
 *
 * In verbose mode every operation is logged via pino.
 * In non-verbose mode all output is written synchronously to stdout so that
 * the cli-progress bar does not interleave with pino-pretty's async worker.
 */
export function archive(
  options: ArchiveOptions,
  config: AppConfig,
  logger: Logger
): void {
  if (options.verbose) {
    archiveVerbose(options, config, logger);
  } else {
    archiveSilent(options, config);
  }
}

function archiveVerbose(
  options: ArchiveOptions,
  config: AppConfig,
  logger: Logger
): void {
  if (options.dryRun) logger.info('Dry-run mode enabled — no files will be written');

  logger.info(`Source:  ${options.source}`);
  logger.info(`Target:  ${options.target}`);
  logger.info(`Mode:    ${options.mode}`);
  logger.info(`Recurse: ${options.recurse}`);

  const operations = scanDirectory(options.source, config, options.target, options.mode, options.recurse, logger);

  logger.info(`${operations.length} file operation(s) to process`);

  for (const operation of operations) {
    processFileOperation(operation, options.mode, options.dryRun, logger);
  }

  logger.info('Done');
}

function archiveSilent(
  options: ArchiveOptions,
  config: AppConfig,
): void {
  const silentLogger = pino({ level: 'silent' });

  if (options.dryRun) print('Dry-run mode enabled — no files will be written');

  print(`Source:  ${options.source}`);
  print(`Target:  ${options.target}`);
  print(`Mode:    ${options.mode}`);
  print(`Recurse: ${options.recurse}`);

  const entries = fs.readdirSync(options.source);
  print(`Scanning ${options.source} — ${entries.length} entries found`);

  const operations = scanDirectory(options.source, config, options.target, options.mode, options.recurse, silentLogger);

  print(`${operations.length} file operation(s) to process`);

  if (operations.length === 0) {
    print('Done');
    return;
  }

  const reporter = new ProgressReporter();
  reporter.start(operations.length);

  for (const operation of operations) {
    processFileOperation(operation, options.mode, options.dryRun, silentLogger);
    reporter.tick(operation.destDir);
  }

  const folders = reporter.finish();
  print(`\nFolders written (${folders.length}):`);
  for (const dir of folders) {
    print(`  ${dir}`);
  }
  print('\nDone');
}
