import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Tier } from '../../../../generated/prisma/enums.js';

export class JoinWaitlistDto {
  @IsString()
  userId: string;

  @IsString()
  eventId: string;

  @IsOptional()
  @IsEnum(Tier)
  tier?: Tier;
}
