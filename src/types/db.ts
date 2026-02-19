import { JsonB } from './enums';
import {
  User, UserPermissions, UserFormData, PlatformAdmin, AgencyUser
} from './users';
import { AgencyEntity } from './common';
import {
  Agency, AgencyFormData, AgencyRegistrationRequest, AgencySubscription,
  SubscriptionPayment, Reward, AgencyRanking
} from './agencies';
import { Owner } from './owners';
import { Tenant, TenantFormData, TenantFilters, TenantWithRental, Rental, PaymentRecord } from './tenants';
import {
  Property, PropertyFormData, PropertyLocation, PropertyDetails,
  RoomDetails, PropertyImage
} from './properties';
import { Announcement, AnnouncementInterest } from './announcements';
import {
  Contract,
  RentReceipt,
  RentReceiptWithContract,
  ContractTemplate,
  ContractVersion,
  ManagedContract,
  PropertyTenantAssignment,
} from './contracts';
import { FinancialStatement, FinancialTransaction } from './financials';
import { Message, Notification, EmailNotification, NotificationSettings, NotificationSettingsUpsert } from './messages';
import { PlatformSetting, AuditLog, SystemAlert, PlatformStats, DashboardStats } from './platform';

export type Entity =
  | User
  | Agency
  | Owner
  | Tenant
  | Property
  | ManagedContract
  | ContractTemplate
  | ContractVersion
  | PropertyTenantAssignment
  | Contract
  | Announcement
  | RentReceipt
  | FinancialStatement
  | Message
  | Notification
  | EmailNotification
  | AgencySubscription
  | SubscriptionPayment
  | AgencyRanking
  | PlatformSetting
  | AuditLog
  | AnnouncementInterest
  | AuditLog
  | AnnouncementInterest
  | NotificationSettings
  | Inventory;

export type {
  // Users
  User,
  UserPermissions,
  UserFormData,
  PlatformAdmin,
  AgencyUser,
  // Agencies
  Agency,
  AgencyFormData,
  AgencyRegistrationRequest,
  AgencySubscription,
  SubscriptionPayment,
  Reward,
  AgencyRanking,
  AgencyEntity,
  // Owners
  Owner,
  // Tenants
  Tenant,
  TenantFormData,
  TenantFilters,
  Rental,
  PaymentRecord,
  TenantWithRental,
  // Properties
  Property,
  PropertyFormData,
  PropertyLocation,
  PropertyDetails,
  RoomDetails,
  PropertyImage,
  // Announcements
  Announcement,
  AnnouncementInterest,
  // Contracts
  Contract,
  RentReceipt,
  RentReceiptWithContract,
  ContractTemplate,
  ContractVersion,
  ManagedContract,
  PropertyTenantAssignment,
  // Financials
  FinancialStatement,
  FinancialTransaction,
  // Messages
  Message,
  Notification,
  EmailNotification,
  NotificationSettings,
  NotificationSettingsUpsert,
  // Platform
  PlatformSetting,
  AuditLog,
  SystemAlert,
  PlatformStats,
  DashboardStats,
  // Enums
  JsonB,
};

export interface Inventory {
  id: string;
  agency_id: string;
  property_id: string;
  tenant_id?: string;
  contract_id?: string;
  date: string; // ISO date
  type: 'entry' | 'exit';
  status: 'draft' | 'completed' | 'signed';
  notes?: string;
  rooms: {
    name: string;
    elements: {
      name: string; // e.g. "Mur", "Sol", "Prises"
      condition: 'neuf' | 'bon' | 'usage' | 'mauvais';
      comment?: string;
      photos?: string[];
    }[];
  }[];
  meter_readings?: {
    electricity?: { index: number; number?: string };
    water?: { index: number; number?: string };
  };
  keys_count?: number;
  signature_url?: string; // URL to signed PDF/Image
  created_at: string;
  updated_at: string;
}
