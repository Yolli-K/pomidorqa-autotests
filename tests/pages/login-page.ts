import { type Locator, type Page } from "@playwright/test";

const LOGIN = "/pomidorqa/auth/login";

export class LoginPage {
  page: Page;

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Пароль");
    this.loginButton = page.getByRole("button", { name: "Войти" });
    this.errorMessage = page.getByText(/Неверный/);
  }

  async goto() {
    await this.page.goto(LOGIN);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
