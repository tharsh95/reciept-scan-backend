import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import { processReceipt } from '../utils/receiptProcessor';
import { ReceiptFilters, ReceiptStats } from '../types/receipt';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export const uploadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const file = req.file;

    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    // Process receipt
    const processedReceipt = await processReceipt(file.path);

    // Create receipt file record
    const receiptFile = await prisma.receiptFile.create({
      data: {
        fileName: file.originalname,
        filePath: file.path,
        userId,
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
        userId,
        category: processedReceipt.data.category,
        notes: processedReceipt.data.notes,
        items: {
          create: processedReceipt.data.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json({
      message: 'Receipt processed successfully',
      receipt: {
        id: receipt.id,
        merchantName: receipt.merchantName,
        totalAmount: receipt.totalAmount,
        purchasedAt: receipt.purchasedAt,
        category: receipt.category,
        items: receipt.items,
        isScanned: processedReceipt.isScanned,
        confidence: processedReceipt.confidence,
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

export const listReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      category,
      search,
    } = req.query as ReceiptFilters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      userId,
      ...(startDate && endDate && {
        purchasedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { merchantName: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Get receipts with pagination
    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          items: true,
        },
        skip,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
      }),
      prisma.receipt.count({ where }),
    ]);

    res.json({
      receipts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
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
        id,
        userId,
      },
      include: {
        items: true,
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

export const updateReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { merchantName, totalAmount, purchasedAt, category, notes, items } = req.body;

    const receipt = await prisma.receipt.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    // Update receipt
    const updatedReceipt = await prisma.receipt.update({
      where: { id },
      data: {
        merchantName,
        totalAmount,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : undefined,
        category,
        notes,
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        }),
      },
      include: {
        items: true,
      },
    });

    res.json({
      message: 'Receipt updated successfully',
      receipt: updatedReceipt,
    });
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
        id,
        userId,
      },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    // Delete associated file
    if (receipt.filePath) {
      try {
        await fs.unlink(receipt.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    // Delete receipt and associated items
    await prisma.receipt.delete({
      where: { id },
    });

    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getReceiptStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const where = {
      userId,
      ...(startDate && endDate && {
        purchasedAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      }),
    };

    // Get total spent and average amount
    const [totalSpent, averageAmount] = await Promise.all([
      prisma.receipt.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.receipt.aggregate({
        where,
        _avg: { totalAmount: true },
      }),
    ]);

    // Get category breakdown
    const categoryBreakdown = await prisma.receipt.groupBy({
      by: ['category'],
      where,
      _sum: { totalAmount: true },
      _count: true,
    });

    // Get monthly breakdown
    const monthlyBreakdown = await prisma.receipt.groupBy({
      by: ['purchasedAt'],
      where,
      _sum: { totalAmount: true },
      _count: true,
    });

    const stats: ReceiptStats = {
      totalSpent: totalSpent._sum.totalAmount || 0,
      averageAmount: averageAmount._avg.totalAmount || 0,
      categoryBreakdown: categoryBreakdown.map(cat => ({
        category: cat.category || 'Uncategorized',
        total: cat._sum.totalAmount || 0,
        count: cat._count,
      })),
      monthlyBreakdown: monthlyBreakdown.map(month => ({
        month: month.purchasedAt.toISOString().slice(0, 7),
        total: month._sum.totalAmount || 0,
        count: month._count,
      })),
    };

    res.json({ stats });
  } catch (error) {
    next(error);
  }
}; 