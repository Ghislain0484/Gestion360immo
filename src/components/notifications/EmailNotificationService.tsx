import React, { useEffect, useMemo, useRef } from 'react';
import { Mail, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { EmailNotification, Contract, Property } from '../../types/db';
import { useAuth, AuthUser } from '../../contexts/AuthContext';
import Chart from 'chart.js/auto';

interface EmailNotificationServiceProps {
  agencyId: string;
}

const emailTemplates = (agencyName: string) => ({
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
    `,
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
    `,
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
    `,
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
    `,
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
    `,
  },
});

const sendEmailNotification = async (
  type: keyof ReturnType<typeof emailTemplates>,
  recipient: string,
  variables: Record<string, string>,
  agencyId: string,
  agencyName: string
): Promise<EmailNotification> => {
  try {
    const templates = emailTemplates(agencyName);
    const template = templates[type];
    let subject = template.subject;
    let content = template.content;

    const validatedVariables = {
      agencyName,
      userName: 'Utilisateur',
      userEmail: recipient,
      tempPassword: '********',
      userRole: 'Non spécifié',
      contractType: 'Non spécifié',
      propertyTitle: 'Non spécifié',
      contractAmount: '0',
      contractDate: new Date().toLocaleDateString('fr-FR'),
      receiptNumber: 'N/A',
      period: 'N/A',
      amount: '0',
      tenantName: 'Non spécifié',
      daysLate: '0',
      expiryDate: 'N/A',
      daysRemaining: '0',
      ...variables,
    };

    Object.entries(validatedVariables).forEach(([key, value]) => {
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
      agency_id: agencyId,
      created_at: new Date().toISOString(),
    };

    await dbService.emailNotifications.create(notification);

    console.log('📧 Envoi email:', { to: recipient, subject, content });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await dbService.emailNotifications.update(notification.id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return notification;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    const failedNotification: EmailNotification = {
      id: `email_${Date.now()}`,
      type,
      recipient,
      subject: 'Erreur lors de l’envoi',
      content: 'Échec de l’envoi de l’email.',
      status: 'failed',
      agency_id: agencyId,
      created_at: new Date().toISOString(),
    };
    await dbService.emailNotifications.create(failedNotification);
    throw error;
  }
};

export const EmailNotificationService: React.FC<EmailNotificationServiceProps> = ({ agencyId }) => {
  const { user } = useAuth();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const { data: notifications, initialLoading, error } = useRealtimeData<EmailNotification>(
    async (agencyId: string) => dbService.emailNotifications.getByAgency(agencyId),
    'email_notifications'
  );

  const statusCounts = useMemo(() => {
    if (!notifications) return { pending: 0, sent: 0, failed: 0 };
    return notifications.reduce(
      (counts: { pending: number; sent: number; failed: number }, n: EmailNotification) => {
        counts[n.status]++;
        return counts;
      },
      { pending: 0, sent: 0, failed: 0 }
    );
  }, [notifications]);

  useEffect(() => {
    if (chartRef.current && !initialLoading && !error && notifications) {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();

      chartInstanceRef.current = new Chart(chartRef.current, {
        type: 'pie',
        data: {
          labels: ['En attente', 'Envoyé', 'Échoué'],
          datasets: [
            {
              data: [statusCounts.pending, statusCounts.sent, statusCounts.failed],
              backgroundColor: ['#3B82F6', '#10B981', '#EF4444'],
              borderColor: ['#ffffff', '#ffffff', '#ffffff'],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Statut des Notifications par Email' },
          },
        },
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [statusCounts, initialLoading, error, notifications]);

  if (!agencyId) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        ID de l’agence requis pour afficher les notifications par email.
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historique des Notifications par Email</h1>
        <p className="text-gray-600 mt-1">Suivi des emails envoyés par l’agence</p>
      </div>
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Statuts</h3>
        <canvas ref={chartRef} id="emailStatusChart" />
      </Card>
      <div className="space-y-3" role="list">
        {notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <Card key={notification.id} className="p-4" role="listitem">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {notification.status === 'sent' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : notification.status === 'failed' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Send className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900">{notification.subject}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          notification.status === 'sent'
                            ? 'success'
                            : notification.status === 'failed'
                            ? 'danger'
                            : 'info'
                        }
                        size="sm"
                      >
                        {notification.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(notification.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{notification.content}</p>
                  <p className="text-xs text-gray-500">Destinataire : {notification.recipient}</p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center" role="listitem">
            <Mail className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun email envoyé</h3>
            <p className="text-gray-600">Aucune notification par email n’a été envoyée pour le moment.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export const useEmailNotifications = (agencyId: string, agencyName: string) => {
  return {
    render: () => <EmailNotificationService agencyId={agencyId} />,
    notifyNewUser: (userData: AuthUser) =>
      sendEmailNotification('new_user', userData.email, {
        userName: `${userData.first_name || ''} ${userData.last_name || ''}`,
        userEmail: userData.email,
        tempPassword: userData.temp_password || '********',
        userRole: userData.role || 'agent',
      }, agencyId, agencyName),
    notifyNewContract: (contractData: Contract, propertyData: Property, agencyEmail: string) =>
      sendEmailNotification('new_contract', agencyEmail, {
        contractType: contractData.type,
        propertyTitle: propertyData.title,
        contractAmount: contractData.monthly_rent
          ? contractData.monthly_rent.toLocaleString()
          : contractData.sale_price
          ? contractData.sale_price.toLocaleString()
          : '0',
        contractDate: new Date(contractData.created_at).toLocaleDateString('fr-FR'),
      }, agencyId, agencyName),
  };
};
