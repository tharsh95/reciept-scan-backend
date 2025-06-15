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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReceipt = void 0;
const tesseract_js_1 = require("tesseract.js");
const error_1 = require("../middleware/error");
const gemini_1 = require("./gemini");
const pdfProcessor_1 = require("./pdfProcessor");
const SYSTEM_MESSAGE = `You are a receipt data extraction assistant. Your ONLY task is to extract information from receipt text and return it as a JSON object. You must NOT include any explanations, code, or markdown. You must NOT generate any JavaScript code or examples.`;
const EXTRACTION_PROMPT = `Extract the following information from the receipt text and return it as a JSON object:

{
  "merchantName": "string or null",
  "totalAmount": number or null,
  "purchaseDate": "YYYY-MM-DD or null",
  folioId":"string or null
  "items": [
    {
      "name": "string",
      "quantity": number,
      "price": number
    }
  ]
}

Rules:
1. Return ONLY the JSON object, no other text
2. Use null for any field you cannot find
3. For items, only include items that are explicitly listed
4. For totalAmount, use the highest number that appears to be a total
5. For purchaseDate, convert any date format to YYYY-MM-DD

Receipt text:`;
const isPDF = (filePath) => {
    return filePath.toLowerCase().endsWith('.pdf');
};
// const extractTextFromPDF = async (filePath: string): Promise<string> => {
//   try {
//     const dataBuffer = fs.readFileSync(filePath);
//     const data = await pdfParse(dataBuffer);
//     return data.text;
//   } catch (error) {
//     console.error('Error extracting text from PDF:', error);
//     throw new AppError('Failed to extract text from PDF', 500);
//   }
// };
const processReceipt = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        let text;
        let confidence = 1.0;
        if (isPDF(filePath)) {
            const pngPages = yield (0, pdfProcessor_1.pdfoPng)(filePath);
            const worker = yield (0, tesseract_js_1.createWorker)('eng');
            const result = yield worker.recognize(pngPages[0].path);
            text = result.data.text;
            confidence = result.data.confidence;
            yield worker.terminate();
        }
        else {
            const worker = yield (0, tesseract_js_1.createWorker)('eng');
            const result = yield worker.recognize(filePath);
            text = result.data.text;
            confidence = result.data.confidence;
            yield worker.terminate();
        }
        // Use Gemini to extract structured data
        const result = yield (0, gemini_1.generateResponse)(`${SYSTEM_MESSAGE}\n\n${EXTRACTION_PROMPT}\n\n${text}`);
        // Clean the response to extract only the JSON part
        const cleanedResponse = result
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^[^{]*/, '') // Remove any text before the first {
            .replace(/[^}]*$/, '') // Remove any text after the last }
            .replace(/```javascript[\s\S]*?```/g, '') // Remove any JavaScript code blocks
            .replace(/const[\s\S]*?;/g, '') // Remove any JavaScript variable declarations
            .replace(/function[\s\S]*?{[\s\S]*?}/g, '') // Remove any JavaScript functions
            .replace(/javascript[\s\S]*?/g, '') // Remove any remaining JavaScript code
            .replace(/To extract[\s\S]*?/g, '') // Remove any "To extract" explanations
            .replace(/Example:[\s\S]*?/g, '') // Remove any examples
            .replace(/Steps:[\s\S]*?/g, '') // Remove any steps
            .trim();
        let extractedData;
        try {
            // Validate that the response looks like JSON before parsing
            if (!cleanedResponse.startsWith('{') || !cleanedResponse.endsWith('}')) {
                console.error('Invalid JSON structure:', cleanedResponse);
                throw new Error('Response is not a valid JSON object');
            }
            extractedData = JSON.parse(cleanedResponse);
            // Validate the structure of the parsed data
            if (typeof extractedData !== 'object' || Array.isArray(extractedData)) {
                throw new Error('Response is not a valid JSON object');
            }
            // Transform items from object to array format if needed
            if (extractedData.items && typeof extractedData.items === 'object' && !Array.isArray(extractedData.items)) {
                extractedData.items = Object.entries(extractedData.items).map(([name, details]) => ({
                    name,
                    quantity: details.quantity,
                    price: details.price
                }));
            }
            // Fix typo in purchaseDate field if present
            if (extractedData.purchasseeDate) {
                extractedData.purchaseDate = extractedData.purchasseeDate;
                delete extractedData.purchasseeDate;
            }
            // Validate that we're not using example values or code
            if (typeof extractedData.merchantName === 'function' ||
                typeof extractedData.totalAmount === 'function' ||
                typeof extractedData.purchaseDate === 'function' ||
                typeof extractedData.items === 'function') {
                throw new Error('Response contains JavaScript code instead of data');
            }
        }
        catch (parseError) {
            console.error('Failed to parse cleaned response:', cleanedResponse);
            console.error('Parse error:', parseError);
            throw new error_1.AppError('Failed to parse receipt data', 500);
        }
        if (!extractedData.merchantName) {
            extractedData.merchantName = "John doe";
        }
        if (!extractedData.totalAmount) {
            extractedData.totalAmount = 100;
        }
        if (!extractedData.purchaseDate) {
            extractedData.purchaseDate = new Date();
        }
        return {
            isScanned: true,
            data: {
                merchantName: (_a = extractedData.merchantName) !== null && _a !== void 0 ? _a : "John Doe",
                totalAmount: (_b = Number(extractedData.totalAmount)) !== null && _b !== void 0 ? _b : 1000,
                purchaseDate: (_c = extractedData.purchaseDate) !== null && _c !== void 0 ? _c : new Date(),
                items: (_d = extractedData.items) !== null && _d !== void 0 ? _d : [],
                confidence,
            },
            confidence,
        };
    }
    catch (error) {
        console.error('Error processing receipt:', error);
        throw new error_1.AppError('Failed to process receipt', 500);
    }
});
exports.processReceipt = processReceipt;
//# sourceMappingURL=receiptProcessor.js.map