import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export const getAllInvestors = async (req: Request, res: Response) => {
  try {
    const investors = await prisma.investor.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { cattles: true }
        }
      }
    });
    res.json(investors);
  } catch (error: any) {
    console.error('Error fetching investors:', error);
    res.status(500).json({ message: 'Gagal mengambil data investor' });
  }
};

export const getInvestorById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const investor = await prisma.investor.findUnique({
      where: { id },
      include: {
        cattles: {
          include: {
            sale: true
          }
        }
      }
    });
    if (!investor) return res.status(404).json({ message: 'Investor tidak ditemukan' });
    res.json(investor);
  } catch (error: any) {
    console.error('Error fetching investor by id:', error);
    res.status(500).json({ message: 'Gagal mengambil detail investor' });
  }
};

export const createInvestor = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, address, profitSharePercent, notes } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Nama, email, dan telepon wajib diisi' });
    }

    // Check if email already registered
    const existing = await prisma.investor.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email investor sudah terdaftar' });
    }

    const investor = await prisma.investor.create({
      data: {
        name,
        email,
        phone,
        address,
        profitSharePercent: Number(profitSharePercent) || 70,
        notes
      }
    });

    res.status(201).json(investor);
  } catch (error: any) {
    console.error('Error creating investor:', error);
    res.status(500).json({ message: error.message || 'Gagal menambahkan investor' });
  }
};

export const updateInvestor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, email, phone, address, profitSharePercent, notes } = req.body;

    // Check email uniqueness if email is changing
    if (email) {
      const existing = await prisma.investor.findFirst({
        where: { 
          email,
          NOT: { id }
        }
      });
      if (existing) {
        return res.status(400).json({ message: 'Email investor sudah digunakan oleh investor lain' });
      }
    }

    const updateData: any = {
      name,
      email,
      phone,
      address,
      notes
    };
    if (profitSharePercent !== undefined) {
      updateData.profitSharePercent = Number(profitSharePercent);
    }

    const updated = await prisma.investor.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating investor:', error);
    res.status(500).json({ message: 'Gagal memperbarui data investor' });
  }
};

export const deleteInvestor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Check if investor has associated cattles
    const cattlesCount = await prisma.cattle.count({ where: { investorId: id } });
    if (cattlesCount > 0) {
      return res.status(400).json({ message: 'Investor tidak dapat dihapus karena masih memiliki sapi terdaftar' });
    }

    await prisma.investor.delete({ where: { id } });
    res.json({ message: 'Data investor berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting investor:', error);
    res.status(500).json({ message: 'Gagal menghapus data investor' });
  }
};
