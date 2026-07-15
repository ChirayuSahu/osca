import { config } from './config'
import app from './app'
import { prisma } from './utils/prisma'
import { initWorkers, shutdownWorkers } from './workers'
import { closeAllQueues } from './config/queue'
import { initNeo4j, neo4jDriver } from './utils/neo4j'

const server = app.listen(config.port, async () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`)
  await initNeo4j()
  initWorkers()
})

const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...')
  try {
    await shutdownWorkers()
    await closeAllQueues()
    await prisma.$disconnect()
    await neo4jDriver.close()
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection! Shutting down...')
  console.error(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})
