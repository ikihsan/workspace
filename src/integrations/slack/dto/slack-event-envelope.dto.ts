import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SlackInnerEventDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  subtype?: string;

  @IsString()
  @IsOptional()
  bot_id?: string;

  @IsString()
  @IsOptional()
  event_ts?: string;
}

export class SlackEventEnvelopeDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  challenge?: string;

  @IsString()
  @IsOptional()
  event_id?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SlackInnerEventDto)
  @IsOptional()
  event?: SlackInnerEventDto;
}
