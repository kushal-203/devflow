export interface ErrorDetail {
  field?: string;
  message: string;
}

/** An error that is safe to show to the client. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[] | Record<string, unknown>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) => new AppError(400, 'VALIDATION_ERROR', message, details);
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to perform this action', code = 'FORBIDDEN') => new AppError(403, code, message);
export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code: string, message: string, details?: Record<string, unknown>) => new AppError(409, code, message, details);
