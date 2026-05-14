import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export const getAllRecords = async (req: Request, res: Response) => {
  try {
    const records = await prisma.healthRecord.findMany({
      orderBy: { checkDate: 'desc' },
      include: {
        cattle: {
          select: { name: true, breed: true, pen: true, photoUrl: true }
        }
      }
    });
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil data kesehatan' });
  }
};

export const getRecordsByCattleId = async (req: Request, res: Response) => {
  try {
    const cattleId = req.params.cattleId as string;
    const records = await prisma.healthRecord.findMany({
      where: { cattleId },
      orderBy: { checkDate: 'desc' }
    });
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil riwayat kesehatan' });
  }
};

export const createRecord = async (req: Request, res: Response) => {
  try {
    const { 
      cattleId, 
      checkDate, 
      symptoms, 
      diagnosis, 
      severity, 
      bodyTemperature, 
      appetite, 
      stoolCondition, 
      actionType, 
      medicineName, 
      dosage, 
      withdrawalDays,
      nextCheckupDate,
      status,
      notes,
      officerName
    } = req.body;

    // Validate cattle
    const cattle = await prisma.cattle.findUnique({ where: { id: cattleId } });
    if (!cattle) {
      return res.status(404).json({ message: 'Sapi tidak ditemukan' });
    }

    // Calculate safe to sell date if withdrawal days present
    let safeToSellDate = null;
    if (withdrawalDays && Number(withdrawalDays) > 0) {
      const date = new Date(checkDate);
      date.setDate(date.getDate() + Number(withdrawalDays));
      safeToSellDate = date;
    }

    const record = await prisma.healthRecord.create({
      data: {
        cattleId,
        checkDate: new Date(checkDate),
        symptoms,
        diagnosis,
        severity: severity || 'mild',
        bodyTemperature: bodyTemperature ? Number(bodyTemperature) : null,
        appetite: appetite || 'normal',
        stoolCondition: stoolCondition || 'normal',
        actionType,
        medicineName,
        dosage,
        withdrawalDays: withdrawalDays ? Number(withdrawalDays) : 0,
        safeToSellDate,
        nextCheckupDate: nextCheckupDate ? new Date(nextCheckupDate) : null,
        status: status || 'active',
        notes,
        officerName
      }
    });

    res.status(201).json(record);
  } catch (error: any) {
    console.error('Error creating health record:', error);
    res.status(500).json({ message: error.message || 'Gagal menyimpan data kesehatan' });
  }
};

export const updateRecord = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    // Handle date conversions if present
    if (data.checkDate) data.checkDate = new Date(data.checkDate);
    if (data.nextCheckupDate) data.nextCheckupDate = new Date(data.nextCheckupDate);
    if (data.recoveryDate) data.recoveryDate = new Date(data.recoveryDate);
    
    // Recalculate safe to sell date if withdrawal days or check date changed
    if (data.withdrawalDays !== undefined || data.checkDate) {
      const record = await prisma.healthRecord.findUnique({ where: { id } });
      const currentCheckDate = data.checkDate || record?.checkDate;
      const currentWithdrawal = data.withdrawalDays !== undefined ? Number(data.withdrawalDays) : record?.withdrawalDays;
      
      if (currentCheckDate && (currentWithdrawal || 0) > 0) {
        const date = new Date(currentCheckDate);
        date.setDate(date.getDate() + (currentWithdrawal || 0));
        data.safeToSellDate = date;
      } else {
        data.safeToSellDate = null;
      }
    }

    const updated = await prisma.healthRecord.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal memperbarui data kesehatan' });
  }
};

export const deleteRecord = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.healthRecord.delete({
      where: { id }
    });
    res.json({ message: 'Data kesehatan berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal menghapus data kesehatan' });
  }
};
