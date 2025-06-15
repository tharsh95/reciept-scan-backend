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
exports.generateResponse = generateResponse;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Initialize the API with proper error handling
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
}
const ai = new generative_ai_1.GoogleGenerativeAI(apiKey);
function generateResponse(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = yield model.generateContent(prompt);
            const response = result.response;
            return response.text();
        }
        catch (error) {
            console.error("Error generating response from Gemini:", error);
            throw new Error("Failed to generate response from Gemini API");
        }
    });
}
//# sourceMappingURL=gemini.js.map