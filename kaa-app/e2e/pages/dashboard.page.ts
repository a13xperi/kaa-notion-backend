import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly greeting: Locator;
  readonly activeProjectsSection: Locator;
  readonly projectCards: Locator;
  readonly statsCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.locator('.dashboard-greeting h1');
    this.activeProjectsSection = page.locator('.dashboard-section').first();
    this.projectCards = page.locator('.project-card');
    this.statsCards = page.locator('.stat-card');
    this.emptyState = page.locator('[data-testid="empty-state"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async waitForLoad() {
    await this.page.waitForSelector('.project-dashboard', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  async getActiveProjectCount(): Promise<number> {
    return this.projectCards.count();
  }

  async clickProject(name: string) {
    await this.page.getByRole('button', { name: new RegExp(`view project.*${name}`, 'i') }).click();
  }

  async clickFirstProject() {
    await this.projectCards.first().click();
  }

  async getStatValue(label: string): Promise<string> {
    const card = this.statsCards.filter({ hasText: label });
    return (await card.locator('.stat-value').textContent()) ?? '';
  }

  async hasProjects(): Promise<boolean> {
    const count = await this.projectCards.count();
    return count > 0;
  }

  async getGreeting(): Promise<string> {
    return (await this.greeting.textContent()) ?? '';
  }
}
