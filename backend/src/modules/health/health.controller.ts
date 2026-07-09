import { Request, Response } from 'express'
import { HealthService } from './health.service'
import { sendResponse } from '../../utils/send-response'
import { asyncHandler } from '../../utils/async-handler'

// #27: Updated to async to support DB + Redis health pings
const getHealth = asyncHandler(async (req: Request, res: Response) => {
  const healthInfo = await HealthService.checkHealth()
  const statusCode = healthInfo.status === 'UP' ? 200 : 503
  sendResponse(res, statusCode, healthInfo.status === 'UP', 'API health check status retrieved', healthInfo)
})

export const HealthController = {
  getHealth
}
