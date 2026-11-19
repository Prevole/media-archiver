import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../../../scripts/fix-dates-from-archive.mjs', import.meta.url));

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTree(relativeFiles: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-dates-'));
  tempDirs.push(root);
  for (const relativePath of relativeFiles) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'test\n');
  }
  return root;
}

function setDates(filePath: string, date: Date): void {
  fs.utimesSync(filePath, date, date);
}

function runScript(root: string): void {
  execFileSync('node', [scriptPath, root], { encoding: 'utf8' });
}

describe('fix-dates-from-archive script', () => {
  it('sets the fallback date (folder date + current time of day) for a .mov file', () => {
    const root = makeTree(['Photos/2026/03/19/a/VID_1.mov']);
    const file = path.join(root, 'Photos/2026/03/19/a/VID_1.mov');
    setDates(file, new Date(2026, 10, 16, 21, 1, 23));

    runScript(root);

    const stats = fs.statSync(file);
    const expected = new Date(2026, 2, 19, 21, 1, 23);
    expect(stats.mtime.getTime()).toBe(expected.getTime());
    expect(stats.atime.getTime()).toBe(expected.getTime());
  });

  it('processes .heic/.aae/.mov files and recurses; ignores other extensions', () => {
    const root = makeTree([
      'Photos/2026/03/19/a/IMG_1.heic',
      'Photos/2026/03/19/a/IMG_2.AAE',
      'Photos/2026/03/19/a/VID_1.mov',
      'Photos/2026/03/19/a/IMG_3.txt',
    ]);
    const buggy = new Date(2026, 10, 16, 21, 1, 23);
    for (const relativePath of [
      'Photos/2026/03/19/a/IMG_1.heic',
      'Photos/2026/03/19/a/IMG_2.AAE',
      'Photos/2026/03/19/a/VID_1.mov',
      'Photos/2026/03/19/a/IMG_3.txt',
    ]) {
      setDates(path.join(root, relativePath), buggy);
    }

    runScript(root);

    const expected = new Date(2026, 2, 19, 21, 1, 23);
    for (const relativePath of [
      'Photos/2026/03/19/a/IMG_1.heic',
      'Photos/2026/03/19/a/IMG_2.AAE',
      'Photos/2026/03/19/a/VID_1.mov',
    ]) {
      const stats = fs.statSync(path.join(root, relativePath));
      expect(stats.mtime.getTime()).toBe(expected.getTime());
      expect(stats.atime.getTime()).toBe(expected.getTime());
    }

    const txtStats = fs.statSync(path.join(root, 'Photos/2026/03/19/a/IMG_3.txt'));
    expect(txtStats.mtime.getTime()).toBe(buggy.getTime());
  });

  it('does nothing when the file dates already are the folder date', () => {
    const root = makeTree(['Photos/2026/03/19/a/IMG_1.heic']);
    const file = path.join(root, 'Photos/2026/03/19/a/IMG_1.heic');
    const folderDate = new Date(2026, 2, 19);
    setDates(file, folderDate);

    runScript(root);

    const stats = fs.statSync(file);
    expect(stats.mtime.getTime()).toBe(folderDate.getTime());
    expect(stats.atime.getTime()).toBe(folderDate.getTime());
  });

  it('skips files whose target date is before March 2026', () => {
    const root = makeTree(['Photos/2025/06/15/a/VID_1.mov']);
    const file = path.join(root, 'Photos/2025/06/15/a/VID_1.mov');
    // mtime on a different day than the folder date, so the "already
    // folder date" branch is not taken and the March filter is reached.
    const buggy = new Date(2025, 5, 20, 21, 1, 23);
    setDates(file, buggy);

    runScript(root);

    const stats = fs.statSync(file);
    expect(stats.mtime.getTime()).toBe(buggy.getTime());
  });

  const sourceHeic = '/Volumes/media/Photos/2026/03/19/a/IMG_1691.HEIC';

  it.skipIf(!fs.existsSync(sourceHeic))('moves the real HEIC (from the archive) to the folder date', () => {
    const root = makeTree(['Photos/2026/03/19/a/IMG_1691.HEIC']);
    const file = path.join(root, 'Photos/2026/03/19/a/IMG_1691.HEIC');
    fs.copyFileSync(sourceHeic, file);
    setDates(file, new Date(2026, 10, 16, 21, 1, 23));

    runScript(root);

    const stats = fs.statSync(file);
    const folderDate = new Date(2026, 2, 19);
    const onFolderDate =
      stats.mtime.getFullYear() === folderDate.getFullYear() &&
      stats.mtime.getMonth() === folderDate.getMonth() &&
      stats.mtime.getDate() === folderDate.getDate();
    expect(onFolderDate).toBe(true);
  });
});
