import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export const getAllSales = async (req: Request, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { saleDate: 'desc' },
      include: {
        cattle: {
          select: { id: true, breed: true, pen: true, initialWeightKg: true, purchasePrice: true }
        }
      }
    });
    res.json(sales);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Gagal mengambil data penjualan' });
  }
};

export const getSaleById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        cattle: true
      }
    });
    if (!sale) return res.status(404).json({ message: 'Penjualan tidak ditemukan' });
    res.json(sale);
  } catch (error: any) {
    console.error('Error fetching sale by id:', error);
    res.status(500).json({ message: 'Gagal mengambil detail penjualan' });
  }
};

export const createSale = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Check if cattle is already sold
    const existingSale = await prisma.sale.findUnique({ where: { cattleId: data.cattleId } });
    if (existingSale) {
      return res.status(400).json({ message: 'Sapi ini sudah tercatat terjual' });
    }

    const sale = await prisma.sale.create({
      data: {
        cattleId: data.cattleId,
        saleDate: new Date(data.saleDate),
        finalWeightKg: Number(data.finalWeightKg),
        salePrice: Number(data.salePrice),
        destination: data.destination,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        deliveryAddress: data.deliveryAddress,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        downPayment: Number(data.downPayment) || 0,
        purchasePrice: Number(data.purchasePrice) || 0,
        totalFeedCost: Number(data.totalFeedCost) || 0,
        totalMedicalCost: Number(data.totalMedicalCost) || 0,
        additionalOperationalCost: Number(data.additionalOperationalCost) || 0,
        totalProductionCost: Number(data.totalProductionCost) || 0,
        projectedProfit: Number(data.projectedProfit) || 0,
        marginPercent: Number(data.marginPercent) || 0,
        sellingPricePerKg: Number(data.salePrice) / Number(data.finalWeightKg),
        totalAdg: Number(data.totalAdg) || 0,
        status: data.status || 'Final',
        notes: data.notes
      },
      include: {
        cattle: true
      }
    });

    // Update cattle status to TERJUAL, add archive reason, and sync final weight
    await prisma.cattle.update({
      where: { id: data.cattleId },
      data: { 
        status: 'TERJUAL',
        archiveReason: 'Terjual',
        initialWeightKg: Number(data.finalWeightKg) // Sync weight to cattle record
      }
    });

    res.status(201).json(sale);
  } catch (error: any) {
    console.error('Error creating sale:', error);
    res.status(500).json({ message: error.message || 'Gagal menyimpan data penjualan' });
  }
};

export const updateSale = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    if (data.saleDate) data.saleDate = new Date(data.saleDate);
    
    // Recalculate if prices change
    if (data.salePrice || data.finalWeightKg) {
      const existing = await prisma.sale.findUnique({ where: { id } });
      const salePrice = data.salePrice !== undefined ? Number(data.salePrice) : existing?.salePrice || 0;
      const finalWeightKg = data.finalWeightKg !== undefined ? Number(data.finalWeightKg) : existing?.finalWeightKg || 1;
      data.sellingPricePerKg = salePrice / finalWeightKg;
    }

    const updated = await prisma.sale.update({
      where: { id },
      data,
      include: { cattle: true }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating sale:', error);
    res.status(500).json({ message: 'Gagal memperbarui data penjualan' });
  }
};

export const deleteSale = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // find the sale to get cattleId
    const sale = await prisma.sale.findUnique({ where: { id } });
    
    if (sale) {
      // Revert cattle status to AKTIF and clear archive reason
      await prisma.cattle.update({
        where: { id: sale.cattleId },
        data: { 
          status: 'AKTIF',
          archiveReason: null
        }
      });
    }

    await prisma.sale.delete({ where: { id } });
    res.json({ message: 'Data penjualan berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ message: 'Gagal menghapus data penjualan' });
  }
};
