import React, { useState, useEffect, useRef } from 'react';
import logger from '../utils/logger';
import './DesignIdeas.css';

interface DesignIdea {
  id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  source?: 'pinterest' | 'upload' | 'url';
  pinterestUrl?: string;
  tags?: string[];
  addedAt: string;
  clientAddress: string;
}

interface DesignIdeasProps {
  clientAddress: string;
}

const DesignIdeas: React.FC<DesignIdeasProps> = ({ clientAddress }) => {
  const [designIdeas, setDesignIdeas] = useState<DesignIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinterestModal, setShowPinterestModal] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'url' | 'pinterest'>('upload');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [pinterestBoardUrl, setPinterestBoardUrl] = useState('');
  const [pinterestLoading, setPinterestLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commonTags = [
    'Modern', 'Traditional', 'Rustic', 'Contemporary', 'Mediterranean', 
    'Tropical', 'Desert', 'Cottage', 'Minimalist', 'Eclectic', 
    'Outdoor Living', 'Garden', 'Hardscape', 'Water Features', 'Lighting'
  ];

  useEffect(() => {
    loadDesignIdeas();
    // Mark that user has visited design ideas section (for Sage prompts)
    localStorage.setItem('kaa-design-ideas-visited', 'true');
  }, [clientAddress]);

  const loadDesignIdeas = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/client/design-ideas/${encodeURIComponent(clientAddress)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDesignIdeas(data.designIdeas || []);
      } else {
        // Fallback to dummy data for demo
        setDesignIdeas(generateDummyDesignIdeas());
      }
    } catch (err) {
      logger.error('Error loading design ideas:', err);
      // Fallback to dummy data
      setDesignIdeas(generateDummyDesignIdeas());
    } finally {
      setLoading(false);
    }
  };

  const generateDummyDesignIdeas = (): DesignIdea[] => {
    const now = new Date();
    return [
      {
        id: '1',
        imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
        title: 'Modern Minimalist Garden',
        description: 'Clean lines and simple plantings',
        source: 'upload',
        tags: ['Modern', 'Minimalist', 'Garden'],
        addedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        clientAddress
      },
      {
        id: '2',
        imageUrl: 'https://images.unsplash.com/photo-1464822759844-d150ad2996e3?w=400',
        title: 'Mediterranean Courtyard',
        description: 'Warm colors and drought-tolerant plants',
        source: 'pinterest',
        pinterestUrl: 'https://pinterest.com/pin/example',
        tags: ['Mediterranean', 'Outdoor Living', 'Hardscape'],
        addedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        clientAddress
      },
      {
        id: '3',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
        title: 'Tropical Paradise',
        description: 'Lush greenery and water features',
        source: 'upload',
        tags: ['Tropical', 'Water Features', 'Garden'],
        addedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        clientAddress
      },
      {
        id: '4',
        imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
        title: 'Rustic Farmhouse Style',
        description: 'Natural materials and native plants',
        source: 'pinterest',
        pinterestUrl: 'https://pinterest.com/pin/example2',
        tags: ['Rustic', 'Traditional', 'Garden'],
        addedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        clientAddress
      },
      {
        id: '5',
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400',
        title: 'Contemporary Outdoor Kitchen',
        description: 'Modern hardscape with integrated cooking',
        source: 'upload',
        tags: ['Contemporary', 'Outdoor Living', 'Hardscape'],
        addedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        clientAddress
      },
      {
        id: '6',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        title: 'Desert Oasis',
        description: 'Xeriscape with native desert plants',
        source: 'url',
        tags: ['Desert', 'Minimalist', 'Garden'],
        addedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        clientAddress
      }
    ];
  };

  const handleAddImage = async () => {
    if (addMode === 'upload' && fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      await uploadImageFile(file);
    } else if (addMode === 'url' && newImageUrl.trim()) {
      await addImageFromUrl();
    } else if (addMode === 'pinterest' && pinterestBoardUrl.trim()) {
      await importPinterestBoard();
    }
  };

  const uploadImageFile = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('address', clientAddress);
      formData.append('title', newTitle.trim().slice(0, 200));
      formData.append('description', newDescription.trim().slice(0, 1000));
      formData.append('tags', JSON.stringify(selectedTags));

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/client/design-ideas/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDesignIdeas(prev => [data.designIdea, ...prev]);
        setShowAddModal(false);
        resetAddForm();
      } else {
        const errorData = await response.json();
        logger.error('Upload failed:', errorData.error);
        alert(errorData.error || 'Failed to upload image');
      }
    } catch (error) {
      logger.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addImageFromUrl = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/client/design-ideas/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: clientAddress,
            imageUrl: newImageUrl.trim(),
            title: newTitle.trim().slice(0, 200),
            description: newDescription.trim().slice(0, 1000),
            tags: selectedTags,
            source: 'url'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDesignIdeas(prev => [data.designIdea, ...prev]);
        setShowAddModal(false);
        resetAddForm();
      } else {
        const errorData = await response.json();
        logger.error('Add failed:', errorData.error);
        alert(errorData.error || 'Failed to add image');
      }
    } catch (error) {
      logger.error('Error adding image:', error);
      alert('Failed to add image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const importPinterestBoard = async () => {
    try {
      setPinterestLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/client/design-ideas/pinterest-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: clientAddress,
            boardUrl: pinterestBoardUrl.trim()
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDesignIdeas(prev => [...data.designIdeas, ...prev]);
        setShowPinterestModal(false);
        setPinterestBoardUrl('');
        alert(`Successfully imported ${data.designIdeas.length} images from Pinterest!`);
      } else {
        const errorData = await response.json();
        logger.error('Pinterest import failed:', errorData.error);
        alert(errorData.error || 'Failed to import from Pinterest. Please check the board URL.');
      }
    } catch (error) {
      logger.error('Error importing from Pinterest:', error);
      alert('Failed to import from Pinterest. Please try again.');
    } finally {
      setPinterestLoading(false);
    }
  };

  const resetAddForm = () => {
    setNewImageUrl('');
    setNewTitle('');
    setNewDescription('');
    setSelectedTags([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this design idea?')) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/client/design-ideas/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: clientAddress })
        }
      );

      if (response.ok) {
        setDesignIdeas(prev => prev.filter(idea => idea.id !== id));
      } else {
        logger.error('Failed to delete design idea');
        alert('Failed to remove design idea');
      }
    } catch (error) {
      logger.error('Error deleting design idea:', error);
      alert('Failed to remove design idea. Please try again.');
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const allTags = Array.from(new Set(designIdeas.flatMap(idea => idea.tags || [])));

  const filteredIdeas = designIdeas.filter(idea => {
    const matchesSearch = !searchQuery.trim() || 
      (idea.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       idea.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       idea.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesTag = filterTag === 'all' || idea.tags?.includes(filterTag);
    
    return matchesSearch && matchesTag;
  });

  if (loading && designIdeas.length === 0) {
    return (
      <div className="design-ideas">
        <div className="design-ideas-loading">
          <div className="loading-spinner"></div>
          <p>Loading your design ideas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="design-ideas">
      {/* Header */}
      <div className="design-ideas-header">
        <div className="header-main">
          <div className="header-title-section">
            <h1>🎨 Design Ideas</h1>
            <p className="design-ideas-subtitle">Collect and organize your design inspiration</p>
          </div>
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowPinterestModal(true)}
            >
              📌 Import from Pinterest
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setAddMode('upload');
                setShowAddModal(true);
              }}
            >
              + Add Image
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="design-ideas-toolbar">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search design ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          <div className="tag-filters">
            <button
              className={`tag-filter ${filterTag === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTag('all')}
            >
              All ({designIdeas.length})
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-filter ${filterTag === tag ? 'active' : ''}`}
                onClick={() => setFilterTag(tag)}
              >
                {tag} ({designIdeas.filter(i => i.tags?.includes(tag)).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pinterest-style Grid */}
      {filteredIdeas.length === 0 ? (
        <div className="design-ideas-empty">
          <div className="empty-icon">🎨</div>
          <h3>No design ideas yet</h3>
          <p>
            {searchQuery 
              ? `No design ideas match "${searchQuery}". Try a different search term.`
              : filterTag !== 'all'
              ? `You don't have any design ideas tagged "${filterTag}" yet.`
              : "Start building your design inspiration board! Add images from your computer, import from Pinterest, or add images by URL."}
          </p>
          {!searchQuery && filterTag === 'all' && (
            <div className="empty-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setAddMode('upload');
                  setShowAddModal(true);
                }}
              >
                + Add Your First Image
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowPinterestModal(true)}
              >
                📌 Import from Pinterest
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="design-ideas-grid">
          {filteredIdeas.map((idea) => (
            <div key={idea.id} className="design-idea-card">
              <div className="idea-image-container">
                <img 
                  src={idea.imageUrl} 
                  alt={idea.title || 'Design idea'}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400x600?text=Image+Not+Available';
                  }}
                />
                <div className="idea-overlay">
                  <button
                    className="idea-delete-btn"
                    onClick={() => handleDelete(idea.id)}
                    aria-label="Delete design idea"
                    title="Remove this design idea"
                  >
                    ✕
                  </button>
                  {idea.pinterestUrl && (
                    <a
                      href={idea.pinterestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="idea-pinterest-link"
                      title="View on Pinterest"
                    >
                      📌
                    </a>
                  )}
                </div>
              </div>
              {(idea.title || idea.description || idea.tags?.length) && (
                <div className="idea-details">
                  {idea.title && <h3 className="idea-title">{idea.title}</h3>}
                  {idea.description && (
                    <p className="idea-description">{idea.description}</p>
                  )}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="idea-tags">
                      {idea.tags.map(tag => (
                        <span key={tag} className="idea-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Image Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Design Idea</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`modal-tab ${addMode === 'upload' ? 'active' : ''}`}
                onClick={() => setAddMode('upload')}
              >
                📤 Upload
              </button>
              <button
                className={`modal-tab ${addMode === 'url' ? 'active' : ''}`}
                onClick={() => setAddMode('url')}
              >
                🔗 URL
              </button>
            </div>

            <div className="modal-body">
              {addMode === 'upload' && (
                <div className="upload-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="upload-area"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {fileInputRef.current?.files?.[0] ? (
                      <div>
                        <span>📎</span>
                        <p>{fileInputRef.current.files[0].name}</p>
                        <small>Click to change</small>
                      </div>
                    ) : (
                      <div>
                        <span>📤</span>
                        <p>Click to upload an image</p>
                        <small>JPG, PNG, GIF up to 10MB</small>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {addMode === 'url' && (
                <div className="url-section">
                  <label>Image URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/image.jpg"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Title (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Modern Minimalist Garden"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="What do you like about this design?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Tags (click to select)</label>
                <div className="tags-selector">
                  {commonTags.map(tag => (
                    <button
                      key={tag}
                      className={`tag-option ${selectedTags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAddImage}
                disabled={loading || (addMode === 'url' && !newImageUrl.trim()) || (addMode === 'upload' && !fileInputRef.current?.files?.[0])}
              >
                {loading ? 'Adding...' : 'Add Design Idea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinterest Import Modal */}
      {showPinterestModal && (
        <div className="modal-overlay" onClick={() => setShowPinterestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import from Pinterest</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowPinterestModal(false);
                  setPinterestBoardUrl('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Pinterest Board URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://www.pinterest.com/username/board-name/"
                  value={pinterestBoardUrl}
                  onChange={(e) => setPinterestBoardUrl(e.target.value)}
                />
                <small className="form-hint">
                  Paste the URL of your Pinterest board to import all images
                </small>
              </div>

              <div className="pinterest-info">
                <p><strong>💡 How to get your board URL:</strong></p>
                <ol>
                  <li>Go to your Pinterest board</li>
                  <li>Copy the URL from your browser's address bar</li>
                  <li>Paste it above</li>
                </ol>
                <p className="note">
                  <strong>Note:</strong> You may need to connect your Pinterest account first in Settings.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowPinterestModal(false);
                  setPinterestBoardUrl('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={importPinterestBoard}
                disabled={pinterestLoading || !pinterestBoardUrl.trim()}
              >
                {pinterestLoading ? 'Importing...' : 'Import Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignIdeas;
