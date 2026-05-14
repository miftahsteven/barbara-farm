import { Router } from 'express';
import {
  getAllFeedingLogs,
  getFeedingLogsByCattleId,
  createFeedingLog,
  updateFeedingLog,
  deleteFeedingLog
} from '../controllers/feed.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.get('/', getAllFeedingLogs);
router.get('/cattle/:cattleId', getFeedingLogsByCattleId);
router.post('/', createFeedingLog);
router.put('/:id', updateFeedingLog);
router.delete('/:id', deleteFeedingLog);

export default router;
