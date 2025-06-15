import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/error';
import userRoutes from './routes/userRoutes';
import receiptRoutes from './routes/receiptRoutes';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT ?? 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});
// Routes
app.use('/api/users', userRoutes);
app.use('/api/receipts', receiptRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

// Start file cleanup service
// const fileCleanupService = FileCleanupService.getInstance();
// fileCleanupService.startCleanupJob().catch(console.error);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 