"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.deleteReceipt = exports.getReceipts = exports.processReceipt = exports.validateReceipt = exports.uploadReceipt = void 0;
const client_1 = require("@prisma/client");
const error_1 = require("../middleware/error");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const receiptProcessor_1 = require("../utils/receiptProcessor");
const prisma = new client_1.PrismaClient();
const uploadReceipt = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            throw new error_1.AppError('User not authenticated', 401);
        }
        const file = req.file;
        if (!file) {
            throw new error_1.AppError('No file uploaded', 400);
        }
        // Create receipt file record
        const receiptFile = yield prisma.receiptFile.create({
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
    }
    catch (error) {
        next(error);
    }
});
exports.uploadReceipt = uploadReceipt;
const validateReceipt = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            throw new error_1.AppError('User not authenticated', 401);
        }
        const { fileId } = req.params;
        const receiptFile = yield prisma.receiptFile.findFirst({
            where: {
                id: parseInt(fileId),
                userId: userId
            }
        });
        if (!receiptFile) {
            throw new error_1.AppError('Receipt file not found', 404);
        }
        // Check if file exists
        try {
            yield promises_1.default.access(receiptFile.filePath);
        }
        catch (_b) {
            throw new error_1.AppError('Receipt file not found on server', 404);
        }
        // Check file type
        const fileExtension = path_1.default.extname(receiptFile.fileName).toLowerCase();
        if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(fileExtension)) {
            throw new error_1.AppError('Invalid file type. Only PDF and image files are supported', 400);
        }
        // Try basic OCR/parsing to validate
        try {
            const processedReceipt = yield (0, receiptProcessor_1.processReceipt)(receiptFile.filePath);
            // Check if we got any meaningful data
            if (!processedReceipt.isScanned || processedReceipt.confidence < 0.5) {
                throw new error_1.AppError('Receipt could not be parsed successfully', 400);
            }
            // Update receipt file with validation status
            yield prisma.receiptFile.update({
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
                    fileSize: (yield promises_1.default.stat(receiptFile.filePath)).size
                }
            });
        }
        catch (error) {
            // Update receipt file as invalid
            yield prisma.receiptFile.update({
                where: {
                    id: parseInt(fileId)
                },
                data: {
                    isValid: false
                }
            });
            throw new error_1.AppError('Failed to parse receipt: ' + error.message, 400);
        }
    }
    catch (error) {
        next(error);
    }
});
exports.validateReceipt = validateReceipt;
const cleanupProcessedFiles = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield promises_1.default.unlink(filePath);
        console.log(`Deleted processed file: ${filePath}`);
        const outputDir = path_1.default.join(__dirname, '../../output/folder');
        try {
            const outputFiles = yield promises_1.default.readdir(outputDir);
            for (const file of outputFiles) {
                yield promises_1.default.unlink(path_1.default.join(outputDir, file));
                console.log(`Deleted output file: ${path_1.default.join(outputDir, file)}`);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.log('Output directory does not exist, skipping cleanup');
            }
            else {
                console.error('Error cleaning output directory:', error);
            }
        }
    }
    catch (error) {
        console.error(`Error deleting processed file ${filePath}:`, error);
    }
});
const processReceipt = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            throw new error_1.AppError('User not authenticated', 401);
        }
        const { fileId } = req.params;
        const receiptFile = yield prisma.receiptFile.findFirst({
            where: {
                id: parseInt(fileId),
                userId: userId,
                isValid: true
            }
        });
        if (!receiptFile) {
            throw new error_1.AppError('Valid receipt file not found', 404);
        }
        // Process receipt with OCR and Gemini
        const processedReceipt = yield (0, receiptProcessor_1.processReceipt)(receiptFile.filePath);
        // Check for existing receipt with same details
        const existingReceiptFile = yield prisma.receiptFile.findFirst({
            where: {
                fileName: receiptFile.fileName,
                userId: userId
            },
            include: {
                receipt: true
            }
        });
        // If receipt exists, check if it's a duplicate
        if (existingReceiptFile === null || existingReceiptFile === void 0 ? void 0 : existingReceiptFile.receipt) {
            const existingReceipt = existingReceiptFile.receipt;
            const isDuplicate = existingReceipt.merchantName === processedReceipt.data.merchantName &&
                existingReceipt.totalAmount === processedReceipt.data.totalAmount &&
                existingReceipt.purchasedAt.toISOString().split('T')[0] === processedReceipt.data.purchaseDate;
            if (isDuplicate) {
                // Delete the duplicate receipt file
                yield prisma.receiptFile.delete({
                    where: {
                        id: receiptFile.id
                    }
                });
                // Delete the file from filesystem
                yield cleanupProcessedFiles(receiptFile.filePath);
                yield cleanupProcessedFiles(receiptFile.filePath);
                return res.status(200).json({
                    message: 'Duplicate receipt detected and removed',
                    status: false,
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
        const receipt = yield prisma.receipt.create({
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
        yield prisma.receiptFile.update({
            where: {
                id: parseInt(fileId)
            },
            data: {
                isProcessed: true
            }
        });
        yield cleanupProcessedFiles(receiptFile.filePath);
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
    }
    catch (error) {
        next(error);
    }
});
exports.processReceipt = processReceipt;
const getReceiptStatus = (file) => {
    if (!file.isValid && !file.isProcessed)
        return 'pending_validation';
    if (file.isValid && !file.isProcessed)
        return 'pending_processing';
    if (file.isValid && file.isProcessed && !file.receipt)
        return 'processed';
    return 'final';
};
const getReceipts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { search, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query;
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
                        { isValid: null }, // Pending validation
                        { isValid: true } // Validated
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
                        { isProcessed: true }
                    ]
                };
                break;
            default:
                // If no status specified, return all receipts
                statusFilter = {};
        }
        const receipts = yield prisma.receiptFile.findMany({
            where: Object.assign({ userId }, statusFilter),
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
                [sortBy]: sortOrder,
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
                currentStage: getReceiptStatus(file)
            },
            receipt: file.receipt ? Object.assign(Object.assign({}, file.receipt), { items: file.receipt.items ? JSON.parse(file.receipt.items) : null }) : null,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt
        }));
        // Calculate stats
        const allReceipts = yield prisma.receiptFile.findMany({
            where: { userId },
            include: { receipt: true }
        });
        // Calculate total amount from all receipts
        const totalAmount = allReceipts.reduce((sum, file) => {
            var _a;
            return sum + (((_a = file.receipt) === null || _a === void 0 ? void 0 : _a.totalAmount) || 0);
        }, 0);
        res.json({
            receipts: transformedReceipts,
            stats: {
                totalFiles: allReceipts.length,
                validFiles: allReceipts.filter(r => r.isValid).length,
                processedFiles: allReceipts.filter(r => r.isProcessed).length,
                totalAmount: totalAmount
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getReceipts = getReceipts;
const deleteReceipt = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { id } = req.params;
        const receiptFile = yield prisma.receiptFile.findFirst({
            where: {
                id: parseInt(id),
                userId,
            },
            include: {
                receipt: true
            }
        });
        if (!receiptFile) {
            throw new error_1.AppError('Receipt file not found', 404);
        }
        // Delete file from filesystem
        try {
            yield promises_1.default.unlink(receiptFile.filePath);
        }
        catch (error) {
            console.error('Error deleting file:', error);
        }
        // Delete associated receipt if it exists
        if (receiptFile.receipt) {
            yield prisma.receipt.delete({
                where: {
                    id: receiptFile.receipt.id
                }
            });
        }
        // Delete the receipt file
        yield prisma.receiptFile.delete({
            where: {
                id: receiptFile.id
            }
        });
        res.json({ message: 'Receipt deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteReceipt = deleteReceipt;
const getStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            throw new error_1.AppError('User not authenticated', 401);
        }
        const { startDate, endDate } = req.query;
        // Build date filter
        const dateFilter = Object.assign({}, (startDate && endDate ? {
            purchasedAt: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        } : {}));
        // Get all receipts for the user within date range
        const receipts = yield prisma.receipt.findMany({
            where: Object.assign({ userId }, dateFilter),
            select: {
                totalAmount: true,
                purchasedAt: true,
                items: true
            }
        });
        // Calculate total spent
        const totalSpent = receipts.reduce((sum, receipt) => { var _a; return sum + ((_a = receipt.totalAmount) !== null && _a !== void 0 ? _a : 0); }, 0);
        // Calculate average amount
        const averageAmount = receipts.length > 0 ? totalSpent / receipts.length : 0;
        // Calculate monthly breakdown
        const monthlyBreakdown = receipts.reduce((acc, receipt) => {
            var _a;
            const month = receipt.purchasedAt.toISOString().slice(0, 7); // YYYY-MM format
            acc[month] = (acc[month] || 0) + ((_a = receipt.totalAmount) !== null && _a !== void 0 ? _a : 0);
            return acc;
        }, {});
        // Calculate category breakdown
        const categoryBreakdown = receipts.reduce((acc, receipt) => {
            if (receipt.items) {
                const items = JSON.parse(receipt.items);
                items.forEach((item) => {
                    var _a, _b;
                    const category = (_a = item.category) !== null && _a !== void 0 ? _a : 'Uncategorized';
                    acc[category] = (acc[category] || 0) + ((_b = item.price) !== null && _b !== void 0 ? _b : 0);
                });
            }
            return acc;
        }, {});
        res.json({
            totalSpent,
            averageAmount,
            totalReceipts: receipts.length,
            monthlyBreakdown,
            categoryBreakdown
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getStats = getStats;
//# sourceMappingURL=receiptController.js.map