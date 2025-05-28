import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import path from 'path';
import fs from 'fs/promises';
import { processReceipt } from '../utils/receiptProcessor';

const prisma = new PrismaClient();

export const uploadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const file = req.file;
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    // Process receipt
    console.log(file.path);
    const processedReceipt = await processReceipt(file.path);
    // Create receipt file record
    const receiptFile = await prisma.receiptFile.create({
      data: {
        fileName: file.originalname,
        filePath: file.path,
        userId: userId,
        isValid: true,
        isProcessed: true,
      },
    });

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        merchantName: processedReceipt.data.merchantName,
        totalAmount: processedReceipt.data.totalAmount,
        purchasedAt: new Date(processedReceipt.data.purchaseDate),
        filePath: file.path,
        userId: userId,
        fileId: receiptFile.id,
      },
    });

    res.status(201).json({
      message: 'Receipt processed successfully',
      receipt: {
        id: receipt.id,
        merchantName: receipt.merchantName,
        totalAmount: receipt.totalAmount,
        purchasedAt: receipt.purchasedAt,
        isScanned: processedReceipt.isScanned,
        confidence: processedReceipt.data.confidence,
      },
    });
  } catch (error) {
    // Clean up file if upload fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    next(error);
  }
};

export const getReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const receipts = await prisma.receipt.findMany({
      where: {
        userId,
        ...(search ? {
          OR: [
            { merchantName: { contains: search as string } },
            { file: { fileName: { contains: search as string } } },
          ],
        } : {}),
      },
      include: {
        file: {
          select: {
            fileName: true,
            filePath: true,
            isProcessed: true,
          },
        },
      },
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    res.json({ receipts });
  } catch (error) {
    next(error);
  }
};

export const getReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
      include: {
        file: {
          select: {
            fileName: true,
            filePath: true,
            isProcessed: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    res.json({ receipt });
  } catch (error) {
    next(error);
  }
};

export const downloadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
      include: {
        file: true,
      },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    const filePath = receipt.file.filePath;
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('File not found', 404);
    }

    res.download(filePath, receipt.file.fileName);
  } catch (error) {
    next(error);
  }
};

export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
      include: {
        file: true,
      },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    // Delete file from filesystem
    try {
      await fs.unlink(receipt.file.filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    // Delete from database
    await prisma.receipt.delete({
      where: {
        id: parseInt(id),
      },
    });

    await prisma.receiptFile.delete({
      where: {
        id: receipt.file.id,
      },
    });

    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    next(error);
  }
}; 