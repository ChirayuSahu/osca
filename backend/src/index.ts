import { config } from './config'
import app from './app'
<<<<<<< HEAD

const server = app.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`)
})

=======
import { prisma } from './utils/prisma'
import { initWorkers, shutdownWorkers } from './workers'
import { closeAllQueues } from './config/queue'

const server = app.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`)
  initWorkers()
})

const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...')
  try {
    await shutdownWorkers()
    await closeAllQueues()
    await prisma.$disconnect()
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

>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection! Shutting down...')
  console.error(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})
