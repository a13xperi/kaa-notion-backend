import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.submitButton = page.getByRole('button', { name: /sign in|log in/i });
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.registerLink = page.getByRole('link', { name: /register|sign up/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForRedirect(urlPattern: RegExp) {
    await this.page.waitForURL(urlPattern, { timeout: 10000 });
  }

  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? '';
  }

  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }
}
