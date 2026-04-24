import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import type { Stats } from 'node:fs';
import {
  copyFile,
  ensureDestinationDir,
  fixDates,
  moveFile,
  processFileOperation,
} from '../../services/fileProcessor.js';
import type { FileOperation } from '../../models/fileOperation.js';
import pino from 'pino';

vi.mock('node:fs');

const logger = pino({ level: 'silent' });

function makeOperation(overrides: Partial<FileOperation> = {}): FileOperation {
  return {
    file: 'photo.jpg',
    src: '/src/photo.jpg',
    destDir: '/target/Photos/2026/04/05/a',
    destFile: '/target/Photos/2026/04/05/a/photo.jpg',
    times: {
      atime: new Date('2026-04-05T10:00:00Z'),
      atimeMs: 1743847200,
      mtime: new Date('2026-04-05T10:00:00Z'),
      mtimeMs: 1743847200,
      btime: new Date('2026-04-05T09:00:00Z'),
      btimeMs: 1743843600,
    },
    ...overrides,
  };
}

describe('ensureDestinationDir', () => {
  it('creates the directory when it does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const op = makeOperation();
    ensureDestinationDir(op, false, logger);
    expect(fs.mkdirSync).toHaveBeenCalledWith(op.destDir, { recursive: true });
  });

  it('does not create the directory in dry-run mode', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    ensureDestinationDir(makeOperation(), true, logger);
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('does not create the directory if it already exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    ensureDestinationDir(makeOperation(), false, logger);
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});

describe('fixDates', () => {
  it('calls utimesSync with atime and mtime', () => {
    const op = makeOperation();
    fixDates(op, false, logger);
    expect(fs.utimesSync).toHaveBeenCalledWith(op.destFile, op.times.atime, op.times.mtime);
  });

  it('does not call utimesSync in dry-run mode', () => {
    fixDates(makeOperation(), true, logger);
    expect(fs.utimesSync).not.toHaveBeenCalled();
  });
});

describe('copyFile', () => {
  it('copies and fixes dates', () => {
    const op = makeOperation();
    copyFile(op, false, logger);
    expect(fs.copyFileSync).toHaveBeenCalledWith(op.src, op.destFile);
    expect(fs.utimesSync).toHaveBeenCalled();
  });

  it('does nothing in dry-run mode', () => {
    copyFile(makeOperation(), true, logger);
    expect(fs.copyFileSync).not.toHaveBeenCalled();
    expect(fs.utimesSync).not.toHaveBeenCalled();
  });
});

describe('moveFile', () => {
  it('renames and fixes dates', () => {
    const op = makeOperation();
    moveFile(op, false, logger);
    expect(fs.renameSync).toHaveBeenCalledWith(op.src, op.destFile);
    expect(fs.utimesSync).toHaveBeenCalled();
  });

  it('does nothing in dry-run mode', () => {
    moveFile(makeOperation(), true, logger);
    expect(fs.renameSync).not.toHaveBeenCalled();
  });
});

describe('processFileOperation', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as unknown as Stats);
  });

  it('calls copyFile for mode=copy', () => {
    const op = makeOperation();
    processFileOperation(op, 'copy', false, logger);
    expect(fs.copyFileSync).toHaveBeenCalledWith(op.src, op.destFile);
  });

  it('calls moveFile for mode=move', () => {
    const op = makeOperation();
    processFileOperation(op, 'move', false, logger);
    expect(fs.renameSync).toHaveBeenCalledWith(op.src, op.destFile);
  });

  it('calls fixDates for mode=date', () => {
    const op = makeOperation();
    processFileOperation(op, 'date', false, logger);
    expect(fs.utimesSync).toHaveBeenCalledWith(op.destFile, op.times.atime, op.times.mtime);
  });

  it('throws for an unknown mode (exhaustive never branch)', () => {
    const op = makeOperation();
    // Cast to bypass TypeScript — tests the runtime default branch
    expect(() => processFileOperation(op, 'unknown' as never, false, logger)).toThrow('Unknown mode: unknown');
  });
});
