// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import { PrismaClient } from '@prisma/client';
// import { errorHandler } from './middleware/error';
// import userRoutes from './routes/userRoutes';
// import receiptRoutes from './routes/receiptRoutes';
// import path from 'path';
// import fs from 'fs';

// // Load environment variables
// dotenv.config();

// // Initialize Express app
// const app = express();
// const prisma = new PrismaClient();
// const port = process.env.PORT ?? 8080;

// // Create uploads directory if it doesn't exist
// const uploadsDir = path.join(__dirname, '../uploads');
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// // Middleware
// app.use(cors({
//   origin: '*',
//   credentials: true
// }));

// // Body parsing middleware
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // Static files
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// app.get("/", (req, res) => {
//   res.status(200).send("OK");
// });
// // Routes
// app.use('/api/users', userRoutes);
// app.use('/api/receipts', receiptRoutes);
// app.get("/debug/png", (req, res) => {
//   const filePath = path.resolve("output/folder/page.1.png"); // adjust as needed
//   res.sendFile(filePath, (err) => {
//     if (err) {
//       res.status(404).send("File not found");
//     }
//   });
// });

// // Basic health check route
// app.get('/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// // Error handling middleware
// app.use(errorHandler);

// // Start file cleanup service
// // const fileCleanupService = FileCleanupService.getInstance();
// // fileCleanupService.startCleanupJob().catch(console.error);

// // Start server
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// }); 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/error';
import userRoutes from './routes/userRoutes';
import receiptRoutes from './routes/receiptRoutes';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT ?? 8080;

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
  res.status(200).send("OK");
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/receipts', receiptRoutes);

app.get("/debug/png", (req, res) => {
  const filePath = path.resolve("output/folder/page.1.png");
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send("File not found");
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

  // Self-ping every 5 minutes to prevent Render spin down
  // cron.schedule('*/5 * * * *', async () => {
  //   try {
  //     await fetch(`${process.env.APP_URL}/health`);
  //     console.log('Render keep-alive ping sent');
  //   } catch (error) {
  //     console.error('Render keep-alive failed:', error);
  //   }
  // });

  // Aiven DB keep-alive ping every 3 hours
  cron.schedule('0 */3 * * *', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Aiven DB keep-alive ping sent');
    } catch (error) {
      console.error('Aiven DB keep-alive failed:', error);
    }
  });
});