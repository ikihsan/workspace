import {
  AttendanceEventSource,
  AttendanceEventType,
  IdentityProvider,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ProcessAttendanceEventDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(AttendanceEventType)
  eventType!: AttendanceEventType;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(AttendanceEventSource)
  @IsOptional()
  source?: AttendanceEventSource;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;

  @IsDateString()
  @IsOptional()
  eventTimestamp?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(IdentityProvider)
  @IsOptional()
  provider?: IdentityProvider;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @MaxLength(255)
  providerUserId?: string;
}
