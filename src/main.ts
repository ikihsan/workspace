import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { CorrelationIdMiddleware } from './core/correlation/correlation-id.middleware';
import { AppConfigService } from './core/config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const configService = app.get(AppConfigService);

  app.use(CorrelationIdMiddleware.create());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableCors({ origin: configService.corsOrigin });

  await app.listen(configService.port);
}

void bootstrap();
