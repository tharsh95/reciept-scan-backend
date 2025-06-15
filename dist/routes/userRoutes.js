"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', userController_1.register);
router.post('/login', userController_1.login);
// Protected routes
router.get('/profile', auth_1.authenticateToken, userController_1.getProfile);
router.put('/profile', auth_1.authenticateToken, userController_1.updateProfile);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map