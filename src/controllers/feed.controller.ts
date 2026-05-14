import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export const getAllFeedingLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.feedingLog.findMany({
      orderBy: { feedingDate: 'desc' },
      include: {
        cattle: {
          select: { id: true, name: true, breed: true, pen: true, photoUrl: true }
        },
        group: true
      }
    });
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching feeding logs:', error);
    res.status(500).json({ message: 'Gagal mengambil data pakan' });
  }
};

export const getFeedingLogsByCattleId = async (req: Request, res: Response) => {
  try {
    const { cattleId } = req.params;
    const logs = await prisma.feedingLog.findMany({
      where: { cattleId },
      orderBy: { feedingDate: 'desc' }
    });
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching feeding logs by cattle id:', error);
    res.status(500).json({ message: 'Gagal mengambil histori pakan sapi' });
  }
};

export const createFeedingLog = async (req: Request, res: Response) => {
  try {
    const {
      feedingDate,
      feedingTime,
      targetType,
      cattleId,
      groupId,
      feedType,
      feedName,
      portionKg,
      costPerKg,
      notes,
      status,
      createdBy
    } = req.body;

    const totalCost = (Number(portionKg) || 0) * (Number(costPerKg) || 0);

    const log = await prisma.feedingLog.create({
      data: {
        feedingDate: new Date(feedingDate),
        feedingTime,
        targetType,
        cattleId: targetType === 'SAPI' ? cattleId : null,
        groupId: targetType === 'KELOMPOK' ? groupId : null,
        feedType,
        feedName,
        portionKg: Number(portionKg),
        costPerKg: Number(costPerKg) || 0,
        totalCost,
        notes,
        status: status || 'Posted',
        createdBy
      },
      include: {
        cattle: { select: { name: true, pen: true } },
        group: true
      }
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error('Error creating feeding log:', error);
    res.status(500).json({ message: error.message || 'Gagal menyimpan data pakan' });
  }
};

export const updateFeedingLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.feedingDate) data.feedingDate = new Date(data.feedingDate);
    if (data.portionKg !== undefined || data.costPerKg !== undefined) {
      const existing = await prisma.feedingLog.findUnique({ where: { id } });
      const portion = data.portionKg !== undefined ? Number(data.portionKg) : existing?.portionKg || 0;
      const cost = data.costPerKg !== undefined ? Number(data.costPerKg) : existing?.costPerKg || 0;
      data.totalCost = portion * cost;
      if (data.portionKg !== undefined) data.portionKg = portion;
      if (data.costPerKg !== undefined) data.costPerKg = cost;
    }

    const updated = await prisma.feedingLog.update({
      where: { id },
      data,
      include: {
        cattle: { select: { name: true, pen: true } },
        group: true
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating feeding log:', error);
    res.status(500).json({ message: 'Gagal memperbarui data pakan' });
  }
};

export const deleteFeedingLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.feedingLog.delete({ where: { id } });
    res.json({ message: 'Data pakan berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting feeding log:', error);
    res.status(500).json({ message: 'Gagal menghapus data pakan' });
  }
};
