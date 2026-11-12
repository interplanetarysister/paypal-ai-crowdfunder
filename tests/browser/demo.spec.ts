import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { harness } from "../harness";
import { handle } from "../../worker/index";
import { mkdir } from "node:fs/promises";
type Harness = Awaited<ReturnType<typeof harness>>;
async function connect(page: Page, h: Harness) {
  h.env.DEMO_ORIGIN = "http://127.0.0.1:4173";
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      headers = await req.allHeaders();
    const response = await handle(
      new Request(req.url(), {
        method: req.method(),
        headers,
        ...(req.postData() ? { body: req.postData() } : {}),
      }),
      h.env,
    );
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
}
// A local browser test uses real local SQL and MOCKED AI/PayPal. It is not a live provider test.
test("guest navigation, discovery, synthetic map, campaign disclosures, sharing and authorization", async ({
  page,
}) => {
  const h = await harness();
  try {
    await h.register();
    const c = await h.campaign();
    await connect(page, h);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Endless possibilities/ }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Explore causes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Restore Aurora Harbor’s learning center",
      }),
    ).toBeVisible();
    await page.getByLabel("Search campaigns").fill("no match");
    await expect(
      page.getByRole("heading", { name: "No campaigns found" }),
    ).toBeVisible();
    await page.getByLabel("Search campaigns").fill("Aurora");
    await page
      .getByRole("heading", { name: "Restore Aurora Harbor’s learning center" })
      .click();
    await expect(
      page
        .getByText(
          "DEMO CAMPAIGN — FICTIONAL CONTENT — SANDBOX PAYMENTS ONLY",
          { exact: true },
        )
        .first(),
    ).toBeVisible();
    await page.getByRole("link", { name: "Share this possibility" }).click();
    await expect(page.locator(".qr svg")).toBeVisible();
    await expect(page.getByLabel("Shareable demo link")).toHaveValue(
      new RegExp(c.id),
    );
    await page.goto("/map");
    await page.getByRole("button", { name: "Rotate globe west" }).click();
    await page
      .getByRole("button", {
        name: /Select fictional campaign: Restore Aurora/,
      })
      .press("Enter");
    await expect(
      page.getByRole("link", { name: "Open campaign and charts" }),
    ).toBeVisible();
    await page.goto("/hackathon/tracker");
    await expect(
      page.getByRole("heading", { name: "Sign in to your demo account" }),
    ).toBeVisible();
    await page.goto("/support");
    await expect(
      page.getByRole("heading", { name: "Sign in to your demo account" }),
    ).toBeVisible();
  } finally {
    await h.close();
  }
});
test("browser wizard: account creation, five titles, two descriptions, story sections, draft, publish and dashboard", async ({
  page,
}) => {
  const h = await harness();
  try {
    await connect(page, h);
    await page.goto("/login");
    await page
      .getByRole("button", { name: "New here? Create a demo account" })
      .click();
    await page.getByLabel("Fictional handle").fill("browser_judge");
    await page
      .getByLabel("Separate demo password")
      .fill("test-only-password-123");
    await page
      .getByRole("button", { name: "Create demo account", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Hello, browser_judge" }),
    ).toBeVisible();
    await page.goto("/create");
    await page
      .getByLabel("What is the need")
      .fill(
        "A fictional community needs to rebuild a learning center after a synthetic storm.",
      );
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Generate five titles", exact: true })
      .click();
    await expect(
      page.locator(".options").first().getByRole("button"),
    ).toHaveCount(5);
    await page.locator(".options").first().getByRole("button").first().click();
    await page
      .getByRole("button", { name: "Generate two descriptions", exact: true })
      .click();
    await expect(
      page.locator(".options").nth(1).getByRole("button"),
    ).toHaveCount(2);
    await page.locator(".options").nth(1).getByRole("button").first().click();
    await page
      .getByRole("button", { name: "Generate one story", exact: true })
      .click();
    await expect(page.getByLabel("Section 1 text")).toContainText("");
    await expect(page.getByLabel("Section 1 text")).toHaveValue(
      /fictional community/,
    );
    await page
      .getByRole("button", { name: "Regenerate only this section" })
      .first()
      .click();
    await expect(
      page.getByText(
        "AI generation completed. Review the content before using it.",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Give your possibility a world" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(
      page.getByText("Private draft saved.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Publish in demo discovery" })
      .click();
    await expect(page).toHaveURL(/\/campaign\//);
    await expect(
      page.getByRole("link", { name: "Donate with PayPal Sandbox" }),
    ).toBeVisible();
    await page.goto("/dashboard?view=organizer");
    await expect(
      page.getByRole("heading", { name: "A new dawn for Aurora Harbor" }),
    ).toBeVisible();
    await page.goto("/hackathon/tracker");
    await expect(
      page.getByRole("heading", { name: "Administrator access required" }),
    ).toBeVisible();
  } finally {
    await h.close();
  }
});
test("AI provider failure preserves the campaign draft and never shows fake successful generation", async ({
  page,
}) => {
  const h = await harness();
  try {
    const user = await h.register("failure_judge");
    await connect(page, h);
    await page.context().addCookies([
      {
        name: "ifund_demo_session",
        value: h.cookie.split("=")[1],
        url: "http://127.0.0.1:4173",
      },
    ]);
    h.failAI = true;
    await page.goto("/create");
    await page
      .getByLabel("What is the need")
      .fill("Fictional community campaign with a synthetic beneficiary.");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Generate five titles", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("AI provider failed");
    await expect(
      page.locator(".options").first().getByRole("button"),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("What is the need")).toHaveValue(
      /Fictional community/,
    );
    expect(user.id).toBeTruthy();
  } finally {
    await h.close();
  }
});
test("desktop, tablet and phone layouts, screenshots and automated accessibility", async ({
  page,
}) => {
  // Eighteen full axe scans plus chart initialization exceed the single-route budget.
  test.setTimeout(180000);
  const h = await harness();
  try {
    await h.register();
    const c = await h.campaign();
    await connect(page, h);
    await mkdir("evidence/browser", { recursive: true });
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of [
        "/",
        "/discover",
        "/map",
        "/campaign/" + c.id,
        "/create",
        "/hackathon",
        "/login",
      ]) {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        expect(overflow, `overflow at ${route} ${viewport.width}`).toBe(false);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          results.violations,
          `a11y at ${route} ${viewport.width}`,
        ).toEqual([]);
      }
      await page.goto("/");
      await page.screenshot({
        path: `evidence/browser/TEST_ONLY-home-${viewport.width}.png`,
        fullPage: true,
      });
      await page.goto("/discover");
      await page.screenshot({
        path: `evidence/browser/TEST_ONLY-discovery-${viewport.width}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("link", { name: "Judge guide", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Judge guide", exact: true }).click();
    await expect(page).toHaveURL(/hackathon/);
  } finally {
    await h.close();
  }
});
