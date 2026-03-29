import { Injectable } from '@nestjs/common';
import { IdentityProvider, Prisma, UserIdentity } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class UserIdentitiesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: Prisma.UserIdentityCreateInput): Promise<UserIdentity> {
    return this.prismaService.userIdentity.create({ data });
  }

  findById(id: string): Promise<UserIdentity | null> {
    return this.prismaService.userIdentity.findUnique({
      where: { id },
    });
  }

  findByProviderAndProviderUserId(
    provider: IdentityProvider,
    providerUserId: string,
  ): Promise<UserIdentity | null> {
    return this.prismaService.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
    });
  }

  findByUserId(userId: string): Promise<UserIdentity[]> {
    return this.prismaService.userIdentity.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findByUserIdAndProvider(
    userId: string,
    provider: IdentityProvider,
  ): Promise<UserIdentity | null> {
    return this.prismaService.userIdentity.findFirst({
      where: {
        userId,
        provider,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  delete(id: string): Promise<UserIdentity> {
    return this.prismaService.userIdentity.delete({
      where: { id },
    });
  }
}
