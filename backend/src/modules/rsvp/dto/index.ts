import { Tier } from '../../../../generated/prisma/enums.js';

export class CreateRsvpDto {
  userId: string;
  eventId: string;
  tier?: Tier;
}

export class CancelRsvpDto {
  // populated from route param
}
