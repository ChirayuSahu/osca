import { Request, Response, NextFunction } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    // Auth URLs carry OAuth codes and state in the query; keep those out of logs
    const url = req.originalUrl.includes('/auth/') ? req.originalUrl.split('?')[0] : req.originalUrl
    console.log(`[${new Date().toISOString()}] ${req.method} ${url} ${res.statusCode} - ${duration}ms`)
  })
  next()
}
