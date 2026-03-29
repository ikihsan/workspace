import { Injectable } from '@nestjs/common';
import { IdentityProvider, Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prismaService.user.create({ data });
  }

  findById(id: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  findByEmails(emails: string[]): Promise<User[]> {
    if (emails.length === 0) {
      return Promise.resolve([]);
    }

    return this.prismaService.user.findMany({
      where: {
        email: {
          in: emails,
        },
      },
    });
  }

  findActiveUsers(): Promise<User[]> {
    return this.prismaService.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  findByProviderAndProviderUserId(
    provider: IdentityProvider,
    providerUserId: string,
  ): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: {
        identities: {
          some: {
            provider,
            providerUserId,
          },
        },
      },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }

  delete(id: string): Promise<User> {
    return this.prismaService.user.delete({
      where: { id },
    });
  }
}
