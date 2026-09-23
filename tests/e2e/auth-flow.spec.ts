import { test, expect, type Page } from "@playwright/test";
import {
  ROUTES,
  makeUser,
  registerUserViaApi,
  deleteUserViaApi,
  type TestUser,
} from "../helpers/user";
import { LoginPage } from "../pages/login-page";
import { RegisterPage } from "../pages/register-page";

// Кнопка «Выйти» и ссылка «Войти» живут в хедере каждой страницы.
const logoutButton = (page: Page) => page.getByRole("button", { name: "Выйти" });
const headerLoginLink = (page: Page) => page.getByTestId("PomidorqaHeader-login-link");

test.describe("Вход и выход", () => {
  let user: TestUser;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    user = makeUser("auth", Date.now());
    await registerUserViaApi(page.context().request, user);
    loginPage = new LoginPage(page);
  });

  test.afterEach(async ({ page }) => {
    await deleteUserViaApi(page.context().request);
  });

  test("выход разлогинивает, повторный вход через форму возвращает аккаунт", async ({ page }) => {
    await test.step("Открываем главную под созданным аккаунтом", async () => {
      await page.goto(ROUTES.home);
    });

    await test.step("Проверяем авторизованное состояние", async () => {
      await expect(logoutButton(page)).toBeVisible();
    });

    await test.step("Выходим", async () => {
      await logoutButton(page).click();
    });

    await test.step("Проверяем анонимное состояние", async () => {
      await expect(page).toHaveURL(/\/pomidorqa\/?$/);
      await expect(headerLoginLink(page)).toBeVisible();
      await expect(logoutButton(page)).toBeHidden();
    });

    await test.step("Входим через форму логина", async () => {
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
    });

    await test.step("Проверяем: пользователь снова авторизован", async () => {
      await expect(page).toHaveURL(/\/pomidorqa\/?$/);
      await expect(logoutButton(page)).toBeVisible();
    });
  });
});

test.describe("Регистрация", () => {
  // Аккаунт создан (через API или отправкой формы) и его надо удалить в afterEach.
  let accountExists = false;

  test.afterEach(async ({ page }) => {
    if (accountExists) {
      await deleteUserViaApi(page.context().request);
    }
  });

  test("успешная регистрация через форму сразу авторизует", async ({ page }) => {
    accountExists = false;
    const registerPage = new RegisterPage(page);
    const user = makeUser("reg", Date.now());

    await test.step("Заполняем форму регистрации и отправляем", async () => {
      await registerPage.goto();
      await registerPage.fillForm(user);
      await registerPage.submit();
      accountExists = true;
    });

    await test.step("Проверяем: редирект на главную, пользователь авторизован", async () => {
      await expect(page).toHaveURL(/\/pomidorqa\/?$/);
      await expect(logoutButton(page)).toBeVisible();
    });
  });

  test("повторная регистрация с уже занятым email показывает ошибку", async ({ page }) => {
    accountExists = false;
    const registerPage = new RegisterPage(page);
    const user = makeUser("dup", Date.now());

    await test.step("Создаём первый аккаунт через API", async () => {
      await registerUserViaApi(page.context().request, user);
      accountExists = true;
    });

    await test.step("Пробуем зарегистрироваться с тем же email через форму", async () => {
      await registerPage.goto();
      await registerPage.fillForm({ ...user, name: `Повторно ${Date.now()}` });
      await registerPage.submit();
    });

    await test.step("Проверяем: форма показала ошибку и не зарегистрировала", async () => {
      await expect(registerPage.errorMessage).toBeVisible();
      await expect(page).toHaveURL(/\/pomidorqa\/auth\/register$/);
    });
  });
});
