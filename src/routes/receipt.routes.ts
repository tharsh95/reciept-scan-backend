import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  createReceipt,
  getReceipt,
  updateReceipt,
  deleteReceipt,
  listReceipts,
  uploadReceipt,
  getReceiptStats,
} from '../controllers/receipt.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createReceiptSchema,
  updateReceiptSchema,
  deleteReceiptSchema,
  getReceiptSchema,
  listReceiptsSchema,
} from '../schemas/validation';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only PDF and image files
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// All routes are protected
router.use(authenticate);

// Receipt management routes
router.post('/', validate(createReceiptSchema), createReceipt);
router.post('/upload', upload.single('receipt'), uploadReceipt);
router.get('/', validate(listReceiptsSchema), listReceipts);
router.get('/stats', getReceiptStats);
router.get('/:id', validate(getReceiptSchema), getReceipt);
router.put('/:id', validate(updateReceiptSchema), updateReceipt);
router.delete('/:id', validate(deleteReceiptSchema), deleteReceipt);

export default router; 