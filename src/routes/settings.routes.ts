import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticateToken, isAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Settings routes require authentication and admin role
router.use(authenticateToken, isAdmin);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
