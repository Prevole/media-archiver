import { SingleBar, Presets } from 'cli-progress';

/**
 * Lightweight progress reporter used in non-verbose mode.
 *
 * Displays a single progress bar while files are being processed.
 * Call `finish()` to stop the bar and retrieve the sorted list of
 * destination folders, which the caller can then log via pino.
 */
export class ProgressReporter {
  private bar: SingleBar;
  private destDirs = new Set<string>();

  constructor() {
    this.bar = new SingleBar(
      {
        format: 'Archiving | {bar} | {percentage}% | {value}/{total} files',
        clearOnComplete: true,
        hideCursor: true,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
      },
      Presets.shades_classic
    );
  }

  /**
   * Start the progress bar with a known total.
   */
  start(total: number): void {
    this.bar.start(total, 0);
  }

  /**
   * Increment the progress bar by one and record the destination directory.
   */
  tick(destDir: string): void {
    this.destDirs.add(destDir);
    this.bar.increment();
  }

  /**
   * Stop the progress bar and return the sorted list of destination folders.
   */
  finish(): string[] {
    this.bar.stop();
    return [...this.destDirs].sort();
  }
}
