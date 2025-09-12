import { JsonB, NotifType, NotifPriority } from './enums';

export interface Message {
  id: string; // UUID
  sender_id: string; // UUID, FK vers users(id)
  receiver_id: string; // UUID, FK vers users(id)
  agency_id?: string | null; // UUID, FK vers agencies(id)
  property_id?: string | null; // UUID, FK vers properties(id)
  announcement_id?: string | null; // UUID, FK vers announcements(id)
  subject: string;
  content: string;
  is_read: boolean;
  attachments: JsonB;
  created_at: string; // timestamptz
}

export interface Notification {
  id: string; // UUID
  user_id: string; // UUID, FK vers users(id)
  type: NotifType;
  title: string;
  message: string;
  data: JsonB;
  is_read: boolean;
  priority: NotifPriority;
  created_at: string; // timestamptz
  agency_id?: string; // UUID, FK vers agencies(id)
}

export interface EmailNotification {
  id: string; // UUID
  type: 'new_user' | 'new_contract' | 'receipt_generated' | 'payment_reminder' | 'contract_expiry';
  recipient: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  agency_id: string; // UUID, FK vers agencies(id)
  created_at: string; // timestamptz
}

export interface NotificationSettings {
  id: string; // UUID
  user_id: string; // UUID, FK vers users(id)
  payment_reminder: boolean;
  new_message: boolean;
  rental_alert: boolean;
  property_update: boolean;
  contract_expiry: boolean;
  new_interest: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface NotificationSettingsUpsert {
  payment_reminder: boolean;
  new_message: boolean;
  rental_alert: boolean;
  property_update: boolean;
  contract_expiry: boolean;
  new_interest: boolean;
}