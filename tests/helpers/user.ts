import {
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { RegisterPage } from "../pages/register-page";

export const ROUTES = {
  home: "/pomidorqa",
  profile: "/pomidorqa/profile",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export type RegisteredParticipant = {
  id: string;
  name: string;
  email: string;
};

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

// UI-регистрация: для тестов, которые проверяют саму форму регистрации.
export async function registerUser(page: Page, user: TestUser) {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  await registerPage.fillForm(user);
  await registerPage.submit();

  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

// API-регистрация: подготовка данных (arrange). Сессия садится в cookies
// контекста, поэтому страница из этого же контекста уже авторизована.
export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<RegisteredParticipant> {
  const response = await request.post("/api/pomidorqa/test/accounts", {
    data: user,
  });

  if (response.status() !== 201) {
    throw new Error(
      `Регистрация ${user.email} не удалась: ${response.status()} ${await response.text()}`,
    );
  }

  return (await response.json()) as RegisteredParticipant;
}

// API-удаление: сервер определяет аккаунт по session-cookie, поэтому удалять
// нужно тем же контекстом, которым регистрировали. Каскадно снимает навыки,
// свободные слоты и бронирования.
export async function deleteUserViaApi(request: APIRequestContext): Promise<void> {
  const response = await request.delete("/api/pomidorqa/test/accounts");

  if (response.status() !== 200) {
    throw new Error(
      `Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`,
    );
  }
}

// Очистка нескольких контекстов: удалить аккаунт и закрыть контекст.
// Отказоустойчиво: неудача одного DELETE (например, 401 при сбое сессии)
// не прерывает очистку остальных контекстов, а ошибка очистки пишется в лог
// и не маскирует настоящую причину падения теста.
export async function cleanupUsersViaApi(contexts: BrowserContext[]): Promise<void> {
  const errors: unknown[] = [];

  for (const context of contexts) {
    try {
      await deleteUserViaApi(context.request);
    } catch (error) {
      errors.push(error);
    }
    await context.close();
  }

  if (errors.length > 0) {
    console.error(
      `Очистка не удалась для ${errors.length} из ${contexts.length} контекстов:`,
      errors,
    );
  }
}
