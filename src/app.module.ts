import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CoreConfigModule } from './core/config/core-config.module';
import { CoreLoggerModule } from './core/logger/core-logger.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { RedisModule } from './core/redis/redis.module';
import { QueueModule } from './core/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { AllExceptionsFilter } from './core/errors/all-exceptions.filter';
import { RequestTracingInterceptor } from './core/correlation/request-tracing.interceptor';
import { UsersModule } from './modules/users/users.module';
import { UserIdentitiesModule } from './modules/user-identities/user-identities.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { SlackModule } from './integrations/slack/slack.module';

@Module({
  imports: [
    CoreConfigModule,
    CoreLoggerModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    HealthModule,
    UsersModule,
    UserIdentitiesModule,
    AttendanceModule,
    PreferencesModule,
    SlackModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTracingInterceptor,
    },
  ],
})
export class AppModule {}
