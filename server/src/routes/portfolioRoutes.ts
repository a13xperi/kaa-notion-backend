/**
 * Portfolio Routes
 * API endpoints for portfolio gallery management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware';
import * as portfolioService from '../services/portfolioService';
import { sanitizeInput, validateBody, validateParams } from '../middleware';

const router = Router();
router.use(sanitizeInput);

// ============================================
// Validation Schemas
// ============================================

const portfolioIdParamsSchema = z.object({
  id: z.string().uuid('Invalid portfolio ID format'),
});

const portfolioImageParamsSchema = z.object({
  id: z.string().uuid('Invalid portfolio ID format'),
  imageId: z.string().uuid('Invalid image ID format'),
});

const projectIdParamsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
});

const createPortfolioSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format').optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  shortDescription: z.string().optional(),
  location: z.string().optional(),
  projectType: z.string().min(1, 'Project type is required'),
  completedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
});

const updatePortfolioSchema = createPortfolioSchema.partial();

const featurePortfolioSchema = z
  .object({
    featured: z.boolean().optional(),
  })
  .optional();

const addImageSchema = z.object({
  url: z.string().url('Valid image URL is required'),
  thumbnailUrl: z.string().url().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  displayOrder: z.coerce.number().int().optional(),
  isCover: z.boolean().optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

const updateImageSchema = addImageSchema.partial();

const emptyBodySchema = z.object({}).optional();

const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid('Invalid image ID format')).min(1, 'imageIds are required'),
});

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /api/portfolio
 * Get all public portfolio projects with pagination
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { page, limit, category, style, featured } = req.query;

    const portfolios = await portfolioService.getPublicPortfolios({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      category: category as string,
      style: style as string,
    });

    res.json(portfolios);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

/**
 * GET /api/portfolio/featured
 * Get featured portfolio projects
 */
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const featured = await portfolioService.getFeaturedPortfolios(
      limit ? parseInt(limit as string, 10) : 6
    );
    res.json(featured);
  } catch (error) {
    console.error('Error fetching featured portfolios:', error);
    res.status(500).json({ error: 'Failed to fetch featured portfolios' });
  }
});

/**
 * GET /api/portfolio/categories
 * Get all categories with project counts
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await portfolioService.getPortfolioCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/portfolio/:slug
 * Get a single portfolio project by slug
 */
router.get('/:slug', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const portfolio = await portfolioService.getPortfolioBySlug(slug);

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Check if portfolio is published or user is admin
    const isAdmin = (req as any).user?.role === 'ADMIN';
    if (!portfolio.publishedAt && !isAdmin) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * POST /api/portfolio
 * Create a new portfolio project (admin only)
 */
router.post(
  '/',
  requireAuth,
  validateBody(createPortfolioSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const portfolio = await portfolioService.createPortfolio(req.body);
    res.status(201).json(portfolio);
  } catch (error: any) {
    console.error('Error creating portfolio:', error);
    res.status(400).json({ error: error.message || 'Failed to create portfolio' });
  }
  }
);

/**
 * POST /api/portfolio/from-project/:projectId
 * Create portfolio from an existing project (admin only)
 */
router.post(
  '/from-project/:projectId',
  requireAuth,
  validateParams(projectIdParamsSchema),
  validateBody(updatePortfolioSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { projectId } = req.params;
    const portfolio = await portfolioService.createFromProject(projectId, req.body);
    res.status(201).json(portfolio);
  } catch (error: any) {
    console.error('Error creating portfolio from project:', error);
    res.status(400).json({ error: error.message || 'Failed to create portfolio' });
  }
  }
);

/**
 * PUT /api/portfolio/:id
 * Update a portfolio project (admin only)
 */
router.put(
  '/:id',
  requireAuth,
  validateParams(portfolioIdParamsSchema),
  validateBody(updatePortfolioSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const portfolio = await portfolioService.updatePortfolio(id, req.body);
    res.json(portfolio);
  } catch (error: any) {
    console.error('Error updating portfolio:', error);
    res.status(400).json({ error: error.message || 'Failed to update portfolio' });
  }
  }
);

/**
 * DELETE /api/portfolio/:id
 * Delete a portfolio project (admin only)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    await portfolioService.deletePortfolio(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting portfolio:', error);
    res.status(400).json({ error: error.message || 'Failed to delete portfolio' });
  }
});

/**
 * POST /api/portfolio/:id/publish
 * Publish a portfolio project (admin only)
 */
router.post(
  '/:id/publish',
  requireAuth,
  validateParams(portfolioIdParamsSchema),
  validateBody(emptyBodySchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const portfolio = await portfolioService.publishPortfolio(id);
    res.json(portfolio);
  } catch (error: any) {
    console.error('Error publishing portfolio:', error);
    res.status(400).json({ error: error.message || 'Failed to publish portfolio' });
  }
  }
);

/**
 * POST /api/portfolio/:id/unpublish
 * Unpublish a portfolio project (admin only)
 */
router.post(
  '/:id/unpublish',
  requireAuth,
  validateParams(portfolioIdParamsSchema),
  validateBody(emptyBodySchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const portfolio = await portfolioService.unpublishPortfolio(id);
    res.json(portfolio);
  } catch (error: any) {
    console.error('Error unpublishing portfolio:', error);
    res.status(400).json({ error: error.message || 'Failed to unpublish portfolio' });
  }
  }
);

/**
 * POST /api/portfolio/:id/feature
 * Feature/unfeature a portfolio project (admin only)
 */
router.post(
  '/:id/feature',
  requireAuth,
  validateParams(portfolioIdParamsSchema),
  validateBody(featurePortfolioSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { featured } = req.body;
    const portfolio = await portfolioService.setFeatured(id, featured !== false);
    res.json(portfolio);
  } catch (error: any) {
    console.error('Error featuring portfolio:', error);
    res.status(400).json({ error: error.message || 'Failed to feature portfolio' });
  }
  }
);

// ============================================
// IMAGE MANAGEMENT
// ============================================

/**
 * POST /api/portfolio/:id/images
 * Add an image to a portfolio (admin only)
 */
router.post(
  '/:id/images',
  requireAuth,
  validateParams(portfolioIdParamsSchema),
  validateBody(addImageSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const image = await portfolioService.addImage(id, req.body);
    res.status(201).json(image);
  } catch (error: any) {
    console.error('Error adding image:', error);
    res.status(400).json({ error: error.message || 'Failed to add image' });
  }
  }
);

/**
 * PUT /api/portfolio/:id/images/:imageId
 * Update an image (admin only)
 */
router.put(
  '/:id/images/:imageId',
  requireAuth,
  validateParams(portfolioImageParamsSchema),
  validateBody(updateImageSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { imageId } = req.params;
    const image = await portfolioService.updateImage(imageId, req.body);
    res.json(image);
  } catch (error: any) {
    console.error('Error updating image:', error);
    res.status(400).json({ error: error.message || 'Failed to update image' });
  }
  }
);

/**
 * DELETE /api/portfolio/:id/images/:imageId
 * Delete an image (admin only)
 */
router.delete('/:id/images/:imageId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { imageId } = req.params;
    await portfolioService.deleteImage(imageId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    res.status(400).json({ error: error.message || 'Failed to delete image' });
  }
});

/**
 * POST /api/portfolio/:id/images/:imageId/cover
 * Set an image as cover (admin only)
 */
router.post(
  '/:id/images/:imageId/cover',
  requireAuth,
  validateParams(portfolioImageParamsSchema),
  validateBody(emptyBodySchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id, imageId } = req.params;
    const portfolio = await portfolioService.setCoverImage(id, imageId);
    res.json(portfolio);
  } catch (error: any) {
    console.error('Error setting cover image:', error);
    res.status(400).json({ error: error.message || 'Failed to set cover image' });
  }
  }
);

/**
 * PUT /api/portfolio/:id/images/reorder
 * Reorder images (admin only)
 */
router.put(
  '/:id/images/reorder',
  requireAuth,
  validateParams(portfolioIdParamsSchema),
  validateBody(reorderImagesSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { imageIds } = req.body as z.infer<typeof reorderImagesSchema>;

    await portfolioService.reorderImages(id, imageIds);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering images:', error);
    res.status(400).json({ error: error.message || 'Failed to reorder images' });
  }
  }
);

export default router;
