import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserIdentity } from '@prisma/client';
import { UsersRepository } from '../users/users.repository';
import { CreateUserIdentityDto } from './dto/create-user-identity.dto';
import { UserIdentitiesRepository } from './user-identities.repository';

@Injectable()
export class UserIdentitiesService {
  constructor(
    private readonly userIdentitiesRepository: UserIdentitiesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(createUserIdentityDto: CreateUserIdentityDto): Promise<UserIdentity> {
    const normalizedProviderUserId = createUserIdentityDto.providerUserId.trim();

    const user = await this.usersRepository.findById(createUserIdentityDto.userId);

    if (!user) {
      throw new NotFoundException('Cannot create identity for missing user');
    }

    const existing = await this.userIdentitiesRepository.findByProviderAndProviderUserId(
      createUserIdentityDto.provider,
      normalizedProviderUserId,
    );

    if (existing) {
      if (existing.userId === createUserIdentityDto.userId) {
        return existing;
      }

      throw new ConflictException('Identity is already mapped to another user');
    }

    try {
      return await this.userIdentitiesRepository.create({
        provider: createUserIdentityDto.provider,
        providerUserId: normalizedProviderUserId,
        metadata: this.toPrismaJson(createUserIdentityDto.metadata),
        user: {
          connect: {
            id: createUserIdentityDto.userId,
          },
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Identity is already mapped to another user');
      }

      throw error;
    }
  }

  async findById(id: string): Promise<UserIdentity> {
    const identity = await this.userIdentitiesRepository.findById(id);

    if (!identity) {
      throw new NotFoundException('User identity not found');
    }

    return identity;
  }

  findByUserId(userId: string): Promise<UserIdentity[]> {
    return this.userIdentitiesRepository.findByUserId(userId);
  }

  findByUserIdAndProvider(
    userId: string,
    provider: CreateUserIdentityDto['provider'],
  ): Promise<UserIdentity | null> {
    return this.userIdentitiesRepository.findByUserIdAndProvider(userId, provider);
  }

  async findByProviderAndProviderUserId(
    provider: CreateUserIdentityDto['provider'],
    providerUserId: string,
  ): Promise<UserIdentity | null> {
    return this.userIdentitiesRepository.findByProviderAndProviderUserId(provider, providerUserId.trim());
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.userIdentitiesRepository.delete(id);
  }

  private toPrismaJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
    if (!value) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
