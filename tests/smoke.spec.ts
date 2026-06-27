import { test, expect } from "@playwright/test";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8080";

const publicRoutes = [
  "/",
  "/matches",
  "/leaderboard",
  "/news",
  "/shop",
  "/apk",
  "/support",
  "/premium",
  "/about",
  "/auth",
];

for (const route of publicRoutes) {
  test(`public route renders: ${route}`, async ({ page }) => {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `status for ${route}`).toBeLessThan(500);
    // No client-side crash
    await expect(page.locator("body")).toBeVisible();
  });
}

test("auth gate redirects unauthenticated /dashboard to /auth", async ({ page }) => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/auth/, { timeout: 5000 });
  expect(page.url()).toMatch(/\/auth/);
});

test("admin gate redirects unauthenticated /admin", async ({ page }) => {
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/(auth|$)/, { timeout: 5000 });
});

test("sitemap.xml served", async ({ request }) => {
  const r = await request.get(`${BASE}/sitemap.xml`);
  expect(r.status()).toBe(200);
  expect((await r.text()).startsWith("<?xml")).toBeTruthy();
});

test("robots.txt served", async ({ request }) => {
  const r = await request.get(`${BASE}/robots.txt`);
  expect(r.status()).toBe(200);
  expect(await r.text()).toMatch(/User-agent/i);
});
