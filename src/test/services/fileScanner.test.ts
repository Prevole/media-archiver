import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import type { Stats } from 'node:fs';
import { scanDirectory } from '../../services/fileScanner.js';
import type { AppConfig } from '../../models/config.js';
import pino from 'pino';

vi.mock('node:fs');

const logger = pino({ level: 'silent' });

const config: AppConfig = {
  media: {
    types: [
      { name: 'photos', directory: 'Photos', extensions: ['jpg'] },
    ],
  },
};

function makeFileStat(overrides: Partial<Stats> = {}): Stats {
  return {
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    atime: new Date('2026-04-05T10:00:00'),
    mtime: new Date('2026-04-05T10:00:00'),
    birthtime: new Date('2026-04-05T09:00:00'),
    ...overrides,
  } as unknown as Stats;
}

describe('scanDirectory', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  it('returns an empty list when the directory is empty', () => {
    vi.mocked(fs.readdirSync).mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);
    const ops = scanDirectory('/src', config, '/target', 'copy', false, logger);
    expect(ops).toHaveLength(0);
  });

  it('ignores .DS_Store files', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['.DS_Store'] as unknown as ReturnType<typeof fs.readdirSync>);
    const ops = scanDirectory('/src', config, '/target', 'copy', false, logger);
    expect(ops).toHaveLength(0);
  });

  it('ignores Thumbs.db files', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['Thumbs.db'] as unknown as ReturnType<typeof fs.readdirSync>);
    const ops = scanDirectory('/src', config, '/target', 'copy', false, logger);
    expect(ops).toHaveLength(0);
  });

  it('skips files with unknown extensions', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['document.pdf'] as unknown as ReturnType<typeof fs.readdirSync>);
    vi.mocked(fs.statSync).mockReturnValue(makeFileStat());
    const ops = scanDirectory('/src', config, '/target', 'copy', false, logger);
    expect(ops).toHaveLength(0);
  });

  it('returns one operation for a matching file', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['photo.jpg'] as unknown as ReturnType<typeof fs.readdirSync>);
    vi.mocked(fs.statSync).mockReturnValue(makeFileStat());
    const ops = scanDirectory('/src', config, '/target', 'copy', false, logger);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.file).toBe('photo.jpg');
  });

  it('does not recurse into subdirectories when recurse=false', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['subdir'] as unknown as ReturnType<typeof fs.readdirSync>);
    vi.mocked(fs.statSync).mockReturnValue(makeFileStat({ isFile: () => false, isDirectory: () => true }));
    const ops = scanDirectory('/src', config, '/target', 'copy', false, logger);
    expect(ops).toHaveLength(0);
    // readdirSync should only be called once (for /src)
    expect(fs.readdirSync).toHaveBeenCalledTimes(1);
  });

  it('recurses into subdirectories when recurse=true', () => {
    vi.mocked(fs.readdirSync)
      .mockReturnValueOnce(['subdir'] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce(['photo.jpg'] as unknown as ReturnType<typeof fs.readdirSync>);

    vi.mocked(fs.statSync)
      .mockReturnValueOnce(makeFileStat({ isFile: () => false, isDirectory: () => true }))
      .mockReturnValueOnce(makeFileStat());

    const ops = scanDirectory('/src', config, '/target', 'copy', true, logger);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.src).toBe('/src/subdir/photo.jpg');
  });

  it('skips entries that are neither files nor directories (e.g. sockets, device files)', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['weird-entry'] as unknown as ReturnType<typeof fs.readdirSync>);
    vi.mocked(fs.statSync).mockReturnValue(
      makeFileStat({ isFile: () => false, isDirectory: () => false })
    );
    const ops = scanDirectory('/src', config, '/target', 'copy', false, logger);
    expect(ops).toHaveLength(0);
  });

  it('emits a warning via the callback when date mode finds no destination for a file', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['photo.jpg'] as unknown as ReturnType<typeof fs.readdirSync>);
    vi.mocked(fs.statSync).mockReturnValue(makeFileStat());
    // existsSync always false → findExistingDestination returns undefined → callback fires
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const warnSpy = vi.spyOn(logger, 'warn');

    const ops = scanDirectory('/src', config, '/target', 'date', false, logger);

    expect(ops).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[date mode] No existing destination found for')
    );
  });
});
