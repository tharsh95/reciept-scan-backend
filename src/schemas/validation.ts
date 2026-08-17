import { z } from 'zod';

// User schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Receipt schemas
export const createReceiptSchema = z.object({
  body: z.object({
    merchantName: z.string().min(1, 'Merchant name is required'),
    totalAmount: z.number().positive('Total amount must be positive'),
    purchaseDate: z.string().datetime('Invalid date format'),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Item name is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
        price: z.number().positive('Price must be positive'),
      })
    ),
    category: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateReceiptSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid receipt ID'),
  }),
  body: z.object({
    merchantName: z.string().min(1, 'Merchant name is required').optional(),
    totalAmount: z.number().positive('Total amount must be positive').optional(),
    purchaseDate: z.string().datetime('Invalid date format').optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1, 'Item name is required'),
          quantity: z.number().int().positive('Quantity must be positive'),
          price: z.number().positive('Price must be positive'),
        })
      )
      .optional(),
    category: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const deleteReceiptSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid receipt ID'),
  }),
});

export const getReceiptSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid receipt ID'),
  }),
});

export const listReceiptsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime('Invalid start date').optional(),
    endDate: z.string().datetime('Invalid end date').optional(),
    category: z.string().optional(),
    search: z.string().optional(),
  }),
}); 