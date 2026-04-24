import { describe, expect, it } from 'vitest';
import { ALPHABET, expandTilde, formatDatePath, toUnixSeconds } from '../../utils/path.js';
import os from 'node:os';
import path from 'node:path';

describe('expandTilde', () => {
  it('expands ~ alone to the home directory', () => {
    expect(expandTilde('~')).toBe(os.homedir());
  });

  it('expands ~/foo to home/foo', () => {
    expect(expandTilde('~/foo/bar')).toBe(path.join(os.homedir(), '/foo/bar'));
  });

  it('leaves absolute paths unchanged', () => {
    expect(expandTilde('/absolute/path')).toBe('/absolute/path');
  });

  it('leaves relative paths unchanged', () => {
    expect(expandTilde('relative/path')).toBe('relative/path');
  });
});

describe('formatDatePath', () => {
  it('formats a date as YYYY/MM/DD with zero-padded month and day', () => {
    // Using a fixed local date to avoid TZ issues in tests
    const date = new Date(2026, 3, 5); // April 5, 2026 (month is 0-indexed)
    expect(formatDatePath(date)).toBe('2026/04/05');
  });

  it('formats december 31st correctly', () => {
    const date = new Date(2025, 11, 31);
    expect(formatDatePath(date)).toBe('2025/12/31');
  });

  it('zero-pads single-digit month and day', () => {
    const date = new Date(2024, 0, 1); // January 1
    expect(formatDatePath(date)).toBe('2024/01/01');
  });
});

describe('toUnixSeconds', () => {
  it('converts a Date to Unix seconds (integer)', () => {
    const date = new Date(1_000_000_000_000); // 2001-09-09T01:46:40.000Z
    expect(toUnixSeconds(date)).toBe(1_000_000_000);
  });

  it('floors the result (no decimals)', () => {
    const date = new Date(1_500_000_000_500); // 500ms remainder
    expect(toUnixSeconds(date)).toBe(1_500_000_000);
  });
});

describe('ALPHABET', () => {
  it('contains 26 lowercase letters', () => {
    expect(ALPHABET).toHaveLength(26);
    expect(ALPHABET[0]).toBe('a');
    expect(ALPHABET[25]).toBe('z');
  });
});
