/**
 * Represents a single media type entry in the configuration file.
 */
export interface MediaTypeConfig {
  /** Name of this media type (e.g. "photos", "videos") */
  name: string;
  /** Subdirectory under --target where files of this type will be archived */
  directory: string;
  /** List of file extensions (without leading dot, lowercase) to match */
  extensions: string[];
}

/**
 * Root configuration loaded from ~/.config/media-archiver/config.yaml
 */
export interface AppConfig {
  media: {
    /** Default operating mode if --mode is not provided on CLI */
    mode?: 'copy' | 'move' | 'date';
    /** Default dry-run flag if --dry-run is not provided on CLI */
    dryRun?: boolean;
    /** List of media type definitions */
    types: MediaTypeConfig[];
  };
}
