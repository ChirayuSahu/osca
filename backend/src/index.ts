import app from './app'
import { config } from './config'

const server = app.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`)
})

process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection! Shutting down...')
  console.error(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})
