import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

/**
 * Calculate ADG and status based on current weight and previous log
 */
const calculateStats = (
  currentWeight: number, 
  prevLog?: any, 
  weighDate?: string,
  initialWeightKg: number = 0,
  entryDate?: Date
): { 
  weightGainKg: number, 
  daysFromPrevious: number, 
  adg: number, 
  status: string 
} => {
  const d1 = prevLog ? new Date(prevLog.weighDate) : (entryDate ? new Date(entryDate) : null);
  const baseWeight = prevLog ? prevLog.weightKg : initialWeightKg;
  
  if (!d1) return { weightGainKg: 0, daysFromPrevious: 0, adg: 0, status: 'normal' };
  
  const d2 = new Date(weighDate || new Date().toISOString());
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  
  const weightGainKg = currentWeight - baseWeight;
  const adg = parseFloat((weightGainKg / diffDays).toFixed(2));
  
  let status = 'normal';
  if (adg >= 1.2) status = 'excellent';
  else if (adg >= 0.8) status = 'normal';
  else if (adg >= 0.4) status = 'slow';
  else status = 'attention';
  
  return { weightGainKg, daysFromPrevious: diffDays, adg, status };
};

export const createLog = async (req: Request, res: Response) => {
  try {
    const { cattleId, weightKg, weighDate, bcs, notes, chestCircumferenceCm, heightCm } = req.body;

    // 1. Validate cattle exists
    const cattle = await prisma.cattle.findUnique({
      where: { id: cattleId }
    });

    if (!cattle) {
      return res.status(404).json({ message: 'Sapi tidak ditemukan di database' });
    }

    // 2. Get previous log to calculate ADG
    const prevLog = await prisma.growthLog.findFirst({
      where: { cattleId },
      orderBy: { weighDate: 'desc' }
    });

    // 3. Calculate stats
    const { weightGainKg, daysFromPrevious, adg, status } = calculateStats(
      Number(weightKg), 
      prevLog, 
      weighDate,
      cattle.initialWeightKg,
      cattle.entryDate
    );

    // 4. Save log
    const log = await prisma.growthLog.create({
      data: {
        cattleId,
        weightKg: Number(weightKg),
        weighDate: new Date(weighDate),
        bcs: bcs ? Number(bcs) : 3,
        notes,
        chestCircumferenceCm: chestCircumferenceCm ? Number(chestCircumferenceCm) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        weightGainKg,
        daysFromPrevious,
        adgKgPerDay: adg,
        status
      }
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error('Error creating growth log:', error);
    res.status(500).json({ message: error.message || 'Gagal menyimpan data penimbangan' });
  }
};

export const getLogsByCattleId = async (req: Request, res: Response) => {
  try {
    const cattleId = req.params.cattleId as string;
    const logs = await prisma.growthLog.findMany({
      where: { cattleId },
      orderBy: { weighDate: 'desc' }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil riwayat penimbangan' });
  }
};

export const getAllLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.growthLog.findMany({
      orderBy: { weighDate: 'desc' },
      include: {
        cattle: {
          select: { name: true, breed: true }
        }
      }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil data pertumbuhan' });
  }
};

export const deleteLog = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.growthLog.delete({
      where: { id }
    });
    res.json({ message: 'Log berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal menghapus log' });
  }
};
