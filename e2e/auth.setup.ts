import { test as setup } from "@playwright/test";

// Persistent QA account documented in .claude/skills/verify/SKILL.md -
// shared, reusable test account, not a disposable one to clean up after.
const QA_EMAIL = process.env.QA_EMAIL ?? "qa-persistent@example.com";
const QA_PASSWORD = process.env.QA_PASSWORD ?? "QaPersistent!2026";

const authFile = "e2e/.auth/qa-persistent.json";

setup("authenticate as the persistent QA account", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(QA_EMAIL);
  await page.getByLabel("Senha").fill(QA_PASSWORD);
  // Auth pages render two submit buttons - "Continuar com Google" comes
  // first, so the email/password one needs an exact name match.
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await page.context().storageState({ path: authFile });
});
