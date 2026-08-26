/** Make the published still show the actual handoff action in its ready state. */
export default async function screenshotScenario(page) {
  await page.getByLabel("One-time code").fill("428913");
  await page.locator("#relay-label").fill("email sign-in");
  await page.getByRole("heading", { name: "Send a code" }).click();
}
