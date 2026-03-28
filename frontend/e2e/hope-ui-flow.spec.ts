import { test, expect, type APIRequestContext } from '@playwright/test';

const FRONTEND_URL =
  process.env.PLAYWRIGHT_FRONTEND_URL ?? 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000';

type EventRecord = {
  id: string;
  name: string;
  totalCapacity: number;
};

test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

async function createEvent(
  request: APIRequestContext,
  name: string,
  totalCapacity: number,
) {
  const response = await request.post(`${API_URL}/events`, {
    data: { name, totalCapacity },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as EventRecord;
}

async function createRsvp(
  request: APIRequestContext,
  eventId: string,
  userId: string,
  tier: 'GENERAL' | 'VIP' | 'EARLY_BIRD' | 'ANY',
) {
  const response = await request.post(`${API_URL}/rsvp`, {
    data: { userId, eventId, tier },
  });
  expect(response.ok()).toBeTruthy();
  return response;
}

async function joinWaitlist(
  request: APIRequestContext,
  eventId: string,
  userId: string,
  tier: 'GENERAL' | 'VIP' | 'EARLY_BIRD' | 'ANY',
) {
  const response = await request.post(`${API_URL}/waitlist/join`, {
    data: { userId, eventId, tier },
  });
  expect(response.ok()).toBeTruthy();
  return response;
}

test('attendee booking flow works through booking, waitlist, offers, and my tickets', async ({
  page,
  request,
}) => {
  const suffix = Date.now();
  const event = await createEvent(request, `ui-booking-${suffix}`, 1);
  const confirmedUser = `ui-confirmed-${suffix}`;
  const waitlistedUser = `ui-waitlisted-${suffix}`;

  await page.goto(`${FRONTEND_URL}/booking`);
  await page.getByRole('button', { name: new RegExp(event.name) }).click();

  await page.getByPlaceholder('Your User ID').fill(confirmedUser);
  await page.getByRole('button', { name: /Book Ticket|Join Waitlist/ }).click();
  await expect(page.getByText(/Ticket confirmed!/)).toBeVisible();

  await page.getByPlaceholder('Your User ID').fill(waitlistedUser);
  await page.getByRole('button', { name: /Book Ticket|Join Waitlist/ }).click();
  await expect(page.getByText(/waitlisted at position 1/i)).toBeVisible();

  await page.goto(`${FRONTEND_URL}/my-tickets`);
  await page.getByPlaceholder('Your User ID').fill(waitlistedUser);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('WAITLISTED', { exact: true })).toBeVisible();

  await page.getByPlaceholder('Your User ID').fill(confirmedUser);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.goto(`${FRONTEND_URL}/offers`);
  await page.getByPlaceholder('Your User ID').fill(waitlistedUser);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expect(page.getByText(/\d+:\d{2}/)).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).click();

  await page.goto(`${FRONTEND_URL}/my-tickets`);
  await page.getByPlaceholder('Your User ID').fill(waitlistedUser);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible();
});

test('waitlist page confirms immediately when capacity is still open', async ({
  page,
  request,
}) => {
  const suffix = Date.now();
  const event = await createEvent(request, `ui-waitlist-${suffix}`, 2);
  const userId = `ui-direct-${suffix}`;

  await page.goto(`${FRONTEND_URL}/waitlist`);
  await page.locator('select').first().selectOption(event.id);
  await page.getByPlaceholder('e.g. user-123').fill(userId);
  await page.getByRole('button', { name: 'Join Waitlist' }).click();

  await expect(
    page.getByText(/Ticket confirmed immediately\. RSVP ID:/),
  ).toBeVisible();
});

test('host dashboard shows queue state and capacity increase triggers offers', async ({
  page,
  request,
}) => {
  const suffix = Date.now();
  const event = await createEvent(request, `ui-host-${suffix}`, 1);

  await createRsvp(request, event.id, `ui-host-confirmed-${suffix}`, 'VIP');
  await joinWaitlist(request, event.id, `ui-host-vip-${suffix}`, 'VIP');
  await joinWaitlist(request, event.id, `ui-host-any-${suffix}`, 'ANY');

  await page.goto(`${FRONTEND_URL}/host`);
  await page.getByRole('button', { name: new RegExp(event.name) }).click();

  await expect(page.getByText('Waitlist & offer state')).toBeVisible();
  await expect(page.getByText(`ui-host-vip-${suffix}`)).toBeVisible();
  await expect(page.getByText(`ui-host-any-${suffix}`)).toBeVisible();

  await page.getByRole('button', { name: 'Increase Capacity (+10)' }).click();
  await expect(page.getByText(/Capacity increased by 10/)).toBeVisible();
  await expect(page.getByText('OFFERED', { exact: true })).toHaveCount(2);
});
