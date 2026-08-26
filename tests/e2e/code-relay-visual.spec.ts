import { expect, test, type Browser } from "@playwright/test";

type ViewportContract = {
  name: string;
  width: number;
  height: number;
};

const viewports: ViewportContract[] = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1141, height: 602 },
];

async function openViewport(browser: Browser, baseURL: string, viewport: ViewportContract) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  return { context, page };
}

test("visual contract — Code Relay's real send action is above the fold at supported viewports", async ({
  browser,
  baseURL,
}) => {
  for (const viewport of viewports) {
    const { context, page } = await openViewport(browser, baseURL ?? "", viewport);
    try {
      await expect(page.getByRole("heading", { name: "Code Relay", level: 1 })).toBeVisible();
      const send = page.getByRole("button", { name: "Send code to room" });
      await expect(send).toBeVisible();
      const box = await send.boundingBox();
      expect(box, `${viewport.name}: send button has no layout box`).not.toBeNull();
      expect(
        (box?.y ?? Number.POSITIVE_INFINITY) + (box?.height ?? 0),
        `${viewport.name}: send button must be reachable without scrolling`,
      ).toBeLessThanOrEqual(viewport.height);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
    } finally {
      await context.close();
    }
  }
});

test("accessibility contract — the handoff form, room state, and shared-data boundary are named", async ({
  page,
}) => {
  await page.goto("./", { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("One-time code")).toBeVisible();
  await expect(page.getByLabel(/label \(optional\)/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send code to room" })).toBeDisabled();
  await expect(page.locator(".relay-room-state")).toHaveAttribute("aria-label", /device.*room/i);
  await expect(
    page.getByText("This is a shared room feed: every participant can view a sent code."),
  ).toBeVisible();
});
