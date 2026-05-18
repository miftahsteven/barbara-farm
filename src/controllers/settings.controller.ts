import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

// Helper to ensure settings are initialized in database
const ensureSettingsInitialized = async () => {
  const defaults = [
    { key: 'farmName', value: 'Barbara Farm' },
    { key: 'farmLogo', value: '/images/logo3.png' },
    { key: 'enableGlobal2FA', value: 'true' }
  ];

  for (const item of defaults) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: item.key }
    });
    if (!existing) {
      await prisma.systemSetting.create({
        data: item
      });
    }
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    await ensureSettingsInitialized();
    const settingsList = await prisma.systemSetting.findMany();
    
    // Map list of settings to an object key-value
    const settings: Record<string, string> = {};
    for (const s of settingsList) {
      settings[s.key] = s.value;
    }
    
    return res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ message: 'Gagal mengambil pengaturan sistem' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { farmName, farmLogo, enableGlobal2FA } = req.body;

    if (farmName !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'farmName' },
        update: { value: String(farmName) },
        create: { key: 'farmName', value: String(farmName) }
      });
    }

    if (farmLogo !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'farmLogo' },
        update: { value: String(farmLogo) },
        create: { key: 'farmLogo', value: String(farmLogo) }
      });
    }

    if (enableGlobal2FA !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'enableGlobal2FA' },
        update: { value: String(enableGlobal2FA) },
        create: { key: 'enableGlobal2FA', value: String(enableGlobal2FA) }
      });
    }

    return res.json({ message: 'Pengaturan sistem berhasil diperbarui' });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ message: 'Gagal memperbarui pengaturan sistem' });
  }
};
