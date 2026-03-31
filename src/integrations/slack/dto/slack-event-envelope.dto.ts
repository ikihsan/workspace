import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
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

  @IsString()
  @IsOptional()
  channel?: string;
}

export class SlackEventEnvelopeDto {
  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  challenge?: string;

  @IsString()
  @IsOptional()
  team_id?: string;

  @IsString()
  @IsOptional()
  api_app_id?: string;

  @IsString()
  @IsOptional()
  event_id?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  event_time?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  authed_users?: string[];

  @IsArray()
  @IsOptional()
  authorizations?: Record<string, unknown>[];

  @IsString()
  @IsOptional()
  event_context?: string;

  @IsOptional()
  is_ext_shared_channel?: boolean;

  @IsString()
  @IsOptional()
  context_team_id?: string;

  @IsString()
  @IsOptional()
  context_enterprise_id?: string;

  @IsObject()
  @IsOptional()
  event?: SlackInnerEventDto;
}
