import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Stats } from 'node:fs';
import {
  buildFileTimes,
  buildFileOperation,
  createLetterCache,
  findExistingDestination,
  resolveMediaType,
  resolveNewDestination,
} from '../../services/destinationResolver.js';
import type { AppConfig } from '../../models/config.js';

vi.mock('node:fs');

const config: AppConfig = {
  media: {
    types: [
      { name: 'photos', directory: 'Photos', extensions: ['jpg', 'jpeg'] },
      { name: 'videos', directory: 'Videos', extensions: ['mp4', 'mov'] },
    ],
  },
};

function makeStat(overrides: Partial<Stats> = {}): Stats {
  return {
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    atime: new Date('2026-04-05T10:00:00Z'),
    mtime: new Date('2026-04-05T10:00:00Z'),
    birthtime: new Date('2026-04-05T09:00:00Z'),
    ...overrides,
  } as unknown as Stats;
}

describe('resolveMediaType', () => {
  it('matches a known extension', () => {
    expect(resolveMediaType('.jpg', config)?.name).toBe('photos');
  });

  it('matches extension without leading dot', () => {
    expect(resolveMediaType('mp4', config)?.name).toBe('videos');
  });

  it('matches uppercase extension (case-insensitive)', () => {
    expect(resolveMediaType('.JPG', config)?.name).toBe('photos');
  });

  it('returns undefined for unknown extension', () => {
    expect(resolveMediaType('.txt', config)).toBeUndefined();
  });
});

describe('buildFileTimes', () => {
  it('sets mtime equal to atime (intentional behavior for archiving)', () => {
    const atime = new Date('2026-04-05T10:00:00Z');
    const mtime = new Date('2026-04-05T12:00:00Z');
    const stats = makeStat({ atime, mtime });

    const times = buildFileTimes(stats);

    expect(times.atime).toBe(atime);
    expect(times.mtime).toBe(atime); // mtime mirrors atime intentionally
    expect(times.atimeMs).toBe(Math.floor(atime.getTime() / 1000));
    expect(times.mtimeMs).toBe(Math.floor(atime.getTime() / 1000));
  });

  it('records birthtime separately', () => {
    const btime = new Date('2026-04-05T09:00:00Z');
    const stats = makeStat({ birthtime: btime });
    const times = buildFileTimes(stats);
    expect(times.btime).toBe(btime);
  });
});

describe('resolveNewDestination', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  it('returns path with letter a when date directory does not exist', () => {
    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00') });
    const cache = createLetterCache();
    const result = resolveNewDestination('/target/Photos', 'photo.jpg', stats, cache);
    const expected = path.join('/target/Photos', '2026', '04', '05', 'a', 'photo.jpg');
    expect(result).toBe(expected);
  });

  it('picks next available letter when a already exists on disk', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const str = String(p);
      // date dir exists, 'a' subdirectory exists, 'b' does not
      return str.endsWith('05') || str.endsWith('a');
    });

    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00') });
    const cache = createLetterCache();
    const result = resolveNewDestination('/target/Photos', 'photo.jpg', stats, cache);
    expect(result).toContain(path.sep + 'b' + path.sep);
  });

  it('reuses the cached letter for the same date+base path within a run', () => {
    // First call: date dir does not exist → picks 'a', caches it
    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00') });
    const cache = createLetterCache();

    resolveNewDestination('/target/Photos', 'photo-a.jpg', stats, cache);

    // Simulate that 'a' folder now exists on disk (photo-a was just copied)
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const str = String(p);
      return str.endsWith('05') || str.endsWith(path.sep + 'a');
    });

    // Second call: same date, same base → must reuse 'a' from cache, NOT pick 'b'
    const result = resolveNewDestination('/target/Photos', 'photo-b.jpg', stats, cache);
    expect(result).toContain(path.sep + 'a' + path.sep);
    expect(result).toContain('photo-b.jpg');
  });

  it('uses different letters for different dates within the same run', () => {
    const statsApril5 = makeStat({ mtime: new Date('2026-04-05T10:00:00') });
    const statsApril6 = makeStat({ mtime: new Date('2026-04-06T10:00:00') });
    const cache = createLetterCache();

    const result5 = resolveNewDestination('/target/Photos', 'photo.jpg', statsApril5, cache);
    const result6 = resolveNewDestination('/target/Photos', 'photo.jpg', statsApril6, cache);

    expect(result5).toContain('2026');
    expect(result5).toContain('04');
    expect(result5).toContain('05');
    expect(result6).toContain('06');
    // Both get letter 'a' independently (different date keys in cache)
    expect(result5).toContain(path.sep + 'a' + path.sep);
    expect(result6).toContain(path.sep + 'a' + path.sep);
  });

  it('throws when all 26 letters are taken', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const stats = makeStat();
    const cache = createLetterCache();
    expect(() => resolveNewDestination('/target', 'photo.jpg', stats, cache)).toThrow('a-z');
  });
});

describe('findExistingDestination', () => {
  it('returns undefined when date directory does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const stats = makeStat();
    expect(findExistingDestination('/target/Photos', 'photo.jpg', stats)).toBeUndefined();
  });

  it('finds a file matching name and size', () => {
    const targetFile = '/target/Photos/2026/04/05/a/photo.jpg';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockImplementation((p) => {
      const str = String(p);

      if (str === '/target/Photos/2026/04/05') {
        return { isDirectory: () => true } as unknown as Stats;
      }

      if (str === '/target/Photos/2026/04/05/a') {
        return { isDirectory: () => true } as unknown as Stats;
      }

      return { isDirectory: () => false, size: 1024 } as unknown as Stats;
    });
    vi.mocked(fs.readdirSync).mockImplementation((p) => {
      const str = String(p);

      if (str === '/target/Photos/2026/04/05') return ['a'] as unknown as ReturnType<typeof fs.readdirSync>;
      if (str === '/target/Photos/2026/04/05/a') return ['photo.jpg'] as unknown as ReturnType<typeof fs.readdirSync>;

      return [] as unknown as ReturnType<typeof fs.readdirSync>;
    });

    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00'), size: 1024 });
    const result = findExistingDestination('/target/Photos', 'photo.jpg', stats);
    expect(result).toBe(targetFile);
  });

  it('returns undefined when name matches but size differs', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockImplementation((p) => {
      const str = String(p);

      if (str === '/target/Photos/2026/04/05') {
        return { isDirectory: () => true } as unknown as Stats;
      }

      if (str === '/target/Photos/2026/04/05/a') {
        return { isDirectory: () => true } as unknown as Stats;
      }

      return { isDirectory: () => false, size: 9999 } as unknown as Stats; // different size
    });
    vi.mocked(fs.readdirSync).mockImplementation((p) => {
      const str = String(p);

      if (str === '/target/Photos/2026/04/05') return ['a'] as unknown as ReturnType<typeof fs.readdirSync>;
      if (str === '/target/Photos/2026/04/05/a') return ['photo.jpg'] as unknown as ReturnType<typeof fs.readdirSync>;

      return [] as unknown as ReturnType<typeof fs.readdirSync>;
    });

    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00'), size: 1024 });
    expect(findExistingDestination('/target/Photos', 'photo.jpg', stats)).toBeUndefined();
  });
});

describe('buildFileOperation', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  it('returns undefined for unrecognized extension', () => {
    const stats = makeStat();
    const cache = createLetterCache();
    const result = buildFileOperation('/src/file.txt', stats, config, '/target', 'copy', cache);
    expect(result).toBeUndefined();
  });

  it('builds a copy operation for a known extension', () => {
    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00') });
    const cache = createLetterCache();
    const op = buildFileOperation('/src/photo.jpg', stats, config, '/target', 'copy', cache);
    expect(op).not.toBeUndefined();
    expect(op?.file).toBe('photo.jpg');
    expect(op?.src).toBe('/src/photo.jpg');
    expect(op?.destFile).toContain('Photos');
    expect(op?.destFile).toContain('photo.jpg');
  });

  it('two files with same date share the same letter in one run', () => {
    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00') });
    const cache = createLetterCache();

    const op1 = buildFileOperation('/src/photo-a.jpg', stats, config, '/target', 'copy', cache);
    const op2 = buildFileOperation('/src/photo-b.jpg', stats, config, '/target', 'copy', cache);

    expect(op1?.destDir).toBe(op2?.destDir);
  });

  it('calls onDateModeNotFound when date mode and file not found', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const onNotFound = vi.fn();
    const cache = createLetterCache();
    const stats = makeStat();
    const result = buildFileOperation('/src/photo.jpg', stats, config, '/target', 'date', cache, onNotFound);
    expect(result).toBeUndefined();
    expect(onNotFound).toHaveBeenCalledWith('/src/photo.jpg');
  });

  it('builds a date operation when the existing file is found in the target', () => {
    // Simulate the file existing in the target at the expected date path
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockImplementation((p) => {
      const str = String(p);

      if (str === '/target/Photos/2026/04/05') {
        return { isDirectory: () => true } as unknown as Stats;
      }

      if (str === '/target/Photos/2026/04/05/a') {
        return { isDirectory: () => true } as unknown as Stats;
      }

      return { isDirectory: () => false, size: 1024 } as unknown as Stats;
    });
    vi.mocked(fs.readdirSync).mockImplementation((p) => {
      const str = String(p);

      if (str === '/target/Photos/2026/04/05') return ['a'] as unknown as ReturnType<typeof fs.readdirSync>;
      if (str === '/target/Photos/2026/04/05/a') return ['photo.jpg'] as unknown as ReturnType<typeof fs.readdirSync>;

      return [] as unknown as ReturnType<typeof fs.readdirSync>;
    });

    const stats = makeStat({ mtime: new Date('2026-04-05T10:00:00'), size: 1024 });
    const cache = createLetterCache();
    const op = buildFileOperation('/src/photo.jpg', stats, config, '/target', 'date', cache);

    expect(op).not.toBeUndefined();
    expect(op?.destFile).toBe('/target/Photos/2026/04/05/a/photo.jpg');
    expect(op?.src).toBe('/src/photo.jpg');
  });
});
