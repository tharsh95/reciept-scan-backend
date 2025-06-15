"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReceiptsSchema = exports.getReceiptSchema = exports.deleteReceiptSchema = exports.updateReceiptSchema = exports.createReceiptSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// User schemas
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
// Receipt schemas
exports.createReceiptSchema = zod_1.z.object({
    body: zod_1.z.object({
        merchantName: zod_1.z.string().min(1, 'Merchant name is required'),
        totalAmount: zod_1.z.number().positive('Total amount must be positive'),
        purchaseDate: zod_1.z.string().datetime('Invalid date format'),
        items: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1, 'Item name is required'),
            quantity: zod_1.z.number().int().positive('Quantity must be positive'),
            price: zod_1.z.number().positive('Price must be positive'),
        })),
        category: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.updateReceiptSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid receipt ID'),
    }),
    body: zod_1.z.object({
        merchantName: zod_1.z.string().min(1, 'Merchant name is required').optional(),
        totalAmount: zod_1.z.number().positive('Total amount must be positive').optional(),
        purchaseDate: zod_1.z.string().datetime('Invalid date format').optional(),
        items: zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string().min(1, 'Item name is required'),
            quantity: zod_1.z.number().int().positive('Quantity must be positive'),
            price: zod_1.z.number().positive('Price must be positive'),
        }))
            .optional(),
        category: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.deleteReceiptSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid receipt ID'),
    }),
});
exports.getReceiptSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid receipt ID'),
    }),
});
exports.listReceiptsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        startDate: zod_1.z.string().datetime('Invalid start date').optional(),
        endDate: zod_1.z.string().datetime('Invalid end date').optional(),
        category: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=validation.js.map