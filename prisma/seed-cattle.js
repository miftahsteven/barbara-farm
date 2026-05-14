import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const cattleBreeds = ['Bali', 'Limousin', 'Simental', 'PO (Peranakan Ongole)', 'Brahman', 'Angus'];
const pens = ['Kandang A', 'Kandang B', 'Kandang C', 'Kandang D'];
const cattlePhotos = [
    'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1484557918186-7b4e591d4a12?auto=format&fit=crop&q=80&w=800',
];
async function main() {
    console.log('Clearing existing cattle data...');
    await prisma.cattle.deleteMany({});
    console.log('Seeding 10 cattle...');
    for (let i = 1; i <= 10; i++) {
        const id = `BF-2026-${i.toString().padStart(4, '0')}`;
        const breed = cattleBreeds[Math.floor(Math.random() * cattleBreeds.length)] || 'Bali';
        const pen = pens[Math.floor(Math.random() * pens.length)] || 'Kandang A';
        const photoUrl = cattlePhotos[Math.floor(Math.random() * cattlePhotos.length)] || null;
        const weight = 250 + Math.random() * 300;
        await prisma.cattle.upsert({
            where: { id },
            update: {},
            create: {
                id,
                name: `Sapi ${['Aster', 'Bima', 'Cempaka', 'Drona', 'Ekalaya', 'Gatotkaca', 'Hanoman', 'Indrajit'][i % 8]} ${i}`,
                breed,
                gender: Math.random() > 0.5 ? 'JANTAN' : 'BETINA',
                originType: 'Supplier Lokal',
                originName: 'PT. Ternak Jaya',
                entryDate: new Date(Date.now() - Math.random() * 10000000000),
                initialWeightKg: weight,
                purchasePrice: weight * 50000,
                photoUrl,
                pen,
                status: i % 5 === 0 ? 'PEMANTAUAN' : 'AKTIF',
                notes: 'Sapi dalam kondisi sehat dan nafsu makan baik.',
            },
        });
    }
    console.log('Seed completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-cattle.js.map