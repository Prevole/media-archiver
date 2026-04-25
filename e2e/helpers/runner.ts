import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import type { AppConfig } from '../../src/models/config.js';
import type { ArchiveOptions } from '../../src/models/fileOperation.js';
import { archive } from '../../src/services/archiver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root of the e2e directory */
export const E2E_ROOT = path.resolve(__dirname, '..');

/**
 * Returns absolute paths for a given test scenario's directories.
 */
export function scenarioPaths(scenario: string): {
  source: string;
  target: string;
  expected: string;
} {
  return {
    source: path.join(E2E_ROOT, scenario, 'source'),
    target: path.join(E2E_ROOT, scenario, 'target'),
    expected: path.join(E2E_ROOT, scenario, 'expected'),
  };
}

/**
 * A silent pino logger for e2e tests.
 * Set level to 'info' locally if you want to debug.
 */
export const silentLogger = pino({ level: 'silent' });

/**
 * Standard media-archiver config used across all e2e tests.
 */
export const e2eConfig: AppConfig = {
  media: {
    types: [
      {
        name: 'photos',
        directory: 'Photos',
        extensions: ['jpg', 'jpeg', 'png'],
      },
      {
        name: 'videos',
        directory: 'Videos',
        extensions: ['mp4', 'mov'],
      },
    ],
  },
};

/**
 * Runs the archiver with the given options and the standard e2e config.
 */
export function runArchiver(options: ArchiveOptions): void {
  archive(options, e2eConfig, silentLogger);
}
