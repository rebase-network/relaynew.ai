import { expect, test } from "@playwright/test";

const isDeployedRun = process.env.E2E_DEPLOYED === "1";
const allowDeployedWrites = process.env.E2E_ALLOW_DEPLOYED_WRITES === "1";
const adminBaseUrl = process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:4174";
const apiBaseUrl =
  process.env.API_BASE_URL ?? (isDeployedRun ? "https://api.relaynew.ai" : "http://127.0.0.1:8787");

test("admin overview shows operating totals", async ({ page }) => {
  await page.goto(`${adminBaseUrl}/`);
  await expect(page.getByText("Operate the relay catalog, sponsorships, and pricing lanes.")).toBeVisible();
  await expect(page.getByText(/pending submissions/i)).toBeVisible();

  await page.getByRole("link", { name: "Relays" }).click();
  await expect(page).toHaveURL(new RegExp(`${adminBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/relays$`));
  await expect(page.getByRole("heading", { name: "Relay catalog", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Submissions" }).click();
  await expect(page).toHaveURL(new RegExp(`${adminBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/submissions$`));
  await expect(page.getByRole("heading", { name: "Submission queue", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Sponsors" }).click();
  await expect(page).toHaveURL(new RegExp(`${adminBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sponsors$`));
  await expect(page.getByRole("heading", { name: "Sponsor placements", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Prices" }).click();
  await expect(page).toHaveURL(new RegExp(`${adminBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/prices$`));
  await expect(page.getByRole("heading", { name: "Price history", exact: true })).toBeVisible();
});

test("admin can create a relay", async ({ page }) => {
  test.skip(
    isDeployedRun && !allowDeployedWrites,
    "Relay creation is skipped on deployed runs unless E2E_ALLOW_DEPLOYED_WRITES=1.",
  );
  const slug = `northwind-${Date.now()}`;
  const name = `Northwind ${Date.now()}`;

  await page.goto(`${adminBaseUrl}/relays`);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Base URL").fill(`https://${slug}.example.ai/v1`);
  await page.getByLabel("Provider").fill("Northwind Labs");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("Relay created.")).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
});

test("admin can review submissions, create sponsors, and add prices", async ({ page, request }) => {
  test.skip(
    isDeployedRun && !allowDeployedWrites,
    "Write-path admin tests are skipped on deployed runs unless E2E_ALLOW_DEPLOYED_WRITES=1.",
  );
  const relayName = `Review Queue ${Date.now()}`;
  const sponsorName = `Sponsor ${Date.now()}`;

  const submissionResponse = await request.post(`${apiBaseUrl}/public/submissions`, {
    data: {
      relayName,
      baseUrl: `https://review-${Date.now()}.example.ai/v1`,
      websiteUrl: "https://review.example.ai",
      submitterEmail: "ops@example.com",
      notes: "Created by deployed Playwright admin coverage.",
    },
  });
  expect(submissionResponse.ok()).toBeTruthy();

  await page.goto(`${adminBaseUrl}/submissions`);
  const submissionCard = page.locator("div.border.border-white\\/10.bg-white\\/5.p-4").filter({ hasText: relayName }).first();
  await expect(submissionCard).toBeVisible();
  await submissionCard.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/Submission approved\./)).toBeVisible();

  await page.goto(`${adminBaseUrl}/sponsors`);
  await page.getByLabel("Name").fill(sponsorName);
  await page.getByLabel("Placement").fill("leaderboard-spotlight");
  await page.getByRole("button", { name: "Create placement" }).click();
  await expect(page.getByText("Sponsor placement created.")).toBeVisible();
  await expect(page.getByText(sponsorName)).toBeVisible();

  await page.goto(`${adminBaseUrl}/prices`);
  await page.getByLabel("Relay").selectOption({ index: 1 });
  await page.getByLabel("Model").selectOption({ index: 1 });
  await page.getByLabel("Input price").fill("0.33");
  await page.getByLabel("Output price").fill("1.22");
  await page.getByRole("button", { name: "Create price" }).click();
  await expect(page.getByText("Price record created.")).toBeVisible();
});
