/**
 * Portfolio Service
 * Handles public portfolio gallery management
 */

import { PortfolioProject, PortfolioImage } from '@prisma/client';
import { prisma } from '../utils/prisma';

// ============================================
// TYPES
// ============================================

export interface CreatePortfolioInput {
  projectId?: string;
  title: string;
  description: string;
  shortDescription?: string;
  location?: string;
  projectType: string;
  completedAt?: Date;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface UpdatePortfolioInput {
  title?: string;
  description?: string;
  shortDescription?: string;
  location?: string;
  projectType?: string;
  completedAt?: Date;
  featured?: boolean;
  published?: boolean;
  displayOrder?: number;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface AddImageInput {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  displayOrder?: number;
  isCover?: boolean;
  width?: number;
  height?: number;
}

export interface PortfolioWithImages extends PortfolioProject {
  images: PortfolioImage[];
}

export interface PortfolioListOptions {
  page?: number;
  limit?: number;
  projectType?: string;
  tag?: string;
  featured?: boolean;
  published?: boolean;
}

// ============================================
// SLUG GENERATION
// ============================================

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Ensure slug is unique
 */
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.portfolioProject.findUnique({
      where: { slug },
    });

    if (!existing || existing.id === excludeId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// ============================================
// PORTFOLIO CRUD
// ============================================

/**
 * Create a new portfolio project
 */
export async function createPortfolio(
  input: CreatePortfolioInput
): Promise<PortfolioProject> {
  const baseSlug = generateSlug(input.title);
  const slug = await ensureUniqueSlug(baseSlug);

  return prisma.portfolioProject.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      slug,
      description: input.description,
      shortDescription: input.shortDescription,
      location: input.location,
      projectType: input.projectType,
      completedAt: input.completedAt,
      tags: input.tags || [],
      seoTitle: input.seoTitle || input.title,
      seoDescription: input.seoDescription || input.shortDescription,
      seoKeywords: input.seoKeywords || [],
    },
  });
}

/**
 * Update a portfolio project
 */
export async function updatePortfolio(
  id: string,
  input: UpdatePortfolioInput
): Promise<PortfolioProject> {
  const data: Record<string, unknown> = { ...input };

  // Handle publish/unpublish
  if (input.published === true) {
    data.publishedAt = new Date();
  } else if (input.published === false) {
    data.publishedAt = null;
  }

  return prisma.portfolioProject.update({
    where: { id },
    data,
  });
}

/**
 * Delete a portfolio project
 */
export async function deletePortfolio(id: string): Promise<void> {
  await prisma.portfolioProject.delete({
    where: { id },
  });
}

/**
 * Get portfolio by ID
 */
export async function getPortfolioById(
  id: string
): Promise<PortfolioWithImages | null> {
  return prisma.portfolioProject.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
}

/**
 * Get portfolio by slug (for public pages)
 */
export async function getPortfolioBySlug(
  slug: string,
  publishedOnly: boolean = true
): Promise<PortfolioWithImages | null> {
  return prisma.portfolioProject.findFirst({
    where: {
      slug,
      ...(publishedOnly && { published: true }),
    },
    include: {
      images: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
}

// ============================================
// PORTFOLIO LISTING (PUBLIC)
// ============================================

/**
 * Get published portfolio projects
 */
export async function getPublicPortfolios(
  options: PortfolioListOptions = {}
): Promise<{
  portfolios: PortfolioWithImages[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || 12), 50);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    published: true,
  };

  if (options.projectType) {
    where.projectType = options.projectType;
  }

  if (options.tag) {
    where.tags = { has: options.tag };
  }

  if (options.featured !== undefined) {
    where.featured = options.featured;
  }

  const [portfolios, total] = await Promise.all([
    prisma.portfolioProject.findMany({
      where,
      include: {
        images: {
          where: { isCover: true },
          take: 1,
        },
      },
      orderBy: [
        { featured: 'desc' },
        { displayOrder: 'asc' },
        { completedAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.portfolioProject.count({ where }),
  ]);

  return {
    portfolios: portfolios as PortfolioWithImages[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get featured portfolios
 */
export async function getFeaturedPortfolios(
  limit: number = 6
): Promise<PortfolioWithImages[]> {
  return prisma.portfolioProject.findMany({
    where: {
      published: true,
      featured: true,
    },
    include: {
      images: {
        where: { isCover: true },
        take: 1,
      },
    },
    orderBy: [
      { displayOrder: 'asc' },
      { completedAt: 'desc' },
    ],
    take: limit,
  }) as Promise<PortfolioWithImages[]>;
}

/**
 * Get all unique tags from published portfolios
 */
export async function getPortfolioTags(): Promise<string[]> {
  const portfolios = await prisma.portfolioProject.findMany({
    where: { published: true },
    select: { tags: true },
  });

  const tagSet = new Set<string>();
  portfolios.forEach((p: typeof portfolios[number]) => p.tags.forEach((tag: string) => tagSet.add(tag)));

  return Array.from(tagSet).sort();
}

/**
 * Get all unique project types from published portfolios
 */
export async function getProjectTypes(): Promise<string[]> {
  const portfolios = await prisma.portfolioProject.groupBy({
    by: ['projectType'],
    where: { published: true },
  });

  return portfolios.map((p: typeof portfolios[number]) => p.projectType).sort();
}

// ============================================
// PORTFOLIO LISTING (ADMIN)
// ============================================

/**
 * Get all portfolio projects (admin)
 */
export async function getAllPortfolios(
  options: PortfolioListOptions = {}
): Promise<{
  portfolios: PortfolioWithImages[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || 20), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (options.projectType) {
    where.projectType = options.projectType;
  }

  if (options.published !== undefined) {
    where.published = options.published;
  }

  if (options.featured !== undefined) {
    where.featured = options.featured;
  }

  const [portfolios, total] = await Promise.all([
    prisma.portfolioProject.findMany({
      where,
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.portfolioProject.count({ where }),
  ]);

  return {
    portfolios: portfolios as PortfolioWithImages[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// IMAGE MANAGEMENT
// ============================================

/**
 * Add image to portfolio
 */
export async function addImage(
  portfolioId: string,
  input: AddImageInput
): Promise<PortfolioImage> {
  // If this is marked as cover, unset other covers
  if (input.isCover) {
    await prisma.portfolioImage.updateMany({
      where: { portfolioId, isCover: true },
      data: { isCover: false },
    });
  }

  // Get next display order
  const lastImage = await prisma.portfolioImage.findFirst({
    where: { portfolioId },
    orderBy: { displayOrder: 'desc' },
  });
  const displayOrder = input.displayOrder ?? (lastImage?.displayOrder ?? 0) + 1;

  return prisma.portfolioImage.create({
    data: {
      portfolioId,
      url: input.url,
      thumbnailUrl: input.thumbnailUrl,
      alt: input.alt,
      caption: input.caption,
      displayOrder,
      isCover: input.isCover || false,
      width: input.width,
      height: input.height,
    },
  });
}

/**
 * Update image
 */
export async function updateImage(
  imageId: string,
  input: Partial<AddImageInput>
): Promise<PortfolioImage> {
  const image = await prisma.portfolioImage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new Error('Image not found');
  }

  // If setting as cover, unset other covers
  if (input.isCover) {
    await prisma.portfolioImage.updateMany({
      where: {
        portfolioId: image.portfolioId,
        isCover: true,
        id: { not: imageId },
      },
      data: { isCover: false },
    });
  }

  return prisma.portfolioImage.update({
    where: { id: imageId },
    data: input,
  });
}

/**
 * Delete image
 */
export async function deleteImage(imageId: string): Promise<void> {
  await prisma.portfolioImage.delete({
    where: { id: imageId },
  });
}

/**
 * Reorder images
 */
export async function reorderImages(
  portfolioId: string,
  imageIds: string[]
): Promise<void> {
  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.portfolioImage.update({
        where: { id },
        data: { displayOrder: index },
      })
    )
  );
}

/**
 * Set cover image
 */
export async function setCoverImage(
  portfolioId: string,
  imageId: string
): Promise<void> {
  await prisma.$transaction([
    // Unset all covers
    prisma.portfolioImage.updateMany({
      where: { portfolioId, isCover: true },
      data: { isCover: false },
    }),
    // Set new cover
    prisma.portfolioImage.update({
      where: { id: imageId },
      data: { isCover: true },
    }),
  ]);
}

// ============================================
// PUBLISHING
// ============================================

/**
 * Publish a portfolio
 */
export async function publishPortfolio(id: string): Promise<PortfolioProject> {
  return prisma.portfolioProject.update({
    where: { id },
    data: {
      published: true,
      publishedAt: new Date(),
    },
  });
}

/**
 * Unpublish a portfolio
 */
export async function unpublishPortfolio(id: string): Promise<PortfolioProject> {
  return prisma.portfolioProject.update({
    where: { id },
    data: {
      published: false,
      publishedAt: null,
    },
  });
}

/**
 * Toggle featured status
 */
export async function toggleFeatured(id: string): Promise<PortfolioProject> {
  const portfolio = await prisma.portfolioProject.findUnique({
    where: { id },
  });

  if (!portfolio) {
    throw new Error('Portfolio not found');
  }

  return prisma.portfolioProject.update({
    where: { id },
    data: { featured: !portfolio.featured },
  });
}

// ============================================
// IMPORT FROM PROJECT
// ============================================

/**
 * Create portfolio from existing project
 */
export async function createFromProject(
  projectId: string,
  overrides?: Partial<CreatePortfolioInput>
): Promise<PortfolioProject> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      deliverables: {
        where: {
          fileType: { startsWith: 'image/' },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Check if portfolio already exists for this project
  const existing = await prisma.portfolioProject.findUnique({
    where: { projectId },
  });

  if (existing) {
    throw new Error('Portfolio already exists for this project');
  }

  // Create portfolio
  const portfolio = await createPortfolio({
    projectId,
    title: overrides?.title || project.name,
    description: overrides?.description || `Portfolio showcase for ${project.name}`,
    shortDescription: overrides?.shortDescription,
    location: overrides?.location || project.projectAddress || undefined,
    projectType: overrides?.projectType || 'residential',
    completedAt: overrides?.completedAt,
    tags: overrides?.tags || [],
    ...overrides,
  });

  // Add deliverable images
  for (let i = 0; i < project.deliverables.length; i++) {
    const deliverable = project.deliverables[i];
    await addImage(portfolio.id, {
      url: deliverable.fileUrl,
      alt: deliverable.name,
      caption: deliverable.description || undefined,
      displayOrder: i,
      isCover: i === 0,
    });
  }

  return portfolio;
}

export default {
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioById,
  getPortfolioBySlug,
  getPublicPortfolios,
  getFeaturedPortfolios,
  getPortfolioTags,
  getProjectTypes,
  getAllPortfolios,
  addImage,
  updateImage,
  deleteImage,
  reorderImages,
  setCoverImage,
  publishPortfolio,
  unpublishPortfolio,
  toggleFeatured,
  createFromProject,
};
