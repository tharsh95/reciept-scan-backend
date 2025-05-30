import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { AppError } from '../middleware/error';

export interface ExtractedText {
  text: string;
  numpages: number;
  info: {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    [key: string]: any;
  };
}

export const extractTextFromPDF = async (filePath: string): Promise<ExtractedText> => {
  try {
    // Read the PDF file
    const dataBuffer = await fs.readFile(filePath);
    
    // Extract text from PDF
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      numpages: data.numpages,
      info: data.info
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(`Error extracting text from PDF: ${error.message}`, 500);
    }
    throw new AppError('Error extracting text from PDF', 500);
  }
};

export const validatePDF = async (filePath: string): Promise<boolean> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    
    // Basic validation checks
    if (!data.text || data.text.trim().length === 0) {
      return false;
    }
    
    // Check if the PDF has at least some content
    if (data.numpages === 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating PDF:', error);
    return false;
  }
}; 