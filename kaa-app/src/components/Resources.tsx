import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';
import './Resources.css';

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: 'COURSE' | 'TRAINING' | 'INSTALL_GALLERY' | 'TEMPLATE' | 'GUIDE' | 'VIDEO' | 'DOCUMENT';
  category?: string;
  requiredTier: number; // 1 = Basic, 2 = Pro
  notionUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  tags: string[];
  isFeatured: boolean;
  viewCount: number;
}

interface SubscriptionInfo {
  tier: 'BASIC' | 'PRO' | null;
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | null;
  hasAccess: boolean;
}

interface ResourcesProps {
  clientAddress: string;
}

// Demo resources when API is unavailable
const DEMO_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Getting Started with Landscape Design',
    description: 'Learn the fundamentals of landscape design including space planning, plant selection, and basic design principles.',
    type: 'COURSE',
    category: 'Fundamentals',
    requiredTier: 1,
    thumbnailUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400',
    duration: '45 min',
    tags: ['beginner', 'fundamentals', 'design'],
    isFeatured: true,
    viewCount: 1234,
  },
  {
    id: '2',
    title: 'Native Plant Selection Guide',
    description: 'A comprehensive guide to choosing native plants that thrive in your region and support local ecosystems.',
    type: 'GUIDE',
    category: 'Plants',
    requiredTier: 1,
    thumbnailUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
    duration: '20 min read',
    tags: ['plants', 'native', 'sustainability'],
    isFeatured: false,
    viewCount: 892,
  },
  {
    id: '3',
    title: 'Install Gallery: Modern Backyard Oasis',
    description: 'See the complete transformation of a suburban backyard into a modern entertainment space with pool and outdoor kitchen.',
    type: 'INSTALL_GALLERY',
    category: 'Inspiration',
    requiredTier: 1,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    tags: ['modern', 'backyard', 'pool'],
    isFeatured: true,
    viewCount: 2341,
  },
  {
    id: '4',
    title: 'Hardscape Design Masterclass',
    description: 'Advanced techniques for designing patios, walkways, retaining walls, and other hardscape elements.',
    type: 'TRAINING',
    category: 'Advanced',
    requiredTier: 2,
    thumbnailUrl: 'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=400',
    duration: '2 hours',
    tags: ['hardscape', 'advanced', 'patio'],
    isFeatured: false,
    viewCount: 567,
  },
  {
    id: '5',
    title: 'Water Feature Installation Video',
    description: 'Step-by-step video guide for planning and installing water features including ponds, fountains, and waterfalls.',
    type: 'VIDEO',
    category: 'Installation',
    requiredTier: 2,
    thumbnailUrl: 'https://images.unsplash.com/photo-1585419497964-e31f5f4ea3fc?w=400',
    duration: '35 min',
    tags: ['water', 'fountain', 'installation'],
    isFeatured: false,
    viewCount: 445,
  },
  {
    id: '6',
    title: 'Project Planning Template',
    description: 'Downloadable template for organizing your landscape project from concept to completion.',
    type: 'TEMPLATE',
    category: 'Tools',
    requiredTier: 1,
    tags: ['template', 'planning', 'organization'],
    isFeatured: false,
    viewCount: 678,
  },
  {
    id: '7',
    title: 'Install Gallery: Drought-Tolerant Front Yard',
    description: 'Beautiful xeriscape design that reduced water usage by 70% while creating stunning curb appeal.',
    type: 'INSTALL_GALLERY',
    category: 'Inspiration',
    requiredTier: 1,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
    tags: ['xeriscape', 'drought-tolerant', 'front-yard'],
    isFeatured: false,
    viewCount: 1567,
  },
  {
    id: '8',
    title: 'Lighting Design for Landscapes',
    description: 'Create ambiance and extend outdoor living hours with professional lighting design techniques.',
    type: 'COURSE',
    category: 'Design',
    requiredTier: 2,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    duration: '1 hour',
    tags: ['lighting', 'design', 'outdoor'],
    isFeatured: true,
    viewCount: 789,
  },
];

const Resources: React.FC<ResourcesProps> = ({ clientAddress }) => {
  const [resources, setResources] = useState<Resource[]>(DEMO_RESOURCES);
  const [loading, setLoading] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    tier: 'BASIC', // Default to basic for demo
    status: 'ACTIVE',
    hasAccess: true
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  useEffect(() => {
    loadResources();
    checkSubscription();
  }, [clientAddress]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/resources`,
        {
          headers: {
            'X-Client-Address': clientAddress
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load resources');
      }

      const data = await response.json();
      if (data.resources && data.resources.length > 0) {
        setResources(data.resources);
        setUsingDemoData(false);
      } else {
        setUsingDemoData(true);
      }
    } catch (error) {
      logger.error('Error loading resources:', error);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/subscription/status`,
        {
          headers: {
            'X-Client-Address': clientAddress
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      logger.error('Error checking subscription:', error);
      // Keep demo subscription
    }
  };

  const handleUpgrade = (requiredTier: number) => {
    const tierName = requiredTier === 1 ? 'Basic' : 'Pro';
    const price = requiredTier === 1 ? '$7/month' : '$20/month';
    
    if (window.confirm(`Upgrade to ${tierName} subscription (${price}) to access this content?`)) {
      window.location.href = `/pricing?tier=${requiredTier}`;
    }
  };

  const canAccess = (requiredTier: number): boolean => {
    if (!subscription.hasAccess) return false;
    
    if (requiredTier === 1) {
      return subscription.tier === 'BASIC' || subscription.tier === 'PRO';
    } else if (requiredTier === 2) {
      return subscription.tier === 'PRO';
    }
    
    return false;
  };

  const getTypeIcon = (type: Resource['type']): string => {
    const icons: Record<Resource['type'], string> = {
      COURSE: '📚',
      TRAINING: '🎓',
      INSTALL_GALLERY: '🏡',
      TEMPLATE: '📋',
      GUIDE: '📖',
      VIDEO: '🎥',
      DOCUMENT: '📄'
    };
    return icons[type] || '📄';
  };

  const filteredResources = resources.filter(resource => {
    if (filterType !== 'all' && resource.type !== filterType) return false;
    if (filterCategory !== 'all' && resource.category !== filterCategory) return false;
    return true;
  });

  const categories = Array.from(new Set(resources.map(r => r.category).filter(Boolean)));
  const types = Array.from(new Set(resources.map(r => r.type)));

  if (loading) {
    return (
      <div className="resources-container">
        <div className="resources-loading">
          <div className="loading-spinner"></div>
          <p>Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resources-container">
      {/* Header */}
      <div className="resources-header">
        <div className="header-content">
          <h1>📚 SAGE Resources</h1>
          <p className="resources-subtitle">
            Access courses, training materials, and our complete install gallery
          </p>
          {usingDemoData && (
            <p className="demo-notice">⚠️ Showing demo content</p>
          )}
        </div>
        
        {/* Subscription Status */}
        <div className="subscription-status">
          {subscription.hasAccess ? (
            <div className="subscription-badge active">
              <span className="badge-icon">✓</span>
              <span className="badge-text">
                {subscription.tier === 'PRO' ? 'Pro Member' : 'Basic Member'}
              </span>
            </div>
          ) : (
            <div className="subscription-badge inactive">
              <span className="badge-text">No Active Subscription</span>
              <button 
                className="btn-upgrade"
                onClick={() => handleUpgrade(1)}
              >
                Subscribe
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="resources-filters">
        <div className="filter-group">
          <label>Type:</label>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>
                {getTypeIcon(type as Resource['type'])} {type.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {categories.length > 0 && (
          <div className="filter-group">
            <label>Category:</label>
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resources Grid */}
      <div className="resources-grid">
        {filteredResources.length === 0 ? (
          <div className="resources-empty">
            <p>No resources found matching your filters.</p>
          </div>
        ) : (
          filteredResources.map(resource => {
            const hasAccess = canAccess(resource.requiredTier);
            const tierName = resource.requiredTier === 1 ? 'Basic' : 'Pro';
            const tierPrice = resource.requiredTier === 1 ? '$7/month' : '$20/month';

            return (
              <div 
                key={resource.id} 
                className={`resource-card ${resource.isFeatured ? 'featured' : ''} ${!hasAccess ? 'locked' : ''}`}
                onClick={() => hasAccess && setSelectedResource(resource)}
              >
                {resource.isFeatured && (
                  <div className="resource-badge">⭐ Featured</div>
                )}
                
                {!hasAccess && (
                  <div className="resource-lock-overlay">
                    <div className="lock-icon">🔒</div>
                    <p className="lock-text">Pro Content</p>
                    <button
                      className="btn-unlock"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpgrade(resource.requiredTier);
                      }}
                    >
                      Upgrade to {tierName} ({tierPrice})
                    </button>
                  </div>
                )}

                {resource.thumbnailUrl && (
                  <div className="resource-thumbnail">
                    <img src={resource.thumbnailUrl} alt={resource.title} />
                  </div>
                )}

                <div className="resource-content">
                  <div className="resource-header">
                    <span className="resource-type-icon">
                      {getTypeIcon(resource.type)}
                    </span>
                    <span className="resource-type">{resource.type.replace('_', ' ')}</span>
                  </div>

                  <h3 className="resource-title">{resource.title}</h3>
                  
                  {resource.description && (
                    <p className="resource-description">{resource.description}</p>
                  )}

                  <div className="resource-meta">
                    {resource.duration && (
                      <span className="resource-duration">⏱ {resource.duration}</span>
                    )}
                    {resource.category && (
                      <span className="resource-category">📁 {resource.category}</span>
                    )}
                    <span className="resource-views">👁 {resource.viewCount} views</span>
                  </div>

                  {resource.tags.length > 0 && (
                    <div className="resource-tags">
                      {resource.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="resource-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  {hasAccess && resource.notionUrl && (
                    <div className="resource-actions">
                      <a
                        href={resource.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view-resource"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View in Notion →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <div 
          className="resource-modal-overlay"
          onClick={() => setSelectedResource(null)}
        >
          <div 
            className="resource-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="modal-close"
              onClick={() => setSelectedResource(null)}
            >
              ×
            </button>
            
            <div className="modal-header">
              <span className="modal-type-icon">
                {getTypeIcon(selectedResource.type)}
              </span>
              <h2>{selectedResource.title}</h2>
            </div>

            {selectedResource.description && (
              <p className="modal-description">{selectedResource.description}</p>
            )}

            <div className="modal-meta">
              {selectedResource.duration && (
                <span>⏱ {selectedResource.duration}</span>
              )}
              {selectedResource.category && (
                <span>📁 {selectedResource.category}</span>
              )}
              <span>👁 {selectedResource.viewCount} views</span>
            </div>

            {selectedResource.notionUrl && (
              <div className="modal-actions">
                <a
                  href={selectedResource.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Open in Notion →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
