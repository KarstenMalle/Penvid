import { Express } from 'express';
import profileRoutes from './profileRoutes';
import currencyRoutes from './currencyRoutes';
import financialRoutes from './financialRoutes';
import { notFound, errorHandler } from '../middleware/errorMiddleware';

/**
 * Set up all API routes
 */
export function setupRoutes(app: Express) {
  // API routes
  app.use('/api/profile', profileRoutes);
  app.use('/api/currencies', currencyRoutes);
  app.use('/api/financial', financialRoutes);

  // Error handling middleware
  app.use(notFound);
  app.use(errorHandler);
}