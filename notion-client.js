const { Client } = require('@notionhq/client');

class NotionClient {
  constructor(apiKey) {
    this.notion = new Client({ auth: apiKey });
  }

  // Get all pages from your workspace
  async getAllPages() {
    try {
      const response = await this.notion.search({
        query: '',
        filter: {
          property: 'object',
          value: 'page'
        }
      });
      return response.results;
    } catch (error) {
      console.error('Error fetching pages:', error);
      return [];
    }
  }

  // Get page content by ID
  async getPageContent(pageId) {
    try {
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      const blocks = await this.notion.blocks.children.list({ block_id: pageId });
      return {
        page,
        blocks: blocks.results
      };
    } catch (error) {
      console.error('Error fetching page content:', error);
      return null;
    }
  }

  // Get all databases
  async getAllDatabases() {
    try {
      const response = await this.notion.search({
        query: '',
        filter: {
          property: 'object',
          value: 'database'
        }
      });
      return response.results;
    } catch (error) {
      console.error('Error fetching databases:', error);
      return [];
    }
  }

  // Search pages by title
  async searchPages(query) {
    try {
      const response = await this.notion.search({
        query: query,
        filter: {
          property: 'object',
          value: 'page'
        }
      });
      return response.results;
    } catch (error) {
      console.error('Error searching pages:', error);
      return [];
    }
  }

  // Get page hierarchy (parent-child relationships)
  async getPageHierarchy() {
    try {
      const pages = await this.getAllPages();
      const hierarchy = {};
      
      for (const page of pages) {
        if (page.parent && page.parent.type === 'page_id') {
          const parentId = page.parent.page_id;
          if (!hierarchy[parentId]) {
            hierarchy[parentId] = [];
          }
          hierarchy[parentId].push(page);
        }
      }
      
      return hierarchy;
    } catch (error) {
      console.error('Error building hierarchy:', error);
      return {};
    }
  }
}

module.exports = NotionClient;
