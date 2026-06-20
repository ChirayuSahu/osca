import { Response } from 'express'

interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T
): void => {
  const responsePayload: ApiResponse<T> = {
    success,
    message
  }

  if (data !== undefined) {
    responsePayload.data = data
  }

  res.status(statusCode).json(responsePayload)
}
