// // const { pdfToPng } = require('pdf-to-png-converter');
// import { fromPath } from "pdf2pic";
// import path from "path";

// export const pdfoPng = async (pdfFilePath: string, pages: number[] = [1]) => {
//     const outputFolder = path.resolve("output/folder");
//     const convert = fromPath(pdfFilePath, {
//         density: 300,
//         saveFilename: "page",
//         savePath: outputFolder,
//         format: "png",
//         width: 1240, // You can adjust width/height as needed
//         height: 1754,
//     });

//     // Convert specified pages
//     const results = [];
//     for (const page of pages) {
//         const result = await convert(page);
//         results.push(result);
//     }
//     return results;
// };

import { pdfToPng } from 'pdf-to-png-converter';
import path from 'path';

export const pdfoPng = async (pdfFilePath: string, pages: number[] = [1]) => {
  const results = await pdfToPng(pdfFilePath, {
    disableFontFace: false,
    useSystemFonts: false,
    viewportScale: 2.0,
    pagesToProcess: pages,
    strictPagesToProcess: false,
  });

  return results; // returns array of { pageNumber, path, content (buffer) }
};