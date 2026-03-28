import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { WaitlistService } from './../src/modules/waitlist/waitlist.service';

type Tier = 'GENERAL' | 'VIP' | 'EARLY_BIRD' | 'ANY';
type EventStatsResponse = {
  available: number;
  offered: number;
};
type EventQueueResponseItem = {
  id: string;
  userId: string;
  status: 'OFFERED' | 'WAITLISTED';
};

describe('Waitlist engine system validation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let waitlistService: WaitlistService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    waitlistService = app.get(WaitlistService);
  });

  afterAll(async () => {
    await cleanupQaData();
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await cleanupQaData();
  });

  async function cleanupQaData() {
    if (!prisma) {
      return;
    }

    const events = await prisma.client.event.findMany({
      where: { name: { startsWith: 'qa-' } },
      select: { id: true },
    });
    const eventIds = events.map((event) => event.id);

    if (eventIds.length > 0) {
      await prisma.client.rsvp.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.client.event.deleteMany({ where: { id: { in: eventIds } } });
    }
  }

  async function createEvent(
    totalCapacity: number,
    name = `qa-event-${Date.now()}`,
  ) {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send({ name, totalCapacity })
      .expect(201);

    return response.body as { id: string; totalCapacity: number; name: string };
  }

  async function createRsvp(eventId: string, userId: string, tier: Tier) {
    const response = await request(app.getHttpServer())
      .post('/rsvp')
      .send({ userId, eventId, tier })
      .expect(201);

    return response.body as {
      id: string;
      eventId: string;
      tier: Tier;
      status: string;
      waitlistPosition: number | null;
      offerExpiresAt: string | null;
    };
  }

  async function joinWaitlist(eventId: string, userId: string, tier: Tier) {
    const response = await request(app.getHttpServer())
      .post('/waitlist/join')
      .send({ userId, eventId, tier })
      .expect(201);

    return response.body as {
      id: string;
      eventId: string;
      tier: Tier;
      status: string;
      waitlistPosition: number | null;
      offerExpiresAt: string | null;
    };
  }

  it('runs the core lifecycle from booking to waitlist offer acceptance', async () => {
    const event = await createEvent(2, 'qa-core-lifecycle');

    const confirmedOne = await createRsvp(
      event.id,
      'qa-core-confirmed-1',
      'VIP',
    );
    const confirmedTwo = await createRsvp(
      event.id,
      'qa-core-confirmed-2',
      'GENERAL',
    );
    const waitlistedOne = await createRsvp(event.id, 'qa-core-wait-1', 'VIP');
    await createRsvp(event.id, 'qa-core-wait-2', 'ANY');

    expect(confirmedOne.status).toBe('CONFIRMED');
    expect(confirmedTwo.status).toBe('CONFIRMED');
    expect(waitlistedOne.status).toBe('WAITLISTED');

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmedOne.id}/cancel`)
      .expect(201);

    const offered = await prisma.client.rsvp.findUniqueOrThrow({
      where: { id: waitlistedOne.id },
    });
    expect(offered.status).toBe('OFFERED');
    expect(offered.offerExpiresAt).not.toBeNull();

    await request(app.getHttpServer())
      .post(`/offers/${waitlistedOne.id}/accept`)
      .expect(201);

    const accepted = await prisma.client.rsvp.findUniqueOrThrow({
      where: { id: waitlistedOne.id },
    });
    expect(accepted.status).toBe('CONFIRMED');
    expect(accepted.offerExpiresAt).toBeNull();
  });

  it('confirms directly from the waitlist endpoint when capacity is still available', async () => {
    const event = await createEvent(2, 'qa-direct-confirm-from-waitlist');

    const direct = await joinWaitlist(
      event.id,
      'qa-direct-confirm-user',
      'VIP',
    );

    expect(direct.status).toBe('CONFIRMED');
    expect(direct.waitlistPosition).toBeNull();
  });

  it('prioritizes exact tier matches, then ANY, for freed slots', async () => {
    const event = await createEvent(1, 'qa-tier-priority');

    const confirmed = await createRsvp(event.id, 'qa-tier-confirmed', 'VIP');
    const general = await joinWaitlist(event.id, 'qa-tier-general', 'GENERAL');
    const any = await joinWaitlist(event.id, 'qa-tier-any', 'ANY');
    const vip = await joinWaitlist(event.id, 'qa-tier-vip', 'VIP');

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    const [generalAfter, anyAfter, vipAfter] = await Promise.all([
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: general.id } }),
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: any.id } }),
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: vip.id } }),
    ]);

    expect(vipAfter.status).toBe('OFFERED');
    expect(anyAfter.status).toBe('WAITLISTED');
    expect(generalAfter.status).toBe('WAITLISTED');
  });

  it('falls back to ANY when no exact tier match exists', async () => {
    const event = await createEvent(1, 'qa-any-fallback');

    const confirmed = await createRsvp(
      event.id,
      'qa-any-confirmed',
      'EARLY_BIRD',
    );
    const general = await joinWaitlist(event.id, 'qa-any-general', 'GENERAL');
    const any = await joinWaitlist(event.id, 'qa-any-any', 'ANY');

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    const [generalAfter, anyAfter] = await Promise.all([
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: general.id } }),
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: any.id } }),
    ]);

    expect(anyAfter.status).toBe('OFFERED');
    expect(generalAfter.status).toBe('WAITLISTED');
  });

  it('prevents overbooking and duplicate waitlist positions during concurrent booking', async () => {
    const event = await createEvent(1, 'qa-concurrency-booking');

    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        request(app.getHttpServer())
          .post('/rsvp')
          .send({
            userId: `qa-concurrency-user-${index + 1}`,
            eventId: event.id,
            tier: 'GENERAL',
          }),
      ),
    );

    for (const response of responses) {
      expect(response.status).toBe(201);
    }

    const rsvps = await prisma.client.rsvp.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: 'asc' },
    });

    const confirmedCount = rsvps.filter(
      (rsvp) => rsvp.status === 'CONFIRMED',
    ).length;
    const waitlisted = rsvps.filter((rsvp) => rsvp.status === 'WAITLISTED');
    const positions = waitlisted
      .map((rsvp) => rsvp.waitlistPosition)
      .filter((position): position is number => position !== null)
      .sort((a, b) => a - b);

    expect(confirmedCount).toBe(1);
    expect(waitlisted).toHaveLength(7);
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('rejects duplicate active RSVPs and invalid offer transitions', async () => {
    const event = await createEvent(1, 'qa-invalid-transitions');

    const confirmed = await createRsvp(event.id, 'qa-invalid-user', 'GENERAL');
    await request(app.getHttpServer())
      .post('/rsvp')
      .send({
        userId: 'qa-invalid-user',
        eventId: event.id,
        tier: 'GENERAL',
      })
      .expect(409);

    const waitlisted = await joinWaitlist(
      event.id,
      'qa-invalid-waitlisted',
      'VIP',
    );

    await request(app.getHttpServer())
      .post(`/offers/${waitlisted.id}/accept`)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/offers/${waitlisted.id}/decline`)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);
  });

  it('handles simultaneous cancellations without creating duplicate offers', async () => {
    const event = await createEvent(2, 'qa-concurrency-cancel');

    const confirmedOne = await createRsvp(
      event.id,
      'qa-cancel-confirmed-1',
      'GENERAL',
    );
    const confirmedTwo = await createRsvp(
      event.id,
      'qa-cancel-confirmed-2',
      'VIP',
    );
    const waitOne = await joinWaitlist(event.id, 'qa-cancel-wait-1', 'GENERAL');
    const waitTwo = await joinWaitlist(event.id, 'qa-cancel-wait-2', 'VIP');
    const waitThree = await joinWaitlist(event.id, 'qa-cancel-wait-3', 'ANY');

    await Promise.all([
      request(app.getHttpServer())
        .post(`/rsvp/${confirmedOne.id}/cancel`)
        .expect(201),
      request(app.getHttpServer())
        .post(`/rsvp/${confirmedTwo.id}/cancel`)
        .expect(201),
    ]);

    const offered = await prisma.client.rsvp.findMany({
      where: { eventId: event.id, status: 'OFFERED' },
      orderBy: { createdAt: 'asc' },
    });

    const offeredIds = offered.map((rsvp) => rsvp.id);
    expect(new Set(offeredIds).size).toBe(2);
    expect(offeredIds).toEqual(
      expect.arrayContaining([waitOne.id, waitTwo.id]),
    );

    const untouched = await prisma.client.rsvp.findUniqueOrThrow({
      where: { id: waitThree.id },
    });
    expect(untouched.status).toBe('WAITLISTED');
  });

  it('expires stale offers, rejects late acceptance, and promotes the next user', async () => {
    const event = await createEvent(1, 'qa-expiration');

    const confirmed = await createRsvp(event.id, 'qa-expire-confirmed', 'VIP');
    const offered = await joinWaitlist(event.id, 'qa-expire-offered', 'VIP');
    const next = await joinWaitlist(event.id, 'qa-expire-next', 'ANY');

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    await prisma.client.rsvp.update({
      where: { id: offered.id },
      data: { offerExpiresAt: new Date(Date.now() - 60_000) },
    });

    await request(app.getHttpServer())
      .post(`/offers/${offered.id}/accept`)
      .expect(409);

    const [expiredOffer, nextOffer] = await Promise.all([
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: offered.id } }),
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: next.id } }),
    ]);

    expect(expiredOffer.status).toBe('EXPIRED');
    expect(nextOffer.status).toBe('OFFERED');
  });

  it('moves to the next user when an offered user cancels or declines', async () => {
    const event = await createEvent(1, 'qa-offered-user-actions');

    const confirmed = await createRsvp(
      event.id,
      'qa-actions-confirmed',
      'GENERAL',
    );
    const offered = await joinWaitlist(
      event.id,
      'qa-actions-offered',
      'GENERAL',
    );
    const next = await joinWaitlist(event.id, 'qa-actions-next', 'ANY');

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/rsvp/${offered.id}/cancel`)
      .expect(201);

    let nextState = await prisma.client.rsvp.findUniqueOrThrow({
      where: { id: next.id },
    });
    expect(nextState.status).toBe('OFFERED');

    const declineEvent = await createEvent(1, 'qa-offer-decline');
    const declineConfirmed = await createRsvp(
      declineEvent.id,
      'qa-decline-confirmed',
      'GENERAL',
    );
    const declineOffered = await joinWaitlist(
      declineEvent.id,
      'qa-decline-offered',
      'GENERAL',
    );
    const declineNext = await joinWaitlist(
      declineEvent.id,
      'qa-decline-next',
      'ANY',
    );

    await request(app.getHttpServer())
      .post(`/rsvp/${declineConfirmed.id}/cancel`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/offers/${declineOffered.id}/decline`)
      .expect(201);

    nextState = await prisma.client.rsvp.findUniqueOrThrow({
      where: { id: declineNext.id },
    });
    expect(nextState.status).toBe('OFFERED');
  });

  it('returns capacity to general availability when nobody eligible wants the freed tier', async () => {
    const event = await createEvent(1, 'qa-no-eligible-waitlist');

    const confirmed = await createRsvp(
      event.id,
      'qa-no-eligible-confirmed',
      'VIP',
    );
    const generalOnly = await joinWaitlist(
      event.id,
      'qa-no-eligible-general',
      'GENERAL',
    );

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    const [statsResponse, stillWaiting] = await Promise.all([
      request(app.getHttpServer()).get(`/events/${event.id}/stats`).expect(200),
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: generalOnly.id } }),
    ]);
    const stats = statsResponse.body as EventStatsResponse;

    expect(stats.available).toBe(1);
    expect(stats.offered).toBe(0);
    expect(stillWaiting.status).toBe('WAITLISTED');
  });

  it('accepts cleanly just before expiration', async () => {
    const event = await createEvent(1, 'qa-last-second-accept');

    const confirmed = await createRsvp(
      event.id,
      'qa-last-second-confirmed',
      'VIP',
    );
    const offered = await joinWaitlist(
      event.id,
      'qa-last-second-offered',
      'VIP',
    );

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    await prisma.client.rsvp.update({
      where: { id: offered.id },
      data: { offerExpiresAt: new Date(Date.now() + 5_000) },
    });

    await request(app.getHttpServer())
      .post(`/offers/${offered.id}/accept`)
      .expect(201);

    const accepted = await prisma.client.rsvp.findUniqueOrThrow({
      where: { id: offered.id },
    });
    expect(accepted.status).toBe('CONFIRMED');
  });

  it('triggers multiple offers on capacity increase and leaves slots available without waitlist users', async () => {
    const event = await createEvent(1, 'qa-capacity-increase');

    await createRsvp(event.id, 'qa-capacity-confirmed', 'GENERAL');
    const waitOne = await joinWaitlist(
      event.id,
      'qa-capacity-wait-1',
      'GENERAL',
    );
    const waitTwo = await joinWaitlist(event.id, 'qa-capacity-wait-2', 'ANY');

    await request(app.getHttpServer())
      .patch(`/events/${event.id}/capacity`)
      .send({ totalCapacity: 3 })
      .expect(200);

    const offered = await prisma.client.rsvp.findMany({
      where: { eventId: event.id, status: 'OFFERED' },
    });
    expect(offered.map((rsvp) => rsvp.id).sort()).toEqual(
      [waitOne.id, waitTwo.id].sort(),
    );

    const spareEvent = await createEvent(1, 'qa-capacity-spare');
    await createRsvp(spareEvent.id, 'qa-spare-confirmed', 'GENERAL');

    await request(app.getHttpServer())
      .patch(`/events/${spareEvent.id}/capacity`)
      .send({ totalCapacity: 2 })
      .expect(200);

    const statsResponse = await request(app.getHttpServer())
      .get(`/events/${spareEvent.id}/stats`)
      .expect(200);
    const stats = statsResponse.body as EventStatsResponse;

    expect(stats.available).toBe(1);
    expect(stats.offered).toBe(0);
  });

  it('returns host queue data with offered entries first and waitlist entries after', async () => {
    const event = await createEvent(1, 'qa-host-queue-view');

    const confirmed = await createRsvp(event.id, 'qa-host-confirmed', 'VIP');
    const offered = await joinWaitlist(event.id, 'qa-host-offered', 'VIP');
    const waitlisted = await joinWaitlist(
      event.id,
      'qa-host-waitlisted',
      'ANY',
    );

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/events/${event.id}/queue`)
      .expect(200);
    const queue = response.body as EventQueueResponseItem[];

    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({
      id: offered.id,
      status: 'OFFERED',
      userId: 'qa-host-offered',
    });
    expect(queue[1]).toMatchObject({
      id: waitlisted.id,
      status: 'WAITLISTED',
      userId: 'qa-host-waitlisted',
    });
  });

  it('expires outstanding offers through the scheduler and promotes the next candidate', async () => {
    const event = await createEvent(1, 'qa-cron-expiration');

    const confirmed = await createRsvp(event.id, 'qa-cron-confirmed', 'VIP');
    const first = await joinWaitlist(event.id, 'qa-cron-first', 'VIP');
    const second = await joinWaitlist(event.id, 'qa-cron-second', 'ANY');

    await request(app.getHttpServer())
      .post(`/rsvp/${confirmed.id}/cancel`)
      .expect(201);

    await prisma.client.rsvp.update({
      where: { id: first.id },
      data: { offerExpiresAt: new Date(Date.now() - 60_000) },
    });

    await waitlistService.handleExpiredOffers();

    const [firstAfter, secondAfter] = await Promise.all([
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: first.id } }),
      prisma.client.rsvp.findUniqueOrThrow({ where: { id: second.id } }),
    ]);

    expect(firstAfter.status).toBe('EXPIRED');
    expect(secondAfter.status).toBe('OFFERED');
  });
});
