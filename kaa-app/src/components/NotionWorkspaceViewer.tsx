import React, { useState, useEffect, useCallback, useMemo } from 'react';
import logger from '../utils/logger';
import './NotionWorkspaceViewer.css';
import { 
  notionApi, 
  NotionPage, 
  PageContent, 
  NotionDatabase,
  NotionPropertyValue,
  ViewMode,
  SortOrder,
  FilterType
} from '../api/notionApi';
import { DarkModeProvider } from '../contexts/DarkModeContext';
import ErrorBoundary from './ErrorBoundary';
import Skeleton from './Skeleton';

// Memoized subcomponents for performance
interface KanbanCardProps {
  task: NotionPage;
  onClick: (id: string) => void;
  showPriority?: boolean;
}

const KanbanCard = React.memo<KanbanCardProps>(({ task, onClick, showPriority = true }) => {
  const priorityProp = task.properties?.['Priority'] as any;
  const priorityName = priorityProp?.select?.name || '';
  
  return (
    <div 
      className={`kanban-card ${!showPriority ? 'completed' : ''}`}
      onClick={() => onClick(task.id)}
    >
      {showPriority && (
        <div className="kanban-card-priority">
          {priorityName.includes('Critical') && '🔴 Critical'}
          {priorityName.includes('High') && '🟡 High'}
          {priorityName.includes('Medium') && '🟢 Medium'}
          {priorityName.includes('Low') && '⚪ Low'}
        </div>
      )}
      <div className="kanban-card-title">{task.title}</div>
    </div>
  );
});

KanbanCard.displayName = 'KanbanCard';

interface RecentPageCardProps {
  page: NotionPage;
  onClick: (id: string) => void;
  getParentInfo: (page: NotionPage) => string;
}

const RecentPageCard = React.memo<RecentPageCardProps>(({ page, onClick, getParentInfo }) => {
  return (
    <div 
      className="recent-page-card"
      onClick={() => onClick(page.id)}
    >
      <div className="recent-page-header">
        <span className="recent-page-emoji">{page.emoji || '📄'}</span>
        <span className="recent-page-title">{page.title}</span>
      </div>
      <div className="recent-page-meta">
        <span className="recent-page-location">{getParentInfo(page)}</span>
        <span className="recent-page-date">
          {new Date(page.last_edited_time).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}
        </span>
      </div>
    </div>
  );
});

RecentPageCard.displayName = 'RecentPageCard';

interface NotionWorkspaceViewerProps {
  clientMode?: boolean;
  clientAddress?: string;
}

const NotionWorkspaceViewer: React.FC<NotionWorkspaceViewerProps> = ({ 
  clientMode = false, 
  clientAddress = '' 
}) => {
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [filterType, setFilterType] = useState<FilterType>('root');
  const [allDatabases, setAllDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false);
  const [pagesPanelExpanded, setPagesPanelExpanded] = useState(false);

  const loadDatabases = useCallback(async () => {
    try {
      const dbs = await notionApi.getAllDatabases();
      setAllDatabases(dbs);
    } catch (err) {
      logger.error('Failed to load databases:', err);
    }
  }, []);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await notionApi.getAllPages(filterType);
      setPages(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Notion pages. Make sure your API token is configured.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadDatabases();
    loadPages();
  }, [loadDatabases, loadPages]);

  const loadPageContent = useCallback(async (pageId: string) => {
    setSelectedPage(null); // Clear current page to show loading
    setLoading(true);
    setError(null);
    try {
      const data = await notionApi.getPageContent(pageId);
      setSelectedPage(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load page content.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const sortPages = useCallback((pagesToSort: NotionPage[]) => {
    const sorted = [...pagesToSort];
    
    switch (sortOrder) {
      case 'recent':
        return sorted.sort((a, b) => 
          new Date(b.last_edited_time).getTime() - new Date(a.last_edited_time).getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.last_edited_time).getTime() - new Date(b.last_edited_time).getTime()
        );
      case 'alphabetical':
        return sorted.sort((a, b) => 
          a.title.toLowerCase().localeCompare(b.title.toLowerCase())
        );
      default:
        return sorted;
    }
  }, [sortOrder]);

  const hierarchy = useMemo(() => {
    const hierarchyMap: { [key: string]: NotionPage[] } = {};
    
    pages.forEach(page => {
      if (page.parent && page.parent.type === 'page_id') {
        const parentId = page.parent.page_id!;
        if (!hierarchyMap[parentId]) {
          hierarchyMap[parentId] = [];
        }
        hierarchyMap[parentId].push(page);
      }
    });
    
    // Sort children in each hierarchy level
    Object.keys(hierarchyMap).forEach(key => {
      hierarchyMap[key] = sortPages(hierarchyMap[key]);
    });
    
    return hierarchyMap;
  }, [pages, sortPages]);

  const rootPages = useMemo(() => {
    const rootPagesArray = pages.filter(page => !page.parent || page.parent.type !== 'page_id');
    return sortPages(rootPagesArray);
  }, [pages, sortPages]);

  const toggleFolder = useCallback((pageId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(pageId)) {
        newExpanded.delete(pageId);
      } else {
        newExpanded.add(pageId);
      }
      return newExpanded;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedFolders(new Set(Object.keys(hierarchy)));
  }, [hierarchy]);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const getParentInfo = useCallback((page: NotionPage) => {
    if (!page.parent) return 'Private Workspace';
    
    if (page.parent.type === 'workspace') return 'Private Workspace';
    
    // If page is in a database (either database_id or data_source_id)
    if ((page.parent.type === 'database_id' || page.parent.type === 'data_source_id')) {
      if (page.teamspaceName && page.databaseName) {
        return `${page.teamspaceName} → 📊 ${page.databaseName}`;
      } else if (page.databaseName) {
        return `📊 ${page.databaseName}`;
      } else if (page.teamspaceName) {
        return page.teamspaceName;
      }
      return 'Database Entry';
    }
    
    if (page.parent.type === 'page_id' && page.parent.page_id) {
      const parentPage = pages.find(p => p.id === page.parent?.page_id);
      return parentPage ? `📄 ${parentPage.title}` : 'Subpage';
    }
    
    return 'Unknown';
  }, [pages]);

  const renderPageNode = useCallback((page: NotionPage, hierarchyMap: { [key: string]: NotionPage[] }, depth: number = 0): React.ReactNode => {
    const children = hierarchyMap[page.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(page.id);
    const lastEdited = new Date(page.last_edited_time).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return (
      <div key={page.id} className={`page-node depth-${depth}`}>
        <div 
          className={`page-item ${hasChildren ? 'has-children' : ''} ${depth > 0 ? 'is-child' : 'is-parent'}`}
        >
          {hasChildren ? (
            <span 
              className="folder-toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(page.id);
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="file-icon">{depth > 0 ? '└─' : '📄'}</span>
          )}
          <div 
            className="page-content-wrapper"
            onClick={() => loadPageContent(page.id)}
          >
            <div className="page-main-info">
              <div className="page-title-row">
            <span className="page-emoji">{page.emoji || (hasChildren ? '📁' : '📄')}</span>
            <span className="page-title" title={page.title}>{page.title}</span>
            {hasChildren && <span className="child-count">{children.length}</span>}
              </div>
              <div className="page-metadata">
                <span className="page-space" title="Space">🏠 {getParentInfo(page)}</span>
                <span className="page-separator">•</span>
                <span className="page-date" title="Last edited">📅 {lastEdited}</span>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="page-children">
            {children.map(child => renderPageNode(child, hierarchyMap, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedFolders, toggleFolder, loadPageContent, getParentInfo]);

  const filteredPages = useMemo(() => {
    let filtered = pages.filter(page => 
      page.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Client mode filtering - only show pages that match client address
    if (clientMode && clientAddress) {
      filtered = filtered.filter(page => {
        const addressLower = clientAddress.toLowerCase();
        
        // PRIORITY 1: Check if page has a "Client Address" property that matches
        const clientAddressProp = page.properties?.['Client Address'] || 
                                  page.properties?.['Client'] || 
                                  page.properties?.['Address'];
        
        if (clientAddressProp) {
          // Handle different property types
          let propValue = '';
          if (clientAddressProp.type === 'rich_text' && clientAddressProp.rich_text?.length > 0) {
            propValue = clientAddressProp.rich_text[0].plain_text?.toLowerCase() || '';
          } else if (clientAddressProp.type === 'title' && clientAddressProp.title?.length > 0) {
            propValue = clientAddressProp.title[0].plain_text?.toLowerCase() || '';
          } else if (clientAddressProp.type === 'select' && clientAddressProp.select) {
            propValue = clientAddressProp.select.name?.toLowerCase() || '';
          }
          
          if (propValue.includes(addressLower)) {
            return true;
          }
        }
        
        // PRIORITY 2: Check if page title contains the address
        const titleMatch = page.title.toLowerCase().includes(addressLower);
        
        // PRIORITY 3: Check if database name contains the address
        const databaseMatch = page.databaseName && 
          page.databaseName.toLowerCase().includes(addressLower);
        
        // PRIORITY 4: Check if teamspace name contains the address
        const teamspaceMatch = page.teamspaceName && 
          page.teamspaceName.toLowerCase().includes(addressLower);

        return titleMatch || databaseMatch || teamspaceMatch;
      });
    }

    return sortPages(filtered);
  }, [pages, searchQuery, sortPages, clientMode, clientAddress]);

  // Helper function to render a property value
  const renderPropertyValue = useCallback((property: NotionPropertyValue): React.ReactNode => {
    if (!property) return 'Empty';

    switch (property.type) {
      case 'title':
        return property.title.map(t => t.plain_text).join('') || 'Untitled';
      
      case 'rich_text':
        return property.rich_text.map(t => t.plain_text).join('') || 'Empty';
      
      case 'date':
        if (!property.date) return 'No date';
        const start = new Date(property.date.start).toLocaleString();
        return property.date.end 
          ? `${start} → ${new Date(property.date.end).toLocaleString()}`
          : start;
      
      case 'select':
        return property.select?.name || 'None';
      
      case 'multi_select':
        return property.multi_select.map(s => s.name).join(', ') || 'None';
      
      case 'status':
        return property.status?.name || 'None';
      
      case 'number':
        return property.number !== null ? property.number.toString() : 'Empty';
      
      case 'checkbox':
        return property.checkbox ? '✓ Yes' : '✗ No';
      
      case 'url':
        return property.url ? (
          <a href={property.url} target="_blank" rel="noopener noreferrer" className="property-link">
            {property.url}
          </a>
        ) : 'No URL';
      
      case 'email':
        return property.email || 'No email';
      
      case 'phone_number':
        return property.phone_number || 'No phone';
      
      case 'people':
        return property.people.map(p => p.name || 'Unknown').join(', ') || 'None';
      
      case 'files':
        return property.files.length > 0 ? `${property.files.length} file(s)` : 'No files';
      
      case 'created_time':
        return new Date(property.created_time).toLocaleString();
      
      case 'last_edited_time':
        return new Date(property.last_edited_time).toLocaleString();
      
      case 'created_by':
        return property.created_by.name || 'Unknown';
      
      case 'last_edited_by':
        return property.last_edited_by.name || 'Unknown';
      
      case 'formula':
        if (property.formula.type === 'string') return property.formula.string || 'Empty';
        if (property.formula.type === 'number') return property.formula.number?.toString() || 'Empty';
        if (property.formula.type === 'boolean') return property.formula.boolean ? 'True' : 'False';
        return 'Formula result unavailable';
      
      case 'relation':
        return property.relation.length > 0 ? `${property.relation.length} relation(s)` : 'No relations';
      
      case 'rollup':
        if (property.rollup.type === 'number') return property.rollup.number?.toString() || 'Empty';
        if (property.rollup.type === 'array') return `${property.rollup.array?.length || 0} item(s)`;
        return 'Rollup result unavailable';
      
      default:
        return 'Unsupported property type';
    }
  }, []);

  return (
    <DarkModeProvider>
      <div className="notion-workspace-viewer">
        <div className="viewer-header">
          <div className="header-top">
            <button 
              className="home-button-header"
              onClick={() => setSelectedPage(null)}
              title={selectedPage ? "Back to Dashboard" : "Dashboard Home"}
              aria-label="Dashboard Home"
              style={{ visibility: selectedPage ? 'visible' : 'hidden' }}
            >
              🏠 {selectedPage ? 'Dashboard' : 'Home'}
            </button>
            <h2>
              {clientMode ? (
                <>📁 Projects - {clientAddress}</>
              ) : (
                <>🌳 {
                  filterType === 'workspace' ? 'Private Pages' : 
                  filterType === 'root' ? 'KAA Workspace (Root Pages)' : 
                  'All Notion Pages'
                }</>
              )}
            </h2>
            <button 
              className={`mobile-menu-toggle ${mobileControlsExpanded ? 'expanded' : ''}`}
              onClick={() => setMobileControlsExpanded(!mobileControlsExpanded)}
              aria-label="Toggle mobile menu"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
          <div className={`viewer-controls ${mobileControlsExpanded ? 'expanded' : ''}`}>
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="view-mode-toggle">
            <button 
              className={viewMode === 'tree' ? 'active' : ''}
              onClick={() => setViewMode('tree')}
            >
              Tree
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
          <div className="space-filter">
            <label className="space-filter-label">Space:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as 'all' | 'root' | 'workspace')}
              className="space-filter-dropdown"
            >
              <option value="all">🌍 All Pages</option>
              <option value="root">📁 Root Pages (KAA)</option>
              <option value="workspace">🏠 Private Pages</option>
            </select>
          </div>
          <div className="sort-controls">
            <label className="sort-label">Sort:</label>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest' | 'alphabetical')}
              className="sort-dropdown"
            >
              <option value="recent">📅 Most Recent</option>
              <option value="oldest">📅 Oldest First</option>
              <option value="alphabetical">🔤 A-Z</option>
            </select>
          </div>
          <button onClick={loadPages} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="viewer-content">
        <ErrorBoundary 
          fallbackTitle="Pages Panel Error"
          fallbackMessage="We couldn't load the pages list. Please try refreshing."
        >
          <div className={`pages-panel ${pagesPanelExpanded ? 'expanded' : ''}`}>
            {/* Pages Panel Header - Always Visible on Mobile */}
            <div className="pages-panel-header">
              <div className="pages-header-top">
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pages-search-input"
                />
                <button 
                  className={`pages-menu-toggle ${pagesPanelExpanded ? 'expanded' : ''}`}
                  onClick={() => setPagesPanelExpanded(!pagesPanelExpanded)}
                  aria-label="Toggle pages panel"
                >
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                </button>
              </div>
              <div className="pages-count-bar">
                <span className="pages-count">📚 {pages.length} pages</span>
              </div>
            </div>

            {/* Collapsible Pages Content */}
            <div className={`pages-panel-content ${pagesPanelExpanded ? 'expanded' : ''}`}>
              {loading && pages.length === 0 && (
                <div className="loading-skeleton-container">
                  <Skeleton variant="page" count={5} />
                </div>
              )}
              {error && <div className="error">{error}</div>}
              
              {!loading && !error && (
                <>
                  <div className="folder-controls">
                    <button onClick={expandAll} className="folder-control-btn">
                      📂 Expand All
                    </button>
                    <button onClick={collapseAll} className="folder-control-btn">
                      📁 Collapse All
                    </button>
                  </div>
                  <div className="pages-list">
                {viewMode === 'tree' ? (
                  rootPages.map(page => renderPageNode(page, hierarchy))
                ) : (
                  filteredPages.map(page => {
                    const lastEdited = new Date(page.last_edited_time).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    });
                    return (
                    <div 
                      key={page.id}
                      className="page-item list-item"
                      onClick={() => loadPageContent(page.id)}
                    >
                        <div className="list-item-content">
                          <div className="list-item-main">
                      <span className="page-emoji">{page.emoji || '📄'}</span>
                      <span className="page-title">{page.title}</span>
                          </div>
                          <div className="list-item-metadata">
                            <span className="page-space" title="Space">🏠 {getParentInfo(page)}</span>
                            <span className="page-separator">•</span>
                            <span className="page-date" title="Last edited">📅 {lastEdited}</span>
                          </div>
                        </div>
                    </div>
                    );
                  })
                )}
                </div>
              </>
            )}
            </div>
          </div>
        </ErrorBoundary>

        <ErrorBoundary 
          fallbackTitle="Content Panel Error"
          fallbackMessage="We couldn't display the selected content. Try selecting a different page."
        >
          <div className="content-panel">
          {loading && !selectedPage ? (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading page content...</div>
            </div>
          ) : selectedPage ? (
            <div className="page-content">
              <div className="content-header">
                <div className="content-header-left">
                  <button 
                    className="back-to-dashboard-btn"
                    onClick={() => setSelectedPage(null)}
                    title="Back to Command Center"
                  >
                    ← Back
                  </button>
                <h3>
                  {selectedPage.page.emoji} {selectedPage.page.title}
                </h3>
                </div>
                <a 
                  href={selectedPage.page.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  Open in Notion ↗
                </a>
              </div>
              
              {/* Render Properties Section */}
              {selectedPage.page.properties && Object.keys(selectedPage.page.properties).length > 0 && (
                <div className="properties-section">
                  {Object.entries(selectedPage.page.properties)
                    .filter(([name, prop]: [string, any]) => prop.type !== 'title') // Skip title (shown in header)
                    .map(([name, prop]: [string, any]) => (
                      <div key={name} className="property-row">
                        <div className="property-label">
                          <span className="property-icon">
                            {prop.type === 'date' && '📅'}
                            {prop.type === 'select' && '🏷️'}
                            {prop.type === 'status' && '🔄'}
                            {prop.type === 'people' && '👤'}
                            {prop.type === 'checkbox' && '☑️'}
                            {prop.type === 'url' && '🔗'}
                            {prop.type === 'email' && '📧'}
                            {prop.type === 'phone_number' && '📞'}
                            {prop.type === 'number' && '🔢'}
                            {!['date', 'select', 'status', 'people', 'checkbox', 'url', 'email', 'phone_number', 'number'].includes(prop.type) && '≡'}
                          </span>
                          {name}
                        </div>
                        <div className="property-value">
                          {renderPropertyValue(prop)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {/* Render Blocks Section */}
              {selectedPage.blocks.length > 0 && (
              <div className="content-body">
                  <h4 className="content-section-title">Content</h4>
                {selectedPage.blocks.map(block => (
                  <div key={block.id} className="content-block">
                    {block.type === 'paragraph' && (
                      <p>{block.paragraph?.rich_text?.[0]?.plain_text || ''}</p>
                    )}
                    {block.type === 'heading_1' && (
                      <h1>{block.heading_1?.rich_text?.[0]?.plain_text || ''}</h1>
                    )}
                    {block.type === 'heading_2' && (
                      <h2>{block.heading_2?.rich_text?.[0]?.plain_text || ''}</h2>
                    )}
                    {block.type === 'heading_3' && (
                      <h3>{block.heading_3?.rich_text?.[0]?.plain_text || ''}</h3>
                    )}
                    {block.type === 'bulleted_list_item' && (
                      <li>• {block.bulleted_list_item?.rich_text?.[0]?.plain_text || ''}</li>
                    )}
                    {block.type === 'numbered_list_item' && (
                      <li>1. {block.numbered_list_item?.rich_text?.[0]?.plain_text || ''}</li>
                    )}
                    {block.type === 'code' && (
                      <pre><code>{block.code?.rich_text?.[0]?.plain_text || ''}</code></pre>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          ) : (
            <div className="dashboard-home">
              <div className="dashboard-header">
                <h2>🎯 Alex Command Center Hub</h2>
                <p className="dashboard-subtitle">Workspace Restructuring Project Command Center</p>
              </div>

              {/* Progress & Focus Section */}
              <div className="dashboard-section focus-section">
                <h3 className="section-title">🎯 Progress & Focus</h3>
                <p className="section-subtitle">Your workspace restructuring status</p>
                
                {(() => {
                  // Find task tracker pages - look for pages with Status property from any database
                  const taskTrackerPages = pages.filter(p => {
                    const hasStatusProp = p.properties && 'Status' in p.properties;
                    // Prioritize databases with task-like names
                    const isTaskDB = p.databaseName && (
                      p.databaseName.toLowerCase().includes('task') ||
                      p.databaseName.toLowerCase().includes('tracker') ||
                      p.databaseName.toLowerCase().includes('initiative') ||
                      p.databaseName.toLowerCase().includes('backlog')
                    );
                    return hasStatusProp && (isTaskDB || p.databaseName);
                  });
                  
                  if (taskTrackerPages.length === 0) {
                    // Show demo Kanban board with sample data
                    return (
                      <>
                        <div className="no-tasks">
                          <p>📌 Demo Mode - No task tracker found</p>
                          <p className="no-tasks-hint">Create a database with a "Status" property to see your real tasks</p>
                        </div>

                        {/* Demo Kanban Board */}
                        <div className="kanban-section">
                          <h4 className="kanban-title">
                            📋 Demo Kanban Board
                          </h4>
                          <div className="kanban-board">
                            {/* To Do Column */}
                            <div className="kanban-column backlog-column">
                              <div className="kanban-column-header">
                                <span className="kanban-column-title">🪧 To Do</span>
                                <span className="kanban-column-count">3</span>
                              </div>
                              <div className="kanban-cards">
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">🔴 Critical</div>
                                  <div className="kanban-card-title">Verify database schema and API endpoints work correctly</div>
                                </div>
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">⚪ Low</div>
                                  <div className="kanban-card-title">Add missing database views and filters</div>
                                </div>
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">🟢 Medium</div>
                                  <div className="kanban-card-title">Setup testing environment</div>
                                </div>
                              </div>
                            </div>

                            {/* In Progress Column */}
                            <div className="kanban-column progress-column">
                              <div className="kanban-column-header">
                                <span className="kanban-column-title">🚀 In Progress</span>
                                <span className="kanban-column-count">3</span>
                              </div>
                              <div className="kanban-cards">
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">🟢 Medium</div>
                                  <div className="kanban-card-title">Create mobile responsive layout for all pages</div>
                                </div>
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">🟡 High</div>
                                  <div className="kanban-card-title">Setup dashboard and navigation</div>
                                </div>
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">🟡 High</div>
                                  <div className="kanban-card-title">Performance optimization</div>
                                </div>
                              </div>
                            </div>

                            {/* Complete Column */}
                            <div className="kanban-column complete-column">
                              <div className="kanban-column-header">
                                <span className="kanban-column-title">✅ Complete</span>
                                <span className="kanban-column-count">2</span>
                              </div>
                              <div className="kanban-cards">
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">⚪ Low</div>
                                  <div className="kanban-card-title">Deploy to staging environment</div>
                                </div>
                                <div className="kanban-card">
                                  <div className="kanban-card-priority">⚪ Low</div>
                                  <div className="kanban-card-title">Create documentation pages</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

                  // Calculate progress by status
                  const statusGroups = taskTrackerPages.reduce((acc: Record<string, NotionPage[]>, page: NotionPage) => {
                    const statusProp = page.properties?.['Status'] as any;
                    const status = statusProp?.status?.name || statusProp?.select?.name || 'Unknown';
                    if (!acc[status]) acc[status] = [];
                    acc[status].push(page);
                    return acc;
                  }, {} as Record<string, NotionPage[]>);

                  // Smart status categorization - find completed, in-progress, and backlog statuses
                  const allStatuses = Object.keys(statusGroups);
                  const completedStatuses = allStatuses.filter(s => 
                    s.toLowerCase().includes('complet') || s.toLowerCase().includes('done') || s.toLowerCase().includes('finish')
                  );
                  const inProgressStatuses = allStatuses.filter(s => 
                    s.toLowerCase().includes('progress') || s.toLowerCase().includes('doing') || s.toLowerCase().includes('active')
                  );
                  const backlogStatuses = allStatuses.filter(s => 
                    !completedStatuses.includes(s) && !inProgressStatuses.includes(s) &&
                    (s.toLowerCase().includes('backlog') || s.toLowerCase().includes('todo') || 
                     s.toLowerCase().includes('to do') || s.toLowerCase().includes('not started') ||
                     s.toLowerCase().includes('pending') || s === 'Unknown')
                  );

                  const completed = completedStatuses.reduce((sum, status) => sum + (statusGroups[status]?.length || 0), 0);
                  const inProgress = inProgressStatuses.reduce((sum, status) => sum + (statusGroups[status]?.length || 0), 0);
                  const backlog = backlogStatuses.reduce((sum, status) => sum + (statusGroups[status]?.length || 0), 0);
                  const total = taskTrackerPages.length;
                  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <>
                      {/* Overall Progress */}
                      <div className="progress-overview">
                        <div className="progress-header">
                          <span className="progress-label">Overall Progress</span>
                          <span className="progress-percentage">{completionRate}%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <div className="progress-stats-row">
                          <span className="progress-stat">{completed} Complete</span>
                          <span className="progress-stat-separator">•</span>
                          <span className="progress-stat">{inProgress} In Progress</span>
                          <span className="progress-stat-separator">•</span>
                          <span className="progress-stat">{backlog} Backlog</span>
                          <span className="progress-stat-separator">•</span>
                          <span className="progress-stat-total">{total} Total</span>
                        </div>
                      </div>

                      {/* Kanban Board */}
                      <div className="kanban-section">
                        <h4 className="kanban-title">
                          📋 {taskTrackerPages[0]?.databaseName || 'Task Tracker'} - Kanban
                        </h4>
                        <div className="kanban-board">
                          {/* Backlog Column */}
                          <div className="kanban-column backlog-column">
                            <div className="kanban-column-header">
                              <span className="kanban-column-title">📥 To Do</span>
                              <span className="kanban-column-count">{backlog}</span>
                            </div>
                            <div className="kanban-cards">
                              {backlogStatuses.flatMap(status => statusGroups[status] || []).slice(0, 5).map((task: NotionPage) => (
                                <KanbanCard 
                                  key={task.id}
                                  task={task}
                                  onClick={loadPageContent}
                                />
                              ))}
                              {backlog > 5 && (
                                <div className="kanban-card-more">+{backlog - 5} more</div>
                              )}
                            </div>
                          </div>

                          {/* In Progress Column */}
                          <div className="kanban-column progress-column">
                            <div className="kanban-column-header">
                              <span className="kanban-column-title">🚀 In Progress</span>
                              <span className="kanban-column-count">{inProgress}</span>
                            </div>
                            <div className="kanban-cards">
                              {inProgressStatuses.flatMap(status => statusGroups[status] || []).slice(0, 5).map((task: NotionPage) => (
                                <KanbanCard 
                                  key={task.id}
                                  task={task}
                                  onClick={loadPageContent}
                                />
                              ))}
                              {inProgress === 0 && (
                                <div className="kanban-empty">No tasks in progress</div>
                              )}
                              {inProgress > 5 && (
                                <div className="kanban-card-more">+{inProgress - 5} more</div>
                              )}
                            </div>
                          </div>

                          {/* Complete Column */}
                          <div className="kanban-column complete-column">
                            <div className="kanban-column-header">
                              <span className="kanban-column-title">✅ Complete</span>
                              <span className="kanban-column-count">{completed}</span>
                            </div>
                            <div className="kanban-cards">
                              {completedStatuses.flatMap(status => statusGroups[status] || []).slice(0, 5).map((task: NotionPage) => (
                                <KanbanCard 
                                  key={task.id}
                                  task={task}
                                  onClick={loadPageContent}
                                  showPriority={false}
                                />
                              ))}
                              {completed === 0 && (
                                <div className="kanban-empty">No completed tasks yet</div>
                              )}
                              {completed > 5 && (
                                <div className="kanban-card-more">+{completed - 5} more</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Recommendation Engine */}
                      {(() => {
                        // Analyze tasks to recommend what to work on
                        const incompleteTasks = taskTrackerPages.filter(p => {
                          const statusProp = p.properties?.['Status'] as any;
                          const status = statusProp?.status?.name || statusProp?.select?.name || '';
                          return !completedStatuses.includes(status);
                        });

                        const phase1Tasks = incompleteTasks.filter(p => {
                          const phaseProp = p.properties?.['Phase'] as any;
                          return phaseProp?.select?.name?.includes('Phase 1') || phaseProp?.select?.name?.includes('1');
                        });
                        const criticalTasks = incompleteTasks.filter(p => {
                          const priorityProp = p.properties?.['Priority'] as any;
                          const priority = priorityProp?.select?.name || '';
                          return priority.toLowerCase().includes('critical') || priority.toLowerCase().includes('high');
                        });
                        
                        const recommendedTask = (criticalTasks.length > 0 && phase1Tasks.length > 0 
                          ? criticalTasks.find(t => phase1Tasks.includes(t)) 
                          : null) || criticalTasks[0] || phase1Tasks[0] || incompleteTasks[0];

                        if (!recommendedTask) return null;

                        const blockedTasks = taskTrackerPages.filter(p => {
                          const phaseProp = p.properties?.['Phase'] as any;
                          return phaseProp?.select?.name?.includes('Phase 2') ||
                                 phaseProp?.select?.name?.includes('Phase 3');
                        }).length;

                        return (
                          <div className="ai-recommendation">
                            <div className="recommendation-header">
                              <span className="ai-icon">🤖</span>
                              <h4 className="recommendation-title">AI Recommendation</h4>
                            </div>
                            <div className="recommendation-content">
                              <div className="recommendation-analysis">
                                <div className="analysis-item">
                                  <span className="analysis-label">Critical Path Blocker:</span>
                                  <span className="analysis-value">Phase 1 Foundation tasks are blocking {blockedTasks} downstream tasks</span>
                                </div>
                                <div className="analysis-item">
                                  <span className="analysis-label">Highest Impact:</span>
                                  <span className="analysis-value">Completing {phase1Tasks.length} Phase 1 tasks unlocks all subsequent work</span>
                                </div>
                              </div>
                              <div className="recommendation-task">
                                <div className="recommended-badge">⭐ Recommended Next Task</div>
                                <div 
                                  className="recommended-task-card"
                                  onClick={() => loadPageContent(recommendedTask.id)}
                                >
                                  <div className="recommended-task-header">
                                    <span className="recommended-priority">
                                      {((recommendedTask.properties?.['Priority'] as any)?.select?.name) || 'No Priority'}
                                    </span>
                                    <span className="recommended-phase">
                                      {((recommendedTask.properties?.['Phase'] as any)?.select?.name) || 'No Phase'}
                                    </span>
                                  </div>
                                  <div className="recommended-task-title">{recommendedTask.title}</div>
                                  <div className="recommended-task-reason">
                                    <strong>Why this task?</strong> This is a critical foundation task that must be completed before moving to navigation and documentation phases. It's blocking multiple downstream dependencies.
                                  </div>
                                </div>
                                <button 
                                  className="start-claude-btn"
                                  onClick={() => {
                                    loadPageContent(recommendedTask.id);
                                    // Future: Could integrate with Claude API here
                                  }}
                                >
                                  🚀 Start Working on This Task
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Gantt Chart - Phase Timeline */}
                      {(() => {
                        const phases = ['Phase 1: Foundation', 'Phase 2: Navigation', 'Phase 3: Documentation', 'Phase 4: Polish'];
                        const phaseData = phases.map(phase => {
                          const phaseTasks = taskTrackerPages.filter(p => {
                            const phaseProp = p.properties?.['Phase'] as any;
                            return phaseProp?.select?.name === phase;
                          });
                          const phaseCompleted = phaseTasks.filter(p => {
                            const statusProp = p.properties?.['Status'] as any;
                            const status = statusProp?.status?.name || statusProp?.select?.name || '';
                            return completedStatuses.includes(status);
                          }).length;
                          const phaseInProgress = phaseTasks.filter(p => {
                            const statusProp = p.properties?.['Status'] as any;
                            const status = statusProp?.status?.name || statusProp?.select?.name || '';
                            return inProgressStatuses.includes(status);
                          }).length;
                          const total = phaseTasks.length;
                          const progress = total > 0 ? Math.round((phaseCompleted / total) * 100) : 0;
                          
                          return { phase, total, completed: phaseCompleted, inProgress: phaseInProgress, progress, tasks: phaseTasks };
                        });

                        return (
                          <div className="gantt-section">
                            <h4 className="gantt-title">📊 Project Timeline & Dependencies</h4>
                            <p className="gantt-subtitle">Sequential phases - each phase must complete before the next begins</p>
                            
                            <div className="gantt-chart">
                              {phaseData.map((data, idx) => (
                                <div key={idx} className="gantt-phase">
                                  <div className="gantt-phase-header">
                                    <div className="gantt-phase-info">
                                      <span className="gantt-phase-number">Phase {idx + 1}</span>
                                      <span className="gantt-phase-name">{data.phase.split(': ')[1]}</span>
                                    </div>
                                    <div className="gantt-phase-stats">
                                      <span className="gantt-progress-text">{data.progress}%</span>
                                      <span className="gantt-task-count">{data.completed}/{data.total} tasks</span>
                                    </div>
                                  </div>
                                  <div className="gantt-progress-bar">
                                    <div 
                                      className="gantt-progress-fill"
                                      style={{ 
                                        width: `${data.progress}%`,
                                        backgroundColor: idx === 0 ? '#4CAF50' : idx === 1 ? '#2196F3' : idx === 2 ? '#FF9800' : '#9C27B0'
                                      }}
                                    ></div>
                                  </div>
                                  <div className="gantt-phase-tasks">
                                    {data.tasks.slice(0, 3).map(task => {
                                      const statusProp = task.properties?.['Status'] as any;
                                      const status = statusProp?.status?.name || statusProp?.select?.name || '';
                                      const isComplete = completedStatuses.includes(status);
                                      return (
                                        <div 
                                          key={task.id}
                                          className="gantt-task-item"
                                          onClick={() => loadPageContent(task.id)}
                                        >
                                          <span className="gantt-task-status">
                                            {isComplete ? '✓' : '○'}
                                          </span>
                                          <span className="gantt-task-title">{task.title}</span>
                                        </div>
                                      );
                                    })}
                                    {data.total > 3 && (
                                      <div className="gantt-task-more">+{data.total - 3} more tasks</div>
                                    )}
                                  </div>
                                  {idx < phaseData.length - 1 && (
                                    <div className="gantt-dependency-arrow">↓ Dependencies ↓</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>

              <div className="dashboard-stats">
                {loading && pages.length === 0 ? (
                  <>
                    <Skeleton variant="stat" />
                    <Skeleton variant="stat" />
                    <Skeleton variant="stat" />
                    <Skeleton variant="stat" />
                  </>
                ) : (
                  <>
                    <div className="stat-card">
                      <div className="stat-icon">📚</div>
                      <div className="stat-content">
                        <div className="stat-number">{pages.length}</div>
                        <div className="stat-label">Total Pages</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">📊</div>
                      <div className="stat-content">
                        <div className="stat-number">{allDatabases.length}</div>
                        <div className="stat-label">Databases</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">🏠</div>
                      <div className="stat-content">
                        <div className="stat-number">{new Set(pages.map(p => p.teamspaceName).filter(Boolean)).size}</div>
                        <div className="stat-label">Teamspaces</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="dashboard-section">
                <h3 className="section-title">📅 Recently Edited</h3>
                <div className="recent-pages">
                  {loading && pages.length === 0 ? (
                    <>
                      <Skeleton variant="page" count={4} />
                    </>
                  ) : (
                    sortPages(pages).slice(0, 8).map(page => (
                      <RecentPageCard 
                        key={page.id}
                        page={page}
                        onClick={loadPageContent}
                        getParentInfo={getParentInfo}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="dashboard-section">
                <h3 className="section-title">📁 Projects Overview</h3>
                <p className="section-subtitle">Pages grouped by project type</p>
                <div className="project-groups">
                  {(() => {
                    // Group pages by project prefix (VIDEO, MARKETING, PLANNING, etc.)
                    const projectGroups: { [key: string]: NotionPage[] } = {};
                    const prefixMap: { [key: string]: string } = {
                      'VIDEO': '📹 Video Projects',
                      'MARKETING': '📢 Marketing',
                      'PLANNING': '📋 Planning',
                      'ACTIONITEMS': '✅ Action Items',
                      'ORDINANCE': '📜 Ordinances',
                      'PROFILE': '👤 Profiles',
                      'TRACKER': '📊 Trackers',
                    };
                    
                    pages.forEach(page => {
                      const prefix = page.title.split('-')[0].toUpperCase();
                      if (prefixMap[prefix]) {
                        if (!projectGroups[prefix]) {
                          projectGroups[prefix] = [];
                        }
                        projectGroups[prefix].push(page);
                      }
                    });
                    
                    return Object.entries(projectGroups)
                      .sort(([, a], [, b]) => b.length - a.length)
                      .map(([prefix, groupPages]) => (
                        <div key={prefix} className="project-group-card">
                          <div className="project-group-header">
                            <span className="project-group-name">{prefixMap[prefix]}</span>
                            <span className="project-group-count">{groupPages.length} pages</span>
                          </div>
                          <div className="project-group-items">
                            {groupPages.slice(0, 5).map(page => (
                              <div 
                                key={page.id}
                                className="project-group-item"
                                onClick={() => loadPageContent(page.id)}
                              >
                                <span className="project-item-emoji">{page.emoji || '📄'}</span>
                                <span className="project-item-title">{page.title}</span>
                              </div>
                            ))}
                            {groupPages.length > 5 && (
                              <div className="project-group-more">
                                +{groupPages.length - 5} more...
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              <div className="dashboard-section">
                <h3 className="section-title">📊 Your Databases</h3>
                {!selectedDatabase ? (
                  <div className="teamspace-list">
                    {allDatabases.map((db: NotionDatabase) => {
                      const dbTitle = db.title?.[0]?.plain_text || 'Untitled Database';
                      const dbPages = pages.filter(p => p.databaseName === dbTitle);
                      return (
                        <div 
                          key={db.id} 
                          className="teamspace-card clickable"
                          onClick={() => setSelectedDatabase(dbTitle)}
                        >
                          <div className="teamspace-name">{db.icon?.emoji || '📊'} {dbTitle}</div>
                          <div className="teamspace-count">{dbPages.length} pages →</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="database-detail-view">
                    <button className="back-button" onClick={() => setSelectedDatabase(null)}>
                      ← Back to Databases
                    </button>
                    <h4 className="database-detail-title">
                      {allDatabases.find(db => (db.title?.[0]?.plain_text || 'Untitled Database') === selectedDatabase)?.icon?.emoji || '📊'} 
                      {' '}{selectedDatabase}
                    </h4>
                    <div className="database-pages-table">
                      {pages
                        .filter(p => p.databaseName === selectedDatabase)
                        .map(page => (
                          <div 
                            key={page.id} 
                            className="database-page-row"
                            onClick={() => loadPageContent(page.id)}
                          >
                            <span className="db-page-emoji">{page.emoji || '📄'}</span>
                            <span className="db-page-title">{page.title}</span>
                            <span className="db-page-date">
                              {new Date(page.last_edited_time).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="dashboard-section">
                <h3 className="section-title">🗂️ Your Teamspaces</h3>
                <div className="teamspace-list">
                  {Array.from(new Set(pages.map(p => p.teamspaceName).filter(Boolean))).map((teamspace, idx) => {
                    const teamspacePages = pages.filter(p => p.teamspaceName === teamspace);
                    return (
                      <div key={idx} className="teamspace-card">
                        <div className="teamspace-name">{teamspace}</div>
                        <div className="teamspace-count">{teamspacePages.length} pages</div>
                      </div>
                    );
                  })}
                  {pages.some(p => !p.teamspaceName || p.teamspaceName === 'Private Workspace') && (
                    <div className="teamspace-card">
                      <div className="teamspace-name">Private Workspace</div>
                      <div className="teamspace-count">
                        {pages.filter(p => !p.teamspaceName || p.teamspaceName === 'Private Workspace').length} pages
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="dashboard-tip">
                <span className="tip-icon">💡</span>
                <span>Click any page from the left sidebar or recent items above to view its content</span>
              </div>
            </div>
          )}
          </div>
        </ErrorBoundary>
      </div>
      </div>
    </DarkModeProvider>
  );
};

export default NotionWorkspaceViewer;
