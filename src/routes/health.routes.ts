import { Router } from 'express';
import { 
  createRecord, 
  getRecordsByCattleId, 
  getAllRecords, 
  updateRecord, 
  deleteRecord 
} from '../controllers/health.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.get('/', getAllRecords);
router.get('/cattle/:cattleId', getRecordsByCattleId);
router.post('/', createRecord);
router.put('/:id', updateRecord);
router.delete('/:id', deleteRecord);

export default router;
