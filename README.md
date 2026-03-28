# Hope - Waitlist and Capacity Engine

Full-stack take-home project implementing RSVP, waitlist promotion, timed offers, and host-side capacity management.

## Tech Stack

- Backend: NestJS, Prisma, PostgreSQL
- Frontend: Next.js (App Router), React, Tailwind
- Package manager: pnpm

## Monorepo Structure

- backend: API, state transitions, waitlist engine, cron-based offer expiry
- frontend: attendee and host UI flows

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+

## 1) Backend Setup

```bash
cd backend
pnpm install
```

### Backend environment

Create or update `backend/.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/hope_dev
PORT=4000
FRONTEND_URL=http://localhost:3000
```

If using local Postgres without password on macOS/Homebrew, this can work:

```env
DATABASE_URL=postgresql://hirak@localhost:5432/hope_dev
```

### Database setup

```bash
# create DB once
createdb hope_dev

# apply migrations
npx prisma migrate deploy

# generate prisma client
pnpm run db:generate

# seed sample data (100 confirmed + 40 waitlisted)
pnpm run seed
```

### Run backend

```bash
pnpm run start:dev
```

Backend URL: `http://localhost:4000`

## 2) Frontend Setup

```bash
cd frontend
pnpm install
```

### Frontend environment

Create or update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
BACKEND_URL=http://localhost:4000
```

### Run frontend

```bash
pnpm dev
```

Frontend URL: `http://localhost:3000`

## 3) Run Both Apps

Use 2 terminals:

Terminal A:

```bash
cd backend
pnpm run start:dev
```

Terminal B:

```bash
cd frontend
pnpm dev
```

## 4) Quick Smoke Test

- Open `http://localhost:3000`
- Booking page should show seeded event near/full capacity
- Host page should show counts for confirmed/waitlisted/offered
- Offers page should show countdown when a user has an active offer

## 5) Recommended Manual Test Flow (Frontend)

1. Booking: select event and submit a new user ID while sold out -> user becomes WAITLISTED.
2. My Tickets: find a seeded confirmed user (for example `user-confirmed-001`) and cancel.
3. Offers: check `user-waitlist-001` -> should receive OFFERED seat with timer.
4. Offers: accept (or decline) and verify state change.
5. Host Dashboard: increase capacity (+10) and confirm additional waitlist promotions.

## 6) Test Commands

From `backend`:

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# build
pnpm run build
```

## Notes

- Offer expiry is handled by cron in backend and runs every minute.
- Expired offers are moved to EXPIRED, then waitlist processing continues.
- Capacity checks count both CONFIRMED and OFFERED to avoid over-allocation.
- Waitlist offering uses transactional row locking to avoid double-offers under concurrency.
