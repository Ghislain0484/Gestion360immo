import { AgencyEntity } from './db';
import { AnnouncementType, RegistrationStatus } from './enums';

export interface Announcement extends AgencyEntity {
  id: string; // UUID
  //agency_id: string; // UUID, FK vers agencies(id)
  property_id?: string | null; // UUID, FK vers properties(id) — optionnel si bien non enregistré
  title: string;
  description: string;
  type: AnnouncementType;
  is_active: boolean;
  expires_at?: string | null; // timestamptz
  views: number;
  mandate_url?: string | null;
  mandate_type?: 'vente' | 'gestion' | null;
  external_property_ref?: string | null;
  photos?: string[] | null;           // URLs publiques des photos (max 5)
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  agency?: {
    name: string;
  };
}

export interface AnnouncementInterest extends AgencyEntity {
  id: string; // UUID
  announcement_id: string; // UUID, FK vers announcements(id)
  //agency_id: string; // UUID, FK vers agencies(id)
  user_id: string; // UUID, FK vers users(id)
  message?: string | null;
  status: RegistrationStatus;
  created_at: string; // timestamptz
}