import React, { useState } from 'react';
import './CommunityFeed.css';

interface FeedPost {
  id: string;
  type: 'update' | 'milestone' | 'tip' | 'announcement' | 'showcase';
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timestamp: string;
  isLiked?: boolean;
}

interface CommunityFeedProps {
  clientAddress?: string;
}

// Demo feed data
const DEMO_FEED: FeedPost[] = [
  {
    id: '1',
    type: 'announcement',
    author: {
      name: 'SAGE Team',
      role: 'Official',
      avatar: '🌿',
    },
    content: '🎉 Welcome to the SAGE Community! This is your space to connect with fellow landscape design enthusiasts, get tips from our experts, and see inspiring project showcases. Feel free to explore and engage!',
    likes: 24,
    comments: 5,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'tip',
    author: {
      name: 'Sarah Chen',
      role: 'Lead Designer',
      avatar: '👩‍🎨',
    },
    content: '💡 Design Tip of the Week: When planning your outdoor space, always consider the "flow" - how people will naturally move through the area. Create clear pathways and destination points like seating areas or focal features.',
    likes: 18,
    comments: 3,
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'showcase',
    author: {
      name: 'SAGE Projects',
      role: 'Showcase',
      avatar: '🏡',
    },
    content: '✨ Project Spotlight: Check out this stunning backyard transformation! Our client wanted a low-maintenance modern oasis, and we delivered with native plants, a clean patio design, and ambient lighting. Swipe to see the before & after!',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    likes: 45,
    comments: 12,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'milestone',
    author: {
      name: 'Project Updates',
      role: 'System',
      avatar: '🎯',
    },
    content: '🏆 Milestone Alert: 500+ landscape designs completed this year! Thank you to our amazing community of clients and designers who make this possible. Here\'s to creating more beautiful outdoor spaces together!',
    likes: 67,
    comments: 8,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    type: 'tip',
    author: {
      name: 'Mike Rodriguez',
      role: 'Horticulturist',
      avatar: '🌱',
    },
    content: '🌿 Seasonal Reminder: Now is the perfect time to plan your spring plantings! Consider adding native pollinator plants to support local ecosystems. Some great options: Milkweed, Coneflowers, and Black-eyed Susans.',
    likes: 31,
    comments: 7,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    type: 'update',
    author: {
      name: 'SAGE Team',
      role: 'Official',
      avatar: '🌿',
    },
    content: '📢 New Feature: You can now save your favorite design ideas directly from Pinterest! Head to the Design Ideas section in your portal to try it out. We\'ve made it easier than ever to collect and organize your inspiration.',
    likes: 22,
    comments: 4,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const CommunityFeed: React.FC<CommunityFeedProps> = ({ clientAddress }) => {
  const [posts, setPosts] = useState<FeedPost[]>(DEMO_FEED);
  const [filter, setFilter] = useState<'all' | 'tips' | 'showcase' | 'announcements'>('all');

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked,
        };
      }
      return post;
    }));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return '📢';
      case 'tip': return '💡';
      case 'showcase': return '✨';
      case 'milestone': return '🎯';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'announcement': return 'Announcement';
      case 'tip': return 'Design Tip';
      case 'showcase': return 'Showcase';
      case 'milestone': return 'Milestone';
      default: return 'Update';
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'tips') return post.type === 'tip';
    if (filter === 'showcase') return post.type === 'showcase';
    if (filter === 'announcements') return post.type === 'announcement' || post.type === 'milestone';
    return true;
  });

  return (
    <div className="community-feed">
      {/* Header */}
      <div className="feed-header">
        <div className="feed-header-content">
          <h1>🌿 SAGE Community</h1>
          <p className="feed-subtitle">Tips, updates, and inspiration from the SAGE design community</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="feed-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Posts
        </button>
        <button 
          className={`filter-btn ${filter === 'tips' ? 'active' : ''}`}
          onClick={() => setFilter('tips')}
        >
          💡 Tips
        </button>
        <button 
          className={`filter-btn ${filter === 'showcase' ? 'active' : ''}`}
          onClick={() => setFilter('showcase')}
        >
          ✨ Showcase
        </button>
        <button 
          className={`filter-btn ${filter === 'announcements' ? 'active' : ''}`}
          onClick={() => setFilter('announcements')}
        >
          📢 Announcements
        </button>
      </div>

      {/* Feed Posts */}
      <div className="feed-posts">
        {filteredPosts.map(post => (
          <div key={post.id} className={`feed-post post-type-${post.type}`}>
            {/* Post Header */}
            <div className="post-header">
              <div className="post-avatar">{post.author.avatar}</div>
              <div className="post-author-info">
                <span className="post-author-name">{post.author.name}</span>
                <span className="post-author-role">{post.author.role}</span>
              </div>
              <div className="post-meta">
                <span className="post-type-badge">
                  {getTypeIcon(post.type)} {getTypeLabel(post.type)}
                </span>
                <span className="post-time">{formatTime(post.timestamp)}</span>
              </div>
            </div>

            {/* Post Content */}
            <div className="post-content">
              <p>{post.content}</p>
              {post.image && (
                <div className="post-image">
                  <img src={post.image} alt="Post visual" />
                </div>
              )}
            </div>

            {/* Post Actions */}
            <div className="post-actions">
              <button 
                className={`action-btn like-btn ${post.isLiked ? 'liked' : ''}`}
                onClick={() => handleLike(post.id)}
              >
                {post.isLiked ? '❤️' : '🤍'} {post.likes}
              </button>
              <button className="action-btn comment-btn">
                💬 {post.comments}
              </button>
              <button className="action-btn share-btn">
                📤 Share
              </button>
            </div>
          </div>
        ))}

        {filteredPosts.length === 0 && (
          <div className="no-posts">
            <div className="no-posts-icon">📭</div>
            <h3>No posts found</h3>
            <p>Try selecting a different filter to see more content.</p>
          </div>
        )}
      </div>

      {/* Community Guidelines */}
      <div className="community-info">
        <div className="info-card">
          <h3>📋 Community Guidelines</h3>
          <ul>
            <li>Be respectful and supportive of fellow community members</li>
            <li>Share your own projects and experiences</li>
            <li>Ask questions - we're here to help!</li>
            <li>Keep discussions relevant to landscape design</li>
          </ul>
        </div>
        <div className="info-card">
          <h3>🌟 Get Featured</h3>
          <p>Want your project showcased? Complete your project with SAGE and share your results with our team for a chance to be featured!</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityFeed;
