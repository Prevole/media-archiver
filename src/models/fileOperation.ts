/**
 * Operating modes supported by media-archiver.
 */
export type ArchiveMode = 'copy' | 'move' | 'date';

/**
 * Resolved CLI + config options used throughout the application.
 */
export interface ArchiveOptions {
  /** Absolute path to the source directory */
  source: string;
  /** Absolute path to the target directory */
  target: string;
  /** Operation mode */
  mode: ArchiveMode;
  /** When true, no file system writes are performed */
  dryRun: boolean;
  /** When true, subdirectories of src are scanned recursively */
  recurse: boolean;
  /** When true, all log lines are printed; otherwise a progress bar is shown */
  verbose: boolean;
}

/**
 * Timestamps extracted from a source file's stat.
 * atime and mtime intentionally set to the same value (atime)
 * so that archiving does not alter the perceived creation date.
 */
export interface FileTimes {
  atime: Date;
  atimeMs: number;
  mtime: Date;
  mtimeMs: number;
  btime: Date;
  btimeMs: number;
}

/**
 * A fully resolved file operation ready to be executed.
 */
export interface FileOperation {
  /** Original file name (basename) */
  file: string;
  /** Absolute path of the source file */
  src: string;
  /** Absolute path of the destination directory */
  destDir: string;
  /** Absolute path of the destination file */
  destFile: string;
  /** Timestamps to apply to the destination file */
  times: FileTimes;
}
