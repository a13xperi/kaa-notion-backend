/**
 * Notion API Client for the frontend.
 * 
 * This client handles all communication with the backend Notion API server.
 * It provides methods to fetch pages, page content, and databases from your
 * Notion workspace.
 * 
 * @module notionApi
 * @example
 * ```typescript
 * import { notionApi } from './api/notionApi';
 * 
 * // Fetch all pages
 * const pages = await notionApi.getAllPages();
 * 
 * // Fetch filtered pages
 * const rootPages = await notionApi.getAllPages('root');
 * 
 * // Fetch page content
 * const content = await notionApi.getPageContent(pageId);
 * ```
 */

import {
  NotionPage,
  PageContent,
  NotionDatabase,
  FilterType
} from '../types/notion.types';

/** Base URL for the backend API server */
import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Log the API URL on initialization for debugging
logger.log('[NotionAPI] Using API_BASE_URL:', API_BASE_URL);

/**
 * NotionApi class handles all Notion API operations.
 * Singleton instance is exported as `notionApi`.
 * 
 * @class NotionApi
 */
class NotionApi {
  /**
   * Makes an HTTP request to the backend API.
   * 
   * @private
   * @param {string} endpoint - API endpoint path
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<any>} JSON response data
   * @throws {Error} If the request fails
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    logger.log('[NotionAPI] Making request to:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      logger.log('[NotionAPI] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.log('[NotionAPI] Response data received, items:', Array.isArray(data) ? data.length : 'N/A');
      return data;
    } catch (error) {
      logger.error('[NotionAPI] Request failed:', error);
      logger.error('[NotionAPI] URL was:', url);
      throw error;
    }
  }

  /**
   * Fetches all pages from the Notion workspace.
   * 
   * @param {FilterType} filterType - Optional filter ('all' | 'root' | 'workspace')
   *   - 'all': Returns all pages across all spaces
   *   - 'root': Returns only top-level pages (default in UI)
   *   - 'workspace': Returns only private workspace pages
   * @returns {Promise<NotionPage[]>} Array of Notion pages
   * @throws {Error} If the API request fails
   * 
   * @example
   * ```typescript
   * // Get all pages
   * const allPages = await notionApi.getAllPages();
   * 
   * // Get only root pages
   * const rootPages = await notionApi.getAllPages('root');
   * ```
   */
  async getAllPages(filterType?: FilterType): Promise<NotionPage[]> {
    const params = filterType ? `?filterType=${filterType}` : '';
    return this.makeRequest(`/api/notion/pages${params}`);
  }

  /**
   * Fetches detailed content for a specific page.
   * 
   * Includes:
   * - Page metadata (title, properties, timestamps)
   * - Page blocks (paragraphs, headings, lists, code, etc.)
   * - Property values
   * 
   * @param {string} pageId - UUID of the page to fetch
   * @returns {Promise<PageContent>} Page content including metadata and blocks
   * @throws {Error} If the page doesn't exist or request fails
   * 
   * @example
   * ```typescript
   * const content = await notionApi.getPageContent('550e8400-e29b-41d4-a716-446655440000');
   * console.log(content.page.title); // "My Page Title"
   * console.log(content.blocks.length); // Number of content blocks
   * ```
   */
  async getPageContent(pageId: string): Promise<PageContent> {
    return this.makeRequest(`/api/notion/pages/${pageId}`);
  }

  /**
   * Fetches all databases in the Notion workspace.
   * 
   * Databases are collections of pages with structured properties.
   * This method returns database metadata including schemas.
   * 
   * @returns {Promise<NotionDatabase[]>} Array of Notion databases
   * @throws {Error} If the API request fails
   * 
   * @example
   * ```typescript
   * const databases = await notionApi.getAllDatabases();
   * databases.forEach(db => {
   *   console.log(db.title?.[0]?.plain_text); // Database name
   * });
   * ```
   */
  async getAllDatabases(): Promise<NotionDatabase[]> {
    return this.makeRequest('/api/notion/databases');
  }
}

/**
 * Singleton instance of the Notion API client.
 * Use this instance for all API operations.
 * 
 * @constant {NotionApi}
 * @example
 * ```typescript
 * import { notionApi } from './api/notionApi';
 * const pages = await notionApi.getAllPages();
 * ```
 */
export const notionApi = new NotionApi();
export default notionApi;

// Re-export types for convenience
export type {
  NotionPage,
  NotionBlock,
  PageContent,
  NotionDatabase,
  FilterType,
  ViewMode,
  SortOrder,
  NotionPropertyValue,
  NotionRichText,
  PageHierarchy
} from '../types/notion.types';
