export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  maritalStatus: 'celibataire' | 'marie' | 'divorce' | 'veuf';
  spouseName?: string;
  spousePhone?: string;
  childrenCount: number;
  profession: string;
  nationality: string;
  photoUrl?: string;
  idCardUrl?: string;
  paymentStatus: 'bon' | 'irregulier' | 'mauvais';
  agencyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantFormData extends Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'> {}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  agencyId: string;
  startDate: Date;
  endDate?: Date;
  monthlyRent: number;
  deposit: number;
  status: 'actif' | 'termine' | 'resilie';
  renewalHistory: RenewalRecord[];
  paymentHistory: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RenewalRecord {
  id: string;
  rentalId: string;
  previousEndDate: Date;
  newEndDate: Date;
  newRent?: number;
  renewalDate: Date;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  rentalId: string;
  month: string;
  year: number;
  amount: number;
  paidDate?: Date;
  dueDate: Date;
  status: 'paye' | 'retard' | 'impaye';
  paymentMethod?: 'especes' | 'cheque' | 'virement' | 'mobile_money';
  notes?: string;
  createdAt: Date;
}