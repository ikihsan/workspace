import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IncomingMessage } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { CoreConfigModule } from '../config/core-config.module';
import { AppConfigService } from '../config/app-config.service';
import { CORRELATION_HEADER } from '../correlation/correlation-id.middleware';
import { AppLogger } from './app-logger.service';

@Module({
  imports: [
    CoreConfigModule,
    LoggerModule.forRootAsync({
      imports: [CoreConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        const isDevelopment = configService.app.nodeEnv === 'development';

        return {
          pinoHttp: {
            level: configService.logLevel,
            messageKey: 'message',
            ...(isDevelopment
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                      singleLine: false,
                    },
                  },
                }
              : {}),
            customProps: (req: IncomingMessage) => {
              const headerValue = req.headers[CORRELATION_HEADER];
              const correlationId = typeof headerValue === 'string' ? headerValue : undefined;

              return {
                correlationId,
              };
            },
            genReqId: (req: IncomingMessage) => {
              const headerValue = req.headers[CORRELATION_HEADER];
              const incomingId = typeof headerValue === 'string' ? headerValue : undefined;
              return incomingId && incomingId.trim().length > 0 ? incomingId : randomUUID();
            },
            redact: {
              paths: ['req.headers.authorization', 'req.headers.cookie'],
              censor: '[REDACTED]',
            },
          },
        };
      },
    }),
  ],
  providers: [AppLogger],
  exports: [AppLogger],
})
export class CoreLoggerModule {}
