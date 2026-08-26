import { appendFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

function recordAudit(entry: {
  id: string;
  claim: string;
  method: string;
  evidence: Record<string, unknown>;
}) {
  const auditFile = process.env["MESH_AUDIT_FILE"];
  if (!auditFile) return;
  appendFileSync(auditFile, `${JSON.stringify({ ...entry, result: "pass", ts: Date.now() })}\n`);
}

test("security audit — the UI states the room-visible boundary and does not persist a relayed code", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await expect(
      a.getByText("This is a shared room feed: every participant can view a sent code."),
    ).toBeVisible();
    await expect(a.getByText(/do not send passwords, recovery codes/i)).toBeVisible();

    await a.getByLabel("One-time code").fill("739104");
    await a.getByRole("button", { name: "Send code to room" }).click();
    await expect(b.locator(".tfa-digits-display")).toHaveText("739 104");
    await expect(b.locator(".tfa-code-status")).toHaveText("Copy to this device");

    const persisted = await b.evaluate((prefix) => {
      const matches: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !key.startsWith(prefix)) continue;
        const value = localStorage.getItem(key) ?? "";
        if (value.includes("739104") || value.includes("739 104")) matches.push(key);
      }
      return matches;
    }, storagePrefix);
    expect(persisted, persisted.join(",")).toHaveLength(0);

    recordAudit({
      id: "UI.ROOM.VISIBLE_EPHEMERAL",
      claim:
        "A sent code is visibly shared with room peers but is not written into app localStorage.",
      method:
        "Two BrowserContext peers send and receive a code over the live room; localStorage is scanned for its digits.",
      evidence: { code: "739104", peerCopyControl: true, persistedKeys: persisted },
    });
  } finally {
    await cleanup();
  }
});
