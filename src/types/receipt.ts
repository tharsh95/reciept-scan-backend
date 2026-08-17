export interface ReceiptData {
  merchantName: string;
  totalAmount: number;
  purchaseDate: string;
  items?: ReceiptItem[];
  confidence?: number;
  category?: string;
  notes?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReceiptStats {
  totalSpent: number;
  averageAmount: number;
  categoryBreakdown: {
    category: string;
    total: number;
    count: number;
  }[];
  monthlyBreakdown: {
    month: string;
    total: number;
    count: number;
  }[];
} 