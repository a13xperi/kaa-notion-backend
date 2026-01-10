import { test as base } from '@playwright/test';

type DatabaseFixtures = {
  testProject: {
    id: string;
    name: string;
    tier: number;
    status: string;
  };
  testClient: {
    id: string;
    email: string;
    tier: number;
  };
  cleanupAfterTest: () => Promise<void>;
};

export const test = base.extend<DatabaseFixtures>({
  testProject: async ({}, use) => {
    const project = {
      id: 'test-project-id',
      name: 'Test Project',
      tier: 2,
      status: 'IN_PROGRESS',
    };

    await use(project);
  },

  testClient: async ({}, use) => {
    const client = {
      id: 'test-client-id',
      email: 'testclient@example.com',
      tier: 2,
    };

    await use(client);
  },

  cleanupAfterTest: async ({}, use) => {
    const cleanup = async () => {
      const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
      try {
        await fetch(`${apiUrl}/api/test/cleanup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // Cleanup endpoint might not exist
      }
    };

    await use(cleanup);
  },
});

export { expect } from '@playwright/test';
