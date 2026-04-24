import { afterEach, beforeEach, describe, it } from 'vitest';
import { assertDirectoryMatchesExpected } from '../helpers/compare.js';
import { cleanDirectory, createSourceFiles, createTargetFile } from '../helpers/fixtures.js';
import { runArchiver, scenarioPaths } from '../helpers/runner.js';

/**
 * Scenario: date mode
 *
 * The target already contains files that were copied/moved previously but whose
 * timestamps got corrupted (set to epoch). The source files still exist and carry
 * the correct timestamps. `date` mode finds each file in the target (by name + size)
 * and fixes its atime/mtime to match the source.
 *
 * Setup:
 *   Source:
 *     - photo-a.jpg   mtime=2026-04-15 (correct capture date)
 *     - clip.mp4      mtime=2026-04-15
 *
 *   Target (pre-populated with wrong timestamps at epoch):
 *     - Photos/2026/04/15/a/photo-a.jpg   mtime=1970-01-01
 *     - Videos/2026/04/15/a/clip.mp4      mtime=1970-01-01
 *
 * Expected (same files, correct timestamps):
 *     - Photos/2026/04/15/a/photo-a.jpg   mtime=2026-04-15
 *     - Videos/2026/04/15/a/clip.mp4      mtime=2026-04-15
 */

const { source, target, expected } = scenarioPaths('date');

const correctDate = new Date('2026-04-15T09:00:00');
const wrongDate   = new Date('1970-01-01T00:00:01'); // epoch — simulates corrupted timestamps

const sourceFiles = [
  { relativePath: 'photo-a.jpg', content: 'photo-a', atime: correctDate, mtime: correctDate },
  { relativePath: 'clip.mp4',    content: 'clip',    atime: correctDate, mtime: correctDate },
];

describe('e2e: date mode', () => {
  beforeEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);
    cleanDirectory(expected);

    // Source: correct timestamps
    createSourceFiles(source, sourceFiles);

    // Target: files exist but with wrong timestamps
    createTargetFile(target, 'Photos/2026/04/15/a/photo-a.jpg', 'photo-a', wrongDate, wrongDate);
    createTargetFile(target, 'Videos/2026/04/15/a/clip.mp4',    'clip',    wrongDate, wrongDate);

    // Expected: same files, correct timestamps
    createTargetFile(expected, 'Photos/2026/04/15/a/photo-a.jpg', 'photo-a', correctDate, correctDate);
    createTargetFile(expected, 'Videos/2026/04/15/a/clip.mp4',    'clip',    correctDate, correctDate);
  });

  afterEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);
    cleanDirectory(expected);
  });

  it('fixes timestamps of existing files in the target directory', () => {
    runArchiver({
      source: source,
      target,
      mode: 'date',
      dryRun: false,
      recurse: false,
      verbose: false,
    });

    assertDirectoryMatchesExpected(target, expected);
  });
});
