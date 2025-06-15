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
exports.FileCleanupService = void 0;
const client_1 = require("@prisma/client");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
class FileCleanupService {
    constructor() {
        this.isRunning = false;
        this.CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }
    static getInstance() {
        if (!FileCleanupService.instance) {
            FileCleanupService.instance = new FileCleanupService();
        }
        return FileCleanupService.instance;
    }
    startCleanupJob() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log('Cleanup job is already running');
                return;
            }
            console.log('Starting file cleanup job...');
            this.isRunning = true;
            yield this.cleanupFiles();
            setInterval(() => __awaiter(this, void 0, void 0, function* () {
                console.log('Running scheduled file cleanup...');
                yield this.cleanupFiles();
            }), this.CLEANUP_INTERVAL);
            console.log(`File cleanup job scheduled to run every ${this.CLEANUP_INTERVAL / (60 * 60 * 1000)} hours`);
        });
    }
    cleanupFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Starting file cleanup process...');
                // Clean uploads directory
                const uploadsDir = path_1.default.join(__dirname, '../../uploads');
                const uploadsFiles = yield promises_1.default.readdir(uploadsDir);
                console.log(`Found ${uploadsFiles.length} files in uploads directory`);
                const validFiles = yield prisma.receiptFile.findMany({
                    select: { filePath: true },
                });
                const validFilePaths = new Set(validFiles.map(f => f.filePath));
                console.log(`Found ${validFilePaths.size} valid files in database`);
                let deletedCount = 0;
                for (const file of uploadsFiles) {
                    const filePath = path_1.default.join(uploadsDir, file);
                    if (!validFilePaths.has(filePath)) {
                        try {
                            yield promises_1.default.unlink(filePath);
                            deletedCount++;
                            console.log(`Deleted orphaned file: ${filePath}`);
                        }
                        catch (error) {
                            console.error(`Error deleting file ${filePath}:`, error);
                        }
                    }
                }
                // Clean output directory
                const outputDir = path_1.default.join(__dirname, '../../output/folder');
                try {
                    const outputFiles = yield promises_1.default.readdir(outputDir);
                    console.log(`Found ${outputFiles.length} files in output directory`);
                    for (const file of outputFiles) {
                        const filePath = path_1.default.join(outputDir, file);
                        try {
                            yield promises_1.default.unlink(filePath);
                            deletedCount++;
                            console.log(`Deleted output file: ${filePath}`);
                        }
                        catch (error) {
                            console.error(`Error deleting output file ${filePath}:`, error);
                        }
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
                console.log(`Cleanup completed. Deleted ${deletedCount} files total.`);
            }
            catch (error) {
                console.error('Error in file cleanup job:', error);
            }
        });
    }
}
exports.FileCleanupService = FileCleanupService;
//# sourceMappingURL=fileCleanup.service.js.map