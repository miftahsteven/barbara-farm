import type { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, captchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Google reCAPTCHA Verification
    if (!captchaToken) {
      return res.status(400).json({ message: 'Captcha verification is required' });
    }

    try {
      const secretKey = '6LfG7O8sAAAAAKZlpoGjlICAcFVIWkTPxX76Wnc7';
      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
      
      const recaptchaRes = await fetch(verifyUrl, {
        method: 'POST'
      });
      
      const recaptchaData = await recaptchaRes.json() as { success: boolean };

      if (!recaptchaData.success) {
        return res.status(400).json({ message: 'Captcha verification failed. Please try again.' });
      }
    } catch (err) {
      console.error('reCAPTCHA verification error:', err);
      return res.status(500).json({ message: 'Failed to verify Captcha.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check Global 2FA Setting from database configuration
    const global2FASetting = await prisma.systemSetting.findUnique({ where: { key: 'enableGlobal2FA' } });
    const is2FAGloballyEnabled = global2FASetting ? (global2FASetting.value === 'true') : (process.env.ENABLE_2FA !== 'false');

    // Check if 2FA setup is required
    if (is2FAGloballyEnabled && !user.twoFactorSecret) {
      return res.json({ 
        message: '2FA setup required', 
        requiresSetup2FA: true,
        userId: user.id 
      });
    }

    // Check if 2FA is enabled for this user
    if (is2FAGloballyEnabled && user.twoFactorEnabled) {
      return res.json({ 
        message: '2FA verification required', 
        requires2FA: true,
        userId: user.id 
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      JWT_SECRET as string, 
      { expiresIn: JWT_EXPIRES_IN as any }
    );
    
    return res.json({ 
      token, 
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const setup2FAByUserId = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `${process.env.APP_NAME || 'SmartFarm'}:${user.email}`
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 }
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return res.json({ 
      qrCodeUrl, 
      secret: secret.base32,
      message: '2FA setup initiated. Scan the QR code with your authenticator app.' 
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const setup2FA = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `${process.env.APP_NAME || 'SmartFarm'}:${user.email}`
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 }
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return res.json({ 
      qrCodeUrl, 
      secret: secret.base32,
      message: '2FA setup initiated. Scan the QR code with your authenticator app.' 
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const verify2FA = async (req: Request, res: Response) => {
  try {
    const { token, userId } = req.body; // userId is passed if verifying during login
    const currentUserId = req.user?.userId || userId;

    if (!token || !currentUserId) {
      return res.status(400).json({ message: 'Token and User ID are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: currentUserId } });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA is not set up for this user' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(401).json({ message: 'Invalid 2FA token' });
    }

    // If verifying for the first time to enable it
    if (!user.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true }
      });
    }

    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role }, 
      JWT_SECRET as string, 
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    return res.json({ 
      token: jwtToken, 
      message: '2FA verified successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        name: true,
        phone: true,
        farmName: true,
        position: true,
        location: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, email, phone, farmName, position, location } = req.body;

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email sudah digunakan oleh pengguna lain' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        farmName,
        position,
        location
      },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        name: true,
        phone: true,
        farmName: true,
        position: true,
        location: true,
        createdAt: true
      }
    });

    return res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  // Since we are using JWT, logout is primarily handled by the client 
  // (deleting the token). On the server, we can just return success.
  return res.json({ message: 'Logged out successfully' });
};

export const changePasswordOfCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Password saat ini dan password baru wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Password saat ini salah' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return res.json({ message: 'Password berhasil diperbarui' });
  } catch (error) {
    console.error('Change self password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
