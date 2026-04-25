import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { archive } from '../../services/archiver.js';
import * as fileScanner from '../../services/fileScanner.js';
import * as fileProcessor from '../../services/fileProcessor.js';
import * as progressReporterModule from '../../services/progressReporter.js';
import type { AppConfig } from '../../models/config.js';
import type { ArchiveOptions, FileOperation } from '../../models/fileOperation.js';
import pino from 'pino';

vi.mock('node:fs');
vi.mock('../../services/fileScanner.js');
vi.mock('../../services/fileProcessor.js');
vi.mock('../../services/progressReporter.js');

const logger = pino({ level: 'silent' });

const config: AppConfig = {
  media: {
    types: [{ name: 'photos', directory: 'Photos', extensions: ['jpg'] }],
  },
};

const options: ArchiveOptions = {
  source: '/src',
  target: '/target',
  mode: 'copy',
  dryRun: false,
  recurse: false,
  verbose: false,
};

function makeOperation(destDir = '/target/Photos/2026/04/05/a'): FileOperation {
  return {
    file: 'photo.jpg',
    src: '/src/photo.jpg',
    destDir,
    destFile: `${destDir}/photo.jpg`,
    times: {
      atime: new Date(),
      atimeMs: 0,
      mtime: new Date(),
      mtimeMs: 0,
      btime: new Date(),
      btimeMs: 0,
    },
  };
}

const mockReporter = {
  start: vi.fn(),
  tick: vi.fn(),
  finish: vi.fn(),
};

describe('archive', () => {
  beforeEach(() => {
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fileScanner.scanDirectory).mockReturnValue([]);
    vi.mocked(fileProcessor.processFileOperation).mockReturnValue(undefined);
    vi.mocked(progressReporterModule.ProgressReporter).mockImplementation(() => mockReporter as never);
    mockReporter.start.mockClear();
    mockReporter.tick.mockClear();
    mockReporter.finish.mockClear();
    mockReporter.finish.mockReturnValue([]);
  });

  it('calls scanDirectory with correct arguments', () => {
    archive(options, config, logger);
    expect(fileScanner.scanDirectory).toHaveBeenCalledWith(
      options.source,
      config,
      options.target,
      options.mode,
      options.recurse,
      expect.anything()
    );
  });

  it('calls processFileOperation for each operation returned by scanDirectory', () => {
    const ops = [makeOperation(), makeOperation()];
    vi.mocked(fileScanner.scanDirectory).mockReturnValue(ops);
    archive({ ...options, verbose: true }, config, logger);
    expect(fileProcessor.processFileOperation).toHaveBeenCalledTimes(2);
  });

  it('processes nothing when scanDirectory returns empty list', () => {
    archive(options, config, logger);
    expect(fileProcessor.processFileOperation).not.toHaveBeenCalled();
  });

  it('passes dryRun flag to processFileOperation', () => {
    const op = makeOperation();
    vi.mocked(fileScanner.scanDirectory).mockReturnValue([op]);
    archive({ ...options, dryRun: true, verbose: true }, config, logger);
    expect(fileProcessor.processFileOperation).toHaveBeenCalledWith(op, 'copy', true, logger);
  });

  it('passes mode to processFileOperation', () => {
    const op = makeOperation();
    vi.mocked(fileScanner.scanDirectory).mockReturnValue([op]);
    archive({ ...options, mode: 'move', verbose: true }, config, logger);
    expect(fileProcessor.processFileOperation).toHaveBeenCalledWith(op, 'move', false, logger);
  });

  it('uses ProgressReporter in non-verbose mode', () => {
    const op = makeOperation('/target/Photos/2026/04/05/a');
    vi.mocked(fileScanner.scanDirectory).mockReturnValue([op]);
    archive({ ...options, verbose: false }, config, logger);
    expect(mockReporter.start).toHaveBeenCalledWith(1);
    expect(mockReporter.tick).toHaveBeenCalledWith('/target/Photos/2026/04/05/a');
    expect(mockReporter.finish).toHaveBeenCalled();
  });

  it('prints folder summary lines returned by reporter', () => {
    const op = makeOperation('/target/Photos/2026/04/05/a');
    vi.mocked(fileScanner.scanDirectory).mockReturnValue([op]);
    mockReporter.finish.mockReturnValue(['/target/Photos/2026/04/05/a', '/target/Videos/2026/04/05/a']);
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { written.push(String(chunk)); return true; });
    archive({ ...options, verbose: false }, config, logger);
    vi.restoreAllMocks();
    const out = written.join('');
    expect(out).toContain('/target/Photos/2026/04/05/a');
    expect(out).toContain('/target/Videos/2026/04/05/a');
  });

  it('prints dry-run notice in non-verbose mode', () => {
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { written.push(String(chunk)); return true; });
    archive({ ...options, dryRun: true, verbose: false }, config, logger);
    vi.restoreAllMocks();
    expect(written.join('')).toContain('Dry-run mode enabled');
  });

  it('does not use ProgressReporter in verbose mode', () => {
    const op = makeOperation();
    vi.mocked(fileScanner.scanDirectory).mockReturnValue([op]);
    archive({ ...options, verbose: true }, config, logger);
    expect(mockReporter.start).not.toHaveBeenCalled();
  });
});
