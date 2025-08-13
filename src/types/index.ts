export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'director' | 'manager' | 'agent';
  agencyId: string;
  avatar?: string;
  createdAt: Date;
}

export interface Agency {
  id: string;
  name: string;
  commercialRegister: string;
  logo?: string;
  isAccredited: boolean;
  accreditationNumber?: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  createdAt: Date;
}

export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  propertyTitle: 'village_attestation' | 'attribution_letter' | 'acd' | 'other';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  spouseName?: string;
  spousePhone?: string;
  childrenCount: number;
  agencyId: string;
  createdAt: Date;
}

export interface Property {
  id: string;
  ownerId: string;
  agencyId: string;
  title: string;
  description: string;
  type: 'villa' | 'apartment' | 'land' | 'building' | 'other';
  standing: 'economic' | 'medium' | 'high';
  address: string;
  city: string;
  district: string;
  lot?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  technicalDetails: {
    ceiling: string;
    paint: { type: string; brand: string };
    electricity: { outlets: number; lighting: string };
    carpentry: 'wood' | 'aluminum';
    locks: string;
    flooring: string;
  };
  images: PropertyImage[];
  isAvailable: boolean;
  forSale: boolean;
  forRent: boolean;
  createdAt: Date;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  url: string;
  room: string;
  description?: string;
  isPrimary: boolean;
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  spouseName?: string;
  spousePhone?: string;
  childrenCount: number;
  profession: string;
  nationality: string;
  idCardUrl?: string;
  photoUrl?: string;
  paymentStatus: 'good' | 'irregular' | 'bad';
  agencyId: string;
  createdAt: Date;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  agencyId: string;
  startDate: Date;
  endDate?: Date;
  monthlyRent: number;
  deposit: number;
  status: 'active' | 'ended' | 'terminated';
  paymentHistory: PaymentRecord[];
  createdAt: Date;
}

export interface PaymentRecord {
  id: string;
  rentalId: string;
  month: string;
  year: number;
  amount: number;
  paidDate?: Date;
  status: 'paid' | 'late' | 'unpaid';
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  propertyId?: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'rental_alert' | 'payment_reminder' | 'new_message' | 'property_update';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}