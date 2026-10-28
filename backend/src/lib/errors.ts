export class AppError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}

export const assertFound = <T>(value: T | null | undefined, message: string): T => {
  if (value == null) {
    throw new AppError(message, 404)
  }
  return value
}

// Failures a retry can't fix (bad/expired GitHub token, missing repo, missing
// server token). Workers wrap these in BullMQ's UnrecoverableError so the job
// fails at once instead of retrying with backoff.
export const isPermanentJobError = (error: unknown): boolean =>
  error instanceof AppError && [400, 401, 403, 404, 422].includes(error.statusCode) ||
  (error instanceof AppError && /GITHUB_TOKEN is not configured/.test(error.message))
