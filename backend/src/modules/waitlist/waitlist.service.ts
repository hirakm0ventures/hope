import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

const OFFER_EXPIRY_MINUTES = 15;

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process waitlist for an event: find next eligible WAITLISTED user,
   * lock the row, and transition to OFFERED with expiration.
   */
  async processWaitlist(eventId: string): Promise<void> {
    // Keep offering until no capacity or no waitlisted users
    while (true) {
      const offered = await this.offerNextSlot(eventId);
      if (!offered) break;
    }
  }

  /**
   * Attempt to offer one slot to the next waitlisted user.
   * Returns true if an offer was made, false if no capacity or no users.
   */
  private async offerNextSlot(eventId: string): Promise<boolean> {
    return this.prisma.client.$transaction(async (tx) => {
      // Check available capacity (confirmed + offered vs total)
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) return false;

      const activeCount = await tx.rsvp.count({
        where: {
          eventId,
          status: { in: ['CONFIRMED', 'OFFERED'] },
        },
      });

      if (activeCount >= event.totalCapacity) return false;

      // Find next eligible waitlisted user using raw query for row lock
      const candidates = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "rsvps"
         WHERE "eventId" = $1
           AND "status" = 'WAITLISTED'
         ORDER BY "createdAt" ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        eventId,
      );

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

    // Find and expire all stale offers
    const expired = await this.prisma.client.rsvp.findMany({
      where: {
        status: 'OFFERED',
        offerExpiresAt: { lt: now },
      },
    });

    if (expired.length === 0) return;

    await this.prisma.client.rsvp.updateMany({
      where: {
        status: 'OFFERED',
        offerExpiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
        offerExpiresAt: null,
      },
    });

    console.log(`Expired ${expired.length} offer(s)`);

    // Collect unique event IDs and reprocess their waitlists
    const eventIds = [...new Set(expired.map((r) => r.eventId))];
    for (const eventId of eventIds) {
      await this.processWaitlist(eventId);
    }
  }
}
