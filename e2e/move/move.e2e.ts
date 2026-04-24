import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { assertDirectoryMatchesExpected } from '../helpers/compare.js';
import { cleanDirectory, createSourceFiles, createTargetFile } from '../helpers/fixtures.js';
import { runArchiver, scenarioPaths } from '../helpers/runner.js';

/**
 * Scenario: move mode
 *
 * Source files:
 *   - photo-a.jpg   — 2026-04-10  → Photos/2026/04/10/a/photo-a.jpg
 *   - photo-b.jpg   — 2026-04-10  → Photos/2026/04/10/a/photo-b.jpg
 *   - clip.mov      — 2026-04-10  → Videos/2026/04/10/a/clip.mov
 *
 * After the move:
 *   - Source files no longer exist at their original paths
 *   - Target contains the files with correct content and timestamps
 * Both properties are verified together: a file cannot be considered "moved"
 * unless it has disappeared from source AND arrived correctly at destination.
 */

const { source, target, expected } = scenarioPaths('move');

const april10 = new Date('2026-04-10T08:15:00');

const sourceFiles = [
  { relativePath: 'photo-a.jpg', content: 'photo-a', atime: april10, mtime: april10 },
  { relativePath: 'photo-b.jpg', content: 'photo-b', atime: april10, mtime: april10 },
  { relativePath: 'clip.mov',    content: 'clip',    atime: april10, mtime: april10 },
];

describe('e2e: move mode', () => {
  beforeEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);
    cleanDirectory(expected);

    createSourceFiles(source, sourceFiles);

    createTargetFile(expected, 'Photos/2026/04/10/a/photo-a.jpg', 'photo-a', april10, april10);
    createTargetFile(expected, 'Photos/2026/04/10/a/photo-b.jpg', 'photo-b', april10, april10);
    createTargetFile(expected, 'Videos/2026/04/10/a/clip.mov',    'clip',    april10, april10);
  });

  afterEach(() => {
    cleanDirectory(source);
    cleanDirectory(target);
    cleanDirectory(expected);
  });

  it('moves files: source is empty and target matches expected structure with correct content and timestamps', () => {
    runArchiver({
      source: source,
      target,
      mode: 'move',
      dryRun: false,
      recurse: false,
      verbose: false,
    });

    // Verify destination: correct structure, content, and timestamps
    assertDirectoryMatchesExpected(target, expected);

    // Verify source: every file must be gone — confirming it was truly moved, not copied
    for (const file of sourceFiles) {
      const srcPath = `${source}/${file.relativePath}`;
      expect(
        fs.existsSync(srcPath),
        `Source file should be gone after move: ${file.relativePath}`
      ).toBe(false);
    }
  });
});
