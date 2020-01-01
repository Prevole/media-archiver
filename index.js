const _ = require('lodash');
const commandLineArgs = require('command-line-args');
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');
const untildify = require('untildify');
const yaml = require('yamljs');

const optionDefinitions = [{
    name: 'src',
    alias: 's',
    type: String
}, {
    name: 'dest',
    alias: 'd',
    type: String
}, {
    name: 'mode',
    alias: 'm',
    type: String
}, {
    name: 'dryRun',
    alias: 'r',
    type: Boolean
}, {
    name: 'recurse',
    alias: 'u',
    type: Boolean
}, {
    name: 'since',
    alias: 'n',
    type: String
}];

const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

const options = commandLineArgs(optionDefinitions);
const config = yaml.load(untildify('~/.media-archiver/conf.yml'));

const src = untildify(options.src);
const dest = untildify(options.dest);

const since = moment(options.since || '1900-01-01', 'YYYY-MM-DD');

const mode = options.mode || config.mode || 'copy';
const dryRun = options.dryRun || config.dryRun;
const recurse = options.recurse;

function getBaseDestinationPath(filePathDescription) {
    var type = _.find(config.media, function(media) {
        return _.includes(media.ext, filePathDescription.ext.substring(1).toLowerCase());
    });

    if (type) {
        return path.join(dest, type.dir);
    } else {
        console.log(filePathDescription);
        return dest;
    }
}

function findPreciseDestinationInternal(destPath, destFileName, destFileStat) {
    if (!fs.existsSync(destPath)) {
        return;
    }

    var stat = fs.statSync(destPath);

    var result;

    if (stat.isDirectory()) {
        var files = fs.readdirSync(destPath);

        for (var i = 0; i < files.length; i++) {
            var file = path.join(destPath, files[i]);
            var result = findPreciseDestinationInternal(file, destFileName, destFileStat);

            if (result) {
                break;
            }
        }

        return result;
    } else {
        var fileName = path.parse(destPath).base;

        if (fileName === destFileName && stat.size === destFileStat.size) {
            return destPath;
        }
    }
}

function findPreciseDestination(destPath, destFileName, destFileStat) {
    var datePath = moment(destFileStat.mtime).format('YYYY/MM/DD');
    var fullPath = path.join(destPath, datePath);

    return findPreciseDestinationInternal(fullPath, destFileName, destFileStat);
}

function getPreciseDestinationPath(destPath, destFileName, destFileStats) {
    var datePath = moment(destFileStats.mtime).format('YYYY/MM/DD');
    var fullPath = path.join(destPath, datePath);

    var idx = 0;

    if (fs.existsSync(fullPath)) {
        while (fs.existsSync(path.join(fullPath, alphabet[idx]))) {
            idx++;
            if (idx == alphabet.length) {
                console.error('There is already a to z directory in ' + fullPath);
                process.exit(3);
            }
        }
    }

    return path.join(fullPath, alphabet[idx], destFileName);
}

function buildFileDestination(filePath, stats) {
    if (stats.isFile()) {
        var filePathDescription = path.parse(filePath);
        var fileDestBasePath = getBaseDestinationPath(filePathDescription);

        var dest;

        if (mode === 'date') {
            dest = findPreciseDestination(fileDestBasePath, filePathDescription.base, stats);
        } else {
            dest = getPreciseDestinationPath(fileDestBasePath, filePathDescription.base, stats);
        }

        if (dest) {
            return {
                dest: dest,
                // Access time
                atimeMs: moment(stats.atime).unix(),
                atime: stats.atime,
                // Modification time
                mtimeMs: moment(stats.atime).unix(),
                mtime: stats.mtime,
                // Birthtime (aka creation time)
                btimeMs: moment(stats.birthtime).unix(),
                btime: stats.birthtime
            };
        }
    } else if (recurse && stats.isDirectory()) {
        process.stdout.write('\n');
        return prepareFileOperations(filePath);
    }
}

function buildFileOperations(basePath, files) {
    var fileOperations = [];

    console.log(files.length + ' files to process.');

    files.forEach(function(file) {
        if (file === '.DS_Store') {
            return;
        }

        var filePath = path.join(basePath, file);
        var stats = fs.statSync(filePath);

        if (stats) {
            if (moment(stats.birthtime).isSameOrBefore(since)) {
                return;
            }

            process.stdout.write('.');

            var destFile = buildFileDestination(filePath, stats);

            if (destFile) {
                if (Array.isArray(destFile)) {
                    fileOperations = fileOperations.concat(destFile);
                } else {
                    fileOperations.push({
                        file: file,
                        atime: destFile.atime,
                        atimeMs: destFile.atimeMs,
                        mtime: destFile.mtime,
                        mtimeMs: destFile.mtimeMs,
                        btime: destFile.btime,
                        btimeMs: destFile.btimeMs,
                        src: path.join(basePath, file),
                        destDir: path.parse(destFile.dest).dir,
                        destFile: destFile.dest
                    });
                }
            }
        } else {
            console.error('Unable to stat the file ' + filePath);
            process.exit(2);
        }
    });

    return fileOperations;
}

function processDestFolder(fileOperation) {
    var destinationFolder = path.parse(fileOperation.destDir).dir;
    if (!fs.existsSync(destinationFolder)) {
        console.info('Creates folder: ' + destinationFolder);
        if (!dryRun) {
            fs.mkdirsSync(destinationFolder);
        }
    }
}

function fixDates(fileOperation) {
    console.info('Fix the date of the file: ' + fileOperation.destFile + ' from file: ' + fileOperation.src);
    console.info('Update time: ' + fileOperation.mtime + ' (' + fileOperation.mtimeMs + ')');
    console.info('Access time: ' + fileOperation.atime + ' (' + fileOperation.atimeMs + ')');
    console.info('Birth time: ' + fileOperation.btime + ' (' + fileOperation.btimeMs + '), not usable yet.');
    if (!dryRun) {
        fs.utimesSync(fileOperation.destFile, fileOperation.atime, fileOperation.mtime);
    }
}

function copyFile(fileOperation) {
    console.info('Copy the file ' + fileOperation.src + ' to ' + fileOperation.destFile);
    if (!dryRun) {
        fs.copySync(fileOperation.src, fileOperation.destFile);
        fixDates(fileOperation);
    }

}

function moveFile(fileOperation) {
    console.info('Move the file ' + fileOperation.src + ' to ' + fileOperation.destFile);
    if (!dryRun) {
        fs.moveSync(fileOperation.src, fileOperation.destFile);
        fixDates(fileOperation);
    }
}

function processDestFile(fileOperation) {
    if (mode === 'copy') {
        copyFile(fileOperation);
    } else if (mode === 'move') {
        moveFile(fileOperation);
    } else if (mode === 'date') {
        fixDates(fileOperation);
    } else {
        console.error('Unknown mode: ' + config.mode);
        process.exit(4);
    }
}

function processFileOperations(fileOperations) {
    fileOperations.forEach(function(fileOperation) {
        processDestFolder(fileOperation);
        processDestFile(fileOperation);
    });
}

function prepareFileOperations(src) {
    var files = fs.readdirSync(src);
    if (files) {
        return buildFileOperations(src, files);
    } else {
        console.error('Could not read source directory: ' + src);
        process.exit(1);
    }
}

if (config.dryRun) {
    console.info('Dry run: no writing operation will be done on files');
}

processFileOperations(prepareFileOperations(src));
