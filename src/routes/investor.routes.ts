import { Router } from 'express';
import { 
  getAllInvestors, 
  getInvestorById, 
  createInvestor, 
  updateInvestor, 
  deleteInvestor 
} from '../controllers/investor.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(authenticateToken);

router.get('/', getAllInvestors);
router.get('/:id', getInvestorById);
router.post('/', createInvestor);
router.put('/:id', updateInvestor);
router.delete('/:id', deleteInvestor);

export default router;
