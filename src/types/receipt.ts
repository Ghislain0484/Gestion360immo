export interface RentReceipt {
  id: string;
  receiptNumber: string;
  agencyId: string;
  propertyId: string;
  ownerId: string;
  tenantId: string;
  month: string;
  year: number;
  rentAmount: number;
  charges?: number;
  totalAmount: number;
  paymentDate: Date;
  paymentMethod: 'especes' | 'cheque' | 'virement' | 'mobile_money';
  notes?: string;
  issuedBy: string;
  createdAt: Date;
}

export interface FinancialStatement {
  id: string;
  entityId: string; // owner or tenant ID
  entityType: 'owner' | 'tenant';
  agencyId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    pendingPayments: number;
  };
  transactions: FinancialTransaction[];
  generatedAt: Date;
}

export interface FinancialTransaction {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  propertyId?: string;
  contractId?: string;
}