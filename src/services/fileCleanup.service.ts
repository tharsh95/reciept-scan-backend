import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export class FileCleanupService {
  private static instance: FileCleanupService;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): FileCleanupService {
    if (!FileCleanupService.instance) {
      FileCleanupService.instance = new FileCleanupService();
    }
    return FileCleanupService.instance;
  }

  public async startCleanupJob(interval: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    await this.cleanupFiles();

    setInterval(async () => {
      await this.cleanupFiles();
    }, interval);
  }

  private async cleanupFiles(): Promise<void> {
    try {
      // Get all files in the uploads directory
      const uploadsDir = path.join(__dirname, '../../uploads');
      const files = await fs.readdir(uploadsDir);

      // Get all valid file paths from the database
      const validFiles = await prisma.receiptFile.findMany({
        select: { filePath: true },
      });
      const validFilePaths = new Set(validFiles.map(f => f.filePath));

      // Delete orphaned files
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        if (!validFilePaths.has(filePath)) {
          try {
            await fs.unlink(filePath);
            console.log(`Deleted orphaned file: ${filePath}`);
          } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in file cleanup job:', error);
    }
  }
} 