import { afterEach, beforeEach, describe, it } from 'vitest';
import { assertDirectoryIsEmpty } from '../helpers/compare.js';
import { cleanDirectory, createSourceFiles } from '../helpers/fixtures.js';
import { runArchiver, scenarioPaths } from '../helpers/runner.js';

/**
 * Scenario: dry-run mode (using copy as the underlying operation)
 *
 * Source files:
 *   - photo-a.jpg   — 2026-04-20
 *   - clip.mp4      — 2026-04-20
 *
 * With --dry-run, the archiver scans and logs intended operations
 * but writes nothing. The target directory must remain empty.
 */

const { source, target } = scenarioPaths('dry-run');

const april20 = new Date('2026-04-20T11:00:00');

const sourceFiles = [
  { relativePath: 'photo-a.jpg', content: 'photo-a', atime: april20, mtime: april20 },
  { relativePath: 'clip.mp4',    content: 'clip',    atime: april20, mtime: april20 },
];

describe('e2e: dry-run mode', () => {
  beforeEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);

    createSourceFiles(source, sourceFiles);
  });

  afterEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);
  });

  it('writes no files to the target when dry-run is enabled', () => {
    runArchiver({
      source: source,
      target,
      mode: 'copy',
      dryRun: true,
      recurse: false,
      verbose: false,
    });

    assertDirectoryIsEmpty(target);
  });

  it('creates no directories in the target when dry-run is enabled', () => {
    runArchiver({
      source: source,
      target,
      mode: 'copy',
      dryRun: true,
      recurse: false,
      verbose: false,
    });

    // Even the date subdirectories must not be created
    assertDirectoryIsEmpty(target);
  });
});
