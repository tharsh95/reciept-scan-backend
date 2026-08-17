import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export class FileCleanupService {
  private static instance: FileCleanupService;
  private isRunning: boolean = false;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private constructor() {}

  public static getInstance(): FileCleanupService {
    if (!FileCleanupService.instance) {
      FileCleanupService.instance = new FileCleanupService();
    }
    return FileCleanupService.instance;
  }

  public async startCleanupJob(): Promise<void> {
    if (this.isRunning) {
      console.log('Cleanup job is already running');
      return;
    }

    console.log('Starting file cleanup job...');
    this.isRunning = true;
    await this.cleanupFiles();

    setInterval(async () => {
      console.log('Running scheduled file cleanup...');
      await this.cleanupFiles();
    }, this.CLEANUP_INTERVAL);

    console.log(`File cleanup job scheduled to run every ${this.CLEANUP_INTERVAL / (60 * 60 * 1000)} hours`);
  }

  private async cleanupFiles(): Promise<void> {
    try {
      console.log('Starting file cleanup process...');
      
      // Clean uploads directory
      const uploadsDir = path.join(__dirname, '../../uploads');
      const uploadsFiles = await fs.readdir(uploadsDir);
      console.log(`Found ${uploadsFiles.length} files in uploads directory`);

      const validFiles = await prisma.receiptFile.findMany({
        select: { filePath: true },
      });
      const validFilePaths = new Set(validFiles.map(f => f.filePath));
      console.log(`Found ${validFilePaths.size} valid files in database`);

      let deletedCount = 0;
      for (const file of uploadsFiles) {
        const filePath = path.join(uploadsDir, file);
        if (!validFilePaths.has(filePath)) {
          try {
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`Deleted orphaned file: ${filePath}`);
          } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
          }
        }
      }

      // Clean output directory
      const outputDir = path.join(__dirname, '../../output/folder');
      try {
        const outputFiles = await fs.readdir(outputDir);
        console.log(`Found ${outputFiles.length} files in output directory`);

        for (const file of outputFiles) {
          const filePath = path.join(outputDir, file);
          try {
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`Deleted output file: ${filePath}`);
          } catch (error) {
            console.error(`Error deleting output file ${filePath}:`, error);
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('Output directory does not exist, skipping cleanup');
        } else {
          console.error('Error cleaning output directory:', error);
        }
      }

      console.log(`Cleanup completed. Deleted ${deletedCount} files total.`);
    } catch (error) {
      console.error('Error in file cleanup job:', error);
    }
  }
} 