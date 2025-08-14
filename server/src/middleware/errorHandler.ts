import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err.stack)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  const code = err.code || 'INTERNAL_ERROR'

  res.status(statusCode).json({
    error: true,
    message,
    code,
    statusCode
  })
}