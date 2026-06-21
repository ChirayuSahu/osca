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
