import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  ParseUUIDPipe,
  Param,
  Post,
} from '@nestjs/common';
import { IdentityProvider, UserIdentity } from '@prisma/client';
import { CreateUserIdentityDto } from './dto/create-user-identity.dto';
import { UserIdentitiesService } from './user-identities.service';

@Controller('internal/user-identities')
export class UserIdentitiesController {
  constructor(private readonly userIdentitiesService: UserIdentitiesService) {}

  @Post()
  create(@Body() createUserIdentityDto: CreateUserIdentityDto): Promise<UserIdentity> {
    return this.userIdentitiesService.create(createUserIdentityDto);
  }

  @Get('provider/:provider/:providerUserId')
  async findByProviderAndProviderUserId(
    @Param('provider') providerRaw: string,
    @Param('providerUserId') providerUserId: string,
  ): Promise<UserIdentity> {
    const provider = this.parseProvider(providerRaw);
    const identity = await this.userIdentitiesService.findByProviderAndProviderUserId(
      provider,
      providerUserId,
    );

    if (!identity) {
      throw new NotFoundException('User identity not found');
    }

    return identity;
  }

  @Get('user/:userId')
  findByUserId(@Param('userId', new ParseUUIDPipe()) userId: string): Promise<UserIdentity[]> {
    return this.userIdentitiesService.findByUserId(userId);
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserIdentity> {
    return this.userIdentitiesService.findById(id);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<{ deleted: true }> {
    await this.userIdentitiesService.remove(id);
    return { deleted: true };
  }

  private parseProvider(providerRaw: string): IdentityProvider {
    const normalized = providerRaw.trim().toUpperCase();

    switch (normalized) {
      case IdentityProvider.SLACK:
        return IdentityProvider.SLACK;
      case IdentityProvider.GOOGLE:
        return IdentityProvider.GOOGLE;
      case IdentityProvider.MICROSOFT:
        return IdentityProvider.MICROSOFT;
      default:
        throw new BadRequestException('Unsupported identity provider');
    }
  }
}
