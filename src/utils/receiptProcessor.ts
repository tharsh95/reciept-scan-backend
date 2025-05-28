import { createWorker } from 'tesseract.js';
import { AppError } from '../middleware/error';
import { ReceiptData } from '../types/receipt';

export const processReceipt = async (filePath: string): Promise<{
  isScanned: boolean;
  data: ReceiptData;
  confidence: number;
}> => {
  try {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    const { data: { text, confidence } } = await worker.recognize(filePath);
    await worker.terminate();

    // Extract receipt data using regex patterns
    const merchantName = extractMerchantName(text);
    const totalAmount = extractTotalAmount(text);
    const purchaseDate = extractPurchaseDate(text);
    const items = extractItems(text);

    if (!merchantName || !totalAmount || !purchaseDate) {
      throw new AppError('Could not extract required receipt information', 400);
    }

    return {
      isScanned: true,
      data: {
        merchantName,
        totalAmount,
        purchaseDate,
        items,
        confidence,
      },
      confidence,
    };
  } catch (error) {
    throw new AppError('Failed to process receipt', 500);
  }
};

const extractMerchantName = (text: string): string | null => {
  // Look for common merchant name patterns
  const patterns = [
    /(?:^|\n)([A-Z][A-Z\s]+)(?:\n|$)/, // All caps words
    /(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\n|$)/, // Title case words
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

const extractTotalAmount = (text: string): number | null => {
  // Look for total amount patterns
  const patterns = [
    /(?:total|amount|sum|balance)[:\s]+[$]?(\d+\.\d{2})/i,
    /[$]?(\d+\.\d{2})(?:\s*(?:total|amount|sum|balance))?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }

  return null;
};

const extractPurchaseDate = (text: string): string | null => {
  // Look for date patterns
  const patterns = [
    /(?:date|purchase date)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null;
};

const extractItems = (text: string): Array<{ name: string; quantity: number; price: number }> => {
  const items: Array<{ name: string; quantity: number; price: number }> = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Look for item patterns
    const itemPattern = /(.+?)\s+(\d+)\s+[$]?(\d+\.\d{2})/;
    const match = line.match(itemPattern);

    if (match) {
      items.push({
        name: match[1].trim(),
        quantity: parseInt(match[2]),
        price: parseFloat(match[3]),
      });
    }
  }

  return items;
}; 