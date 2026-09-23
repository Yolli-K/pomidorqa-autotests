import { type Locator, type Page } from "@playwright/test";
import { type TestUser } from "../helpers/user";

const REGISTER = "/pomidorqa/auth/register";

export class RegisterPage {
  page: Page;

  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel("Имя");
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Пароль");
    this.registerButton = page.getByRole("button", { name: "Зарегистрироваться" });
    this.errorMessage = page.getByRole("alert").filter({ hasText: "уже зарегистрирован" });
  }

  async goto() {
    await this.page.goto(REGISTER);
  }

  async fillForm(user: TestUser) {
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
  }

  async submit() {
    await this.registerButton.click();
  }
}
