import { Tier } from '../../../../generated/prisma/enums.js';

export class JoinWaitlistDto {
  userId: string;
  eventId: string;
  tier?: Tier;
}
