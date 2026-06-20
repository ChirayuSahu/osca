import { Response } from 'express'

interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  pagination?: {
    page: number
    limit: number
    total?: number
    totalPages?: number
  }
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  pagination?: ApiResponse<T>['pagination']
): void => {
  const responsePayload: ApiResponse<T> = {
    success,
    message
  }

  if (data !== undefined) {
    responsePayload.data = data
  }

  if (pagination !== undefined) {
    responsePayload.pagination = pagination
  }

  res.status(statusCode).json(responsePayload)
}
