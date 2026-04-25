import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ProgressReporter } from '../../services/progressReporter.js';

// Mock cli-progress so tests don't render to a real TTY
vi.mock('cli-progress', () => {
  const SingleBar = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    increment: vi.fn(),
    stop: vi.fn(),
  }));
  return { SingleBar, Presets: { shades_classic: {} } };
});

describe('ProgressReporter', () => {
  let reporter: ProgressReporter;

  beforeEach(() => {
    reporter = new ProgressReporter();
  });

  it('start delegates to the underlying bar', () => {
    // No throw, bar.start is called
    expect(() => reporter.start(10)).not.toThrow();
  });

  it('tick records the destination directory and increments the bar', () => {
    reporter.start(2);
    reporter.tick('/target/Photos/2026/04/05/a');
    reporter.tick('/target/Videos/2026/04/05/a');
    const folders = reporter.finish();
    expect(folders).toContain('/target/Photos/2026/04/05/a');
    expect(folders).toContain('/target/Videos/2026/04/05/a');
  });

  it('finish returns folders sorted alphabetically', () => {
    reporter.start(3);
    reporter.tick('/target/Videos/2026/04/05/a');
    reporter.tick('/target/Photos/2026/04/05/a');
    reporter.tick('/target/Photos/2026/03/01/a');
    const folders = reporter.finish();
    expect(folders).toEqual([
      '/target/Photos/2026/03/01/a',
      '/target/Photos/2026/04/05/a',
      '/target/Videos/2026/04/05/a',
    ]);
  });

  it('finish deduplicates repeated destination directories', () => {
    reporter.start(3);
    reporter.tick('/target/Photos/2026/04/05/a');
    reporter.tick('/target/Photos/2026/04/05/a');
    reporter.tick('/target/Videos/2026/04/05/a');
    const folders = reporter.finish();
    expect(folders).toHaveLength(2);
  });

  it('finish returns empty array when no files were ticked', () => {
    reporter.start(0);
    expect(reporter.finish()).toEqual([]);
  });
});
