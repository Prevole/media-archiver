# media-archiver

> Archive media files from a source directory to a structured destination following a `YYYY/MM/DD/<import-letter>/` pattern.

## Install

```sh
npm install -g media-archiver
```

## Usage

```sh
media-archiver --source <dir> --target <dir> [options]
```

### Options

| Option | Alias | Required | Default | Description |
|--------|-------|----------|---------|-------------|
| `--source` | `-s` | Yes | — | Source directory to scan |
| `--target` | `-t` | Yes | — | Target directory where files are archived |
| `--mode` | `-m` | No | `copy` | Operation mode: `copy`, `move`, or `date` |
| `--dry-run` | — | No | `false` | Preview operations without writing any files |
| `--recurse` | `-r` | No | `false` | Scan subdirectories of `--source` recursively |
| `--verbose` | `-v` | No | `false` | Print detailed logs for every file operation |
| `--help` | `-h` | No | — | Display help message |

### Modes

- **`copy`** — Copy source files to the target directory
- **`move`** — Move source files to the target directory
- **`date`** — Fix `atime` and `mtime` of existing files in the target directory (useful after a manual move)

### Output

Without `--verbose`, a progress bar is shown during processing, followed by a summary of destination folders written:

```
Source:  /Volumes/CARD/DCIM
Target:  ~/Media
Mode:    copy
Recurse: false
3 file operation(s) to process

Folders written (2):
  ~/Media/Photos/2025/08/28/a
  ~/Media/Videos/2025/09/16/a

Done
```

With `--verbose`, every file operation is logged individually with timestamps and log levels.

### Examples

```sh
# Copy photos and videos from a memory card, dry-run first
media-archiver --source /Volumes/CARD/DCIM --target ~/Media --dry-run

# Then for real
media-archiver --source /Volumes/CARD/DCIM --target ~/Media

# Move files recursively with detailed logs
media-archiver -s /Volumes/CARD -t ~/Media -m move -r --verbose
```

## Destination structure

Files are organised by date and import batch:

```
~/Media/
├── Photos/
│   └── 2026/
│       └── 04/
│           └── 05/
│               ├── a/          ← first import of the day
│               │   ├── IMG_001.jpg
│               │   └── IMG_002.jpg
│               └── b/          ← second import of the day (different source)
│                   └── IMG_003.jpg
└── Videos/
    └── 2026/
        └── 04/
            └── 05/
                └── a/
                    └── VID_001.mp4
```

The letter (`a`, `b`, `c`...) increments automatically with each new import run targeting the same date folder, allowing files from different sources to be kept separate.

## Configuration

The configuration file must be located at `~/.config/media-archiver/config.yaml`.

```yaml
media:
  mode: copy          # Default mode (overridden by --mode)
  dryRun: false       # Default dry-run flag (overridden by --dry-run)
  types:
    - name: photos
      directory: Photos
      extensions:
        - jpg
        - jpeg
        - png
        - heic
    - name: videos
      directory: Videos
      extensions:
        - mp4
        - mov
        - avi
```

### Configuration fields

| Field | Required | Description |
|-------|----------|-------------|
| `media.types` | Yes | List of media type definitions |
| `media.types[].name` | Yes | Identifier for the type (informational) |
| `media.types[].directory` | Yes | Subdirectory under `--target` for this type |
| `media.types[].extensions` | Yes | File extensions to match (case-insensitive, without leading dot) |
| `media.mode` | No | Default mode when `--mode` is not provided |
| `media.dryRun` | No | Default dry-run when `--dry-run` is not provided |

Files whose extension is not matched by any type are silently skipped.

## Development

```sh
npm install
npm run build          # Compile TypeScript
npm test               # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run test:all       # Run all tests
npm run test:coverage  # Run tests with coverage report
npm run lint           # Check code style
npm run lint:fix       # Auto-fix code style issues
```

## License

[MIT](LICENSE)
