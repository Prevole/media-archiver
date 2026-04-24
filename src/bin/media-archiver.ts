#!/usr/bin/env node

import pino from 'pino';
import { parseArgs } from '../cli/args.js';
import { loadConfig } from '../config/loader.js';
import { archive } from '../services/archiver.js';
try {
  const config = loadConfig();
  const options = parseArgs(config);

  const logger = pino({
    transport: {
      target: 'pino-pretty',
      options: options.verbose
        ? { colorize: true }
        : { colorize: false, hideObject: true, messageFormat: '{msg}', ignore: 'pid,hostname,time,level' },
    },
    level: options.verbose ? 'debug' : 'info',
  });

  archive(options, config, logger);
} catch (err) {
  const fallbackLogger = pino({
    transport: { target: 'pino-pretty', options: { colorize: true } },
    level: 'error',
  });
  fallbackLogger.error((err as Error).message);
  process.exit(1);
}
