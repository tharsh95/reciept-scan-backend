"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    const statusCode = 'statusCode' in err ? err.statusCode : 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.js.map