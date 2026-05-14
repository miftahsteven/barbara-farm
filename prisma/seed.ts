import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Seed Admin User
  const adminEmail = 'admin@smartfarm.com';
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log('✅ Admin user created/updated');

  // 2. Seed Feeding Groups (Kandang)
  const feedingGroups = [
    { id: 'KDG-A', name: 'Kandang A', description: 'Penggemukan 1 - Bobot 250-300kg' },
    { id: 'KDG-B', name: 'Kandang B', description: 'Penggemukan 2 - Bobot 300-350kg' },
    { id: 'KDG-C', name: 'Kandang C', description: 'Perawatan & Karantina' },
    { id: 'KDG-D', name: 'Kandang D', description: 'Siap Jual - Finishing' },
  ];

  for (const group of feedingGroups) {
    await prisma.feedingGroup.upsert({
      where: { id: group.id },
      update: {},
      create: group,
    });
  }
  console.log('✅ Feeding groups (Kandang) created');

  // 3. Seed Cattle (25 cows)
  const breeds = ['Simental', 'Limousin', 'PO', 'Bali', 'Brahman', 'Madura', 'Brangus'];
  const pens = ['Kandang A', 'Kandang B', 'Kandang C', 'Kandang D'];
  const statuses = ['AKTIF', 'PEMANTAUAN', 'SIAP_JUAL'];

  for (let i = 1; i <= 25; i++) {
    const cattleId = `BF-2026-${String(i).padStart(3, '0')}`;
    const breed = breeds[i % breeds.length] || 'Simental';
    const pen = pens[i % pens.length] || 'Kandang A';
    const gender = i % 3 === 0 ? 'BETINA' : 'JANTAN';
    const status = i > 20 ? 'SIAP_JUAL' : (i % 5 === 0 ? 'PEMANTAUAN' : 'AKTIF');
    const initialWeight = 200 + (i * 5);
    const purchasePrice = 12000000 + (i * 200000);

    await prisma.cattle.upsert({
      where: { id: cattleId },
      update: {},
      create: {
        id: cattleId,
        name: `${breed} ${String(i).padStart(2, '0')}`,
        breed: breed,
        gender: gender,
        originType: 'Supplier',
        originName: i % 2 === 0 ? 'CV Ternak Makmur' : 'Pak Ridwan Farm',
        entryDate: new Date('2026-01-01'),
        initialWeightKg: initialWeight,
        purchasePrice: purchasePrice,
        pen: pen,
        status: status,
        notes: `Sapi ke-${i} dari program seeding.`,
        qrUrl: `/public/cattle/${cattleId}`,
      },
    });

    // 4. Seed Growth Logs (3-5 logs per cattle)
    for (let j = 0; j < 3; j++) {
      const weighDate = new Date();
      weighDate.setDate(weighDate.getDate() - (30 - j * 10));
      const weight = initialWeight + (j * 15) + (Math.random() * 5);
      
      await prisma.growthLog.create({
        data: {
          cattleId: cattleId,
          weighDate: weighDate,
          weightKg: weight,
          bcs: 3,
          adgKgPerDay: 0.8 + (Math.random() * 0.5),
          status: 'normal',
        },
      });
    }

    // 5. Seed Health Record (some cattle)
    if (i % 5 === 0) {
      await prisma.healthRecord.create({
        data: {
          cattleId: cattleId,
          checkDate: new Date(),
          symptoms: 'Nafsu makan menurun',
          diagnosis: 'Gangguan pencernaan ringan',
          severity: 'mild',
          actionType: 'medicine',
          medicineName: 'Vitamin B Complex',
          status: 'treatment',
        },
      });
    }
  }
  console.log('✅ 25 Cattle with Growth & Health logs created');

  console.log('🚀 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
