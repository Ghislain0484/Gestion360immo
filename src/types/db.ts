import { JsonB } from './enums';
import {
  User, UserPermissions, UserFormData, PlatformAdmin, AgencyUser
} from './users';
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
import { Contract, RentReceipt, RentReceiptWithContract } from './contracts';
import { FinancialStatement, FinancialTransaction } from './financials';
import { Message, Notification, EmailNotification, NotificationSettings, NotificationSettingsUpsert } from './messages';
import { PlatformSetting, AuditLog, SystemAlert, PlatformStats, DashboardStats } from './platform';

export type Entity =
  | User
  | Agency
  | Owner
  | Tenant
  | Property
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
  | NotificationSettings;

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