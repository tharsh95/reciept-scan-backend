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
exports.pdfoPng = void 0;
const { pdfToPng } = require('pdf-to-png-converter');
const pdfoPng = (pdfFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    const pngPages = yield pdfToPng(pdfFilePath, {
        disableFontFace: false,
        useSystemFonts: false,
        enableXfa: false,
        viewportScale: 2.0,
        outputFolder: 'output/folder',
        outputFileMaskFunc: (pageNumber) => `page_${pageNumber}.png`,
        pdfFilePassword: 'pa$$word',
        pagesToProcess: [1, 3, 11],
        strictPagesToProcess: false,
        verbosityLevel: 0,
    });
    return pngPages;
});
exports.pdfoPng = pdfoPng;
//# sourceMappingURL=pdfProcessor.js.map