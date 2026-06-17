const getHealthDetails = () => {
  return {
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
};

export const HealthService = {
  getHealthDetails,
};
