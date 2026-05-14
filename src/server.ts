import dotenv from 'dotenv';

// Load environment variables before importing app
dotenv.config();

import app from './app.js';
import prisma from './lib/prisma.js';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('✅ Database connection established.');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`👉 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

startServer();
