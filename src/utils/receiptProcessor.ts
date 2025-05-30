import { createWorker } from 'tesseract.js';
import { AppError } from '../middleware/error';
import { ReceiptData } from '../types/receipt';
import { generateResponse } from './gemini';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { pdfoPng } from './pdfProcessor';

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

const isPDF = (filePath: string): boolean => {
  return filePath.toLowerCase().endsWith('.pdf');
};


const extractTextFromPDF = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new AppError('Failed to extract text from PDF', 500);
  }
};

export const processReceipt = async (
  filePath: string
): Promise<{
  isScanned: boolean;
  data: ReceiptData;
  confidence: number;
}> => {
  try {
    let text: string;
    let confidence = 1.0;

    if (isPDF(filePath)) {
      const pngPages = await pdfoPng(filePath);
      const worker = await createWorker('eng');
      const result = await worker.recognize(pngPages[0].path);
      text = result.data.text;
      confidence = result.data.confidence;
      await worker.terminate();
    } else {
      const worker = await createWorker('eng');
      const result = await worker.recognize(filePath);
      text = result.data.text;
      confidence = result.data.confidence;
      await worker.terminate();
    }

    // Use Gemini to extract structured data
    const result = await generateResponse(`${SYSTEM_MESSAGE}\n\n${EXTRACTION_PROMPT}\n\n${text}`);

    // Clean the response to extract only the JSON part
    const cleanedResponse = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{]*/, '')  // Remove any text before the first {
      .replace(/[^}]*$/, '')  // Remove any text after the last }
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
        extractedData.items = Object.entries(extractedData.items).map(([name, details]: [string, any]) => ({
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
    } catch (parseError) {
      console.error('Failed to parse cleaned response:', cleanedResponse);
      console.error('Parse error:', parseError);
      throw new AppError('Failed to parse receipt data', 500);
    }
    if (!extractedData.merchantName ){
      extractedData.merchantName="John doe"
    }
    if(!extractedData.totalAmount) {
      extractedData.totalAmount=100
    }
    if(!extractedData.purchaseDate) {
      extractedData.purchaseDate=new Date()
    }

    return {
      isScanned: true,
      data: {
        merchantName: extractedData.merchantName??"John Doe",
        totalAmount: Number(extractedData.totalAmount)??1000,
        purchaseDate: extractedData.purchaseDate??new Date(),
        items: extractedData.items ?? [],
        confidence,
      },
      confidence,
    };
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw new AppError('Failed to process receipt', 500);
  }
};