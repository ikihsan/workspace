import { Global, Module } from '@nestjs/common';
import { CoreConfigModule } from '../config/core-config.module';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [CoreConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
