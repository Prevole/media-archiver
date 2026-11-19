#!/usr/bin/env node
/**
 * Phase 2: rewrite the atime/mtime of archived photos and videos
 * (.heic, .aae, .mov) whose
 * current dates do not match the date directory (YYYY/MM/DD) they are
 * stored in.
 *
 * Usage: node fix-dates-from-archive.mjs <path>
 *   <path>: directory scanned recursively.
 *
 * Per file:
 *   - Target date: `sips -g creation` when it returns a date
 *     (e.g. `creation: 2026:03:19 08:22:28`); otherwise the folder date
 *     (YYYY/MM/DD in the path) + the file's current time of day
 *     ("fake but chronological").
 *   - Files with a target date before March 2026 are not touched (the
 *     concerned photos are all taken since March 2026).
 *   - If the file dates are already the folder date (same day), nothing
 *     is changed.
 *   - Otherwise `fs.utimesSync(file, target, target)` sets atime and
 *     mtime to the target date.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const EXTENSIONS = new Set(['.heic', '.aae', '.mov']);
const MIN_DATE = new Date(2026, 2, 1); // March 2026

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Extracts the YYYY/MM/DD date directory from the file path.
function extractFolderDate(filePath) {
  const match = filePath.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Reads the image creation date via sips (format `YYYY:MM:DD HH:MM:SS`).
function readSipsCreation(filePath) {
  const result = spawnSync('sips', ['-g', 'creation', filePath], { encoding: 'utf8' });
  if (result.error || result.status !== 0) return undefined;
  const line = (result.stdout || '').split('\n').find((l) => /creation:/i.test(l));
  const match = line?.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return undefined;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

function collectFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }
  return files;
}

function processFile(filePath) {
  const stats = fs.statSync(filePath);
  const folderDate = extractFolderDate(filePath);
  const creation = readSipsCreation(filePath);

  const target =
    creation ??
    (folderDate
      ? new Date(
          folderDate.getFullYear(),
          folderDate.getMonth(),
          folderDate.getDate(),
          stats.mtime.getHours(),
          stats.mtime.getMinutes(),
          stats.mtime.getSeconds()
        )
      : undefined);

  if (!target) {
    console.log(`SKIP  no date found             ${filePath}`);
    return 'skipped';
  }

  if (target < MIN_DATE) {
    console.log(`SKIP  before March 2026         ${filePath} -> ${target.toISOString()}`);
    return 'skipped';
  }

  if (folderDate && sameDay(stats.mtime, folderDate)) {
    const y = folderDate.getFullYear();
    const mo = String(folderDate.getMonth() + 1).padStart(2, '0');
    const d = String(folderDate.getDate()).padStart(2, '0');
    console.log(`SKIP  dates already folder date ${filePath} (${y}-${mo}-${d})`);
    return 'skipped';
  }

  fs.utimesSync(filePath, target, target);
  console.log(`SET   ${filePath} -> ${target.toISOString()} (${creation ? 'creation' : 'folder date + current time'})`);
  return 'updated';
}

function main() {
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: node fix-dates-from-archive.mjs <path>');
    process.exit(1);
  }
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  for (const filePath of collectFiles(root)) {
    if (processFile(filePath) === 'updated') updated++;
    else skipped++;
  }
  console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
}

main();
