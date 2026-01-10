import { Page, Locator } from '@playwright/test';

export class ProjectDetailPage {
  readonly page: Page;
  readonly projectTitle: Locator;
  readonly statusBadge: Locator;
  readonly tierBadge: Locator;
  readonly progressRing: Locator;
  readonly milestoneTimeline: Locator;
  readonly milestoneItems: Locator;
  readonly deliverablesTab: Locator;
  readonly deliverablesGrid: Locator;
  readonly deliverableCards: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.projectTitle = page.getByRole('heading', { level: 1 });
    this.statusBadge = page.locator('[data-testid="project-status"]');
    this.tierBadge = page.locator('[data-testid="project-tier"]');
    this.progressRing = page.locator('.progress-ring');
    this.milestoneTimeline = page.locator('.milestone-timeline');
    this.milestoneItems = page.locator('.milestone-item');
    this.deliverablesTab = page.getByRole('tab', { name: /deliverables/i });
    this.deliverablesGrid = page.locator('.deliverables-grid');
    this.deliverableCards = page.locator('.deliverable-card');
    this.backButton = page.getByRole('button', { name: /back/i });
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-testid="project-detail"]', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  async getProjectName(): Promise<string> {
    return (await this.projectTitle.textContent()) ?? '';
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) ?? '';
  }

  async getTier(): Promise<string> {
    return (await this.tierBadge.textContent()) ?? '';
  }

  async getMilestoneCount(): Promise<number> {
    return this.milestoneItems.count();
  }

  async getCompletedMilestoneCount(): Promise<number> {
    return this.milestoneItems.filter({ has: this.page.locator('[data-status="completed"]') }).count();
  }

  async clickDeliverablesTab() {
    await this.deliverablesTab.click();
  }

  async getDeliverableCount(): Promise<number> {
    return this.deliverableCards.count();
  }

  async downloadDeliverable(index: number = 0) {
    const downloadButton = this.deliverableCards.nth(index).getByRole('button', { name: /download/i });
    const downloadPromise = this.page.waitForEvent('download');
    await downloadButton.click();
    return downloadPromise;
  }

  async goBack() {
    await this.backButton.click();
  }
}
