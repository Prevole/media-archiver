import fs from 'node:fs';
import yaml from 'js-yaml';
import type { AppConfig, MediaTypeConfig } from '../models/config.js';
import { expandTilde } from '../utils/path.js';

const CONFIG_PATH = '~/.config/media-archiver/config.yaml';

/**
 * Validates that a media type entry in the config is well-formed.
 * Throws a descriptive error if any required field is missing or invalid.
 */
function validateMediaType(entry: unknown, index: number): MediaTypeConfig {
  if (typeof entry !== 'object' || entry === null) {
    throw new Error(`media.types[${index}] must be an object`);
  }

  const obj = entry as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].trim() === '') {
    throw new Error(`media.types[${index}].name must be a non-empty string`);
  }

  if (typeof obj['directory'] !== 'string' || obj['directory'].trim() === '') {
    throw new Error(`media.types[${index}].directory must be a non-empty string`);
  }

  if (!Array.isArray(obj['extensions']) || obj['extensions'].length === 0) {
    throw new Error(`media.types[${index}].extensions must be a non-empty array`);
  }

  const extensions = obj['extensions'].map((ext: unknown, i: number) => {
    if (typeof ext !== 'string' || ext.trim() === '') {
      throw new Error(`media.types[${index}].extensions[${i}] must be a non-empty string`);
    }

    return ext.trim().toLowerCase();
  });

  return {
    name: obj['name'].trim(),
    directory: obj['directory'].trim(),
    extensions,
  };
}

/**
 * Validates and coerces the raw parsed YAML into an AppConfig.
 * Throws a descriptive error for any structural issue.
 */
function validateConfig(raw: unknown): AppConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Config file must be a YAML object');
  }

  const root = raw as Record<string, unknown>;

  if (typeof root['media'] !== 'object' || root['media'] === null) {
    throw new Error('Config must have a "media" root key');
  }

  const media = root['media'] as Record<string, unknown>;

  const validModes = ['copy', 'move', 'date'] as const;
  let mode: AppConfig['media']['mode'];

  if (media['mode'] !== undefined) {
    if (!validModes.includes(media['mode'] as typeof validModes[number])) {
      throw new Error(`media.mode must be one of: ${validModes.join(', ')}`);
    }

    mode = media['mode'] as AppConfig['media']['mode'];
  }

  let dryRun: boolean | undefined;

  if (media['dryRun'] !== undefined) {
    if (typeof media['dryRun'] !== 'boolean') {
      throw new Error('media.dryRun must be a boolean');
    }

    dryRun = media['dryRun'];
  }

  if (!Array.isArray(media['types']) || media['types'].length === 0) {
    throw new Error('media.types must be a non-empty array');
  }

  const types = media['types'].map((entry: unknown, i: number) => validateMediaType(entry, i));

  return {
    media: {
      ...(mode !== undefined ? { mode } : {}),
      ...(dryRun !== undefined ? { dryRun } : {}),
      types,
    },
  };
}

/**
 * Loads and validates the application configuration from
 * ~/.config/media-archiver/config.yaml.
 *
 * @throws If the file cannot be read or the content is invalid.
 */
export function loadConfig(configPath: string = CONFIG_PATH): AppConfig {
  const resolvedPath = expandTilde(configPath);

  let raw: string;

  try {
    raw = fs.readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read config file at ${resolvedPath}: ${(err as Error).message}`, { cause: err });
  }

  let parsed: unknown;

  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`Config file is not valid YAML: ${(err as Error).message}`, { cause: err });
  }

  return validateConfig(parsed);
}
