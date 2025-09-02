import React from 'react';
import { Mail, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface EmailNotification {
  id: string;
  type: 'new_user' | 'new_contract' | 'receipt_generated' | 'payment_reminder' | 'contract_expiry';
  recipient: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  agencyId: string;
}

interface EmailNotificationServiceProps {
  agencyId: string;
  agencyName: string;
  agencyEmail: string;
}

export const EmailNotificationService: React.FC<EmailNotificationServiceProps> = ({
  agencyId,
  agencyName,
  agencyEmail
}) => {
  const [notifications, setNotifications] = React.useState<EmailNotification[]>([]);

  const emailTemplates = {
    new_user: {
      subject: 'Nouveau compte utilisateur créé - {agencyName}',
      content: `
Bonjour {userName},

Votre compte utilisateur a été créé avec succès sur la plateforme Gestion360Immo.

Informations de connexion :
- Email : {userEmail}
- Mot de passe temporaire : {tempPassword}
- Rôle : {userRole}

Veuillez vous connecter et changer votre mot de passe lors de votre première connexion.

URL de connexion : https://gestion360immo.com

Cordialement,
L'équipe {agencyName}
      `
    },
    new_contract: {
      subject: 'Nouveau contrat signé - {contractType}',
      content: `
Bonjour,

Un nouveau contrat a été signé dans votre agence {agencyName}.

Détails du contrat :
- Type : {contractType}
- Propriété : {propertyTitle}
- Montant : {contractAmount} FCFA
- Date de signature : {contractDate}

Le contrat est disponible dans votre espace de gestion.

Cordialement,
Gestion360Immo
      `
    },
    receipt_generated: {
      subject: 'Quittance de loyer générée - {receiptNumber}',
      content: `
Bonjour,

Une nouvelle quittance de loyer a été générée.

Détails :
- Numéro : {receiptNumber}
- Période : {period}
- Montant : {amount} FCFA
- Locataire : {tenantName}
- Propriété : {propertyTitle}

La quittance est disponible en téléchargement dans votre espace.

Cordialement,
{agencyName}
      `
    },
    payment_reminder: {
      subject: 'Rappel de paiement - Loyer en retard',
      content: `
Bonjour,

Ce message vous informe qu'un loyer est en retard de paiement.

Détails :
- Locataire : {tenantName}
- Propriété : {propertyTitle}
- Montant dû : {amount} FCFA
- Retard : {daysLate} jours

Merci de procéder au recouvrement.

Cordialement,
{agencyName}
      `
    },
    contract_expiry: {
      subject: 'Contrat arrivant à échéance - {propertyTitle}',
      content: `
Bonjour,

Un contrat arrive à échéance prochainement.

Détails :
- Propriété : {propertyTitle}
- Locataire : {tenantName}
- Date d'échéance : {expiryDate}
- Jours restants : {daysRemaining}

Pensez à préparer le renouvellement ou la recherche d'un nouveau locataire.

Cordialement,
{agencyName}
      `
    }
  };

  const sendEmailNotification = async (
    type: keyof typeof emailTemplates,
    recipient: string,
    variables: Record<string, string>
  ) => {
    try {
      const template = emailTemplates[type];
      let subject = template.subject;
      let content = template.content;

      // Remplacer les variables dans le template
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        content = content.replace(new RegExp(placeholder, 'g'), value);
      });

      const notification: EmailNotification = {
        id: `email_${Date.now()}`,
        type,
        recipient,
        subject,
        content,
        status: 'pending',
        agencyId
      };

      // Simuler l'envoi d'email (en production, utiliser un service comme SendGrid)
      console.log('📧 Envoi email:', {
        to: recipient,
        subject,
        content
      });

      // Marquer comme envoyé après 2 secondes
      setTimeout(() => {
        notification.status = 'sent';
        notification.sentAt = new Date();
        setNotifications(prev => [notification, ...prev]);
      }, 2000);

      return notification;
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      throw error;
    }
  };

  // Fonctions utilitaires pour déclencher les notifications
  const notifyNewUser = (userData: any) => {
    return sendEmailNotification('new_user', userData.email, {
      agencyName,
      userName: `${userData.firstName} ${userData.lastName}`,
      userEmail: userData.email,
      tempPassword: userData.password,
      userRole: userData.role
    });
  };

  const notifyNewContract = (contractData: any, propertyData: any) => {
    return sendEmailNotification('new_contract', agencyEmail, {
      agencyName,
      contractType: contractData.type,
      propertyTitle: propertyData.title,
      contractAmount: contractData.monthlyRent?.toLocaleString() || contractData.salePrice?.toLocaleString() || '0',
      contractDate: new Date().toLocaleDateString('fr-FR')
    });
  };

  const notifyReceiptGenerated = (receiptData: any, tenantData: any, propertyData: any) => {
    return sendEmailNotification('receipt_generated', agencyEmail, {
      agencyName,
      receiptNumber: receiptData.receiptNumber,
      period: `${receiptData.month} ${receiptData.year}`,
      amount: receiptData.totalAmount.toLocaleString(),
      tenantName: `${tenantData.firstName} ${tenantData.lastName}`,
      propertyTitle: propertyData.title
    });
  };

  const notifyPaymentReminder = (tenantData: any, propertyData: any, amount: number, daysLate: number) => {
    return sendEmailNotification('payment_reminder', agencyEmail, {
      agencyName,
      tenantName: `${tenantData.firstName} ${tenantData.lastName}`,
      propertyTitle: propertyData.title,
      amount: amount.toLocaleString(),
      daysLate: daysLate.toString()
    });
  };

  const notifyContractExpiry = (contractData: any, tenantData: any, propertyData: any, daysRemaining: number) => {
    return sendEmailNotification('contract_expiry', agencyEmail, {
      agencyName,
      propertyTitle: propertyData.title,
      tenantName: `${tenantData.firstName} ${tenantData.lastName}`,
      expiryDate: new Date(contractData.endDate).toLocaleDateString('fr-FR'),
      daysRemaining: daysRemaining.toString()
    });
  };

  return {
    sendEmailNotification,
    notifyNewUser,
    notifyNewContract,
    notifyReceiptGenerated,
    notifyPaymentReminder,
    notifyContractExpiry,
    notifications
  };
};

// Hook pour utiliser le service de notifications email
export const useEmailNotifications = (agencyId: string, agencyName: string, agencyEmail: string) => {
  return EmailNotificationService({ agencyId, agencyName, agencyEmail });
};