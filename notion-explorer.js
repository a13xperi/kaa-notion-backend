const NotionClient = require('./notion-client');
require('dotenv').config();

class NotionExplorer {
  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      console.error('Please set NOTION_API_KEY in your .env file');
      process.exit(1);
    }
    this.client = new NotionClient(apiKey);
  }

  // Display all pages in a tree structure
  async displayPageTree() {
    console.log('🌳 Notion Page Tree\n');
    
    const pages = await this.client.getAllPages();
    const hierarchy = await this.client.getPageHierarchy();
    
    // Find root pages (pages without parents)
    const rootPages = pages.filter(page => 
      !page.parent || page.parent.type !== 'page_id'
    );
    
    for (const rootPage of rootPages) {
      await this.displayPageNode(rootPage, hierarchy, 0);
    }
  }

  async displayPageNode(page, hierarchy, depth) {
    const indent = '  '.repeat(depth);
    const title = this.getPageTitle(page);
    const emoji = this.getPageEmoji(page);
    
    console.log(`${indent}${emoji} ${title}`);
    
    // Display children
    const children = hierarchy[page.id] || [];
    for (const child of children) {
      await this.displayPageNode(child, hierarchy, depth + 1);
    }
  }

  // Search and display results
  async searchAndDisplay(query) {
    console.log(`🔍 Searching for: "${query}"\n`);
    
    const results = await this.client.searchPages(query);
    
    if (results.length === 0) {
      console.log('No pages found.');
      return;
    }
    
    results.forEach((page, index) => {
      const title = this.getPageTitle(page);
      const emoji = this.getPageEmoji(page);
      console.log(`${index + 1}. ${emoji} ${title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   URL: ${page.url}\n`);
    });
  }

  // Display page content
  async displayPageContent(pageId) {
    console.log(`📄 Page Content\n`);
    
    const content = await this.client.getPageContent(pageId);
    if (!content) {
      console.log('Page not found or access denied.');
      return;
    }
    
    const { page, blocks } = content;
    const title = this.getPageTitle(page);
    const emoji = this.getPageEmoji(page);
    
    console.log(`${emoji} ${title}\n`);
    console.log(`ID: ${page.id}`);
    console.log(`URL: ${page.url}\n`);
    
    console.log('Content:');
    blocks.forEach(block => {
      console.log(this.formatBlock(block));
    });
  }

  // Helper methods
  getPageTitle(page) {
    if (page.properties.title && page.properties.title.title) {
      return page.properties.title.title[0]?.plain_text || 'Untitled';
    }
    return 'Untitled';
  }

  getPageEmoji(page) {
    return page.icon?.emoji || '📄';
  }

  formatBlock(block) {
    switch (block.type) {
      case 'paragraph':
        return block.paragraph.rich_text.map(text => text.plain_text).join('');
      case 'heading_1':
        return `# ${block.heading_1.rich_text.map(text => text.plain_text).join('')}`;
      case 'heading_2':
        return `## ${block.heading_2.rich_text.map(text => text.plain_text).join('')}`;
      case 'heading_3':
        return `### ${block.heading_3.rich_text.map(text => text.plain_text).join('')}`;
      case 'bulleted_list_item':
        return `• ${block.bulleted_list_item.rich_text.map(text => text.plain_text).join('')}`;
      case 'numbered_list_item':
        return `1. ${block.numbered_list_item.rich_text.map(text => text.plain_text).join('')}`;
      case 'code':
        return `\`\`\`${block.code.language}\n${block.code.rich_text.map(text => text.plain_text).join('')}\n\`\`\``;
      default:
        return `[${block.type}]`;
    }
  }
}

// CLI interface
async function main() {
  const explorer = new NotionExplorer();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'tree':
      await explorer.displayPageTree();
      break;
    case 'search':
      if (!arg) {
        console.log('Usage: node notion-explorer.js search "query"');
        return;
      }
      await explorer.searchAndDisplay(arg);
      break;
    case 'page':
      if (!arg) {
        console.log('Usage: node notion-explorer.js page <page-id>');
        return;
      }
      await explorer.displayPageContent(arg);
      break;
    default:
      console.log('Notion Explorer Commands:');
      console.log('  tree                    - Display all pages in tree structure');
      console.log('  search "query"          - Search pages by title');
      console.log('  page <page-id>          - Display page content');
      console.log('\nExample:');
      console.log('  node notion-explorer.js tree');
      console.log('  node notion-explorer.js search "project"');
      console.log('  node notion-explorer.js page 12345678-1234-1234-1234-123456789abc');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = NotionExplorer;
