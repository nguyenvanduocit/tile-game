import winston, { createLogger, format, transports } from 'winston'

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'server' },
  transports: [
    new winston.transports.Console(),
    new transports.File({ filename: './data/error.log', level: 'error' }),
    new transports.File({ filename: './data/combined.log' }),
  ],
})
