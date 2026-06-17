interface HealthDetails {
  status: string
  timestamp: string
  uptime: number
}

const getHealthDetails = (): HealthDetails => {
  return {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }
}

export const HealthService = {
  getHealthDetails
}
