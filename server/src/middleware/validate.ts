/**
 * Validation Middleware
 * Express middleware for request validation using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, validationError } from '../utils/AppError';

// ============================================================================
// TYPES
// ============================================================================

export type ValidationTarget = 'body' | 'query' | 'params';

export interface ValidationOptions {
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Create validation middleware for a specific target
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[target];

      // Parse and validate
      const result = schema.safeParse(data);

      if (!result.success) {
        const formattedErrors = formatZodErrors(result.error);
        throw validationError('Validation failed', formattedErrors);
      }

      // Replace request data with parsed/transformed data
      req[target] = result.data;

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema, options?: ValidationOptions) {
  return validate(schema, 'body', options);
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema, options?: ValidationOptions) {
  return validate(schema, 'query', options);
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema, options?: ValidationOptions) {
  return validate(schema, 'params', options);
}

/**
 * Validate multiple targets
 */
export function validateAll(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: Record<string, unknown> = {};

      // Validate each target
      for (const [target, schema] of Object.entries(schemas)) {
        if (!schema) continue;

        const data = req[target as ValidationTarget];
        const result = schema.safeParse(data);

        if (!result.success) {
          errors[target] = formatZodErrors(result.error);
        } else {
          req[target as ValidationTarget] = result.data;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw validationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }
      next(error);
    }
  };
}

// ============================================================================
// ERROR FORMATTING
// ============================================================================

/**
 * Format Zod errors into a structured object
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';

    if (!formatted[path]) {
      formatted[path] = [];
    }

    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Get a flat list of error messages
 */
export function getErrorMessages(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/**
 * Get the first error message
 */
export function getFirstError(error: ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) return 'Validation failed';

  const path = firstIssue.path.join('.');
  return path ? `${path}: ${firstIssue.message}` : firstIssue.message;
}

export default validate;
