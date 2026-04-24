import commandLineArgs from 'command-line-args';
import type { AppConfig } from '../models/config.js';
import type { ArchiveMode, ArchiveOptions } from '../models/fileOperation.js';
import { expandTilde } from '../utils/path.js';

const VALID_MODES: ArchiveMode[] = ['copy', 'move', 'date'];

const optionDefinitions = [
  { name: 'source',   alias: 's', type: String  },
  { name: 'target',   alias: 't', type: String  },
  { name: 'mode',     alias: 'm', type: String  },
  { name: 'dry-run',              type: Boolean },
  { name: 'recurse',  alias: 'r', type: Boolean },
  { name: 'verbose',  alias: 'v', type: Boolean },
];

/**
 * Parses process.argv and merges with config defaults to produce
 * fully resolved ArchiveOptions.
 *
 * @throws If required arguments are missing or values are invalid.
 */
export function parseArgs(config: AppConfig, argv?: string[]): ArchiveOptions {
  const raw = commandLineArgs(optionDefinitions, { argv });

  // --- src ---
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
