import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AiCommandContextDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  participantUserIds?: string[];

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;
}

export class ProcessAiCommandDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(2000)
  text!: string;

  @ValidateNested()
  @Type(() => AiCommandContextDto)
  @IsOptional()
  context?: AiCommandContextDto;
}
