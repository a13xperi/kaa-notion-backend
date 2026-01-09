import posthog from 'posthog-js';

// PostHog configuration
const POSTHOG_API_KEY = process.env.REACT_APP_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://app.posthog.com';

// Only initialize in production mode
const isProduction = process.env.NODE_ENV === 'production';

let isInitialized = false;

/**
 * Initialize PostHog analytics
 * Only runs in production mode with a valid API key
 */
export const initPostHog = (): void => {
  if (isInitialized) {
    return;
  }

  if (!isProduction) {
    console.log('[PostHog] Skipping initialization - not in production mode');
    return;
  }

  if (!POSTHOG_API_KEY) {
    console.warn('[PostHog] API key not found. Set REACT_APP_POSTHOG_API_KEY environment variable.');
    return;
  }

  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',
    loaded: (posthog) => {
      // Optionally disable in development even if accidentally initialized
      if (!isProduction) {
        posthog.opt_out_capturing();
      }
    },
  });

  isInitialized = true;
  console.log('[PostHog] Analytics initialized');
};

/**
 * Identify a user after login
 * @param userId - Unique identifier for the user
 * @param properties - Additional user properties
 */
export const identifyUser = (
  userId: string,
  properties?: Record<string, string | number | boolean>
): void => {
  if (!isProduction || !isInitialized) {
    return;
  }

  posthog.identify(userId, properties);
};

/**
 * Track a custom event
 * @param eventName - Name of the event
 * @param properties - Additional event properties
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
): void => {
  if (!isProduction || !isInitialized) {
    return;
  }

  posthog.capture(eventName, properties);
};

/**
 * Track a page view (useful for single-page app navigation)
 * @param pageName - Name of the page
 * @param properties - Additional page properties
 */
export const trackPageView = (
  pageName?: string,
  properties?: Record<string, string | number | boolean>
): void => {
  if (!isProduction || !isInitialized) {
    return;
  }

  posthog.capture('$pageview', {
    $current_url: window.location.href,
    page_name: pageName,
    ...properties,
  });
};

/**
 * Reset user identity (call on logout)
 */
export const resetUser = (): void => {
  if (!isProduction || !isInitialized) {
    return;
  }

  posthog.reset();
};

/**
 * Set user properties without identifying
 * @param properties - User properties to set
 */
export const setUserProperties = (
  properties: Record<string, string | number | boolean>
): void => {
  if (!isProduction || !isInitialized) {
    return;
  }

  posthog.people.set(properties);
};

export default posthog;
