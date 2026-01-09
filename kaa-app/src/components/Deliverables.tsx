import React, { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import './Deliverables.css';

interface DeliverablesProps {
  clientAddress: string;
  projectId?: string;
  refreshKey?: number;
}

interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  deliveryMethod: 'upload' | 'link';
  uploadedBy: string;
  createdAt: string;
  downloadCount: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Deliverables Component - Shows project deliverables for clients
 * Clients can view and download deliverables uploaded by the team
 */
const Deliverables: React.FC<DeliverablesProps> = ({
  clientAddress,
  projectId = 'demo-project',
  refreshKey = 0
}) => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Available categories for filtering
  const categories = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'Document', label: 'Documents', icon: '📄' },
    { id: 'Drawing', label: 'Drawings', icon: '📐' },
    { id: 'Photo', label: 'Photos', icon: '📸' },
    { id: 'Plan', label: 'Plans', icon: '🗺️' },
    { id: 'Report', label: 'Reports', icon: '📊' },
    { id: 'Other', label: 'Other', icon: '📁' }
  ];

  const loadDeliverables = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from API
      const response = await fetch(
        `${API_BASE_URL}/api/client/${encodeURIComponent(clientAddress)}/deliverables`
      );

      if (response.ok) {
        const data = await response.json();
        setDeliverables(data.deliverables || []);
      } else {
        throw new Error('Failed to fetch deliverables');
      }
    } catch (err) {
      logger.error('Error fetching deliverables:', err);

      // Show demo data if API fails
      setDeliverables([
        {
          id: 'demo-1',
          projectId: 'demo-project',
          name: 'Landscape Design Concept.pdf',
          description: 'Initial concept designs for your landscape project',
          category: 'Drawing',
          fileUrl: '#demo',
          filePath: 'demo/concept.pdf',
          fileSize: 2500000,
          fileType: 'application/pdf',
          deliveryMethod: 'upload',
          uploadedBy: 'Project Manager',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          downloadCount: 3
        },
        {
          id: 'demo-2',
          projectId: 'demo-project',
          name: 'Site Survey Report.pdf',
          description: 'Comprehensive site survey and analysis',
          category: 'Report',
          fileUrl: '#demo',
          filePath: 'demo/survey.pdf',
          fileSize: 1800000,
          fileType: 'application/pdf',
          deliveryMethod: 'upload',
          uploadedBy: 'Survey Team',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          downloadCount: 2
        },
        {
          id: 'demo-3',
          projectId: 'demo-project',
          name: 'Plant Palette Reference',
          description: 'View the recommended plants for your project',
          category: 'Document',
          fileUrl: 'https://example.com/plants',
          filePath: 'https://example.com/plants',
          fileSize: 0,
          fileType: 'external-link',
          deliveryMethod: 'link',
          uploadedBy: 'Design Team',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          downloadCount: 5
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [clientAddress]);

  useEffect(() => {
    loadDeliverables();
  }, [loadDeliverables, refreshKey]);

  const handleDownload = async (deliverable: Deliverable) => {
    setDownloadingId(deliverable.id);

    try {
      // Track the download
      await fetch(`${API_BASE_URL}/api/deliverables/${deliverable.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: clientAddress })
      });

      // Handle the actual download
      if (deliverable.deliveryMethod === 'link' || deliverable.fileType === 'external-link') {
        // External link - open in new tab
        window.open(deliverable.fileUrl, '_blank', 'noopener,noreferrer');
      } else if (deliverable.fileUrl.startsWith('data:')) {
        // Data URL - create download link
        const link = document.createElement('a');
        link.href = deliverable.fileUrl;
        link.download = deliverable.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (deliverable.fileUrl.startsWith('#')) {
        // Demo or placeholder - show message
        alert('This is a demo deliverable. In production, the file would download here.');
      } else {
        // Regular URL - open in new tab or download
        window.open(deliverable.fileUrl, '_blank', 'noopener,noreferrer');
      }

      // Update local download count
      setDeliverables(prev =>
        prev.map(d =>
          d.id === deliverable.id
            ? { ...d, downloadCount: d.downloadCount + 1 }
            : d
        )
      );
    } catch (err) {
      logger.error('Error downloading deliverable:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return 'External Link';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFileIcon = (category: string, fileType: string): string => {
    if (fileType === 'external-link') return '🔗';

    switch (category.toLowerCase()) {
      case 'drawing': return '📐';
      case 'photo': return '📸';
      case 'plan': return '🗺️';
      case 'report': return '📊';
      case 'document': return '📄';
      default: return '📁';
    }
  };

  const filteredDeliverables = selectedCategory === 'all'
    ? deliverables
    : deliverables.filter(d => d.category === selectedCategory);

  if (loading) {
    return (
      <div className="deliverables">
        <div className="deliverables-header">
          <h2>📦 Deliverables</h2>
          <p className="deliverables-subtitle">Your project files and documents</p>
        </div>
        <div className="deliverables-loading">
          <div className="loading-spinner"></div>
          <p>Loading deliverables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="deliverables">
      <div className="deliverables-header">
        <div className="deliverables-title-section">
          <h2>📦 Deliverables</h2>
          <p className="deliverables-subtitle">Your project files and documents</p>
        </div>
        <button className="refresh-btn" onClick={loadDeliverables}>
          🔄 Refresh
        </button>
      </div>

      {/* Category Filter */}
      <div className="deliverables-filters">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="filter-icon">{cat.icon}</span>
            <span className="filter-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Deliverables List */}
      <div className="deliverables-content">
        {error && (
          <div className="deliverables-error">
            <p>{error}</p>
            <button onClick={loadDeliverables}>Try Again</button>
          </div>
        )}

        {filteredDeliverables.length === 0 ? (
          <div className="deliverables-empty">
            <div className="empty-icon">📭</div>
            <h3>No deliverables yet</h3>
            <p>
              {selectedCategory === 'all'
                ? 'Deliverables from your project team will appear here.'
                : `No ${selectedCategory.toLowerCase()} deliverables found.`}
            </p>
          </div>
        ) : (
          <div className="deliverables-grid">
            {filteredDeliverables.map(deliverable => (
              <div key={deliverable.id} className="deliverable-card">
                <div className="deliverable-icon">
                  {getFileIcon(deliverable.category, deliverable.fileType)}
                </div>

                <div className="deliverable-info">
                  <h3 className="deliverable-name">{deliverable.name}</h3>
                  {deliverable.description && (
                    <p className="deliverable-description">{deliverable.description}</p>
                  )}

                  <div className="deliverable-meta">
                    <span className="meta-item">
                      <span className="meta-icon">📁</span>
                      {deliverable.category}
                    </span>
                    <span className="meta-item">
                      <span className="meta-icon">📏</span>
                      {formatFileSize(deliverable.fileSize)}
                    </span>
                    <span className="meta-item">
                      <span className="meta-icon">📅</span>
                      {formatDate(deliverable.createdAt)}
                    </span>
                  </div>

                  <div className="deliverable-footer">
                    <span className="uploaded-by">
                      Uploaded by {deliverable.uploadedBy}
                    </span>
                    <span className="download-count">
                      {deliverable.downloadCount} download{deliverable.downloadCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <button
                  className={`download-btn ${downloadingId === deliverable.id ? 'downloading' : ''}`}
                  onClick={() => handleDownload(deliverable)}
                  disabled={downloadingId === deliverable.id}
                >
                  {downloadingId === deliverable.id ? (
                    <>
                      <span className="btn-spinner"></span>
                      Downloading...
                    </>
                  ) : deliverable.deliveryMethod === 'link' ? (
                    <>
                      <span className="btn-icon">🔗</span>
                      Open Link
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">⬇️</span>
                      Download
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {deliverables.length > 0 && (
        <div className="deliverables-stats">
          <div className="stat-item">
            <span className="stat-value">{deliverables.length}</span>
            <span className="stat-label">Total Deliverables</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {deliverables.filter(d => {
                const date = new Date(d.createdAt);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return date > weekAgo;
              }).length}
            </span>
            <span className="stat-label">Added This Week</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {deliverables.reduce((sum, d) => sum + d.downloadCount, 0)}
            </span>
            <span className="stat-label">Total Downloads</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliverables;
