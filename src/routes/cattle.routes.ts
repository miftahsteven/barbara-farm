import { Router } from 'express';
import { 
  getAllCattle, 
  getCattleById, 
  createCattle, 
  updateCattle,
  getDams,
  archiveCattle,
  unarchiveCattle
} from '../controllers/cattle.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Get potential dams (BETINA cattle) - for selectbox in KTP generator
router.get('/dams', getDams);

// Publicly accessible for QR scan landing page
router.get('/', authenticateToken, getAllCattle);
router.get('/:id', getCattleById); // Public for QR scan landing

// Protected routes
router.post('/', authenticateToken, createCattle);
router.put('/:id', authenticateToken, updateCattle);
router.put('/:id/archive', authenticateToken, archiveCattle);
router.put('/:id/unarchive', authenticateToken, unarchiveCattle);

export default router;
