import { expect, test, type Page } from "@playwright/test";

const isDeployedRun = process.env.E2E_DEPLOYED === "1";
const allowDeployedWrites = process.env.E2E_ALLOW_DEPLOYED_WRITES === "1";
const adminBaseUrl = process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:4174";
const webBaseUrl = process.env.WEB_BASE_URL ?? "http://127.0.0.1:4173";
const apiBaseUrl =
  process.env.API_BASE_URL ?? (isDeployedRun ? "https://api.relaynew.ai" : "http://127.0.0.1:8787");
const adminUsername = process.env.E2E_ADMIN_USERNAME ?? process.env.ADMIN_AUTH_USERNAME ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_AUTH_PASSWORD ?? "";

function buildBasicAuthorization(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function getAdminApiHeaders() {
  if (!adminUsername || !adminPassword) {
    return undefined;
  }

  return {
    Authorization: buildBasicAuthorization(adminUsername, adminPassword),
  };
}

async function openAdmin(page: Page, path = "/") {
  await page.goto(`${adminBaseUrl}${path}`);

  const loginHeading = page.getByRole("heading", { name: "登录后继续", exact: true });
  const adminBrand = page.getByText("relaynew.ai 管理台", { exact: true });

  await Promise.race([
    loginHeading.waitFor({ state: "visible" }).catch(() => undefined),
    adminBrand.waitFor({ state: "visible" }).catch(() => undefined),
  ]);

  if (!(await loginHeading.isVisible().catch(() => false))) {
    return;
  }

  expect(
    adminUsername && adminPassword,
    "Admin auth is enabled. Set ADMIN_AUTH_USERNAME and ADMIN_AUTH_PASSWORD in .env for Playwright.",
  ).toBeTruthy();

  await page.getByLabel("用户名").fill(adminUsername);
  await page.getByLabel("密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(adminBrand).toBeVisible();
}

test("admin defaults to relay operations and exposes the simplified operator navigation", async ({ page }) => {
  await openAdmin(page, "/");

  await expect(page).toHaveURL(/\/relays$/);
  await expect(page.getByRole("heading", { name: "Relay 列表", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Relay", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Relay历史", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "提交记录", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "提交记录历史", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "提交历史", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "赞助位", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "模型", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "密钥", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "价格", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Relay历史", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Relay 历史", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "提交记录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "提交记录", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "提交历史", exact: true }).click();
  await expect(page.getByRole("heading", { name: "提交历史", exact: true })).toBeVisible();
});

test("admin can manually create a relay with model prices", async ({ page }) => {
  test.skip(
    isDeployedRun && !allowDeployedWrites,
    "Relay creation is skipped on deployed runs unless E2E_ALLOW_DEPLOYED_WRITES=1.",
  );

  const relayName = `Northwind Manual ${Date.now()}`;
  const relayBaseUrl = `https://example.com/manual-relay-${Date.now()}`;

  await openAdmin(page, "/relays");
  await page.getByRole("button", { name: "手动添加 Relay" }).click();

  const drawer = page.locator("aside").filter({ has: page.getByRole("heading", { name: "手动添加 Relay" }) });
  await expect(drawer).toBeVisible();

  await drawer.getByLabel("站点名字").fill(relayName);
  await drawer.getByLabel("Base URL").fill(relayBaseUrl);
  await drawer.getByLabel("站点网站").fill("https://example.com");
  await drawer.getByLabel("联系方式").fill("Telegram: @northwind_manual");
  await drawer.getByLabel("站点简介").fill("后台手动新增 Relay 的 Playwright 覆盖用例。");
  await drawer.getByLabel(/第 1 行模型/).fill("openai-gpt-5.4");
  await drawer.getByLabel(/第 1 行 Input价格/).fill("4.6");
  await drawer.getByLabel(/第 1 行 Output价格/).fill("13.2");
  await drawer.getByLabel("测试API Key").fill("sk-manual-create");
  await drawer.getByRole("button", { name: "创建 Relay" }).click();

  await expect(page.getByText("Relay 已创建并加入当前列表。", { exact: true })).toBeVisible();
  await expect(page.locator(".admin-list-card").filter({ hasText: relayName })).toBeVisible();
});

test("admin can approve a submission and move it into history plus relay list", async ({ page, request }) => {
  test.skip(
    isDeployedRun && !allowDeployedWrites,
    "Submission review is skipped on deployed runs unless E2E_ALLOW_DEPLOYED_WRITES=1.",
  );

  const runId = Date.now();
  const relayName = `Submission Relay ${runId}`;
  const relayBaseUrl = `https://example.com/submission-relay-${runId}`;

  const submissionResponse = await request.post(`${apiBaseUrl}/public/submissions`, {
    data: {
      relayName,
      baseUrl: relayBaseUrl,
      websiteUrl: "https://example.com",
      contactInfo: "Telegram: @submission_ops",
      description: "用于验证审批通过后直接进入 Relay 列表，并移动到提交历史。",
      modelPrices: [
        {
          modelKey: "openai-gpt-5.4",
          inputPricePer1M: 4.6,
          outputPricePer1M: 13.2,
        },
      ],
      testApiKey: "sk-submission-approve",
      compatibilityMode: "auto",
    },
  });
  expect(submissionResponse.ok()).toBeTruthy();

  await openAdmin(page, "/intake");
  const queueCard = page.locator(".admin-list-card").filter({ hasText: relayName }).first();
  await expect(queueCard).toBeVisible();
  await queueCard.click();

  const drawer = page.locator("aside").filter({ has: page.getByRole("heading", { name: relayName }) });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "批准并创建 Relay" }).click();

  await expect(page.locator(".admin-list-card").filter({ hasText: relayName })).toHaveCount(0);

  await page.goto(`${adminBaseUrl}/intake/history`);
  const historyCard = page.locator(".admin-list-card").filter({ hasText: relayName }).first();
  await expect(historyCard).toBeVisible();
  await expect(historyCard.getByText("已关联 Relay", { exact: false })).toBeVisible();

  await page.goto(`${adminBaseUrl}/relays`);
  await expect(page.locator(".admin-list-card").filter({ hasText: relayName })).toBeVisible();
});

test("admin can pause, archive, and reactivate a relay", async ({ page, request }) => {
  test.skip(
    isDeployedRun && !allowDeployedWrites,
    "Relay lifecycle writes are skipped on deployed runs unless E2E_ALLOW_DEPLOYED_WRITES=1.",
  );

  const runId = Date.now();
  const relayName = `Lifecycle Relay ${runId}`;
  const relayBaseUrl = `https://example.com/lifecycle-relay-${runId}`;

  const relayResponse = await request.post(`${apiBaseUrl}/admin/relays`, {
    headers: getAdminApiHeaders(),
    data: {
      name: relayName,
      baseUrl: relayBaseUrl,
      websiteUrl: "https://example.com",
      contactInfo: "Telegram: @lifecycle_ops",
      description: "用于验证 Relay 的 active / paused / archived 生命周期。",
      catalogStatus: "active",
      modelPrices: [
        {
          modelKey: "openai-gpt-5.4",
          inputPricePer1M: 4.6,
          outputPricePer1M: 13.2,
        },
      ],
      testApiKey: "sk-lifecycle-check",
      compatibilityMode: "auto",
    },
  });
  expect(relayResponse.ok()).toBeTruthy();

  await openAdmin(page, "/relays");
  const relayCard = page.locator(".admin-list-card").filter({ hasText: relayName }).first();
  await expect(relayCard).toBeVisible();

  await relayCard.getByRole("button", { name: "暂停" }).click();
  await expect(page.getByText(`${relayName} 已暂停。`, { exact: true })).toBeVisible();

  const pausedCard = page.locator(".admin-list-card").filter({ hasText: relayName }).first();
  await expect(pausedCard).toContainText(/已暂停|paused/i);
  await pausedCard.getByRole("button", { name: "归档" }).click();
  await page.getByRole("button", { name: "归档 Relay" }).click();
  await expect(page.getByText(`${relayName} 已归档到 Relay 历史。`, { exact: true })).toBeVisible();
  await expect(page.locator(".admin-list-card").filter({ hasText: relayName })).toHaveCount(0);

  await page.goto(`${adminBaseUrl}/relays/history`);
  const archivedCard = page.locator(".admin-list-card").filter({ hasText: relayName }).first();
  await expect(archivedCard).toBeVisible();
  await archivedCard.click();
  const drawer = page.locator("aside").filter({ has: page.getByRole("heading", { name: relayName }) });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "重新激活" }).click();
  await expect(drawer).toHaveCount(0);

  await page.goto(`${adminBaseUrl}/relays`);
  await expect(page.locator(".admin-list-card").filter({ hasText: relayName })).toBeVisible();
});

test("public relay pages only expose active relays", async ({ request }) => {
  test.skip(
    isDeployedRun && !allowDeployedWrites,
    "Public visibility writes are skipped on deployed runs unless E2E_ALLOW_DEPLOYED_WRITES=1.",
  );

  const runId = Date.now();
  const relayName = `Paused Public Relay ${runId}`;
  const relayBaseUrl = `https://example.com/public-relay-${runId}`;

  const relayResponse = await request.post(`${apiBaseUrl}/admin/relays`, {
    headers: getAdminApiHeaders(),
    data: {
      name: relayName,
      baseUrl: relayBaseUrl,
      websiteUrl: "https://example.com",
      contactInfo: "Telegram: @paused_public_ops",
      description: "用于验证只有 active Relay 才会出现在公开页面。",
      catalogStatus: "paused",
      modelPrices: [
        {
          modelKey: "openai-gpt-5.4",
          inputPricePer1M: 4.6,
          outputPricePer1M: 13.2,
        },
      ],
      testApiKey: "sk-paused-public",
      compatibilityMode: "auto",
    },
  });
  expect(relayResponse.ok()).toBeTruthy();

  const relaysResponse = await request.get(`${apiBaseUrl}/admin/relays`, {
    headers: getAdminApiHeaders(),
  });
  const relaysPayload = await relaysResponse.json();
  const createdRelay = relaysPayload.rows.find((row: { name: string }) => row.name === relayName);
  expect(createdRelay).toBeTruthy();

  const publicOverviewResponse = await request.get(`${apiBaseUrl}/public/relay/${createdRelay.slug}/overview`);
  expect(publicOverviewResponse.status()).toBe(404);

  const leaderboardResponse = await request.get(`${webBaseUrl}/leaderboard`);
  expect(leaderboardResponse.ok()).toBeTruthy();
});
