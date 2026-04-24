import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../cli/args.js';
import type { AppConfig } from '../../models/config.js';

const baseConfig: AppConfig = {
  media: {
    types: [
      { name: 'photos', directory: 'Photos', extensions: ['jpg'] },
    ],
  },
};

describe('parseArgs', () => {
  it('parses required --source and --target', () => {
    const opts = parseArgs(baseConfig, ['--source', '/media/card', '--target', '/archive']);
    expect(opts.source).toBe('/media/card');
    expect(opts.target).toBe('/archive');
  });

  it('defaults mode to copy when not set in args or config', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst']);
    expect(opts.mode).toBe('copy');
  });

  it('uses config mode when --mode not provided', () => {
    const config: AppConfig = { media: { ...baseConfig.media, mode: 'move' } };
    const opts = parseArgs(config, ['--source', '/src', '--target', '/dst']);
    expect(opts.mode).toBe('move');
  });

  it('uses CLI --mode over config mode', () => {
    const config: AppConfig = { media: { ...baseConfig.media, mode: 'move' } };
    const opts = parseArgs(config, ['--source', '/src', '--target', '/dst', '--mode', 'date']);
    expect(opts.mode).toBe('date');
  });

  it('defaults dryRun to false', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst']);
    expect(opts.dryRun).toBe(false);
  });

  it('sets dryRun to true when --dry-run flag is present', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst', '--dry-run']);
    expect(opts.dryRun).toBe(true);
  });

  it('uses config dryRun when --dry-run not provided', () => {
    const config: AppConfig = { media: { ...baseConfig.media, dryRun: true } };
    const opts = parseArgs(config, ['--source', '/src', '--target', '/dst']);
    expect(opts.dryRun).toBe(true);
  });

  it('defaults recurse to false', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst']);
    expect(opts.recurse).toBe(false);
  });

  it('sets recurse to true when -r flag is present', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst', '-r']);
    expect(opts.recurse).toBe(true);
  });

  it('defaults verbose to false', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst']);
    expect(opts.verbose).toBe(false);
  });

  it('sets verbose to true when --verbose flag is present', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst', '--verbose']);
    expect(opts.verbose).toBe(true);
  });

  it('sets verbose to true when -v alias is present', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst', '-v']);
    expect(opts.verbose).toBe(true);
  });

  it('expands tilde in source and target', () => {
    const opts = parseArgs(baseConfig, ['--source', '~/media', '--target', '~/archive']);
    expect(opts.source).not.toContain('~');
    expect(opts.target).not.toContain('~');
  });

  it('throws when --source is missing', () => {
    expect(() => parseArgs(baseConfig, ['--target', '/dst'])).toThrow('--source');
  });

  it('throws when --target is missing', () => {
    expect(() => parseArgs(baseConfig, ['--source', '/src'])).toThrow('--target');
  });

  it('throws when --mode is invalid', () => {
    expect(() =>
      parseArgs(baseConfig, ['--source', '/src', '--target', '/dst', '--mode', 'invalid'])
    ).toThrow('Invalid --mode');
  });

  it('supports -s alias for --source', () => {
    const opts = parseArgs(baseConfig, ['-s', '/src', '--target', '/dst']);
    expect(opts.source).toBe('/src');
  });

  it('supports -t alias for --target', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '-t', '/dst']);
    expect(opts.target).toBe('/dst');
  });

  it('supports -m alias for --mode', () => {
    const opts = parseArgs(baseConfig, ['--source', '/src', '--target', '/dst', '-m', 'move']);
    expect(opts.mode).toBe('move');
  });
});
