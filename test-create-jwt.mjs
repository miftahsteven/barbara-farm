import jwt from 'jsonwebtoken';

async function run() {
  const secret = 'smartfarm_secret_key_2024_!@#';
  const token = jwt.sign({ userId: 'test-user', role: 'admin' }, secret);

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

  const res = await fetch('http://localhost:3001/api/cattle', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
run();
