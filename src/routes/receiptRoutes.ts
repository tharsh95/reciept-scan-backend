import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { 
  uploadReceipt, 
  getReceipts, 
  getReceipt, 
  downloadReceipt, 
  deleteReceipt 
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
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// All routes are protected
router.use(authenticateToken);

// Receipt routes
router.post('/upload', upload.single('file'), uploadReceipt);
router.get('/', getReceipts);
router.get('/:id', getReceipt);
router.get('/:id/download', downloadReceipt);
router.delete('/:id', deleteReceipt);

export default router; 
 