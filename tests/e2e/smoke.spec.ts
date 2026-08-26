import { expect, test } from "@playwright/test";
import { captureConsoleErrors } from "@baditaflorin/mesh-common/testing";

/**
 * Generic smoke test — works for any mesh-* app without modification.
 * Asserts: page loads, settings drawer opens, self-ref bar visible, no
 * console errors.
 */

test("page loads with modern room controls and the handoff action visible", async ({ page }) => {
  const c = captureConsoleErrors(page);
  await page.goto("./");

  // Code Relay deliberately uses the modern inset app bar rather than the
  // legacy footer chrome. The shared controls and actual handoff action must
  // both be visible on first load.
  await expect(page.locator("[data-mesh-app-shell]")).toBeVisible();
  await expect(page.getByRole("button", { name: /invite people to code relay/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send code to room" })).toBeVisible();

  // Allow a moment for async TURN fetch / WebRTC handshake; benign warnings
  // about TURN unreachable are OK, but real errors are not.
  await page.waitForTimeout(800);
  const errors = c.getErrors().filter((e) => {
    // Ignore network failures that come from the intentionally-unreachable
    // signaling URL in the test environment.
    return !/turn|stun|signaling|websocket|webrtc|failed to load resource|err_failed|err_connection|err_blocked|err_name_not_resolved/i.test(
      e,
    );
  });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("settings drawer can be opened (or is already open) and shows infra fields", async ({
  page,
}) => {
  await page.goto("./");
  // Some legacy apps auto-open the drawer on first load (e.g. when no name
  // is set yet). Click the FAB only if the drawer isn't already showing.
  const drawer = page.locator(".mesh-settings-drawer, .settings-drawer");
  if ((await drawer.count()) === 0) {
    await page.getByLabel("Open settings").click();
  }
  await expect(page.getByText(/Self-hosted infra/i)).toBeVisible();
  await expect(page.getByText(/Signaling URL/i)).toBeVisible();
  await expect(page.getByText(/TURN credentials URL/i)).toBeVisible();
});
