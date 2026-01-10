import React, { useState, useEffect } from 'react';
import './PortfolioGallery.css';

interface PortfolioImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  caption: string | null;
  isCover: boolean;
}

interface PortfolioProject {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  category: string | null;
  style: string | null;
  location: string | null;
  completedAt: string | null;
  clientName: string | null;
  isFeatured: boolean;
  images: PortfolioImage[];
}

interface PortfolioCategory {
  category: string;
  count: number;
}

interface PortfolioGalleryProps {
  featured?: boolean;
  limit?: number;
}

const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({ featured = false, limit }) => {
  const [portfolios, setPortfolios] = useState<PortfolioProject[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [lightboxImage, setLightboxImage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [selectedCategory, page, featured]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/portfolio/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPortfolios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (limit) params.set('limit', limit.toString());
      params.set('page', page.toString());

      const endpoint = featured ? '/api/portfolio/featured' : `/api/portfolio?${params}`;
      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();
        if (featured) {
          setPortfolios(data);
        } else {
          setPortfolios(data.portfolios || []);
          setTotalPages(data.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (slug: string) => {
    try {
      const res = await fetch(`/api/portfolio/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const getCoverImage = (project: PortfolioProject): string => {
    const cover = project.images.find((img) => img.isCover);
    if (cover) return cover.thumbnailUrl || cover.url;
    if (project.images.length > 0) return project.images[0].thumbnailUrl || project.images[0].url;
    return '/placeholder-project.jpg';
  };

  const handleProjectClick = (project: PortfolioProject) => {
    fetchProjectDetails(project.slug);
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setLightboxImage(null);
  };

  const handlePrevImage = () => {
    if (lightboxImage !== null && selectedProject) {
      setLightboxImage(
        lightboxImage === 0 ? selectedProject.images.length - 1 : lightboxImage - 1
      );
    }
  };

  const handleNextImage = () => {
    if (lightboxImage !== null && selectedProject) {
      setLightboxImage(
        lightboxImage === selectedProject.images.length - 1 ? 0 : lightboxImage + 1
      );
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (lightboxImage !== null) {
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'Escape') setLightboxImage(null);
    } else if (selectedProject && e.key === 'Escape') {
      handleCloseModal();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, selectedProject]);

  return (
    <div className="portfolio-gallery">
      {/* Header */}
      <div className="gallery-header">
        <div className="header-content">
          <h1>Our Portfolio</h1>
          <p>Explore our collection of completed design projects</p>
        </div>
      </div>

      {/* Category Filter */}
      {!featured && categories.length > 0 && (
        <div className="category-filter">
          <button
            className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('all');
              setPage(1);
            }}
          >
            All Projects
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category}
              className={`filter-btn ${selectedCategory === cat.category ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(cat.category);
                setPage(1);
              }}
            >
              {cat.category}
              <span className="count">{cat.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-image" />
              <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-text" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portfolio Grid */}
      {!loading && (
        <>
          <div className="portfolio-grid">
            {portfolios.map((project) => (
              <article
                key={project.id}
                className={`portfolio-card ${project.isFeatured ? 'featured' : ''}`}
                onClick={() => handleProjectClick(project)}
              >
                <div className="card-image">
                  <img
                    src={getCoverImage(project)}
                    alt={project.title}
                    loading="lazy"
                  />
                  {project.isFeatured && (
                    <span className="featured-badge">Featured</span>
                  )}
                  <div className="card-overlay">
                    <span className="view-project">View Project</span>
                  </div>
                </div>
                <div className="card-content">
                  <h3>{project.title}</h3>
                  {project.category && (
                    <span className="category-tag">{project.category}</span>
                  )}
                  {project.shortDescription && (
                    <p className="description">{project.shortDescription}</p>
                  )}
                  <div className="card-meta">
                    {project.location && (
                      <span className="location">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M8 8.5C9.10457 8.5 10 7.60457 10 6.5C10 5.39543 9.10457 4.5 8 4.5C6.89543 4.5 6 5.39543 6 6.5C6 7.60457 6.89543 8.5 8 8.5Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M8 14C8 14 13 10.5 13 6.5C13 3.73858 10.7614 1.5 8 1.5C5.23858 1.5 3 3.73858 3 6.5C3 10.5 8 14 8 14Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                        {project.location}
                      </span>
                    )}
                    {project.images.length > 1 && (
                      <span className="image-count">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <rect
                            x="2"
                            y="2"
                            width="9"
                            height="9"
                            rx="1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M5 14H13C13.5523 14 14 13.5523 14 13V5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        {project.images.length}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Empty State */}
          {portfolios.length === 0 && (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect
                  x="8"
                  y="12"
                  width="48"
                  height="40"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <circle cx="20" cy="26" r="4" stroke="currentColor" strokeWidth="3" />
                <path
                  d="M8 44L20 32L28 40L40 28L56 44"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3>No projects found</h3>
              <p>Check back soon for new additions to our portfolio</p>
            </div>
          )}

          {/* Pagination */}
          {!featured && totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Previous
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="project-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={handleCloseModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="modal-content">
              {/* Image Gallery */}
              <div className="modal-gallery">
                <div className="main-image">
                  <img
                    src={
                      selectedProject.images[lightboxImage ?? 0]?.url ||
                      getCoverImage(selectedProject)
                    }
                    alt={selectedProject.title}
                    onClick={() => setLightboxImage(lightboxImage ?? 0)}
                  />
                </div>
                {selectedProject.images.length > 1 && (
                  <div className="thumbnail-strip">
                    {selectedProject.images.map((img, idx) => (
                      <button
                        key={img.id}
                        className={`thumbnail ${idx === (lightboxImage ?? 0) ? 'active' : ''}`}
                        onClick={() => setLightboxImage(idx)}
                      >
                        <img src={img.thumbnailUrl || img.url} alt={img.alt || ''} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Info */}
              <div className="modal-info">
                <div className="info-header">
                  {selectedProject.category && (
                    <span className="category-tag">{selectedProject.category}</span>
                  )}
                  <h2>{selectedProject.title}</h2>
                </div>

                {selectedProject.description && (
                  <p className="description">{selectedProject.description}</p>
                )}

                <div className="project-details">
                  {selectedProject.location && (
                    <div className="detail-item">
                      <span className="label">Location</span>
                      <span className="value">{selectedProject.location}</span>
                    </div>
                  )}
                  {selectedProject.style && (
                    <div className="detail-item">
                      <span className="label">Style</span>
                      <span className="value">{selectedProject.style}</span>
                    </div>
                  )}
                  {selectedProject.completedAt && (
                    <div className="detail-item">
                      <span className="label">Completed</span>
                      <span className="value">
                        {new Date(selectedProject.completedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="modal-cta">
                  <a href="/intake" className="cta-btn primary">
                    Start Your Project
                  </a>
                  <a href="/contact" className="cta-btn secondary">
                    Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage !== null && selectedProject && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <img
            src={selectedProject.images[lightboxImage].url}
            alt={selectedProject.images[lightboxImage].alt || selectedProject.title}
            onClick={(e) => e.stopPropagation()}
          />
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); handleNextImage(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="lightbox-counter">
            {lightboxImage + 1} / {selectedProject.images.length}
          </div>
          {selectedProject.images[lightboxImage].caption && (
            <div className="lightbox-caption">
              {selectedProject.images[lightboxImage].caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfolioGallery;
