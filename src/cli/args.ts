import { createRequire } from 'node:module';
import commandLineArgs from 'command-line-args';
import type { AppConfig } from '../models/config.js';
import type { ArchiveMode, ArchiveOptions } from '../models/fileOperation.js';
import { expandTilde } from '../utils/path.js';

const _require = createRequire(import.meta.url);
const { version: PKG_VERSION } = _require('../../package.json') as { version: string };

const VALID_MODES: ArchiveMode[] = ['copy', 'move', 'date'];

export const optionDefinitions = [
  { name: 'source',   alias: 's', type: String,  description: 'Source directory to scan (required)' },
  { name: 'target',   alias: 't', type: String,  description: 'Target directory where files are archived (required)' },
  { name: 'mode',     alias: 'm', type: String,  description: 'Operation mode: copy, move, or date (default: copy)' },
  { name: 'dry-run',              type: Boolean, description: 'Preview operations without writing any files' },
  { name: 'recurse',  alias: 'r', type: Boolean, description: 'Scan subdirectories of --source recursively' },
  { name: 'verbose',  alias: 'v', type: Boolean, description: 'Print detailed logs for every file operation' },
  { name: 'version',              type: Boolean, description: 'Print the current version and exit' },
  { name: 'help',     alias: 'h', type: Boolean, description: 'Display this help message and exit' },
];

/**
 * Prints usage information to stdout.
 */
export function displayHelp(): void {
  const lines: string[] = [
    `media-archiver v${PKG_VERSION}`,
    '',
    'Usage: media-archiver --source <dir> --target <dir> [options]',
    '',
    'Options:',
  ];

  for (const def of optionDefinitions) {
    const long  = `--${def.name}`;
    const short = 'alias' in def ? `, -${def.alias}` : '      ';
    const flag  = `${long}${short}`;
    lines.push(`  ${flag.padEnd(22)}  ${def.description}`);
  }

  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}

/**
 * Prints the current package version to stdout.
 */
export function displayVersion(): void {
  process.stdout.write(`${PKG_VERSION}\n`);
}

/**
 * Parses process.argv and merges with config defaults to produce
 * fully resolved ArchiveOptions.
 *
 * Returns `null` when --help is requested (caller should display help and exit).
 * Returns `'version'` when --version is requested (caller should display version and exit).
 *
 * @throws If required arguments are missing or values are invalid.
 */
export function parseArgs(config: AppConfig, argv?: string[]): ArchiveOptions | 'version' | null {
  const raw = commandLineArgs(optionDefinitions, { argv });

  // --- help ---
  if (raw['help'] === true) {
    return null;
  }

  // --- version ---
  if (raw['version'] === true) {
    return 'version';
  }

  // --- source ---
  if (typeof raw['source'] !== 'string' || raw['source'].trim() === '') {
    throw new Error('Missing required argument: --source (-s)');
  }

  // --- target ---
  if (typeof raw['target'] !== 'string' || raw['target'].trim() === '') {
    throw new Error('Missing required argument: --target (-t)');
  }

  // --- mode ---
  const rawMode: string | undefined = raw['mode'] ?? config.media.mode;
  const mode: ArchiveMode = (rawMode as ArchiveMode) ?? 'copy';

  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid --mode "${mode}". Must be one of: ${VALID_MODES.join(', ')}`);
  }

  // --- dry-run ---
  const dryRun: boolean = (raw['dry-run'] as boolean | undefined) ?? config.media.dryRun ?? false;

  // --- recurse ---
  const recurse: boolean = (raw['recurse'] as boolean | undefined) ?? false;

  // --- verbose ---
  const verbose: boolean = (raw['verbose'] as boolean | undefined) ?? false;

  return {
    source: expandTilde(raw['source'] as string),
    target: expandTilde(raw['target'] as string),
    mode,
    dryRun,
    recurse,
    verbose,
  };
}
