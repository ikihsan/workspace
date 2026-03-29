import { IdentityProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class FindUserIdentityDto {
  @IsEnum(IdentityProvider)
  provider!: IdentityProvider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerUserId!: string;
}
