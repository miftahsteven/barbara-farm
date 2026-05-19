import prisma from '../src/lib/prisma.js';

async function testPayloadSizes() {
  try {
    console.log("Analyzing Cattle payload sizes...");
    const cattleList = await prisma.cattle.findMany({
      select: {
        id: true,
        name: true,
        photoUrl: true,
        qrUrl: true
      }
    });

    console.log("\n--- Payload Size Breakdown ---");
    let totalPhotoChars = 0;
    let totalQrChars = 0;

    cattleList.forEach(c => {
      const photoLen = c.photoUrl ? c.photoUrl.length : 0;
      const qrLen = c.qrUrl ? c.qrUrl.length : 0;
      totalPhotoChars += photoLen;
      totalQrChars += qrLen;

      if (photoLen > 1000 || qrLen > 1000) {
        console.log(`Cattle: ${c.id} (${c.name || 'No Name'})`);
        console.log(`  - photoUrl: ${(photoLen / 1024).toFixed(2)} KB`);
        console.log(`  - qrUrl: ${(qrLen / 1024).toFixed(2)} KB`);
      }
    });

    console.log(`\nGrand Totals:`);
    console.log(`  - Total Photo Data: ${(totalPhotoChars / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Total QR Data: ${(totalQrChars / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Combined Payload Size: ${((totalPhotoChars + totalQrChars) / (1024 * 1024)).toFixed(2)} MB`);

  } catch (error) {
    console.error("Payload analysis failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPayloadSizes();
