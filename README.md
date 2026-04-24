# media-archiver

> Archive media files from a source directory to a structured destination following a `YYYY/MM/DD/<import-letter>/` pattern.

## Install

```sh
npm install -g media-archiver
```

## Usage

```sh
media-archiver --src <source> --target <target> [options]
```

### Options

| Option | Alias | Required | Default | Description |
|--------|-------|----------|---------|-------------|
| `--src` | `-s` | Yes | — | Source directory to scan |
| `--target` | `-t` | Yes | — | Target directory where files are archived |
| `--mode` | `-m` | No | `copy` | Operation mode: `copy`, `move`, or `date` |
| `--dry-run` | — | No | `false` | Preview operations without writing any files |
| `--recurse` | `-r` | No | `false` | Scan subdirectories of `--src` recursively |

### Modes

- **`copy`** — Copy source files to the target directory
- **`move`** — Move source files to the target directory
- **`date`** — Fix `atime` and `mtime` of existing files in the target directory (useful after a manual move)

### Example

```sh
# Copy photos and videos from a memory card, dry-run first
media-archiver --src /Volumes/CARD/DCIM --target ~/Media --dry-run

# Then for real
media-archiver --src /Volumes/CARD/DCIM --target ~/Media

# Move files recursively
media-archiver -s /Volumes/CARD -t ~/Media -m move -r
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
npm run build       # Compile TypeScript
npm test            # Run tests
npm run test:coverage  # Run tests with coverage report
npm run lint        # Check code style
npm run lint:fix    # Auto-fix code style issues
```

## License

[MIT](LICENSE)
