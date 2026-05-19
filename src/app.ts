import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { restrictCliAccess } from './middlewares/cli.middleware.js';

const app = express();

// Middlewares
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors());
app.use(restrictCliAccess);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

export default app;
