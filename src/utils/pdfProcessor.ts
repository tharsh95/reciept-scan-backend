const { pdfToPng } = require('pdf-to-png-converter');

export const pdfoPng = async (pdfFilePath: any) => {
    const pngPages = await pdfToPng(pdfFilePath, {
        disableFontFace: false,
        useSystemFonts: false,
        enableXfa: false,
        viewportScale: 2.0,
        outputFolder: 'output/folder',
        outputFileMaskFunc: (pageNumber: any) => `page_${pageNumber}.png`,
        pdfFilePassword: 'pa$$word',
        pagesToProcess: [1, 3, 11],
        strictPagesToProcess: false,
        verbosityLevel: 0,
    });
    return pngPages;
};