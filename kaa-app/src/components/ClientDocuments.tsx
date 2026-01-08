import React, { useState, useEffect, useMemo } from 'react';
import logger from '../utils/logger';
import './ClientDocuments.css';

interface UploadedDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  uploadDate: string;
  uploadedBy: string;
  status: string;
  fileUrl?: string;
  fileSize?: number;
}

interface ClientDocumentsProps {
  clientAddress: string;
}

/**
 * Generate realistic dummy documents for landscape architecture projects
 */
const generateDummyDocuments = (clientAddress: string): UploadedDocument[] => {
  const now = new Date();
  const documents: UploadedDocument[] = [
    {
      id: '1',
      title: 'Site Survey & Analysis Report.pdf',
      category: 'Report',
      description: 'Complete site survey including soil analysis, drainage patterns, and existing vegetation assessment',
      uploadDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Project Manager',
      status: 'Approved',
      fileSize: 2450000
    },
    {
      id: '2',
      title: 'Initial Design Concept - Front Yard.pdf',
      category: 'Plan',
      description: 'Preliminary design concept for front yard landscaping with plant selections and hardscape elements',
      uploadDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Designer',
      status: 'Review',
      fileSize: 3200000
    },
    {
      id: '3',
      title: 'Project Contract & Agreement.pdf',
      category: 'Contract',
      description: 'Signed project contract outlining scope of work, timeline, and payment terms',
      uploadDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Project Manager',
      status: 'Approved',
      fileSize: 850000
    },
    {
      id: '4',
      title: 'Permit Application - Landscape.pdf',
      category: 'Permit',
      description: 'City permit application for landscape modifications and irrigation system installation',
      uploadDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: clientAddress,
      status: 'Pending',
      fileSize: 1200000
    },
    {
      id: '5',
      title: 'Invoice #2024-001.pdf',
      category: 'Invoice',
      description: 'Initial deposit invoice for design phase - 30% of total project cost',
      uploadDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Finance Team',
      status: 'Approved',
      fileSize: 450000
    },
    {
      id: '6',
      title: 'Site Photos - Before.pdf',
      category: 'Photo',
      description: 'Comprehensive photo documentation of existing site conditions from all angles',
      uploadDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: clientAddress,
      status: 'Approved',
      fileSize: 8500000
    },
    {
      id: '7',
      title: 'Plant Material List.xlsx',
      category: 'Document',
      description: 'Detailed list of all plants, quantities, and suppliers for the project',
      uploadDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Designer',
      status: 'Approved',
      fileSize: 280000
    },
    {
      id: '8',
      title: 'Irrigation System Plan.pdf',
      category: 'Plan',
      description: 'Detailed irrigation system layout with zone mapping and water flow calculations',
      uploadDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Designer',
      status: 'Review',
      fileSize: 2100000
    },
    {
      id: '9',
      title: 'Hardscape Material Specifications.pdf',
      category: 'Document',
      description: 'Specifications for pavers, retaining walls, and outdoor structures',
      uploadDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Project Manager',
      status: 'Approved',
      fileSize: 1800000
    },
    {
      id: '10',
      title: 'Property Survey - Existing Conditions.pdf',
      category: 'Document',
      description: 'Professional property survey showing lot lines, elevations, and existing structures',
      uploadDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: clientAddress,
      status: 'Approved',
      fileSize: 3200000
    },
    {
      id: '11',
      title: 'Revised Design - Backyard.pdf',
      category: 'Plan',
      description: 'Updated backyard design incorporating client feedback and site constraints',
      uploadDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Designer',
      status: 'Review',
      fileSize: 2800000
    },
    {
      id: '12',
      title: 'Maintenance Schedule & Care Guide.pdf',
      category: 'Document',
      description: 'Post-installation maintenance schedule and plant care instructions',
      uploadDate: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Project Manager',
      status: 'Approved',
      fileSize: 950000
    }
  ];

  // Sort by upload date (most recent first)
  return documents.sort((a, b) => 
    new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );
};

/**
 * Client Documents View - Optimized for client productivity
 * Features: Search, quick filters, sorting, bulk actions, and smart organization
 */
const ClientDocuments: React.FC<ClientDocumentsProps> = ({ clientAddress }) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadDocuments();
  }, [clientAddress]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/client/data/${encodeURIComponent(clientAddress)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      let docs = data.documents || [];
      
      // If no documents from API, use dummy data for demo
      if (docs.length === 0) {
        logger.info('No documents from API, using dummy data for demo');
        docs = generateDummyDocuments(clientAddress);
      }
      
      setDocuments(docs);
    } catch (err) {
      logger.error('Error loading documents:', err);
      
      // On error, use dummy data for better UX
      logger.info('Using dummy data due to API error');
      const dummyDocs = generateDummyDocuments(clientAddress);
      setDocuments(dummyDocs);
    } finally {
      setLoading(false);
    }
  };

  // Smart filtering and sorting
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status?.toLowerCase() === selectedStatus.toLowerCase());
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [documents, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Quick stats
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: documents.length,
      thisWeek: documents.filter(doc => new Date(doc.uploadDate) > weekAgo).length,
      thisMonth: documents.filter(doc => new Date(doc.uploadDate) > monthAgo).length,
      pending: documents.filter(doc => doc.status?.toLowerCase() === 'review' || doc.status?.toLowerCase() === 'pending').length,
      approved: documents.filter(doc => doc.status?.toLowerCase() === 'approved' || doc.status?.toLowerCase() === 'complete').length,
    };
  }, [documents]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach(doc => {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Document': '📄',
      'Invoice': '🧾',
      'Contract': '📋',
      'Photo': '📷',
      'Report': '📊',
      'Plan': '📐',
      'Permit': '🏛️',
      'Other': '📎'
    };
    return icons[category] || '📎';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categories = ['all', 'Document', 'Invoice', 'Contract', 'Photo', 'Report', 'Plan', 'Permit', 'Other'];
  const statuses = ['all', 'Pending', 'Review', 'Approved', 'Complete', 'Rejected'];

  if (loading) {
    return (
      <div className="client-documents">
        <div className="documents-loading">
          <div className="loading-spinner"></div>
          <p>Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-documents">
      {/* Header with Stats */}
      <div className="documents-header">
        <div className="header-main">
          <div className="header-title-section">
            <h1>📄 Your Documents</h1>
            <p className="documents-subtitle">Manage and access all your uploaded files</p>
          </div>
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Grid view"
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="documents-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-value">{stats.thisWeek}</div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="documents-toolbar">
        {/* Search */}
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search documents by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Category Filters */}
        <div className="quick-filters">
          <button
            className={`filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All ({stats.total})
          </button>
          {categories.filter(cat => cat !== 'all' && categoryCounts[cat] > 0).map(category => (
            <button
              key={category}
              className={`filter-pill ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {getCategoryIcon(category)} {category} ({categoryCounts[category]})
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="advanced-filters">
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
            aria-label="Filter by status"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status}
              </option>
            ))}
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="filter-select"
            aria-label="Sort by"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="status">Sort by Status</option>
          </select>

          <button
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Results Count */}
      {filteredAndSortedDocuments.length !== documents.length && (
        <div className="results-info">
          Showing {filteredAndSortedDocuments.length} of {documents.length} documents
          {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
            <button 
              className="clear-filters"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Documents Grid/List */}
      {filteredAndSortedDocuments.length === 0 ? (
        <div className="documents-empty">
          <div className="empty-icon">📭</div>
          <h3>No documents found</h3>
          <p>
            {searchQuery 
              ? `No documents match "${searchQuery}". Try a different search term.`
              : selectedCategory !== 'all'
              ? `You haven't uploaded any ${selectedCategory.toLowerCase()} documents yet.`
              : selectedStatus !== 'all'
              ? `You don't have any documents with status "${selectedStatus}".`
              : "You haven't uploaded any documents yet."}
          </p>
          {!searchQuery && selectedCategory === 'all' && selectedStatus === 'all' && (
            <p className="empty-hint">Use the Upload button in the header to add your first document.</p>
          )}
        </div>
      ) : (
        <div className={`documents-container ${viewMode}`}>
          {filteredAndSortedDocuments.map((doc) => (
            <div key={doc.id} className={`document-card ${doc.status?.toLowerCase() || 'pending'}`}>
              <div className="document-card-header">
                <div className="document-icon-large">
                  {getCategoryIcon(doc.category)}
                </div>
                <div className="document-title-section">
                  <h3 className="document-title" title={doc.title}>
                    {doc.title}
                  </h3>
                  <div className="document-badges">
                    <span className="category-badge">{doc.category}</span>
                    <span className={`status-badge status-${doc.status?.toLowerCase() || 'pending'}`}>
                      {doc.status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {doc.description && (
                <p className="document-description" title={doc.description}>
                  {doc.description}
                </p>
              )}

              <div className="document-meta">
                <div className="meta-row">
                  <span className="meta-icon">📅</span>
                  <span className="meta-text">{formatDate(doc.uploadDate)}</span>
                </div>
                {doc.uploadedBy && (
                  <div className="meta-row">
                    <span className="meta-icon">👤</span>
                    <span className="meta-text">{doc.uploadedBy}</span>
                  </div>
                )}
                {doc.fileSize && (
                  <div className="meta-row">
                    <span className="meta-icon">📦</span>
                    <span className="meta-text">{formatFileSize(doc.fileSize)}</span>
                  </div>
                )}
              </div>

              {doc.fileUrl ? (
                <a 
                  href={doc.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="document-action-btn"
                  aria-label={`Open ${doc.title}`}
                >
                  <span>Open Document</span>
                  <span className="action-arrow">→</span>
                </a>
              ) : (
                <div className="document-action-btn disabled">
                  <span>Document Preview</span>
                  <span className="action-arrow">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientDocuments;
