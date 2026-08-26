import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Generic mesh-presence test — works for any mesh-* app without modification.
 * Opens two pages in the same browser context so y-webrtc's BroadcastChannel
 * fallback syncs them with no signaling server / no network.
 *
 * Apps that show a peer count in the UI should pass this. Apps that don't
 * surface peer count can override or skip this test.
 */
test("two peers in the same room can both load", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Code Relay opts into the modern inset shell, whose visible shared
    // controls live in the app bar rather than the legacy self-ref footer.
    await expect(a.locator("[data-mesh-app-shell]")).toBeVisible();
    await expect(b.locator("[data-mesh-app-shell]")).toBeVisible();
    await expect(a.getByRole("button", { name: /invite people to code relay/i })).toBeVisible();
    await expect(b.getByRole("button", { name: /invite people to code relay/i })).toBeVisible();
    await expect(a.getByRole("heading", { name: "Code Relay", level: 1 })).toBeVisible();
    await expect(b.getByRole("heading", { name: "Code Relay", level: 1 })).toBeVisible();
  } finally {
    await cleanup();
  }
});
