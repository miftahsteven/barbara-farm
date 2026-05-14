import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticateToken, isAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// All user management routes require authentication and admin role
router.use(authenticateToken, isAdmin);

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/reset-2fa', userController.reset2FA);
router.post('/:id/change-password', userController.changePassword);

export default router;
