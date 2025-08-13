export interface Notification {
  id: string;
  userId: string;
  type: 'rental_alert' | 'payment_reminder' | 'new_message' | 'property_update' | 'contract_expiry' | 'new_interest';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface NotificationSettings {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  rentalAlerts: boolean;
  paymentReminders: boolean;
  messageNotifications: boolean;
  collaborationUpdates: boolean;
}