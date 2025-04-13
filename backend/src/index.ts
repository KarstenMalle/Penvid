import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

import { setupRoutes } from './routes';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorMiddleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOW_ORIGINS = process.env.ALLOW_ORIGINS?.split(',') || ['http://localhost:3000'];
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Add FRONTEND_URL to environment
process.env.FRONTEND_URL = FRONTEND_URL;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('dev'));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps)
    if (!origin || ALLOW_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Swagger documentation setup (only in development)
if (NODE_ENV === 'development') {
  try {
    // Load the pre-built swagger.json file
    const swaggerFile = path.join(__dirname, '..', 'swagger.json');
    const swaggerData = fs.readFileSync(swaggerFile, 'utf8');
    const swaggerDoc = JSON.parse(swaggerData);

    // Update the servers array to use the current port
    swaggerDoc.servers = [
      {
        url: `http://localhost:${PORT}/api`,
        description: 'Development server',
      },
    ];

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    logger.info('Swagger documentation available at /api-docs');
  } catch (error) {
    logger.error('Failed to load Swagger documentation:', error);
  }
}

// Setup API routes
setupRoutes(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`Health Check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default app;