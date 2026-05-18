import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import cattleRoutes from './cattle.routes.js';
import growthRoutes from './growth.routes.js';
import healthRoutes from './health.routes.js';
import feedRoutes from './feed.routes.js';
import salesRoutes from './sales.routes.js';
import investorRoutes from './investor.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

// API Health Check
router.get('/api-status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cattle', cattleRoutes);
router.use('/growth', growthRoutes);
router.use('/health', healthRoutes);
router.use('/feed', feedRoutes);
router.use('/sales', salesRoutes);
router.use('/investors', investorRoutes);
router.use('/settings', settingsRoutes);

export default router;
