export interface Announcement {
  id: string;
  agencyId: string;
  propertyId: string;
  title: string;
  description: string;
  type: 'location' | 'vente';
  isActive: boolean;
  expiresAt?: Date;
  views: number;
  interests: AnnouncementInterest[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnouncementInterest {
  id: string;
  announcementId: string;
  agencyId: string;
  userId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  agencyId?: string;
  propertyId?: string;
  announcementId?: string;
  subject: string;
  content: string;
  isRead: boolean;
  attachments: MessageAttachment[];
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}