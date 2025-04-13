import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

import { setupRoutes } from './routes';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOW_ORIGINS = process.env.ALLOW_ORIGINS?.split(',') || ['http://localhost:3000'];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('dev'));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
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
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Penvid Finance API',
        version: '1.0.0',
        description: 'API documentation for Penvid Finance Application',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
    },
    apis: ['./src/routes/*.ts'],
  };

  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
  logger.info('Swagger documentation available at /api-docs');
}

// Setup API routes
setupRoutes(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', environment: NODE_ENV });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

export default app;