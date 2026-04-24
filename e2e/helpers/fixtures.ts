import fs from 'node:fs';
import path from 'node:path';

/**
 * Describes a fake source file to create during test setup.
 */
export interface SourceFile {
  /** Relative path within the source directory (e.g. "photo.jpg" or "subdir/photo.jpg") */
  relativePath: string;
  /** File content — plain text is fine for fake media files */
  content: string;
  /**
   * Timestamps to force on the file after creation.
   * These drive the destination path (YYYY/MM/DD) and are verified in assertions.
   */
  atime: Date;
  mtime: Date;
}

/**
 * Creates a source file on disk and forces its timestamps.
 */
export function createSourceFile(srcDir: string, file: SourceFile): void {
  const fullPath = path.join(srcDir, file.relativePath);

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, file.content, 'utf-8');
  fs.utimesSync(fullPath, file.atime, file.mtime);
}

/**
 * Creates all source files in a source directory.
 */
export function createSourceFiles(srcDir: string, files: SourceFile[]): void {
  for (const file of files) {
    createSourceFile(srcDir, file);
  }
}

/**
 * Creates a file at the given path, forcing its timestamps.
 * Used to pre-populate the target directory for `date` mode tests.
 */
export function createTargetFile(
  targetDir: string,
  relativePath: string,
  content: string,
  atime: Date,
  mtime: Date
): void {
  const fullPath = path.join(targetDir, relativePath);

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  fs.utimesSync(fullPath, atime, mtime);
}

/**
 * Removes all contents of a directory without removing the directory itself.
 * Safe to call on an already-empty directory.
 */
export function cleanDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });

    return;
  }

  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}
