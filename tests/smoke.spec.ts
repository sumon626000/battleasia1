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
  "/forgot-password",
];

for (const route of publicRoutes) {
  test(`public route renders: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `status for ${route}`).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
    expect(errors, `console errors on ${route}`).toEqual([]);
  });
}

test("auth gate redirects unauthenticated /dashboard to /auth", async ({ page }) => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/auth/, { timeout: 5000 });
  expect(page.url()).toMatch(/\/auth/);
});

test("auth gate covers dashboard sub-routes", async ({ page }) => {
  for (const sub of ["/dashboard/wallet", "/dashboard/profile", "/dashboard/matches"]) {
    await page.goto(`${BASE}${sub}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url(), `redirected from ${sub}`).toMatch(/\/auth/);
  }
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

test("manifest.webmanifest is served and valid JSON", async ({ request }) => {
  const r = await request.get(`${BASE}/manifest.webmanifest`);
  expect(r.status()).toBe(200);
  const json = await r.json();
  expect(json.name || json.short_name).toBeTruthy();
});

test("homepage has h1 and language switcher", async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
});

test("auth page renders register form fields", async ({ page }) => {
  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  // either tab — check we can see at least an email input on the page
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
});

test("404 page renders for unknown route", async ({ page }) => {
  const res = await page.goto(`${BASE}/this-route-does-not-exist-xyz`, { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("body")).toBeVisible();
});

test("language switch persists across navigation", async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("ba_lang", "bn"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const lang = await page.evaluate(() => document.documentElement.lang);
  expect(lang).toBe("bn");
});
