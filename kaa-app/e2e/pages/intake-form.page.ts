import { Page, Locator } from '@playwright/test';

export class IntakeFormPage {
  readonly page: Page;

  // Step 1 elements
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly addressInput: Locator;

  // Navigation
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;

  // Progress
  readonly progressBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email address/i);
    this.nameInput = page.getByLabel(/your name/i);
    this.addressInput = page.getByLabel(/project address/i);
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.backButton = page.getByRole('button', { name: /back/i });
    this.submitButton = page.getByRole('button', { name: /get my recommendation/i });
    this.progressBar = page.locator('.intake-progress-fill');
  }

  async goto() {
    await this.page.goto('/intake');
  }

  async fillStep1(data: { email: string; name?: string; address: string }) {
    await this.emailInput.fill(data.email);
    if (data.name) await this.nameInput.fill(data.name);
    await this.addressInput.fill(data.address);
  }

  async selectBudget(value: string) {
    await this.page.getByLabel(new RegExp(value, 'i')).click();
  }

  async selectTimeline(value: string) {
    await this.page.getByLabel(new RegExp(value, 'i')).click();
  }

  async selectProjectType(value: string) {
    await this.page.getByLabel(new RegExp(value, 'i')).click();
  }

  async toggleSurvey(checked: boolean) {
    const checkbox = this.page.getByRole('checkbox', { name: /property survey/i });
    if (checked) await checkbox.check();
    else await checkbox.uncheck();
  }

  async toggleDrawings(checked: boolean) {
    const checkbox = this.page.getByRole('checkbox', { name: /drawings/i });
    if (checked) await checkbox.check();
    else await checkbox.uncheck();
  }

  async completeAllSteps(data: {
    email: string;
    name?: string;
    address: string;
    budget: string;
    timeline: string;
    projectType: string;
    hasSurvey?: boolean;
    hasDrawings?: boolean;
  }) {
    // Step 1: Contact info
    await this.fillStep1({ email: data.email, name: data.name, address: data.address });
    await this.continueButton.click();

    // Step 2: Budget
    await this.selectBudget(data.budget);
    await this.continueButton.click();

    // Step 3: Timeline
    await this.selectTimeline(data.timeline);
    await this.continueButton.click();

    // Step 4: Project type and assets
    await this.selectProjectType(data.projectType);
    if (data.hasSurvey) await this.toggleSurvey(true);
    if (data.hasDrawings) await this.toggleDrawings(true);
    await this.continueButton.click();

    // Now on Step 5 (Review)
  }

  async submit() {
    await this.submitButton.click();
  }

  async getProgress(): Promise<number> {
    const style = await this.progressBar.getAttribute('style');
    const match = style?.match(/width:\s*(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  async waitForTierRecommendation() {
    await this.page.waitForSelector('[data-testid="tier-recommendation"]', { timeout: 10000 });
  }

  async getRecommendedTier(): Promise<number | null> {
    const tierElement = this.page.locator('[data-testid="recommended-tier"]');
    const text = await tierElement.textContent();
    const match = text?.match(/tier\s*(\d)/i);
    return match ? parseInt(match[1]) : null;
  }
}
