import { Router } from 'express';
import {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale
} from '../controllers/sales.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.get('/', getAllSales);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;
