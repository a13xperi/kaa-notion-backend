/**
 * Notion Helper Utilities
 * Utility functions for working with Notion API responses.
 */

import type { PageObjectResponse, PartialPageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

/**
 * Extract page title from a Notion page object
 */
export function getPageTitle(
  page: PageObjectResponse | PartialPageObjectResponse
): string {
  // Check if it's a PageObjectResponse (has properties) or PartialPageObjectResponse
  if ('properties' in page && page.properties) {
    const props = page.properties;
    
    // Find the title property (usually the first property of type 'title')
    const titleProp = Object.values(props).find((prop: any) => {
      return prop && typeof prop === 'object' && 'type' in prop && prop.type === 'title';
    }) as { type: 'title'; title: Array<{ plain_text?: string }> } | undefined;
    
    if (titleProp && titleProp.type === 'title' && titleProp.title && Array.isArray(titleProp.title)) {
      if (titleProp.title.length > 0 && titleProp.title[0]) {
        return titleProp.title[0]?.plain_text || 'Untitled';
      }
    }
  }
  
  return 'Untitled';
}

/**
 * Map Notion status select value to Postgres project status
 */
export function mapNotionStatusToPostgres(notionStatus: string | null): string | null {
  if (!notionStatus) return null;
  
  const statusMap: Record<string, string> = {
    'ONBOARDING': 'ONBOARDING',
    'IN_PROGRESS': 'IN_PROGRESS',
    'AWAITING_FEEDBACK': 'AWAITING_FEEDBACK',
    'REVISIONS': 'REVISIONS',
    'DELIVERED': 'DELIVERED',
    'CLOSED': 'CLOSED',
  };
  
  return statusMap[notionStatus] || null;
}
