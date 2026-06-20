import { Request, Response, NextFunction } from 'express'
import { HealthService } from './health.service'
import { sendResponse } from '../../utils/send-response'

const getHealth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const healthInfo = HealthService.getHealthDetails()
    sendResponse(res, 200, true, 'API health check status retrieved successfully', healthInfo)
  } catch (error) {
    next(error)
  }
}

export const HealthController = {
  getHealth
}
