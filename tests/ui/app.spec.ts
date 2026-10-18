import { expect, test, type Page } from "@playwright/test";

/** Открыть стенд, собрать ошибки консоли. */
async function open(page: Page, query = "still") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.setViewportSize({ width: 700, height: 580 });
  await page.goto(`/mock.html?${query}`);
  await expect(page.getByText("Мост активен").first()).toBeVisible();
  return errors;
}

async function go(page: Page, label: string) {
  await page.getByRole("tab", { name: label }).click();
}

test("обзор: IP один раз, проверка приватности с вердиктом", async ({ page }) => {
  const errors = await open(page);
  await expect(page.getByText("185.68.187.138")).toHaveCount(1);
  await expect(page.getByText("Доступна версия 0.7.0")).toBeVisible();
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.getByText("Всё чисто")).toBeVisible();
  await expect(page.getByText("Ваш IP скрыт")).toBeVisible();
  await expect(page.getByText("DNS не выдаёт провайдера")).toBeVisible();
  await page.screenshot({ path: "test-results/overview.png" });
  expect(errors).toEqual([]);
});

test("приложения: папки, статусы, перехват расширением", async ({ page }) => {
  const errors = await open(page);
  await go(page, "Приложения");
  for (const folder of ["AI", "Браузеры", "Мессенджеры", "Разработка"]) {
    await expect(page.getByText(folder, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Прокси перехватывает FoxyProxy")).toBeVisible();
  await expect(page.getByRole("button", { name: "Отключить", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/apps-list.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("приложения: сетка и режим упорядочивания", async ({ page }) => {
  const errors = await open(page);
  await go(page, "Приложения");
  await page.getByRole("radio", { name: "Сетка" }).click();
  await expect(page.getByText("Telegram")).toBeVisible();
  await page.screenshot({ path: "test-results/apps-grid.png", fullPage: true });
  // ПКМ → меню → «Упорядочить»
  await page.getByText("Telegram").click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  // Меню целиком в окне (раньше обрезалось снизу).
  const box = await menu.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(580);
  await expect(page.getByRole("menuitem", { name: "Убрать из списка" })).toBeInViewport();
  await page.screenshot({ path: "test-results/apps-context-menu.png" });
  await page.getByRole("menuitem", { name: "Упорядочить" }).click();
  await expect(page.getByRole("button", { name: "Готово" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Новая папка" })).toBeVisible();
  await page.screenshot({ path: "test-results/apps-editing.png", fullPage: true });
  await page.getByRole("button", { name: "Готово" }).click();
  await expect(page.getByRole("button", { name: "Добавить" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("приложения: окно настроек через шестерёнку", async ({ page }) => {
  const errors = await open(page);
  await go(page, "Приложения");
  await page.getByText("Google Chrome").hover();
  await page.getByRole("button", { name: "Настройки приложения" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Прокси", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Всегда через мост")).toBeVisible();
  await expect(dialog.getByText("Весь трафик через прокси")).toBeVisible();
  await page.screenshot({ path: "test-results/app-settings.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test("приложения: умное добавление", async ({ page }) => {
  const errors = await open(page);
  await go(page, "Приложения");
  await page.getByRole("button", { name: "Добавить" }).click();
  await page.getByPlaceholder("Название программы").fill("wec");
  await expect(page.getByText("WeChat")).toBeVisible();
  await page.screenshot({ path: "test-results/apps-add.png" });
  expect(errors).toEqual([]);
});

test("прокси, настройки и сайдбар", async ({ page }) => {
  const errors = await open(page);
  await go(page, "Прокси");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/proxies.png", fullPage: true });
  await expect(page.getByText("Claude main").first()).toBeVisible();
  await go(page, "Настройки");
  await expect(page.getByText("Открывать при входе")).toBeVisible();
  await page.screenshot({ path: "test-results/settings.png" });
  await page.getByRole("button", { name: "Развернуть панель" }).click();
  await expect(page.getByText("AI-прокси мост")).toBeVisible();
  await page.screenshot({ path: "test-results/sidebar-open.png" });
  expect(errors).toEqual([]);
});

test("windows: статусы по соединениям, Telegram и вид плитками", async ({ page }) => {
  const errors = await open(page, "still&platform=win");
  await go(page, "Приложения");
  await expect(page.getByText("Telegram").first()).toBeVisible();
  await expect(page.getByText("Через мост · 4").first()).toBeVisible();
  await expect(page.getByText("Прокси перехватывает FoxyProxy").first()).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Вид" })).toBeVisible();
  await page.screenshot({ path: "test-results/apps-windows.png" });
  expect(errors).toEqual([]);
});
