import { Router } from 'express';
import { login, getProfile, updateProfile, setup2FA, setup2FAByUserId, verify2FA, logout, changePasswordOfCurrentUser } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/verify-2fa', verify2FA); // Public during login
router.get('/setup-2fa/:userId', setup2FAByUserId); // Public during login
router.post('/setup-2fa', authenticateToken, setup2FA); // Private for already logged in users
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePasswordOfCurrentUser);
router.post('/logout', authenticateToken, logout);

export default router;
