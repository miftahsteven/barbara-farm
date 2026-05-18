import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export const getAllCattle = async (req: Request, res: Response) => {
  try {
    const cattle = await prisma.cattle.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { investor: true, insurance: true }
    });
    res.json(cattle);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cattle data', error });
  }
};

export const getCattleById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const cattle = await prisma.cattle.findUnique({
      where: { id },
      include: { 
        dam: true,
        investor: true,
        insurance: true,
        growthLogs: { orderBy: { weighDate: 'desc' }, take: 1 }
      }
    });
    if (!cattle) {
      return res.status(404).json({ message: 'Cattle not found' });
    }
    res.json(cattle);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cattle detail', error });
  }
};

export const createCattle = async (req: Request, res: Response) => {
  try {
    const { 
      id, name, breed, gender, originType, originName, 
      entryDate, birthDate, initialWeightKg, purchasePrice, 
      photoUrl, pen, status, notes, qrUrl, eartagNo, estimatedAgeMonths,
      damId, damAlias, isDam, investorId, insurance
    } = req.body;

    const createData: any = {
      id,
      name,
      breed,
      gender,
      originType,
      originName,
      eartagNo,
      damId: damId ? String(damId) : null,
      damAlias: damAlias ? String(damAlias) : null,
      isDam: isDam === true,
      estimatedAgeMonths: estimatedAgeMonths ? Number(estimatedAgeMonths) : null,
      entryDate: new Date(entryDate),
      birthDate: birthDate ? new Date(birthDate) : null,
      initialWeightKg: Number(initialWeightKg),
      purchasePrice: Number(purchasePrice),
      photoUrl,
      pen,
      status: status || 'AKTIF',
      notes,
      qrUrl,
      investorId: investorId ? String(investorId) : null
    };

    if (insurance) {
      createData.insurance = {
        create: {
          coverageType: insurance.coverageType,
          coveragePercent: Number(insurance.coveragePercent || 100),
          sumAssured: Number(insurance.sumAssured),
          premiumCost: Number(insurance.premiumCost),
          premiumPaymentType: insurance.premiumPaymentType,
          duration: insurance.duration,
          startDate: insurance.startDate ? new Date(insurance.startDate) : new Date(),
          endDate: insurance.endDate ? new Date(insurance.endDate) : null,
          notes: insurance.notes,
          status: insurance.status || 'AKTIF'
        }
      };
    }

    const cattle = await prisma.cattle.create({
      data: createData
    });
    res.status(201).json(cattle);
  } catch (error: any) {
    console.error('Error creating cattle:', error);
    res.status(500).json({ message: error.message || 'Error creating cattle', error });
  }
};

export const updateCattle = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { 
      id: newId, // The generated KTP code from frontend
      name, breed, gender, originType, originName, 
      entryDate, birthDate, initialWeightKg, purchasePrice, 
      photoUrl, pen, status, notes, qrUrl, eartagNo, estimatedAgeMonths,
      damId, damAlias, investorId, insurance
    } = req.body;

    // Use a transaction to handle potential ID change safely
    const result = await prisma.$transaction(async (tx) => {
      let currentId = id;

      // 1. If ID changed (e.g. breed changed), update it via raw SQL because Prisma update doesn't allow @id change
      if (newId && newId !== id) {
        // Check if new ID already exists
        const existing = await tx.cattle.findUnique({ where: { id: newId } });
        if (existing) {
          throw new Error('Kode KTP baru sudah digunakan oleh sapi lain');
        }

        // Raw SQL to update primary key (onUpdate: Cascade handles relations)
        await tx.$executeRawUnsafe(
          `UPDATE "Cattle" SET "id" = $1 WHERE "id" = $2`,
          newId, id
        );
        currentId = newId;
      }

      // 2. Update the rest of the fields
      const updateData: any = {
        name,
        breed,
        gender,
        originType,
        originName,
        eartagNo,
        damId: damId ? String(damId) : null,
        damAlias: damAlias ? String(damAlias) : null,
        photoUrl,
        pen,
        status,
        notes,
        qrUrl
      };

      if (investorId !== undefined) updateData.investorId = investorId ? String(investorId) : null;
      if (estimatedAgeMonths !== undefined) updateData.estimatedAgeMonths = Number(estimatedAgeMonths);
      if (entryDate !== undefined) updateData.entryDate = new Date(entryDate);
      if (birthDate !== undefined) updateData.birthDate = new Date(birthDate);
      if (initialWeightKg !== undefined) updateData.initialWeightKg = Number(initialWeightKg);
      if (purchasePrice !== undefined) updateData.purchasePrice = Number(purchasePrice);

      if (insurance !== undefined) {
        if (insurance === null) {
          const existingInsurance = await tx.insurance.findUnique({ where: { cattleId: currentId } });
          if (existingInsurance) {
            await tx.insurance.delete({ where: { cattleId: currentId } });
          }
        } else {
          const existingInsurance = await tx.insurance.findUnique({ where: { cattleId: currentId } });
          
          const insData: any = {
            coverageType: insurance.coverageType,
            coveragePercent: Number(insurance.coveragePercent || 100),
            sumAssured: Number(insurance.sumAssured),
            premiumCost: Number(insurance.premiumCost),
            premiumPaymentType: insurance.premiumPaymentType,
            duration: insurance.duration,
            endDate: insurance.endDate ? new Date(insurance.endDate) : null,
            notes: insurance.notes,
            status: insurance.notes || 'AKTIF'
          };
          if (insurance.startDate) {
            insData.startDate = new Date(insurance.startDate);
          }

          if (existingInsurance) {
            await tx.insurance.update({
              where: { cattleId: currentId },
              data: insData
            });
          } else {
            await tx.insurance.create({
              data: {
                cattleId: currentId,
                ...insData,
                startDate: insurance.startDate ? new Date(insurance.startDate) : new Date()
              }
            });
          }
        }
      }

      return await tx.cattle.update({
        where: { id: currentId },
        data: updateData
      });
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error updating cattle:', error);
    res.status(500).json({ message: error.message || 'Error updating cattle' });
  }
};

export const archiveCattle = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const cattle = await prisma.cattle.update({
      where: { id },
      data: {
        status: reason === 'Terjual' ? 'TERJUAL' : 'ARSIP',
        archiveReason: reason || 'Lainnya'
      }
    });

    res.json(cattle);
  } catch (error: any) {
    console.error('Error archiving cattle:', error);
    res.status(500).json({ message: error.message || 'Error archiving cattle' });
  }
};

export const unarchiveCattle = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const cattle = await prisma.cattle.update({
      where: { id },
      data: {
        status: 'AKTIF',
        archiveReason: null
      }
    });

    res.json(cattle);
  } catch (error: any) {
    console.error('Error unarchiving cattle:', error);
    res.status(500).json({ message: error.message || 'Error unarchiving cattle' });
  }
};

// Fetch all female cattle to use as potential dams in KTP generator selectbox
export const getDams = async (req: Request, res: Response) => {
  try {
    const dams = await prisma.cattle.findMany({
      where: { gender: 'BETINA' },
      select: { id: true, name: true, notes: true, breed: true, isDam: true, damAlias: true },
      orderBy: { createdAt: 'desc' }
    });

    // Extract alias: prefer damAlias field, fallback to parsing notes, then name/id
    const damsWithAlias = dams.map(d => {
      const aliasFromNotes = d.notes?.match(/Nama panggilan:\s*([A-Z0-9]+)/i)?.[1];
      const alias = d.damAlias || aliasFromNotes || d.name || d.id;
      return { ...d, alias };
    });

    res.json(damsWithAlias);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dams', error });
  }
};
