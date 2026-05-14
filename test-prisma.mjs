import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const payload = {
    "gender": "JANTAN",
    "status": "AKTIF",
    "breed": "BLIX",
    "pen": "Kandang C",
    "originType": "Supplier Lokal",
    "entryDate": "2026-06-30",
    "damAlias": "EXT",
    "birthDate": "2025-06-01",
    "originName": "CV INDO TERNAK JAYA",
    "initialWeightKg": 120,
    "purchasePrice": 15500000,
    "id": "BF-EXT-BLIX-J-6-25 (HJ1)",
    "photoUrl": "https://images.unsplash.com/photo-1546445317-29f4545e9d53?q=80&w=800",
    "name": "HJ1",
    "isDam": false,
    "notes": "Bagus, sehat\nNama panggilan: HJ1",
    "qrUrl": "/public/cattle/BF-EXT-BLIX-J-6-25 (HJ1)"
  };

  try {
    const cattle = await prisma.cattle.create({
      data: {
        ...payload,
        entryDate: new Date(payload.entryDate),
        birthDate: payload.birthDate ? new Date(payload.birthDate) : null,
      }
    });
    console.log("SUCCESS:", cattle.id);
  } catch (err) {
    console.log("PRISMA ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
