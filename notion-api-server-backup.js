const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Helper function to extract page title
function getPageTitle(page) {
  // Find the title property (it might not be named "title")
  const titleProp = Object.values(page.properties).find(prop => prop.type === 'title');
  
  if (titleProp && titleProp.title && titleProp.title.length > 0) {
    return titleProp.title[0]?.plain_text || 'Untitled';
  }
  
  return 'Untitled';
}

// Helper function to get page emoji
function getPageEmoji(page) {
  return page.icon?.emoji || '📄';
}

// API Routes

// Get all pages (with optional workspace filter)
app.get('/api/notion/pages', async (req, res) => {
  try {
    if (!process.env.NOTION_API_KEY) {
      return res.status(500).json({ 
        error: 'Notion API key not configured. Please set NOTION_API_KEY in your .env file.' 
      });
    }

    const { workspace, filterType } = req.query;

    const response = await notion.search({
      query: '',
      filter: {
        property: 'object',
        value: 'page'
      }
    });

    // Fetch database names and teamspace info
    const databaseCache = new Map();
    const teamspaceCache = new Map();
    
    const pages = await Promise.all(response.results.map(async (page) => {
      let databaseName = null;
      let teamspaceName = null;
      
      // If page is in a database, fetch the database info
      // Handle both database_id and data_source_id (data_source_id is often the same as database_id)
      const dbId = page.parent?.database_id || page.parent?.data_source_id;
      if ((page.parent?.type === 'database_id' || page.parent?.type === 'data_source_id') && dbId) {
        if (!databaseCache.has(dbId)) {
          try {
            const database = await notion.databases.retrieve({ database_id: dbId });
            const dbTitle = database.title?.[0]?.plain_text || 'Untitled Database';
            
            // Get teamspace/workspace info
            let teamspace = 'Private Workspace';
            if (database.parent?.type === 'page_id') {
              // Database is in a teamspace (teamspaces are special pages)
              const teamspaceId = database.parent.page_id;
              if (!teamspaceCache.has(teamspaceId)) {
                try {
                  const teamspacePage = await notion.pages.retrieve({ page_id: teamspaceId });
                  const teamspaceTitle = getPageTitle(teamspacePage);
                  teamspaceCache.set(teamspaceId, teamspaceTitle);
                } catch (err) {
                  console.error(`Failed to fetch teamspace ${teamspaceId}:`, err.message);
                  teamspaceCache.set(teamspaceId, 'Unknown Space');
                }
              }
              teamspace = teamspaceCache.get(teamspaceId);
            } else if (database.parent?.type === 'workspace') {
              teamspace = 'Private Workspace';
            }
            
            databaseCache.set(dbId, { name: dbTitle, teamspace: teamspace });
          } catch (err) {
            console.error(`Failed to fetch database ${dbId}:`, err.message);
            databaseCache.set(dbId, { name: null, teamspace: null });
          }
        }
        
        const dbInfo = databaseCache.get(dbId);
        databaseName = dbInfo?.name;
        teamspaceName = dbInfo?.teamspace;
      }
      
      return {
        id: page.id,
        title: getPageTitle(page),
        emoji: getPageEmoji(page),
        url: page.url,
        parent: page.parent,
        properties: page.properties,
        last_edited_time: page.last_edited_time,
        databaseName: databaseName,
        teamspaceName: teamspaceName,
        // Add detailed parent info for filtering
        parentType: page.parent?.type || 'none',
        parentId: page.parent?.workspace ? 'workspace' : 
                  page.parent?.page_id || 
                  page.parent?.database_id || 
                  page.parent?.data_source_id ||
                  page.parent?.block_id || null
      };
    }));

    // Filter based on filterType parameter
    let filteredPages = pages;
    if (filterType === 'workspace') {
      // Only workspace-level pages (private pages)
      filteredPages = pages.filter(page => page.parent && page.parent.type === 'workspace');
    } else if (filterType === 'root') {
      // Only root-level pages (not children of other pages)
      filteredPages = pages.filter(page => !page.parent || page.parent.type !== 'page_id');
    } else if (workspace) {
      // Legacy filter for backward compatibility
      filteredPages = pages.filter(page => page.parent && page.parent.type === 'workspace');
    }

    // Log parent types for debugging
    const parentTypes = new Set(filteredPages.map(p => p.parentType));
    console.log('Available parent types:', Array.from(parentTypes));
    console.log('Total pages:', filteredPages.length);

    res.json(filteredPages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pages from Notion',
      details: error.message 
    });
  }
});

// Get page content
app.get('/api/notion/pages/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;

    // Get page details
    const page = await notion.pages.retrieve({ page_id: pageId });
    
    // Get page blocks
    const blocks = await notion.blocks.children.list({ block_id: pageId });

    const pageContent = {
      page: {
        id: page.id,
        title: getPageTitle(page),
        emoji: getPageEmoji(page),
        url: page.url,
        parent: page.parent,
        properties: page.properties,
        last_edited_time: page.last_edited_time
      },
      blocks: blocks.results
    };

    res.json(pageContent);
  } catch (error) {
    console.error('Error fetching page content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch page content from Notion',
      details: error.message 
    });
  }
});

// Get teamspaces
app.get('/api/notion/teamspaces', async (req, res) => {
  try {
    if (!NOTION_API_KEY || NOTION_API_KEY === 'your_notion_api_key_here') {
      return res.status(401).json({ error: 'Notion API key not configured' });
    }

    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      }
    });

    // Extract unique teamspace information from pages
    const teamspaceMap = new Map();
    
    response.results.forEach(page => {
      if (page.parent && page.parent.type === 'workspace') {
        // This is a workspace-level page
        teamspaceMap.set('workspace', {
          id: 'workspace',
          name: 'Private Pages (Workspace)',
          type: 'workspace'
        });
      } else if (page.parent && page.parent.type === 'page_id') {
        // Try to identify teamspace pages
        const parentId = page.parent.page_id;
        // We'll need to check if parent is a teamspace root
      }
    });

    // Add a simple way to get all pages
    teamspaceMap.set('all', {
      id: 'all',
      name: 'All Pages',
      type: 'all'
    });

    res.json(Array.from(teamspaceMap.values()));
  } catch (error) {
    console.error('Error fetching teamspaces:', error);
    res.status(500).json({ 
      error: 'Failed to fetch teamspaces from Notion',
      details: error.message 
    });
  }
});

// Search pages
app.get('/api/notion/search', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const response = await notion.search({
      query: query,
      filter: {
        property: 'object',
        value: 'page'
      }
    });

    const pages = response.results.map(page => ({
      id: page.id,
      title: getPageTitle(page),
      emoji: getPageEmoji(page),
      url: page.url,
      parent: page.parent,
      properties: page.properties,
      last_edited_time: page.last_edited_time
    }));

    res.json(pages);
  } catch (error) {
    console.error('Error searching pages:', error);
    res.status(500).json({ 
      error: 'Failed to search pages in Notion',
      details: error.message 
    });
  }
});

// Get all databases
app.get('/api/notion/databases', async (req, res) => {
  try {
    // Notion API doesn't support searching for 'database' type directly
    // We need to get databases from pages' parent information
    const pagesResponse = await notion.search({
      query: '',
      filter: {
        property: 'object',
        value: 'page'
      }
    });

    // Extract unique databases from pages
    const databaseIds = new Set();
    const databases = [];
    
    for (const page of pagesResponse.results) {
      const dbId = page.parent?.database_id || page.parent?.data_source_id;
      if (dbId && !databaseIds.has(dbId)) {
        databaseIds.add(dbId);
        try {
          const database = await notion.databases.retrieve({ database_id: dbId });
          databases.push(database);
        } catch (err) {
          console.error(`Failed to fetch database ${dbId}:`, err.message);
        }
      }
    }

    res.json(databases);
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ 
      error: 'Failed to fetch databases from Notion',
      details: error.message 
    });
  }
});

// Client verification endpoint
app.post('/api/client/verify', async (req, res) => {
  try {
    const { address, password } = req.body;

    if (!address || !password) {
      return res.status(400).json({ 
        verified: false, 
        error: 'Address and password are required' 
      });
    }

    // Demo mode: Accept "demo123" for any address
    if (password === 'demo123') {
      return res.json({ 
        verified: true, 
        address: address,
        mode: 'demo'
      });
    }

    // TODO: In production, verify against a Notion database of client credentials
    // For now, we'll check if there are any pages with this address
    try {
      const response = await notion.search({
        query: address,
        filter: {
          property: 'object',
          value: 'page'
        }
      });

      // If we find pages with this address, consider it valid
      // In production, you'd want a more secure verification system
      if (response.results.length > 0) {
        return res.json({ 
          verified: true, 
          address: address,
          pageCount: response.results.length
        });
      }
    } catch (searchError) {
      console.error('Error searching for client address:', searchError);
    }

    // Invalid credentials
    return res.json({ 
      verified: false, 
      error: 'Invalid address or password' 
    });

  } catch (error) {
    console.error('Error verifying client:', error);
    res.status(500).json({ 
      verified: false,
      error: 'Server error during verification' 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    notion_configured: !!process.env.NOTION_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Notion API Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  
  if (!process.env.NOTION_API_KEY) {
    console.log('⚠️  WARNING: NOTION_API_KEY not set in .env file');
    console.log('   Please add your Notion integration token to .env');
  } else {
    console.log('✅ Notion API key configured');
  }
});

module.exports = app;
