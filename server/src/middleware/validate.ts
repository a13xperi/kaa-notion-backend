import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { formatZodErrors, getFirstError } from '../utils/validators';

/**
 * Validation Middleware
 *
 * Middleware factory for validating request body, query, and params
 * against Zod schemas.
 */

// ============================================
// TYPES
// ============================================

export interface ValidatedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> extends Request {
  validatedBody: TBody;
  validatedQuery: TQuery;
  validatedParams: TParams;
}

export interface ValidationOptions {
  /** Whether to strip unknown keys from the data (default: true) */
  stripUnknown?: boolean;
  /** Custom error message prefix */
  errorPrefix?: string;
  /** Whether to include detailed field errors (default: true) */
  includeFieldErrors?: boolean;
}

// ============================================
// MIDDLEWARE FACTORIES
// ============================================

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends z.ZodSchema>(
  schema: T,
  options: ValidationOptions = {}
) {
  const { stripUnknown = true, errorPrefix, includeFieldErrors = true } = options;

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const parseSchema = stripUnknown ? schema : schema;
    const result = parseSchema.safeParse(req.body);

    if (!result.success) {
      const message = errorPrefix
        ? `${errorPrefix}: ${getFirstError(result.error)}`
        : getFirstError(result.error);

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message,
          ...(includeFieldErrors && { fields: formatZodErrors(result.error) }),
        },
      });
    }

    (req as ValidatedRequest<z.infer<T>>).validatedBody = result.data;
    next();
  };
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodSchema>(
  schema: T,
  options: ValidationOptions = {}
) {
  const { stripUnknown = true, errorPrefix, includeFieldErrors = true } = options;

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const parseSchema = stripUnknown ? schema : schema;
    const result = parseSchema.safeParse(req.query);

    if (!result.success) {
      const message = errorPrefix
        ? `${errorPrefix}: ${getFirstError(result.error)}`
        : `Invalid query parameters: ${getFirstError(result.error)}`;

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message,
          ...(includeFieldErrors && { fields: formatZodErrors(result.error) }),
        },
      });
    }

    (req as ValidatedRequest<unknown, z.infer<T>>).validatedQuery = result.data;
    next();
  };
}

/**
 * Validate request URL parameters against a Zod schema
 */
export function validateParams<T extends z.ZodSchema>(
  schema: T,
  options: ValidationOptions = {}
) {
  const { stripUnknown = true, errorPrefix, includeFieldErrors = true } = options;

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const parseSchema = stripUnknown ? schema : schema;
    const result = parseSchema.safeParse(req.params);

    if (!result.success) {
      const message = errorPrefix
        ? `${errorPrefix}: ${getFirstError(result.error)}`
        : `Invalid URL parameters: ${getFirstError(result.error)}`;

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message,
          ...(includeFieldErrors && { fields: formatZodErrors(result.error) }),
        },
      });
    }

    (req as ValidatedRequest<unknown, unknown, z.infer<T>>).validatedParams = result.data;
    next();
  };
}

/**
 * Validate multiple parts of the request at once
 */
export function validate<
  TBody extends z.ZodSchema | undefined = undefined,
  TQuery extends z.ZodSchema | undefined = undefined,
  TParams extends z.ZodSchema | undefined = undefined
>(schemas: {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
}, options: ValidationOptions = {}) {
  const { includeFieldErrors = true } = options;

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const errors: Record<string, Record<string, string[]>> = {};

    // Validate body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.body = formatZodErrors(result.error);
      } else {
        (req as ValidatedRequest).validatedBody = result.data;
      }
    }

    // Validate query
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.query = formatZodErrors(result.error);
      } else {
        (req as ValidatedRequest).validatedQuery = result.data;
      }
    }

    // Validate params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.params = formatZodErrors(result.error);
      } else {
        (req as ValidatedRequest).validatedParams = result.data;
      }
    }

    // Return errors if any
    if (Object.keys(errors).length > 0) {
      // Get first error message
      const firstSection = Object.keys(errors)[0] as keyof typeof errors;
      const firstField = Object.keys(errors[firstSection]!)[0];
      const firstMessage = errors[firstSection]![firstField][0];

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${firstMessage}`,
          ...(includeFieldErrors && { fields: errors }),
        },
      });
    }

    next();
  };
}

// ============================================
// COMMON PARAM SCHEMAS
// ============================================

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
});

export const leadIdParamSchema = z.object({
  leadId: z.string().uuid('Invalid lead ID format'),
});

// ============================================
// EXPORTS
// ============================================

export default {
  validateBody,
  validateQuery,
  validateParams,
  validate,
  idParamSchema,
  projectIdParamSchema,
  leadIdParamSchema,
};
