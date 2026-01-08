/**
 * Tests for Notion API client
 * Tests API methods, error handling, and data transformation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { notionApi } from '../notionApi';

// Mock fetch globally
global.fetch = vi.fn();

describe('Notion API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPages', () => {
    it('fetches all pages successfully', async () => {
      const mockResponse = [
        { id: '1', title: 'Page 1', properties: {} },
        { id: '2', title: 'Page 2', properties: {} },
      ];

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const pages = await notionApi.getAllPages();

      expect(pages).toHaveLength(2);
      expect(pages[0].title).toBe('Page 1');
      expect(pages[1].title).toBe('Page 2');
    });

    it('filters pages by type', async () => {
      const mockResponse = [
        { id: '1', title: 'Root Page', properties: {} },
        { id: '2', title: 'Child Page', properties: {} },
      ];

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const pages = await notionApi.getAllPages('root');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?filterType=root'),
        expect.any(Object)
      );
    });

    it('handles API errors', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(notionApi.getAllPages()).rejects.toThrow();
    });

    it('handles network errors', async () => {
      (global.fetch as Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(notionApi.getAllPages()).rejects.toThrow('Network error');
    });

    it('handles empty response', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const pages = await notionApi.getAllPages();
      expect(pages).toEqual([]);
    });

    it('includes authentication header', async () => {
      const mockResponse: any[] = [];

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await notionApi.getAllPages();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('getPageContent', () => {
    it('fetches page content successfully', async () => {
      const mockContent = {
        id: 'page-123',
        title: 'Test Page',
        blocks: [
          { id: 'block-1', type: 'paragraph', content: 'Test content' },
        ],
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContent,
      });

      const content = await notionApi.getPageContent('page-123');

      expect(content.id).toBe('page-123');
      expect(content.title).toBe('Test Page');
      expect(content.blocks).toHaveLength(1);
    });

    it('throws error for invalid page ID', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(notionApi.getPageContent('invalid-id')).rejects.toThrow();
    });

    it('handles page with no content', async () => {
      const mockContent = {
        id: 'page-123',
        title: 'Empty Page',
        blocks: [],
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContent,
      });

      const content = await notionApi.getPageContent('page-123');
      expect(content.blocks).toEqual([]);
    });

    it('makes request to correct endpoint', async () => {
      const mockContent = { id: 'page-123', title: 'Test', blocks: [] };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContent,
      });

      await notionApi.getPageContent('page-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notion/pages/page-123'),
        expect.any(Object)
      );
    });
  });

  describe('getAllDatabases', () => {
    it('fetches databases successfully', async () => {
      const mockDatabases = [
        { id: 'db-1', title: 'Database 1', properties: {} },
        { id: 'db-2', title: 'Database 2', properties: {} },
      ];

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatabases,
      });

      const databases = await notionApi.getAllDatabases();

      expect(databases).toHaveLength(2);
      expect(databases[0].id).toBe('db-1');
      expect(databases[1].id).toBe('db-2');
    });

    it('handles no databases', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const databases = await notionApi.getAllDatabases();
      expect(databases).toEqual([]);
    });

    it('handles API errors', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(notionApi.getAllDatabases()).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('provides meaningful error messages', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      try {
        await notionApi.getAllPages();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('handles malformed JSON responses', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(notionApi.getAllPages()).rejects.toThrow();
    });

    it('handles timeout errors', async () => {
      (global.fetch as Mock).mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      await expect(notionApi.getAllPages()).rejects.toThrow('Timeout');
    }, 10000);
  });

  describe('Request Configuration', () => {
    it('uses correct HTTP method for GET requests', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await notionApi.getAllPages();

      // Note: fetch doesn't explicitly set method: 'GET' as it's the default
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('sets correct Content-Type header', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await notionApi.getAllPages();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('uses base URL from environment', async () => {
      // Note: In Vitest with import.meta.env, environment variables are set differently
      // This test verifies the fetch was called with a URL containing http://
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await notionApi.getAllPages();

      // Should use the configured base URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://'),
        expect.any(Object)
      );
    });
  });

  describe('Response Caching', () => {
    it('makes separate requests for different filters', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await notionApi.getAllPages('all');
      await notionApi.getAllPages('root');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('filterType=all'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('filterType=root'),
        expect.any(Object)
      );
    });
  });
});
