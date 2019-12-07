# Media Archiver

> Archive media files from a directory to a destination following YYYY/MM/DD saving pattern

# Install

```
$> npm install -g media-archiver
```

# Usage

* `--src | -s`: The source directory
* `--dest | -d`: The destination directory
* `--mode | -m`: The mode: `copy`, `move` or `date`. Date is for fixing `atime` and `mtime` of destination file
* `--dryRun | -r`: Dry run. Do the lookup part with console outputs without applying any change
* `--recurse | -u`: Recurse through sub directories

```
$> media-archiver -s ~/some/dir -d ~/another/dir -m copy -r
```

# Config file

```yml
media:
  video:
    dir: Videos
    ext:
      - mp4
      - mov
  photo:
    dir: Photos
    ext:
      - jpg
      - jpeg
      - png
mode: copy
dryRun: false
```

**Remark**: `mode` and `dryRun` are overrided by the command line options
