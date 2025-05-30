import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import path from 'path';
import fs from 'fs/promises';
import { processReceipt as processReceiptUtil } from '../utils/receiptProcessor';

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

    // Create receipt file record
    const receiptFile = await prisma.receiptFile.create({
      data: {
        fileName: file.originalname,
        filePath: file.path,
        userId: userId,
        isValid: false,
        isProcessed: false,
      },
    });

    res.status(201).json({
      message: 'Receipt uploaded successfully',
      receiptFile: {
        id: receiptFile.id,
        fileName: receiptFile.fileName,
        filePath: receiptFile.filePath,
        isValid: receiptFile.isValid,
        isProcessed: receiptFile.isProcessed
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validateReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { fileId } = req.params;
    const receiptFile = await prisma.receiptFile.findFirst({
      where: {
        id: parseInt(fileId),
        userId: userId
      }
    });

    if (!receiptFile) {
      throw new AppError('Receipt file not found', 404);
    }

    // Check if file exists
    try {
      await fs.access(receiptFile.filePath);
    } catch {
      throw new AppError('Receipt file not found on server', 404);
    }

    // Check file type
    const fileExtension = path.extname(receiptFile.fileName).toLowerCase();
    if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(fileExtension)) {
      throw new AppError('Invalid file type. Only PDF and image files are supported', 400);
    }

    // Try basic OCR/parsing to validate
    try {
      const processedReceipt = await processReceiptUtil(receiptFile.filePath);
      
      // Check if we got any meaningful data
      if (!processedReceipt.isScanned || processedReceipt.confidence < 0.5) {
        throw new AppError('Receipt could not be parsed successfully', 400);
      }

      // Update receipt file with validation status
      await prisma.receiptFile.update({
        where: {
          id: parseInt(fileId)
        },
        data: {
          isValid: true
        }
      });

      res.json({
        message: 'Receipt validated successfully',
        validation: {
          isValid: true,
          confidence: processedReceipt.confidence,
          isScanned: processedReceipt.isScanned,
          fileType: fileExtension,
          fileSize: (await fs.stat(receiptFile.filePath)).size
        }
      });
    } catch (error) {
      // Update receipt file as invalid
      await prisma.receiptFile.update({
        where: {
          id: parseInt(fileId)
        },
        data: {
          isValid: false
        }
      });
      throw new AppError('Failed to parse receipt: ' + (error as Error).message, 400);
    }
  } catch (error) {
    next(error);
  }
};

export const processReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { fileId } = req.params;
    const receiptFile = await prisma.receiptFile.findFirst({
      where: {
        id: parseInt(fileId),
        userId: userId,
        isValid: true
      }
    });

    if (!receiptFile) {
      throw new AppError('Valid receipt file not found', 404);
    }

    // Process receipt with OCR and Gemini
    const processedReceipt = await processReceiptUtil(receiptFile.filePath);

    // Check for existing receipt with same details
    const existingReceiptFile = await prisma.receiptFile.findFirst({
      where: {
        fileName: receiptFile.fileName,
        userId: userId
      },
      include: {
        receipt: true
      }
    });

    // If receipt exists, check if it's a duplicate
    if (existingReceiptFile?.receipt) {
      const existingReceipt = existingReceiptFile.receipt;
      const isDuplicate = 
        existingReceipt.merchantName === processedReceipt.data.merchantName &&
        existingReceipt.totalAmount === processedReceipt.data.totalAmount &&
        existingReceipt.purchasedAt.toISOString().split('T')[0] === processedReceipt.data.purchaseDate;
      
      if (isDuplicate) {
        return res.status(200).json({
          message: 'Duplicate receipt detected',
          receipt: {
            id: existingReceipt.id,
            merchantName: existingReceipt.merchantName,
            totalAmount: existingReceipt.totalAmount,
            purchasedAt: existingReceipt.purchasedAt,
            isScanned: processedReceipt.isScanned,
            confidence: processedReceipt.confidence,
            items: existingReceipt.items ? JSON.parse(existingReceipt.items) : null
          }
        });
      }
    }

    // Create receipt record with processed data
    const receipt = await prisma.receipt.create({
      data: {
        merchantName: processedReceipt.data.merchantName,
        totalAmount: processedReceipt.data.totalAmount,
        purchasedAt: new Date(processedReceipt.data.purchaseDate),
        filePath: receiptFile.filePath,
        userId: userId,
        fileId: receiptFile.id,
        confidence: processedReceipt.confidence || null,
        items: processedReceipt.data.items ? JSON.stringify(processedReceipt.data.items) : null
      },
    });

    // Update receipt file as processed
    await prisma.receiptFile.update({
      where: {
        id: parseInt(fileId)
      },
      data: {
        isProcessed: true
      }
    });

    res.status(201).json({
      message: 'Receipt processed successfully',
      receipt: {
        id: receipt.id,
        merchantName: receipt.merchantName,
        totalAmount: receipt.totalAmount,
        purchasedAt: receipt.purchasedAt,
        isScanned: processedReceipt.isScanned,
        confidence: processedReceipt.confidence,
        items: receipt.items ? JSON.parse(receipt.items) : null
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { search, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query;
    console.log(status,'ss')
    // Build status filter based on the tab
    let statusFilter = {};
    switch (status) {
      case 'uploaded':
        // Show only newly uploaded files
        statusFilter = {
          isValid: null
        };
        break;
      case 'val':
        // Show all files that need validation or are validated
        statusFilter = {
          OR: [
            { isValid: null },  // Pending validation
            { isValid: true }   // Validated
          ]
        };
        break;
      case 'processed':
        // Show all validated files (both pending processing and processed)
        statusFilter = {
          isValid: true
        };
        break;
      case 'final':
        // Show only fully processed files with receipt data
        statusFilter = {
          AND: [
            { isValid: true },
            { isProcessed: true },
          ]
        };
        break;
      default:
        // If no status specified, return all receipts
        statusFilter = {};
    }
    const receipts = await prisma.receiptFile.findMany({
      where: {
        userId,
        ...statusFilter,
        // ...(search ? {
        //   OR: [
        //     { fileName: { contains: search as string } },
        //     { receipt: { merchantName: { contains: search as string } } }
        //   ],
        // } : {}),
      },
      include: {
        receipt: {
          select: {
            id: true,
            merchantName: true,
            totalAmount: true,
            purchasedAt: true,
            confidence: true,
            items: true
          }
        }
      },
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    // Transform the response to include status information
    const transformedReceipts = receipts.map(file => ({
      id: file.id,
      fileName: file.fileName,
      filePath: file.filePath,
      status: {
        isValid: file.isValid,
        isProcessed: file.isProcessed,
        currentStage: !file.isValid&&!file.isProcessed ? 'pending_validation' :
                     file.isValid && !file.isProcessed ? 'pending_processing' :
                     file.isValid && file.isProcessed && !file.receipt ? 'processed' :
                     'final'
      },
      receipt: file.receipt ? {
        ...file.receipt,
        items: file.receipt.items ? JSON.parse(file.receipt.items) : null
      } : null,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }));

    // Calculate stats
    const allReceipts = await prisma.receiptFile.findMany({
      where: { userId },
      include: { receipt: true }
    });

    res.json({ 
      receipts: transformedReceipts,
      stats: {
        total: allReceipts.length,
        validated: allReceipts.filter(r => r.isValid === null || r.isValid).length,
        processed: allReceipts.filter(r => r.isValid).length,
        final: allReceipts.filter(r => r.isValid && r.isProcessed && r.receipt).length,

      }
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

export const getStats = async(req:Request,res:Response,next:NextFunction)=>{

  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {
      ...(startDate && endDate ? {
        purchasedAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      } : {})
    };

    // Get all receipts for the user within date range
    const receipts = await prisma.receipt.findMany({
      where: {
        userId,
        ...dateFilter
      },
      select: {
        totalAmount: true,
        purchasedAt: true,
        items: true
      }
    });

    // Calculate total spent
    const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);

    // Calculate average amount
    const averageAmount = receipts.length > 0 ? totalSpent / receipts.length : 0;

    // Calculate monthly breakdown
    const monthlyBreakdown = receipts.reduce((acc, receipt) => {
      const month = receipt.purchasedAt.toISOString().slice(0, 7); // YYYY-MM format
      acc[month] = (acc[month] || 0) + receipt.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    // Calculate category breakdown
    const categoryBreakdown = receipts.reduce((acc, receipt) => {
      if (receipt.items) {
        const items = JSON.parse(receipt.items);
        items.forEach((item: any) => {
          const category = item.category || 'Uncategorized';
          acc[category] = (acc[category] || 0) + (item.price || 0);
        });
      }
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalSpent,
      averageAmount,
      totalReceipts: receipts.length,
      monthlyBreakdown,
      categoryBreakdown
    });
  } catch (error) {
    next(error);
  }
}