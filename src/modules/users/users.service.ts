import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentityProvider, Prisma, User } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const normalizedEmail = this.normalizeEmail(createUserDto.email);
    const existing = await this.usersRepository.findByEmail(normalizedEmail);

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      return await this.usersRepository.create({
        email: normalizedEmail,
        name: createUserDto.name.trim(),
        timezone: createUserDto.timezone.trim(),
        status: createUserDto.status,
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(this.normalizeEmail(email));
  }

  findByEmails(emails: string[]): Promise<User[]> {
    const normalizedEmails = emails
      .map((email) => this.normalizeEmail(email))
      .filter((email, index, array) => array.indexOf(email) === index);

    return this.usersRepository.findByEmails(normalizedEmails);
  }

  findActiveUsers(): Promise<User[]> {
    return this.usersRepository.findActiveUsers();
  }

  async findBySlackId(slackUserId: string): Promise<User | null> {
    return this.usersRepository.findByProviderAndProviderUserId(
      IdentityProvider.SLACK,
      slackUserId,
    );
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.findById(id);

    if (updateUserDto.email) {
      const normalizedEmail = this.normalizeEmail(updateUserDto.email);
      const existing = await this.usersRepository.findByEmail(normalizedEmail);

      if (existing && existing.id !== id) {
        throw new ConflictException('User with this email already exists');
      }

      updateUserDto.email = normalizedEmail;
    }

    try {
      return await this.usersRepository.update(id, {
        email: updateUserDto.email,
        name: updateUserDto.name?.trim(),
        timezone: updateUserDto.timezone?.trim(),
        status: updateUserDto.status,
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.usersRepository.delete(id);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
