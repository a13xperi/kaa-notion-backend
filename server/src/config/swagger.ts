/**
 * OpenAPI/Swagger Configuration
 * API documentation for SAGE MVP Platform
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SAGE MVP Platform API',
      version: '1.0.0',
      description: `
## Overview

The SAGE MVP Platform API provides endpoints for managing landscape design projects across four service tiers.

### Service Tiers

| Tier | Name | Price | Description |
|------|------|-------|-------------|
| 1 | The Concept | $299 | DIY guidance, automated design |
| 2 | The Builder | $1,499 | Design package with checkpoints |
| 3 | The Concierge | $4,999+ | Full service with site visits |
| 4 | White Glove | Custom | Invitation-only luxury service |

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Rate Limiting

API endpoints are rate limited to prevent abuse:
- General API: 100 requests/minute
- Authentication: 10 requests/minute
- Lead creation: 5 requests/minute
- File uploads: 20 requests/minute

### Error Responses

All errors follow this format:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
\`\`\`
      `,
      contact: {
        name: 'SAGE Support',
        email: 'support@sage.design',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.sage.design',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and user management',
      },
      {
        name: 'Leads',
        description: 'Lead capture and tier routing',
      },
      {
        name: 'Projects',
        description: 'Project management',
      },
      {
        name: 'Milestones',
        description: 'Project milestone tracking',
      },
      {
        name: 'Deliverables',
        description: 'Project deliverable management',
      },
      {
        name: 'Checkout',
        description: 'Payment and checkout',
      },
      {
        name: 'Admin',
        description: 'Admin dashboard endpoints',
      },
      {
        name: 'Upload',
        description: 'File upload management',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from /api/auth/login',
        },
      },
      schemas: {
        // Common response wrapper
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input' },
                details: { type: 'object' },
              },
            },
          },
        },
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
            name: { type: 'string', example: 'John Doe' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            userType: { type: 'string', enum: ['SAGE_CLIENT', 'KAA_CLIENT', 'TEAM', 'ADMIN'] },
            tier: { type: 'integer', enum: [1, 2, 3, 4] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Lead schemas
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            phone: { type: 'string' },
            projectAddress: { type: 'string' },
            budget: { type: 'string', enum: ['under_5k', '5k_15k', '15k_50k', '50k_100k', 'over_100k'] },
            timeline: { type: 'string', enum: ['asap', '1_3_months', '3_6_months', '6_12_months', 'flexible'] },
            projectType: { type: 'string', enum: ['full_landscape', 'front_yard', 'backyard', 'outdoor_living', 'planting_only', 'hardscape_only'] },
            hasSurvey: { type: 'boolean' },
            hasDrawings: { type: 'boolean' },
            status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'CLOSED', 'LOST'] },
            recommendedTier: { type: 'integer', enum: [1, 2, 3, 4] },
            overrideTier: { type: 'integer', nullable: true },
            overrideReason: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateLeadRequest: {
          type: 'object',
          required: ['email', 'name', 'projectAddress', 'budget', 'timeline', 'projectType'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            phone: { type: 'string' },
            projectAddress: { type: 'string' },
            budget: { type: 'string', enum: ['under_5k', '5k_15k', '15k_50k', '50k_100k', 'over_100k'] },
            timeline: { type: 'string', enum: ['asap', '1_3_months', '3_6_months', '6_12_months', 'flexible'] },
            projectType: { type: 'string', enum: ['full_landscape', 'front_yard', 'backyard', 'outdoor_living', 'planting_only', 'hardscape_only'] },
            hasSurvey: { type: 'boolean', default: false },
            hasDrawings: { type: 'boolean', default: false },
            notes: { type: 'string' },
          },
        },
        // Project schemas
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            name: { type: 'string' },
            tier: { type: 'integer', enum: [1, 2, 3, 4] },
            status: { type: 'string', enum: ['DRAFT', 'ONBOARDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
            paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
            clientId: { type: 'string' },
            leadId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // Milestone schemas
        Milestone: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            projectId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            order: { type: 'integer' },
            status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        // Deliverable schemas
        Deliverable: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            projectId: { type: 'string' },
            milestoneId: { type: 'string', nullable: true },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['DESIGN', 'PLAN', 'RENDER', 'DOCUMENT', 'PHOTO', 'OTHER'] },
            fileUrl: { type: 'string' },
            fileType: { type: 'string' },
            fileSize: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Checkout schemas
        CreateCheckoutRequest: {
          type: 'object',
          required: ['leadId', 'tier'],
          properties: {
            leadId: { type: 'string' },
            tier: { type: 'integer', enum: [1, 2, 3] },
            successUrl: { type: 'string', format: 'uri' },
            cancelUrl: { type: 'string', format: 'uri' },
          },
        },
        CheckoutResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                sessionId: { type: 'string' },
                url: { type: 'string', format: 'uri' },
              },
            },
          },
        },
        // Pricing schemas
        TierPricing: {
          type: 'object',
          properties: {
            tier: { type: 'integer' },
            name: { type: 'string' },
            price: { type: 'integer', description: 'Price in cents' },
            currency: { type: 'string', example: 'usd' },
            description: { type: 'string' },
            features: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        // Dashboard stats
        DashboardStats: {
          type: 'object',
          properties: {
            leads: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                new: { type: 'integer' },
                qualified: { type: 'integer' },
                converted: { type: 'integer' },
              },
            },
            projects: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                active: { type: 'integer' },
                completed: { type: 'integer' },
              },
            },
            revenue: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                thisMonth: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Admin access required',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input',
                  details: {
                    email: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMITED',
                  message: 'Too many requests, please try again later',
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI middleware
 */
export function setupSwagger(app: Express): void {
  // Serve Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin-bottom: 30px }
        .swagger-ui .info .title { color: #059669 }
      `,
      customSiteTitle: 'SAGE API Documentation',
      customfavIcon: '/favicon.ico',
    })
  );

  // Serve raw OpenAPI spec
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
