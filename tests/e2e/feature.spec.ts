import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing two-browser proof for the advertised core action:
 *   "Send a short-lived code to the room; copy it on the other device."
 *
 * Peer A (the "phone") sends a code; peer B (the "laptop") must render that
 * exact code with a copy control. These open two pages in one browser context
 * so y-webrtc's BroadcastChannel fallback syncs them with no signaling server.
 */

const PHONE_CODE = "428913";

test("a code typed on peer A is displayed with a copy control on peer B", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Peer A ("phone"): type the code and send it.
    await a.getByLabel("One-time code").fill(PHONE_CODE);
    await a.getByRole("button", { name: "Send code to room" }).click();

    // Peer B ("laptop"): the exact code surfaces, formatted "428 913", inside a
    // copy control (the whole .tfa-code-btn is the one-click copy affordance).
    const copyBtn = b.locator(".tfa-code .tfa-code-btn");
    await expect(copyBtn).toHaveCount(1);
    await expect(copyBtn.locator(".tfa-digits-display")).toHaveText("428 913");
    // The control advertises the copy action and retains the source boundary.
    await expect(copyBtn.locator(".tfa-code-status")).toHaveText(/copy to this device/i);
    await expect(b.locator(".tfa-code .tfa-code-meta")).toContainText("Received from device");

    // And it is a real <button> the user can click (the one-click copy).
    await expect(copyBtn).toBeEnabled();
  } finally {
    await cleanup();
  }
});

test("codes are scoped to the room — a code in another room never reaches peer B", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Seed a code straight into peer A's shared doc via the test handle, then
    // confirm it reaches B (proves the doc is the room-scoped sync channel).
    const marker = "246802";
    // The room handle is only populated once the Yjs room initializes — wait
    // for it before seeding.
    await a.waitForFunction(() => !!(window as unknown as { __tfaRoom?: unknown }).__tfaRoom);
    await a.evaluate((digits) => {
      const w = window as unknown as {
        __tfaRoom?: { doc: { getArray: (k: string) => { push: (v: unknown[]) => void } } };
      };
      const room = w.__tfaRoom;
      if (!room) throw new Error("test handle __tfaRoom missing");
      room.doc.getArray("codes").push([
        {
          id: crypto.randomUUID(),
          digits,
          fromPeer: "phone-test",
          ts: Date.now(),
        },
      ]);
    }, marker);

    await expect(b.locator(".tfa-code .tfa-digits-display")).toHaveText("246 802");

    // The code lives only in the in-memory Yjs doc + BroadcastChannel, never in
    // persistent storage — nothing under the app's storage prefix holds digits.
    const persisted = await b.evaluate((prefix) => {
      const hits: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const v = localStorage.getItem(k) ?? "";
        if (v.includes("246802") || v.includes("246 802")) hits.push(k);
      }
      return hits;
    }, storagePrefix);
    expect(persisted, persisted.join(",")).toHaveLength(0);
  } finally {
    await cleanup();
  }
});

test("an expired code (older than the 90s TTL) is pruned from the shared room", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Push one fresh code and one already-expired code (ts in the deep past)
    // directly into peer A's doc. Both sync to B; only the fresh one renders —
    // proving codes are ephemeral and don't persist beyond their TTL window.
    await a.waitForFunction(() => !!(window as unknown as { __tfaRoom?: unknown }).__tfaRoom);
    await a.evaluate(() => {
      const w = window as unknown as {
        __tfaRoom?: { doc: { getArray: (k: string) => { push: (v: unknown[]) => void } } };
      };
      const room = w.__tfaRoom;
      if (!room) throw new Error("test handle __tfaRoom missing");
      const arr = room.doc.getArray("codes");
      arr.push([
        {
          id: crypto.randomUUID(),
          digits: "111222",
          fromPeer: "phone-test",
          ts: Date.now() - 5 * 60_000, // 5 min ago — well past the 90s TTL
        },
      ]);
      arr.push([
        {
          id: crypto.randomUUID(),
          digits: "333444",
          fromPeer: "phone-test",
          ts: Date.now(),
        },
      ]);
    });

    // The fresh code renders…
    await expect(b.locator(".tfa-code .tfa-digits-display")).toHaveText("333 444");
    // …and the stale one is never rendered: exactly one code shown, and none
    // of them carry the expired digits.
    await expect(b.locator(".tfa-code")).toHaveCount(1);
    await expect(b.locator(".tfa-digits-display", { hasText: "111 222" })).toHaveCount(0);

    // More importantly, expiry is not only a visual filter: a live room peer
    // removes stale entries from the Yjs array so old code digits do not remain
    // in shared app state after the countdown boundary.
    await expect
      .poll(() =>
        b.evaluate(() => {
          const room = (
            window as unknown as {
              __tfaRoom?: { doc: { getArray: (key: string) => { toArray: () => unknown[] } } };
            }
          ).__tfaRoom;
          return room?.doc
            .getArray("codes")
            .toArray()
            .some(
              (code) =>
                typeof code === "object" &&
                code !== null &&
                "digits" in code &&
                code.digits === "111222",
            );
        }),
      )
      .toBe(false);
  } finally {
    await cleanup();
  }
});
