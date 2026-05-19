import { Router } from 'express';
import { checkGPSIDAuth, refreshGPSIDAuth, getGPSIDDevices, getGPSIDDeviceDetail, getGPSIDDeviceHistory } from '../controllers/gps.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// GPS.id Porta M20 Authentication Routes
router.get('/gpsid/auth-check', authenticateToken, checkGPSIDAuth);
router.post('/gpsid/auth-refresh', authenticateToken, refreshGPSIDAuth);

// GPS.id Device Retrieval Route
router.get('/gpsid/devices', authenticateToken, getGPSIDDevices);
router.get('/gpsid/devices/:imei', authenticateToken, getGPSIDDeviceDetail);
router.get('/gpsid/history/:imei', authenticateToken, getGPSIDDeviceHistory);

export default router;
