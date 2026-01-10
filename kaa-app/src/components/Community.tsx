/**
 * Community Component
 * Allows users to share designs, ideas, processes, and communicate with the SAGE community.
 * Creates a viral loop for sharing garden designs, plans, and processes.
 */

import React, { useState, useEffect, useRef } from 'react';
import logger from '../utils/logger';
import './Community.css';

interface CommunityPost {
  id: string;
  author: string;
  authorAvatar?: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  isLiked?: boolean;
  projectType?: string;
  tier?: number;
}

interface Comment {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
}

interface CommunityProps {
  clientAddress: string;
}

const Community: React.FC<CommunityProps> = ({ clientAddress }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState<string[]>([]);
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableTags = [
    'Modern Garden', 'Traditional', 'Rustic', 'Contemporary', 'Mediterranean',
    'Tropical', 'Desert Landscape', 'Cottage Garden', 'Minimalist', 'Eclectic',
    'Outdoor Living', 'Vegetable Garden', 'Hardscape', 'Water Features', 'Lighting',
    'Sustainable', 'Drought Resistant', 'Native Plants', 'Before & After', 'DIY'
  ];

  useEffect(() => {
    loadCommunityPosts();
  }, [clientAddress]);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchQuery, filterTag, sortBy]);

  const loadCommunityPosts = async () => {
    setLoading(true);
    try {
      // Fetch community posts from API
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/community/posts`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('sage_auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('sage_auth_token')}`
            })
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      } else {
        // Fallback to demo data if API is unavailable
        logger.warn('Community API unavailable, using demo data');
        setPosts(getDemoPosts());
      }
    } catch (error) {
      logger.error('Error loading community posts:', error);
      // Use demo data on error
      setPosts(getDemoPosts());
    } finally {
      setLoading(false);
    }
  };

  const getDemoPosts = (): CommunityPost[] => [
    {
      id: '1',
      author: 'Sarah M.',
      authorAvatar: '👩‍🌾',
      title: 'Before & After: Modern Desert Transformation',
      content: 'Just completed our Tier 2 design! We transformed our barren backyard into a beautiful desert oasis. The hardscape features native plants and a stunning fire pit area. Couldn\'t be happier!',
      images: ['/placeholder-garden-1.jpg'],
      tags: ['Modern Garden', 'Desert Landscape', 'Before & After', 'Hardscape'],
      likes: 127,
      comments: 23,
      shares: 15,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      projectType: 'Residential',
      tier: 2
    },
    {
      id: '2',
      author: 'Mike T.',
      authorAvatar: '👨‍🔧',
      title: 'DIY Vegetable Garden Setup - Year 1 Results',
      content: 'Started with Tier 1 guidance last spring. Built raised beds using the SAGE garden guide. First harvest was amazing! Sharing some tips for beginners.',
      images: ['/placeholder-garden-2.jpg'],
      tags: ['Vegetable Garden', 'DIY', 'Sustainable', 'Native Plants'],
      likes: 89,
      comments: 18,
      shares: 32,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      projectType: 'Residential',
      tier: 1
    },
    {
      id: '3',
      author: 'Emma K.',
      authorAvatar: '🏡',
      title: 'Mediterranean-Inspired Patio Design',
      content: 'Working with the Tier 3 concierge team was incredible. They helped us create this stunning Mediterranean patio with custom pergola and built-in seating. The process was smooth from start to finish!',
      images: ['/placeholder-garden-3.jpg'],
      tags: ['Mediterranean', 'Outdoor Living', 'Hardscape', 'Contemporary'],
      likes: 234,
      comments: 45,
      shares: 67,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      projectType: 'Residential',
      tier: 3
    },
    {
      id: '4',
      author: 'David R.',
      authorAvatar: '🌿',
      title: 'Native Plant Garden - Drought Resistant Success',
      content: 'With water restrictions in our area, we focused on native and drought-resistant plants. The SAGE team helped us select the perfect combination. Three months in and everything is thriving!',
      images: ['/placeholder-garden-4.jpg'],
      tags: ['Native Plants', 'Drought Resistant', 'Sustainable', 'Modern Garden'],
      likes: 156,
      comments: 29,
      shares: 41,
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      projectType: 'Residential',
      tier: 2
    }
  ];

  const filterAndSortPosts = () => {
    let filtered = [...posts];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query)) ||
        post.author.toLowerCase().includes(query)
      );
    }

    // Filter by tag
    if (filterTag !== 'all') {
      filtered = filtered.filter(post => post.tags.includes(filterTag));
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));
        break;
      case 'trending':
        // Recent posts with high engagement
        filtered.sort((a, b) => {
          const aScore = (b.likes + b.comments) / (Date.now() - new Date(b.createdAt).getTime());
          const bScore = (a.likes + a.comments) / (Date.now() - new Date(a.createdAt).getTime());
          return aScore - bScore;
        });
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    setFilteredPosts(filtered);
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/community/posts/${postId}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('sage_auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('sage_auth_token')}`
            })
          }
        }
      );

      if (response.ok) {
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? { ...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked }
              : post
          )
        );
      }
    } catch (error) {
      logger.error('Error liking post:', error);
      // Optimistic update
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked }
            : post
        )
      );
    }
  };

  const handleShare = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (post) {
        if (navigator.share) {
          await navigator.share({
            title: post.title,
            text: post.content,
            url: window.location.href
          });

          // Track share
          await fetch(
            `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/community/posts/${postId}/share`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('sage_auth_token') && {
                  Authorization: `Bearer ${localStorage.getItem('sage_auth_token')}`
                })
              }
            }
          );

          setPosts(prevPosts =>
            prevPosts.map(p =>
              p.id === postId ? { ...p, shares: p.shares + 1 } : p
            )
          );
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        }
      }
    } catch (error) {
      logger.error('Error sharing post:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewPostImages(prev => [...prev, event.target.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert('Please fill in title and content');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/community/posts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('sage_auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('sage_auth_token')}`
            })
          },
          body: JSON.stringify({
            title: newPostTitle,
            content: newPostContent,
            tags: newPostTags,
            images: newPostImages,
            author: clientAddress.split('@')[0] || 'Anonymous'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPosts(prev => [data.post, ...prev]);
        setShowCreateModal(false);
        setNewPostTitle('');
        setNewPostContent('');
        setNewPostTags([]);
        setNewPostImages([]);
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      logger.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="community-page">
      <div className="community-header">
        <div className="community-header-content">
          <h1>🌱 SAGE Community</h1>
          <p>Share your designs, ideas, and garden transformations with the community</p>
        </div>
        <button
          className="community-create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          ✨ Share Your Garden
        </button>
      </div>

      <div className="community-filters">
        <div className="community-search">
          <input
            type="text"
            placeholder="Search posts, tags, or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="community-search-input"
          />
        </div>

        <div className="community-filter-group">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'trending')}
            className="community-filter-select"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="trending">Trending</option>
          </select>
        </div>

        <div className="community-filter-group">
          <label>Filter by tag:</label>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="community-filter-select"
          >
            <option value="all">All Tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="community-loading">
          <div className="loading-spinner"></div>
          <p>Loading community posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="community-empty">
          <div className="empty-icon">🌿</div>
          <h3>No posts found</h3>
          <p>Try adjusting your search or filters, or be the first to share!</p>
          <button
            className="community-empty-btn"
            onClick={() => setShowCreateModal(true)}
          >
            Create First Post
          </button>
        </div>
      ) : (
        <div className="community-posts">
          {filteredPosts.map(post => (
            <div key={post.id} className="community-post-card">
              <div className="post-header">
                <div className="post-author">
                  <span className="post-author-avatar">{post.authorAvatar || '👤'}</span>
                  <div className="post-author-info">
                    <strong>{post.author}</strong>
                    <span className="post-time">{formatTimeAgo(post.createdAt)}</span>
                  </div>
                </div>
                {post.tier && (
                  <span className="post-tier-badge">Tier {post.tier}</span>
                )}
              </div>

              <h3 className="post-title" onClick={() => setSelectedPost(post)}>
                {post.title}
              </h3>

              <p className="post-content">{post.content}</p>

              {post.images.length > 0 && (
                <div className="post-images">
                  {post.images.slice(0, 3).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${post.title} - Image ${idx + 1}`}
                      className="post-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EGarden Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ))}
                  {post.images.length > 3 && (
                    <div className="post-images-more">+{post.images.length - 3} more</div>
                  )}
                </div>
              )}

              <div className="post-tags">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="post-tag"
                    onClick={() => setFilterTag(tag)}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="post-actions">
                <button
                  className={`post-action-btn ${post.isLiked ? 'liked' : ''}`}
                  onClick={() => handleLike(post.id)}
                >
                  ❤️ {post.likes}
                </button>
                <button
                  className="post-action-btn"
                  onClick={() => setSelectedPost(post)}
                >
                  💬 {post.comments}
                </button>
                <button
                  className="post-action-btn"
                  onClick={() => handleShare(post.id)}
                >
                  🔗 Share ({post.shares})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="community-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="community-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Your Garden Journey</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g., Before & After: Modern Backyard Transformation"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Your Story *</label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Tell us about your garden project, what inspired you, challenges you faced, and the results..."
                  rows={6}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Add Images</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="form-file-input"
                />
                {newPostImages.length > 0 && (
                  <div className="form-images-preview">
                    {newPostImages.map((img, idx) => (
                      <img key={idx} src={img} alt={`Preview ${idx + 1}`} className="form-image-preview" />
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Tags (select relevant ones)</label>
                <div className="form-tags">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      className={`form-tag ${newPostTags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => {
                        if (newPostTags.includes(tag)) {
                          setNewPostTags(prev => prev.filter(t => t !== tag));
                        } else {
                          setNewPostTags(prev => [...prev, tag]);
                        }
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="modal-btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="modal-btn-submit"
                  onClick={handleCreatePost}
                >
                  Share with Community
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="community-modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="community-modal community-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPost.title}</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedPost(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="post-detail-author">
                <span className="post-author-avatar">{selectedPost.authorAvatar || '👤'}</span>
                <div>
                  <strong>{selectedPost.author}</strong>
                  <span className="post-time">{formatTimeAgo(selectedPost.createdAt)}</span>
                </div>
              </div>

              <p className="post-detail-content">{selectedPost.content}</p>

              {selectedPost.images.length > 0 && (
                <div className="post-detail-images">
                  {selectedPost.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${selectedPost.title} - Image ${idx + 1}`}
                      className="post-detail-image"
                    />
                  ))}
                </div>
              )}

              <div className="post-detail-actions">
                <button
                  className={`post-action-btn ${selectedPost.isLiked ? 'liked' : ''}`}
                  onClick={() => handleLike(selectedPost.id)}
                >
                  ❤️ {selectedPost.likes}
                </button>
                <button className="post-action-btn">
                  💬 {selectedPost.comments}
                </button>
                <button
                  className="post-action-btn"
                  onClick={() => handleShare(selectedPost.id)}
                >
                  🔗 Share ({selectedPost.shares})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
