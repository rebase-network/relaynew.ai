import { expect, test } from "@playwright/test";

test("public crawl and icon assets bypass the SPA fallback", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(robots.headers()["content-type"]).not.toContain("text/html");
  await expect(robots.text()).resolves.toContain("Sitemap: https://relaynew.ai/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(sitemap.headers()["content-type"]).not.toContain("text/html");
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("<urlset");
  expect(sitemapText).toContain("https://relaynew.ai/leaderboard");

  const favicon = await request.get("/favicon.ico");
  expect(favicon.ok()).toBeTruthy();
  expect(favicon.headers()["content-type"]).not.toContain("text/html");
});

test("homepage HTML exposes crawlable fallback content", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();

  expect(html).toContain('lang="zh-CN"');
  expect(html).toContain("发现优质AI服务商，快速测试API，建立公开目录");
  expect(html).toContain("查看站点目录");
});
