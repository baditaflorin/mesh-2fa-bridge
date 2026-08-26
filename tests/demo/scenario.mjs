/**
 * A truthful two-peer Code Relay capture. Peer A enters a short-lived code;
 * peer B receives it through the same shared-room path and copies it locally.
 */
export default async function scenario(a, b) {
  await a.getByLabel("One-time code").fill("428913");
  await a.locator("#relay-label").fill("email sign-in");
  await a.getByRole("button", { name: "Send code to room" }).click();

  const peerCopy = b.getByRole("button", { name: "Copy code 428 913" });
  await peerCopy.waitFor();
  await b.waitForTimeout(700);
  await peerCopy.click();
  await a.waitForTimeout(1_500);
}
