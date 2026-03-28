# Hope - Waitlist & Capacity Engine

Full-stack take-home project for Hopp's sold-out event flow:

- limited-capacity events
- automatic waitlist promotion
- 15-minute offer windows
- attendee booking, offer, and ticket views
- host capacity management with live queue and offer state

## Tech Stack

- Backend: NestJS, Prisma, PostgreSQL
- Frontend: Next.js App Router, React, Tailwind CSS
- Package manager: pnpm

## Monorepo Layout

- `backend` - API, Prisma schema, waitlist engine, expiration scheduler, seed script
- `frontend` - attendee and host UI

## Assignment Coverage

This repo covers the core assignment requirements:

- RSVP creation with capacity checks
- waitlist joining with tier preference including `ANY`
- cancellation-triggered waitlist promotion
- timed offers with accept / decline / expire flows
- host capacity increase triggering additional offers
- queue fairness with exact-tier preference before `ANY`
- concurrency-safe allocation using database locking and transactions
- attendee pages for booking, offers, and ticket status
- host page for counts, capacity management, and live queue / offer state

Known limitation:

- broader lifecycle cases mentioned in the prompt such as event cancellation or user deletion are not modelled as first-class flows yet

## RSVP State Machine

States:

- `CONFIRMED`
- `WAITLISTED`
- `OFFERED`
- `EXPIRED`
- `CANCELLED`

Valid transitions:

```text
WAITLISTED -> OFFERED
WAITLISTED -> CANCELLED

OFFERED -> CONFIRMED
OFFERED -> EXPIRED
OFFERED -> CANCELLED

CONFIRMED -> CANCELLED

EXPIRED -> (terminal)
CANCELLED -> (terminal)
```

Flow summary:

- booking confirms immediately if active capacity exists
- otherwise the RSVP is created as `WAITLISTED`
- when capacity opens, the next eligible waitlist record becomes `OFFERED`
- an offered RSVP can be accepted, declined, cancelled, or expire
- accepted offers become `CONFIRMED`
- declined / cancelled / expired offers free the slot and trigger another promotion attempt

## Queue Fairness Model

Waitlist order is FIFO within the user's eligibility bucket:

1. exact tier match for the freed slot
2. `ANY`
3. earliest `waitlistPosition`
4. earliest `createdAt` as a tie-breaker

Examples:

- if a `VIP` seat opens, `VIP` waitlisted users are considered before `ANY`
- if no exact match exists, `ANY` users can take the spot
- if the host increases total capacity without a tier-specific free slot, the engine processes the queue in overall FIFO order

## Concurrency & Atomicity Strategy

The backend protects the critical paths with database transactions and row locks:

- event capacity allocation is serialized with `SELECT ... FOR UPDATE` on the event row
- next waitlist candidate selection uses `FOR UPDATE SKIP LOCKED`
- active occupancy counts both `CONFIRMED` and `OFFERED` records to prevent over-allocation
- accepting an offer is atomic: the offer row is locked, expiration is re-checked, and the RSVP becomes `CONFIRMED` in the same transaction
- cancellation, decline, and expiration all clear the offered slot before triggering the next promotion

Why this matters:

- two simultaneous cancellations cannot offer the same slot twice
- concurrent booking cannot overbook the event
- an accept that races with expiration fails cleanly if the offer is already stale

## Expiration Strategy

- each offered RSVP gets `offerExpiresAt = now + 15 minutes`
- a Nest scheduler job runs every minute and finds stale `OFFERED` rows
- stale offers are transitioned to `EXPIRED`
- after expiring offers, the system reprocesses the waitlist for the affected event and tier
- if a user tries to accept after expiry, the accept call marks the offer expired and returns a conflict instead of confirming it

## Data Model

Primary entities:

- `Event`
  - `id`
  - `name`
  - `totalCapacity`
  - `createdAt`
- `Rsvp`
  - `id`
  - `userId`
  - `eventId`
  - `tier`
  - `status`
  - `waitlistPosition`
  - `offerExpiresAt`
  - `createdAt`

Enums:

- `Tier`: `GENERAL`, `VIP`, `EARLY_BIRD`, `ANY`
- `RsvpStatus`: `CONFIRMED`, `WAITLISTED`, `OFFERED`, `EXPIRED`, `CANCELLED`

## Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+

### Backend

```bash
cd backend
pnpm install
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/hope_dev
PORT=4000
FRONTEND_URL=http://localhost:3000
```

Then initialize the database:

```bash
createdb hope_dev
npx prisma migrate deploy
pnpm run db:generate
pnpm run seed
```

Run the API:

```bash
pnpm run start:dev
```

Backend URL: `http://localhost:4000`

### Frontend

```bash
cd frontend
pnpm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
BACKEND_URL=http://localhost:4000
```

Run the app:

```bash
pnpm dev
```

Frontend URL: `http://localhost:3000`

## Seed Data

The seed script creates:

- one event: `Hope Conference 2026`
- `100` confirmed RSVPs
- `40` waitlisted RSVPs

This gives you a sold-out event immediately so the waitlist, cancellation, and offer flows can be tested without extra setup.

## Main API Endpoints

- `POST /events` - create event
- `GET /events` - list events
- `GET /events/:id/stats` - confirmed / waitlisted / offered / available counts
- `GET /events/:id/queue` - host queue and active offers
- `PATCH /events/:id/capacity` - update total capacity
- `POST /rsvp` - book or waitlist depending on capacity
- `GET /rsvp/user/:userId` - list a user's RSVPs
- `POST /rsvp/:id/cancel` - cancel confirmed or offered RSVP
- `POST /waitlist/join` - explicit waitlist join with tier preference
- `POST /offers/:id/accept` - accept active offer
- `POST /offers/:id/decline` - decline active offer

## Manual Frontend Test Flows

### Attendee Flow

1. Open `/booking`
2. Book tickets until the event is full
3. Book again with a new user ID
4. Verify the user becomes `WAITLISTED`
5. Cancel a confirmed RSVP from `/my-tickets`
6. Open `/offers` for the waitlisted user
7. Accept or decline the offer
8. Verify the final state in `/my-tickets`

### Waitlist Fairness Flow

1. Add one waitlisted user for `VIP`
2. Add one waitlisted user for `ANY`
3. Cancel a confirmed `VIP` RSVP
4. Verify the `VIP`-specific user gets the first offer
5. Repeat with no exact-tier match and verify `ANY` gets the offer

### Expiration Flow

1. Trigger an offer for a waitlisted user
2. Do not accept it
3. Wait for the 15-minute window to pass
4. Verify the offer becomes `EXPIRED`
5. Verify the next eligible user is promoted

### Host Flow

1. Open `/host`
2. Select an event
3. Review counts and the live queue / offer panel
4. Increase capacity
5. Verify multiple waitlisted users can become `OFFERED`

### Concurrency Flow

1. Create a sold-out event
2. Cancel multiple confirmed RSVPs quickly
3. Verify there are no duplicate offers
4. Verify active occupancy never exceeds total capacity

## Automated Validation

### Backend

From `backend`:

```bash
pnpm lint
pnpm test:e2e
pnpm build
```

The system e2e suite covers:

- core lifecycle from booking to acceptance
- direct confirmation when capacity exists
- tier priority and `ANY` fallback
- concurrent booking protection
- duplicate RSVP rejection
- simultaneous cancellations
- decline / cancel / expiration promotion
- late accept rejection
- just-before-expiry acceptance
- capacity increase creating multiple offers
- no-eligible-user capacity return
- host queue ordering
- scheduler-driven expiry

### Frontend

From the repo root, with backend and frontend running:

```bash
pnpm dlx playwright install chromium
env PLAYWRIGHT_FRONTEND_URL=http://localhost:3000 PLAYWRIGHT_API_URL=http://localhost:4000 pnpm dlx @playwright/test test frontend/e2e/hope-ui-flow.spec.ts --browser=chromium
```

The browser suite covers:

- attendee booking -> waitlist -> offer -> accept -> ticket confirmation
- direct confirmation on the waitlist page when capacity is open
- host queue visibility and capacity increase creating multiple offers

## Notes

- the frontend is intentionally auth-free for the assignment; user IDs are typed manually
- notification delivery is simulated via console logs when offers are created
- payments are not part of this project
- the host UI exposes queue state and counts, but event creation is still easiest through the API
