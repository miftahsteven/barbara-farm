import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
  console.log('Prisma Client path:', require.resolve('@prisma/client'));
} catch (e) {
  console.log('Error resolving @prisma/client:', e.message);
}
