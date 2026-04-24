import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadConfig } from '../../config/loader.js';
import fs from 'node:fs';

vi.mock('node:fs');

const VALID_YAML = `
media:
  mode: copy
  dryRun: false
  types:
    - name: photos
      directory: Photos
      extensions:
        - jpg
        - jpeg
    - name: videos
      directory: Videos
      extensions:
        - mp4
        - mov
`;

describe('loadConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.readFileSync).mockReturnValue(VALID_YAML);
  });

  it('loads and validates a well-formed config', () => {
    const config = loadConfig('/fake/path.yaml');

    expect(config.media.mode).toBe('copy');
    expect(config.media.dryRun).toBe(false);
    expect(config.media.types).toHaveLength(2);
    expect(config.media.types[0]).toEqual({
      name: 'photos',
      directory: 'Photos',
      extensions: ['jpg', 'jpeg'],
    });
  });

  it('lowercases extensions', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  types:
    - name: photos
      directory: Photos
      extensions:
        - JPG
        - JPEG
`);
    const config = loadConfig('/fake/path.yaml');
    expect(config.media.types[0]?.extensions).toEqual(['jpg', 'jpeg']);
  });

  it('allows config without mode and dryRun (optional fields)', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  types:
    - name: photos
      directory: Photos
      extensions:
        - jpg
`);
    const config = loadConfig('/fake/path.yaml');
    expect(config.media.mode).toBeUndefined();
    expect(config.media.dryRun).toBeUndefined();
  });

  it('throws if the file cannot be read', () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(() => loadConfig('/fake/path.yaml')).toThrow('Cannot read config file');
  });

  it('throws if the YAML is invalid', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('{ invalid: yaml: :');
    expect(() => loadConfig('/fake/path.yaml')).toThrow('Config file is not valid YAML');
  });

  it('throws if media key is missing', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('something: else');
    expect(() => loadConfig('/fake/path.yaml')).toThrow('"media" root key');
  });

  it('throws if types array is missing', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('media:\n  mode: copy');
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.types');
  });

  it('throws if a media type has no name', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  types:
    - directory: Photos
      extensions: [jpg]
`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.types[0].name');
  });

  it('throws if a media type has no extensions', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  types:
    - name: photos
      directory: Photos
      extensions: []
`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.types[0].extensions');
  });

  it('throws if mode is invalid', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  mode: invalid
  types:
    - name: photos
      directory: Photos
      extensions: [jpg]
`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.mode must be one of');
  });

  it('throws if a media type entry is not an object (e.g. a number)', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  types:
    - 42
`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.types[0] must be an object');
  });

  it('throws if a media type has no directory', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  types:
    - name: photos
      extensions: [jpg]
`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.types[0].directory');
  });

  it('throws if an extension in the list is not a string', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  types:
    - name: photos
      directory: Photos
      extensions:
        - 123
`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.types[0].extensions[0]');
  });

  it('throws if dryRun is not a boolean', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`
media:
  dryRun: "yes"
  types:
    - name: photos
      directory: Photos
      extensions: [jpg]
`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('media.dryRun must be a boolean');
  });

  it('throws if the YAML root is not an object (e.g. a plain string)', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(`just a string`);
    expect(() => loadConfig('/fake/path.yaml')).toThrow('Config file must be a YAML object');
  });

  it('uses the default config path when called without arguments', () => {
    // The default path contains a tilde — just ensure it resolves and tries to read
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: simulated missing file');
    });
    expect(() => loadConfig()).toThrow('Cannot read config file');
  });
});
