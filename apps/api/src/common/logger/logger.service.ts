import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    this.logger = createLogger({
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      format: isProd
        ? format.combine(
            format.timestamp({ format: 'isoDateTime' }),
            format.errors({ stack: true }),
            format.json(),
          )
        : format.combine(
            format.timestamp({ format: 'HH:mm:ss' }),
            format.colorize({ all: true }),
            format.printf(({ timestamp, level, message, context, ...meta }) => {
              const ctx = context ? `[${context}] ` : '';
              const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${level}: ${ctx}${message}${extra}`;
            }),
          ),
      defaultMeta: { service: 'anexys-api' },
      transports: [
        new transports.Console(),
        ...(process.env.LOG_FILE
          ? [
              new transports.File({ filename: process.env.LOG_FILE, maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
            ]
          : []),
      ],
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }
}
