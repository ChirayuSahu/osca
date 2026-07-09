import path from 'path'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import { Application } from 'express'

export const mountSwaggerDocs = (app: Application): void => {
  if (process.env.NODE_ENV === 'production') {
    console.log('[Swagger] Docs disabled in production')
    return
  }

  const swaggerPath = path.resolve(process.cwd(), 'swagger.yaml')
  const swaggerDocument = YAML.load(swaggerPath)

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'OSCA Backend API Docs'
  }))

  console.log('[Swagger] Docs available at /api/docs')
}
