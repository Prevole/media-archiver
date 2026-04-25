import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertDirectoryMatchesExpected } from '../helpers/compare.js';
import { cleanDirectory, createSourceFiles, createTargetFile } from '../helpers/fixtures.js';
import { runArchiver, scenarioPaths } from '../helpers/runner.js';

/**
 * Scenario: copy mode
 *
 * Source files (processed in a single run = one shared letter per date+type):
 *   - photo-a.jpg   — 2026-04-05  ┐
 *   - photo-b.jpg   — 2026-04-05  ├─→ Photos/2026/04/05/a/  (same date, same run → letter a)
 *   - clip.mp4      — 2026-04-05  → Videos/2026/04/05/a/clip.mp4
 *   - photo-c.jpg   — 2026-03-15  → Photos/2026/03/15/a/photo-c.jpg  (different day → own letter)
 *   - ignore.txt    — any date    → skipped (unknown extension)
 *
 * After the copy:
 *   - All source files still exist, content and timestamps unchanged
 *   - Target matches expected structure with correct timestamps
 *
 * Second-run letter scenario is covered by the dedicated letter test below.
 */

const { source, target, expected } = scenarioPaths('copy');

// Fixed timestamps used both for source files and expected files
const april5  = new Date('2026-04-05T10:00:00');
const march15 = new Date('2026-03-15T14:30:00');

const sourceFiles = [
  { relativePath: 'photo-a.jpg', content: 'photo-a', atime: april5,  mtime: april5  },
  { relativePath: 'photo-b.jpg', content: 'photo-b', atime: april5,  mtime: april5  },
  { relativePath: 'clip.mp4',    content: 'clip',    atime: april5,  mtime: april5  },
  { relativePath: 'photo-c.jpg', content: 'photo-c', atime: march15, mtime: march15 },
  { relativePath: 'ignore.txt',  content: 'ignored', atime: april5,  mtime: april5  },
];

/** Tolerance in ms for timestamp comparisons (filesystem resolution can be ~1s) */
const TIMESTAMP_TOLERANCE_MS = 1500;

describe('e2e: copy mode', () => {
  beforeEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);
    cleanDirectory(expected);

    createSourceFiles(source, sourceFiles);

    // photo-a and photo-b share letter 'a' (same date, same run)
    createTargetFile(expected, 'Photos/2026/04/05/a/photo-a.jpg', 'photo-a', april5,  april5);
    createTargetFile(expected, 'Photos/2026/04/05/a/photo-b.jpg', 'photo-b', april5,  april5);
    createTargetFile(expected, 'Photos/2026/03/15/a/photo-c.jpg', 'photo-c', march15, march15);
    createTargetFile(expected, 'Videos/2026/04/05/a/clip.mp4',    'clip',    april5,  april5);
  });

  afterEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);
    cleanDirectory(expected);
  });

  it('copies files to the correct date-based hierarchy, sharing a letter per date+type within a run', () => {
    runArchiver({
      source: source,
      target,
      mode: 'copy',
      dryRun: false,
      recurse: false,
      verbose: false,
    });

    assertDirectoryMatchesExpected(target, expected);
  });

  it('leaves source files completely intact after copy (content and timestamps unchanged)', () => {
    runArchiver({
      source: source,
      target,
      mode: 'copy',
      dryRun: false,
      recurse: false,
      verbose: false,
    });

    for (const file of sourceFiles) {
      const fullPath = `${source}/${file.relativePath}`;

      // File must still exist
      expect(fs.existsSync(fullPath), `Source file missing after copy: ${file.relativePath}`).toBe(true);

      // Content must be unchanged
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content, `Source content altered for: ${file.relativePath}`).toBe(file.content);

      // mtime must be unchanged — this is the timestamp that matters for archiving
      // and must never be touched by a copy operation.
      // atime is intentionally not checked: reading a file during the scan updates
      // atime on most OS/filesystem combinations, which is expected behavior.
      const stat = fs.statSync(fullPath);
      const mtimeDiff = Math.abs(stat.mtimeMs - file.mtime.getTime());

      expect(
        mtimeDiff,
        `Source mtime altered for ${file.relativePath}: got ${stat.mtime.toISOString()}, expected ${file.mtime.toISOString()}`
      ).toBeLessThanOrEqual(TIMESTAMP_TOLERANCE_MS);
    }
  });

  it('uses the next letter when the target already has files from a previous run', () => {
    // Simulate a previous run that already created letter 'a' for April 5 photos
    createTargetFile(target, 'Photos/2026/04/05/a/old-photo.jpg', 'old', april5, april5);

    // This run should create letter 'b' for new photos on April 5
    runArchiver({
      source: source,
      target,
      mode: 'copy',
      dryRun: false,
      recurse: false,
      verbose: false,
    });

    // photo-a and photo-b must be in 'b' (a already existed)
    expect(fs.existsSync(`${target}/Photos/2026/04/05/b/photo-a.jpg`)).toBe(true);
    expect(fs.existsSync(`${target}/Photos/2026/04/05/b/photo-b.jpg`)).toBe(true);
    // The old file in 'a' must still be there and untouched
    expect(fs.existsSync(`${target}/Photos/2026/04/05/a/old-photo.jpg`)).toBe(true);
    expect(fs.readFileSync(`${target}/Photos/2026/04/05/a/old-photo.jpg`, 'utf-8')).toBe('old');
  });
});
