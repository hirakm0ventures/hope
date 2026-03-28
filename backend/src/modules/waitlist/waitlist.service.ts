import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, Tier } from '../../../generated/prisma/client.js';

export const OFFER_EXPIRY_MINUTES = 15;
type OfferTierHint = Tier | null;

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process waitlist for an event: find next eligible WAITLISTED user,
   * lock the row, and transition to OFFERED with expiration.
   */
  async processWaitlist(
    eventId: string,
    preferredTiers: OfferTierHint[] = [],
  ): Promise<void> {
    const queue = [...preferredTiers];

    // Keep offering until no capacity or no waitlisted users
    while (true) {
      const usingHint = queue.length > 0;
      const preferredTier = usingHint ? (queue.shift() ?? null) : null;
      const offered = await this.offerNextSlot(eventId, preferredTier);
      if (offered) {
        continue;
      }
      if (usingHint) {
        if (queue.length > 0) {
          continue;
        }
        break;
      }
      break;
    }
  }

  /**
   * Attempt to offer one slot to the next waitlisted user.
   * Returns true if an offer was made, false if no capacity or no users.
   */
  private async offerNextSlot(
    eventId: string,
    preferredTier: OfferTierHint,
  ): Promise<boolean> {
    return this.prisma.client.$transaction(async (tx) => {
      // Serialize capacity allocation per event to prevent duplicate offers.
      const [event] = await tx.$queryRaw<{ id: string; totalCapacity: number }[]>(
        Prisma.sql`
          SELECT "id", "totalCapacity"
          FROM "events"
          WHERE "id" = ${eventId}
          FOR UPDATE
        `,
      );
      if (!event) {
        return false;
      }

      const activeCount = await tx.rsvp.count({
        where: {
          eventId,
          status: { in: ['CONFIRMED', 'OFFERED'] },
        },
      });

      if (activeCount >= event.totalCapacity) return false;

      const candidateQuery = preferredTier
        ? Prisma.sql`
            SELECT *
            FROM "rsvps"
            WHERE "eventId" = ${eventId}
              AND "status" = 'WAITLISTED'
              AND ("tier" = ${preferredTier} OR "tier" = 'ANY')
            ORDER BY
              CASE
                WHEN "tier" = ${preferredTier} THEN 0
                ELSE 1
              END,
              "waitlistPosition" ASC NULLS LAST,
              "createdAt" ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `
        : Prisma.sql`
            SELECT *
            FROM "rsvps"
            WHERE "eventId" = ${eventId}
              AND "status" = 'WAITLISTED'
            ORDER BY "waitlistPosition" ASC NULLS LAST, "createdAt" ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `;

      const candidates = await tx.$queryRaw<
        { id: string; userId: string; tier: Tier }[]
      >(candidateQuery);

      if (candidates.length === 0) return false;

      const candidate = candidates[0];
      const expiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000);

      await tx.rsvp.update({
        where: { id: candidate.id },
        data: {
          status: 'OFFERED',
          offerExpiresAt: expiresAt,
        },
      });

      console.log(
        `Offer sent to user ${candidate.userId} for event ${eventId} (expires ${expiresAt.toISOString()})`,
      );
      return true;
    });
  }

  /**
   * Cron job: every minute, expire stale offers and reprocess waitlists.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOffers(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.client.$transaction(async (tx) => {
      const staleOffers = await tx.$queryRaw<
        { id: string; eventId: string; tier: Tier }[]
      >(Prisma.sql`
        SELECT "id", "eventId", "tier"
        FROM "rsvps"
        WHERE "status" = 'OFFERED'
          AND "offerExpiresAt" < ${now}
        ORDER BY "offerExpiresAt" ASC
        FOR UPDATE SKIP LOCKED
      `);

      for (const offer of staleOffers) {
        await tx.rsvp.update({
          where: { id: offer.id },
          data: {
            status: 'EXPIRED',
            offerExpiresAt: null,
          },
        });
      }

      return staleOffers;
    });

    if (expired.length === 0) return;

    console.log(`Expired ${expired.length} offer(s)`);

    const grouped = new Map<string, OfferTierHint[]>();
    for (const offer of expired) {
      const tiers = grouped.get(offer.eventId) ?? [];
      tiers.push(offer.tier);
      grouped.set(offer.eventId, tiers);
    }

    for (const [eventId, tiers] of grouped) {
      await this.processWaitlist(eventId, tiers);
    }
  }
}
