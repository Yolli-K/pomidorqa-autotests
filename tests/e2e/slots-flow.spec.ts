import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, deleteUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";

// Хост уникален на каждый прогон (makeUser + Date.now), поэтому его список слотов
// стартует пустым — карточка [data-slot-id] в тесте гарантированно наша.

test.describe("Мои слоты", () => {
  test.beforeEach(async ({ page }) => {
    await registerUserViaApi(page.context().request, makeUser("slots", Date.now()));
  });

  test.afterEach(async ({ page }) => {
    await deleteUserViaApi(page.context().request);
  });

  test("Удаление свободного слота: карточка исчезает и не возвращается после перезагрузки", async ({
    page,
  }) => {
    const booking = new BookingPage(page);

    await test.step("Открываем «Мои слоты» и добавляем свободный слот на завтра 12:00", async () => {
      await booking.openSlots();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);
      await booking.addSlot(date, "12:00");
    });

    await test.step("Слот появился в списке", async () => {
      await expect(booking.slotsCard.first()).toBeVisible();
    });

    await test.step("Удаляем слот", async () => {
      await booking.deleteFirstSlot();
    });

    await test.step("Карточка слота исчезла из списка", async () => {
      await expect(booking.slotsCard).toHaveCount(0);
    });

    await test.step("После перезагрузки слот не вернулся — удаление подтверждено сервером", async () => {
      await page.reload();
      await expect(booking.slotsCard).toHaveCount(0);
    });
  });
});
