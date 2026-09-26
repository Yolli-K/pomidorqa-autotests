import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  ROUTES,
  makeUser,
  registerUserViaApi,
  deleteUserViaApi,
  type TestUser,
} from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";



function tomorrowIso(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

test.describe("Каталог: поиск по навыку", () => {
  let host: TestUser;
  let tag: string;
  let hostContext: BrowserContext;
  let hostPage: Page;

  test.beforeEach(async ({ page, browser }) => {
    const runId = Date.now();
    tag = `Search-${runId}`;
    host = makeUser("search-host", runId);

    hostContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    await registerUserViaApi(hostContext.request, host);
    
    await registerUserViaApi(
      page.context().request,
      makeUser("search-guest", runId),
    );
  });

  test.afterEach(async ({ page }) => {
    
    try {
      await deleteUserViaApi(page.context().request);
    } catch (error) {
      console.error("Очистка гостя не удалась:", error);
    }
    try {
      await deleteUserViaApi(hostContext.request);
    } catch (error) {
      console.error("Очистка хоста не удалась:", error);
    }
    await hostContext.close();
  });

  test("Поиск по навыку находит участника", async ({ page }) => {
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(page);

    await test.step("Хост публикует навык «могу помочь» и свободный слот", async () => {
      await hostProfile.open();
      await hostProfile.addSkill(tag, "can_help");
      await hostBooking.openSlots();
      await hostBooking.addSlot(tomorrowIso(), "12:00");
    });

    await test.step("Гость ищет по навыку — карточка хоста в каталоге", async () => {
      await page.goto(ROUTES.home);
      await expect(async () => {
        await guestBooking.searchBySkill(tag);
        await expect(
          guestBooking.catalogCard.filter({ hasText: host.name }),
        ).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });
  });

  test("Поиск по несуществующему навыку — пустой результат", async ({
    page,
  }) => {
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(page);

    await test.step("Хост публикует навык и слот — каталог заведомо не пуст", async () => {
      await hostProfile.open();
      await hostProfile.addSkill(tag, "can_help");
      await hostBooking.openSlots();
      await hostBooking.addSlot(tomorrowIso(), "12:00");
    });

    await test.step("Гость ищет несуществующий навык", async () => {
      await page.goto(ROUTES.home);
      await guestBooking.searchBySkill(`No-Such-${tag}`);
    });

    await test.step("Карточек нет — показано пустое состояние", async () => {
      await expect(guestBooking.catalogEmptyState).toBeVisible();
      await expect(guestBooking.catalogCard).toHaveCount(0);
    });
  });

  // Баг на стенде (requirements.md §8: «в списке останутся только участники,
  // у которых есть такой навык из раздела "могу помочь"»).
  // поиск находит участника по want_to_learn-навыку,
  // при этом сам тег на карточке каталога не отображается (блок навыков пуст) -
  // фильтрацию по типу навыка не делает именно поиск.
  // Когда починят - заменить test.fixme( на test(, тест станет регрессионной проверкой фикса.
  test.fixme("Поиск не находит навык из «хочу разобрать»", async ({ page }) => {
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(page);

    await test.step("Хост публикует навык «хочу разобрать» и свободный слот", async () => {
      await hostProfile.open();
      await hostProfile.addSkill(tag, "want_to_learn");
      await hostBooking.openSlots();
      await hostBooking.addSlot(tomorrowIso(), "12:00");
    });

    await test.step("Гость ищет по тегу «хочу разобрать» — карточки нет", async () => {
      await page.goto(ROUTES.home);
      await guestBooking.searchBySkill(tag);
      await expect(
        guestBooking.catalogCard.filter({ hasText: host.name }),
      ).toHaveCount(0, { timeout: 10_000 });
    });
  });

  test("Участник без свободного слота не показывается в каталоге", async ({
    page,
  }) => {
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(page);

    await test.step("Хост публикует только навык, без слотов", async () => {
      await hostProfile.open();
      await hostProfile.addSkill(tag, "can_help");
    });

    await test.step("Гость ищет — карточки нет", async () => {
      await page.goto(ROUTES.home);
      await guestBooking.searchBySkill(tag);
      await expect(
        guestBooking.catalogCard.filter({ hasText: host.name }),
      ).toHaveCount(0, { timeout: 10_000 });
    });

    await test.step("Хост добавляет свободный слот", async () => {
      await hostBooking.openSlots();
      await hostBooking.addSlot(tomorrowIso(), "12:00");
    });

    await test.step("Гость ищет снова — карточка появилась", async () => {
      await page.goto(ROUTES.home);
      await expect(async () => {
        await guestBooking.searchBySkill(tag);
        await expect(
          guestBooking.catalogCard.filter({ hasText: host.name }),
        ).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });
  });

  test("Свою карточку в собственном каталоге не видно", async ({ page }) => {
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);

    await test.step("Хост публикует навык и слот", async () => {
      await hostProfile.open();
      await hostProfile.addSkill(tag, "can_help");
      await hostBooking.openSlots();
      await hostBooking.addSlot(tomorrowIso(), "12:00");
    });

    await test.step("Хост ищет себя в каталоге — своей карточки нет", async () => {
      await hostPage.goto(ROUTES.home);
      await hostBooking.searchBySkill(tag);
      await expect(
        hostBooking.catalogCard.filter({ hasText: host.name }),
      ).toHaveCount(0, { timeout: 10_000 });
    });
  });
});
