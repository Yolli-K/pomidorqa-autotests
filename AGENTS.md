# Правила для ИИ-агентов (PomidorQA)

Репозиторий автотестов марафона «Автоматизация на Playwright + TypeScript».
Продукт — живой сайт `https://aiqa.su/pomidorqa` (исходники закрыты), здесь только тесты.

## Источники истины

1. [CODEX.md](./CODEX.md) — обязательные правила написания и ревью автотестов. Читай перед любым изменением тестов. Если старый тест расходится с кодексом — следуй кодексу, не копируй нарушение.
2. [REVIEW.md](./REVIEW.md) — чеклист ревью по пунктам кодекса.
3. [CONTRIBUTING.md](./CONTRIBUTING.md) — процесс веток и PR.

Для задач «написать / исправить / расширить автотест» используй скил `ai-avtomatizator`.

## Карта проекта (фактическая)

```
src/pyramid/                      — вспомогательный код: slots.ts (чистые функции),
                                    mock-booking-api.ts (локальный мок-сервер для api)
tests/unit/slots.spec.ts          — unit: чистые функции без браузера
tests/api/booking-api.spec.ts     — api: HTTP к локальному мок-серверу (startServer)
tests/e2e/*.spec.ts               — e2e: браузер на живом aiqa.su
tests/helpers/user.ts             — пользователь: ROUTES, TestUser, RegisteredParticipant,
                                    makeUser(role, runId), registerUser (UI), registerUserViaApi,
                                    deleteUserViaApi, cleanupUsersViaApi
tests/pages/login-page.ts         — LoginPage: goto, login, errorMessage
tests/pages/register-page.ts      — RegisterPage: goto, fillForm, submit
tests/pages/profile-page.ts       — ProfilePage: open, reload, saveProfile (ждёт POST), addSkill
tests/pages/booking-page.ts       — BookingPage: каталог, слоты, календарь, модалка брони
```

## Служебные ручки тестовых аккаунтов (живой стенд)

`/api/pomidorqa/test/accounts` — принимает только тестовые email вида `@example.com`
(их и создаёт `makeUser`):

- **POST**, тело `{ name, email, password }` → `201`, возвращает `{ id, name, email }` и
  ставит session-cookie (контекст сразу авторизован);
- **DELETE**, без тела → `200`, удаляет текущий аккаунт каскадно (навыки, свободные слоты,
  бронирования). Сервер находит аккаунт по session-cookie, поэтому удалять нужно **тем же
  контекстом**, которым регистрировали; id и email передавать не нужно.

## Подготовка и очистка данных

- Пользователей для сценария создавай через `registerUserViaApi(context.request, user)` — это
  подготовка (arrange). Страница из того же контекста уже авторизована (при необходимости `goto`).
- `registerUser` (через UI) — только для тестов самой формы регистрации.
- Очистка гарантирована и обязательна:
  - контекст из fixture (`page`) → `test.afterEach` + `deleteUserViaApi(page.context().request)`;
  - контексты созданы внутри теста → `try/finally` + `cleanupUsersViaApi([...])`.
- Удаляй только через сессионную cookie своего контекста — никогда массовыми критериями: стенд общий.

## Команды

```bash
npm run test:unit   # unit
npm run test:api    # api (локальный мок-сервер)
npm run test:e2e    # e2e (живой стенд https://aiqa.su)
npm test            # все три уровня
npm run lint        # ESLint по tests/ — обязателен, ноль ошибок
npm run report      # HTML-отчёт последнего прогона
```

`POMIDORQA_BASE_URL` переопределяет адрес стенда для e2e (по умолчанию `https://aiqa.su`).

## Жёсткие правила

- E2E бьют в общий живой стенд: на каждый тест уникальные данные `makeUser(role, Date.now())`.
- Запрещено: `waitForTimeout`, `{ force: true }`, `page.pause()`, `test.only`, закомментированные тесты (см. eslint.config.mjs — CI это же и проверяет).
- Нельзя отключать ESLint-правила без явного запроса пользователя.
- Перед сдачей работы: `npm run lint` — ноль ошибок, изменённые тесты зелёные. Красный тест сначала чини сам.
- ДЗ-ветки: `hw<N>-<github-username>`, коммит `hw<N>: короткое описание на русском`; рефактор не по теме ДЗ — отдельной веткой/коммитом.
- Не переписывай чужой код «по пути»; увидел проблему не по теме — отметь отдельно.
- Отчёт о работе: перечисли изменённые файлы и фактически выполненные проверки. Если прогон не запускался или стенд был недоступен — скажи прямо, не утверждай, что тест готов.
