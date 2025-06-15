"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const receiptController_1 = require("../controllers/receiptController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Configure multer for file upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
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
router.use(auth_1.authenticateToken);
// Receipt routes
router.post('/upload', upload.single('file'), receiptController_1.uploadReceipt);
router.post('/:fileId/validate', receiptController_1.validateReceipt);
router.post('/:fileId/process', receiptController_1.processReceipt);
router.get('/', receiptController_1.getReceipts);
router.get('/stats', receiptController_1.getStats);
router.delete('/:id', receiptController_1.deleteReceipt);
exports.default = router;
//# sourceMappingURL=receiptRoutes.js.map