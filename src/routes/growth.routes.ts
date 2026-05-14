import { Router } from 'express';
import { 
  createLog, 
  getLogsByCattleId, 
  getAllLogs, 
  deleteLog 
} from '../controllers/growth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.get('/', getAllLogs);
router.get('/cattle/:cattleId', getLogsByCattleId);
router.post('/', createLog);
router.delete('/:id', deleteLog);

export default router;
