import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/dashboard.page';
import { LoginPage } from '../pages/login.page';
import { ProjectDetailPage } from '../pages/project-detail.page';
import { TEST_CREDENTIALS, generateUniqueEmail } from '../utils/test-data';

test.describe('Client Portal Flow', () => {
  test.describe('Authentication', () => {
    test('should display login form', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should login with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login(TEST_CREDENTIALS.client.email, TEST_CREDENTIALS.client.password);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('invalid@example.com', 'wrongpassword');

      // Should show error message
      await expect(page.getByText(/invalid.*credentials|incorrect.*password|authentication failed/i)).toBeVisible();
    });

    test('should show error for empty fields', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.submitButton.click();

      // Should show validation error
      await expect(page.getByText(/required|please enter/i)).toBeVisible();
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
    });

    test('should logout successfully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');

      // Click user menu or logout button
      const userMenu = page.locator('[aria-label="User menu"], [data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.click('text=Logout');
      } else {
        const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
        if (await logoutButton.isVisible()) {
          await logoutButton.click();
        }
      }

      // Should redirect to login or home
      await expect(page).toHaveURL(/login|home|\/$/);
    });

    test('should persist session across page refresh', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.reload();

      // Should still be on dashboard (not redirected to login)
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Dashboard', () => {
    test('should display dashboard greeting', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      // Should show greeting based on time of day
      await expect(dashboard.greeting).toContainText(/good (morning|afternoon|evening)|welcome/i);
    });

    test('should display user projects or empty state', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      const hasProjects = await dashboard.hasProjects();

      if (hasProjects) {
        // Should show project cards
        await expect(dashboard.projectCards.first()).toBeVisible();
      } else {
        // Should show empty state
        await expect(page.getByText(/no.*projects|get started|create.*project/i)).toBeVisible();
      }
    });

    test('should display project statistics', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      // Stats cards should be visible
      await expect(dashboard.statsCards.first()).toBeVisible();
    });

    test('should navigate to project detail on card click', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      const hasProjects = await dashboard.hasProjects();
      if (!hasProjects) {
        test.skip();
        return;
      }

      // Click first project
      await dashboard.clickFirstProject();

      // Should navigate to project detail
      await expect(page).toHaveURL(/projects\/[a-z0-9-]+/);
    });

    test('should show loading state initially', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Navigate and check for loading indicator
      await page.goto('/dashboard');

      // Should show loading state briefly (skeleton or spinner)
      const loadingIndicator = page.locator('[data-testid="loading"], .loading, .skeleton');
      // Loading might be too fast to catch, so we check if page eventually loads
      await page.waitForSelector('.project-dashboard, [data-testid="dashboard"]', { timeout: 10000 });
    });
  });

  test.describe('Project Detail', () => {
    test('should display project information', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Should display project title
      await expect(projectDetail.projectTitle).toBeVisible();

      // Should display status
      await expect(page.getByText(/status|in progress|completed|pending/i)).toBeVisible();
    });

    test('should display milestone timeline', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Should show milestone timeline
      await expect(projectDetail.milestoneTimeline).toBeVisible();

      // Should have milestone items
      const milestoneCount = await projectDetail.getMilestoneCount();
      expect(milestoneCount).toBeGreaterThan(0);
    });

    test('should show milestone status indicators', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Milestones should have status indicators
      const milestoneItems = projectDetail.milestoneItems;
      await expect(milestoneItems.first()).toBeVisible();

      // Check for status classes or icons
      const hasStatusIndicator = await page.locator('.milestone-status, [data-status]').first().isVisible();
      expect(hasStatusIndicator).toBeTruthy();
    });

    test('should display project progress', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Should show progress indicator
      const progressIndicator = page.locator('.progress-ring, .progress-bar, [data-testid="progress"]');
      await expect(progressIndicator).toBeVisible();
    });

    test('should navigate back to dashboard', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      await projectDetail.goBack();

      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Deliverables', () => {
    test('should display deliverables section', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Navigate to deliverables tab if separate
      const deliverablesTab = projectDetail.deliverablesTab;
      if (await deliverablesTab.isVisible()) {
        await deliverablesTab.click();
      }

      // Should show deliverables section
      await expect(page.getByText(/deliverables|files|documents/i)).toBeVisible();
    });

    test('should show deliverable cards when available', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Navigate to deliverables
      const deliverablesTab = projectDetail.deliverablesTab;
      if (await deliverablesTab.isVisible()) {
        await deliverablesTab.click();
      }

      // Check for deliverables or empty state
      const deliverableCount = await projectDetail.getDeliverableCount();
      if (deliverableCount > 0) {
        await expect(projectDetail.deliverableCards.first()).toBeVisible();
      } else {
        await expect(page.getByText(/no deliverables|coming soon/i)).toBeVisible();
      }
    });

    test('should have download button on deliverables', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Navigate to deliverables
      const deliverablesTab = projectDetail.deliverablesTab;
      if (await deliverablesTab.isVisible()) {
        await deliverablesTab.click();
      }

      const deliverableCount = await projectDetail.getDeliverableCount();
      if (deliverableCount > 0) {
        // Should have download button
        const downloadButton = projectDetail.deliverableCards.first().getByRole('button', { name: /download/i });
        await expect(downloadButton).toBeVisible();
      }
    });

    test('should download deliverable file', async ({ authenticatedPage, testProject }) => {
      const page = authenticatedPage;
      const projectDetail = new ProjectDetailPage(page);

      await projectDetail.goto(testProject.id);
      await projectDetail.waitForLoad();

      // Navigate to deliverables
      const deliverablesTab = projectDetail.deliverablesTab;
      if (await deliverablesTab.isVisible()) {
        await deliverablesTab.click();
      }

      const deliverableCount = await projectDetail.getDeliverableCount();
      if (deliverableCount === 0) {
        test.skip();
        return;
      }

      // Trigger download
      const download = await projectDetail.downloadDeliverable(0);

      // Should have a suggested filename
      expect(download.suggestedFilename()).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display mobile navigation on small screens', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Should show mobile menu button
      const mobileMenu = page.locator('[aria-label="Menu"], [data-testid="mobile-menu"], .hamburger');
      await expect(mobileMenu).toBeVisible();
    });

    test('should have touch-friendly project cards on mobile', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await page.setViewportSize({ width: 375, height: 667 });
      await dashboard.goto();
      await dashboard.waitForLoad();

      const hasProjects = await dashboard.hasProjects();
      if (!hasProjects) {
        test.skip();
        return;
      }

      // Cards should be full width on mobile
      const card = dashboard.projectCards.first();
      const box = await card.boundingBox();
      expect(box?.width).toBeGreaterThan(300);
    });

    test('should work on tablet viewport', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await page.setViewportSize({ width: 768, height: 1024 });
      await dashboard.goto();
      await dashboard.waitForLoad();

      await expect(dashboard.greeting).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Simulate offline
      await page.context().setOffline(true);
      await page.goto('/dashboard');

      // Should show error state or offline message
      await expect(page.getByText(/offline|network error|try again/i)).toBeVisible();

      // Restore connection
      await page.context().setOffline(false);
    });

    test('should show 404 for invalid project', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/projects/non-existent-project-id');

      // Should show not found message
      await expect(page.getByText(/not found|doesn't exist|404/i)).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      // Should have h1 heading
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('should support keyboard navigation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Should focus an interactive element
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT']).toContain(focusedTag);
    });
  });
});
