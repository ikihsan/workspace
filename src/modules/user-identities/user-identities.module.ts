import { Module } from '@nestjs/common';
import { UserIdentitiesController } from './user-identities.controller';
import { UserIdentitiesService } from './user-identities.service';
import { UserIdentitiesRepository } from './user-identities.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [UserIdentitiesController],
  providers: [UserIdentitiesService, UserIdentitiesRepository],
  exports: [UserIdentitiesService, UserIdentitiesRepository],
})
export class UserIdentitiesModule {}
