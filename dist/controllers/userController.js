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
exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const error_1 = require("../middleware/error");
const jwt_1 = require("../utils/jwt");
const prisma = new client_1.PrismaClient();
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        // Validate required fields
        if (!name || !email || !password) {
            throw new error_1.AppError('Name, email and password are required', 400);
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new error_1.AppError('Invalid email format', 400);
        }
        // Validate password strength
        if (password.length < 6) {
            throw new error_1.AppError('Password must be at least 6 characters long', 400);
        }
        // Check if user already exists
        const existingUser = yield prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new error_1.AppError('Email already registered', 400);
        }
        // Hash password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = yield prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        // Generate token
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
        });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.register = register;
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Find user
        const user = yield prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new error_1.AppError('Invalid credentials', 401);
        }
        // Verify password
        const isValidPassword = yield bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            throw new error_1.AppError('Invalid credentials', 401);
        }
        // Generate token
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
        });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.login = login;
const getProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
exports.getProfile = getProfile;
const updateProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { name, email } = req.body;
        // Check if email is already taken by another user
        if (email) {
            const existingUser = yield prisma.user.findFirst({
                where: {
                    email,
                    id: { not: userId },
                },
            });
            if (existingUser) {
                throw new error_1.AppError('Email already in use', 400);
            }
        }
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: {
                name,
                email,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.updateProfile = updateProfile;
//# sourceMappingURL=userController.js.map