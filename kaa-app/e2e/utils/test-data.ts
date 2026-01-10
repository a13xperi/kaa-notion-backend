/**
 * Test data generators for E2E tests
 */

export function generateLeadData() {
  const timestamp = Date.now();
  return {
    email: `lead-${timestamp}@test.com`,
    name: `Test User ${timestamp}`,
    address: `${Math.floor(Math.random() * 9999)} Main St, Test City, TS 12345`,
    budget: '$5,000 - $15,000',
    timeline: '1-2 months',
    projectType: 'Standard Renovation',
    hasSurvey: false,
    hasDrawings: false,
  };
}

export function generateUserData() {
  const timestamp = Date.now();
  return {
    email: `user-${timestamp}@test.com`,
    password: 'TestPassword123!',
    name: `Test User ${timestamp}`,
  };
}

export const TIER_TEST_DATA = {
  tier1: {
    budget: 'Under $500',
    timeline: 'As soon as possible',
    projectType: 'Simple Consultation',
  },
  tier2: {
    budget: '$2,000 - $5,000',
    timeline: '2-4 weeks',
    projectType: 'Small Renovation',
  },
  tier3: {
    budget: '$15,000 - $50,000',
    timeline: '2-4 months',
    projectType: 'Standard Renovation',
  },
  tier4: {
    budget: '$50,000+',
    timeline: '4+ months',
    projectType: 'New Build',
  },
} as const;

export const TEST_CREDENTIALS = {
  client: {
    email: 'testclient@example.com',
    password: 'TestPassword123!',
  },
  admin: {
    email: 'admin@test.com',
    password: 'AdminTestPass123!',
  },
} as const;

export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

export function generateAddress(): string {
  const streetNumber = Math.floor(Math.random() * 9999) + 1;
  const streets = ['Main St', 'Oak Ave', 'Elm St', 'Park Blvd', 'Cedar Ln'];
  const cities = ['Springfield', 'Riverside', 'Oakville', 'Maplewood', 'Greendale'];
  const states = ['CA', 'TX', 'FL', 'NY', 'IL'];

  const street = streets[Math.floor(Math.random() * streets.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const zip = Math.floor(Math.random() * 90000) + 10000;

  return `${streetNumber} ${street}, ${city}, ${state} ${zip}`;
}
