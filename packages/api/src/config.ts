import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/sapframework',
  
  auth: {
    enabled: process.env.AUTH_ENABLED === 'true',
    xsuaaUrl: process.env.XSUAA_URL,
    xsuaaClientId: process.env.XSUAA_CLIENT_ID,
    xsuaaClientSecret: process.env.XSUAA_CLIENT_SECRET,
  },
  
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
};