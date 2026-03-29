import { IdentityProvider } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateUserIdentityDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(IdentityProvider)
  provider!: IdentityProvider;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerUserId!: string;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
