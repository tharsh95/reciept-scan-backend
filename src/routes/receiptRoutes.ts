import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { 
  uploadReceipt, 
  getReceipts, 
  deleteReceipt, 
  getStats,
  validateReceipt,
  processReceipt
} from '../controllers/receiptController';
import { authenticateToken } from '../middleware/auth';

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
  // fileFilter: (req, file, cb) => {
  //   // Accept only PDF files
  //   if (file.mimetype === 'application/pdf') {
  //     cb(null, true);
  //   } else {
  //     cb(new Error('Only PDF files are allowed'));
  //   }
  // }
});

// All routes are protected
router.use(authenticateToken);

// Receipt routes
router.post('/upload', upload.single('file'), uploadReceipt);
router.post('/:fileId/validate', validateReceipt);
router.post('/:fileId/process', processReceipt);
router.get('/', getReceipts);
router.get('/stats', getStats);
router.delete('/:id', deleteReceipt);
export default router; 
  