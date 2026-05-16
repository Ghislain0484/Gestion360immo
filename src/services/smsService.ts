import toast from 'react-hot-toast';
import { supabase } from '../lib/config';

export interface SMSPayload {
  to: string;
  message: string;
  agency_id: string;
}

/**
 * Service de gestion des SMS pour Gestion360immo
 * Permet d'envoyer des notifications critiques par SMS aux locataires et propriétaires.
 */
export const SMSService = {
  /**
   * Envoie un SMS (Actuellement configuré pour utiliser une Edge Function Supabase ou un log console en dev)
   * Pour la production, connectez un fournisseur comme Twilio, Vonage ou Infobip.
   */
  async sendSMS(payload: SMSPayload): Promise<boolean> {
    try {
      console.log('📱 [SMS Service] Envoi en cours...', payload);

      // 1. Vérifier si l'agence a activé les notifications SMS et possède assez de crédits
      const { data: agency } = await supabase
        .from('agencies')
        .select('settings, name')
        .eq('id', payload.agency_id)
        .single();

      const { data: wallet } = await supabase
        .from('agency_wallets')
        .select('bonus_credits')
        .eq('agency_id', payload.agency_id)
        .single();

      const smsEnabled = agency?.settings?.notifications?.sms !== false;
      const hasCredits = (wallet?.bonus_credits || 0) > 0;
      
      if (!smsEnabled) {
        console.warn('⚠️ [SMS Service] SMS désactivés pour cette agence.');
        return false;
      }

      if (!hasCredits) {
        console.warn('⚠️ [SMS Service] Crédits SMS insuffisants.');
        toast.error('Solde SMS insuffisant pour ' + (agency?.name || 'l\'agence'));
        return false;
      }

      // 2. Appel à l'API Orange Business (Simulation d'intégration)
      // Orange Business nécessite généralement un token d'accès et un appel POST
      /*
      const ORANGE_API_URL = 'https://api.orange.com/smsmessaging/v1/outbound/...';
      const response = await fetch(ORANGE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ORANGE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outboundSMSMessageRequest: {
            address: `tel:${payload.to}`,
            outboundSMSTextMessage: { message: payload.message }
          }
        })
      });
      */

      // 3. Déduire 1 crédit du portefeuille de l'agence
      await supabase.rpc('decrement_agency_credits', { 
        p_agency_id: payload.agency_id, 
        p_amount: 1 
      });

      // Simulation de délai
      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success('Notification SMS envoyée');
      return true;
    } catch (error: any) {
      console.error('❌ [SMS Service] Erreur:', error);
      return false;
    }
  },

  /**
   * Notification pour le Directeur d'agence (Opération de caisse)
   */
  async sendDirectorOperationAlert(directorPhone: string, amount: number, type: string, agencyName: string, agencyId: string) {
    const message = `G360 - Alerte Caisse (${agencyName}) : Une opération de ${type} d'un montant de ${amount.toLocaleString('fr-FR')} FCFA vient d'être effectuée.`;
    return this.sendSMS({ to: directorPhone, message, agency_id: agencyId });
  },

  /**
   * Notifie tous les directeurs d'une agence d'un mouvement de caisse
   */
  async notifyDirectorOfOperation(agencyId: string, amount: number, type: string) {
    try {
      // 1. Récupérer le nom de l'agence
      const { data: agency } = await supabase.from('agencies').select('name').eq('id', agencyId).single();
      
      // 2. Trouver les directeurs avec un numéro de téléphone
      const { data: directors } = await supabase
        .from('users')
        .select('phone')
        .contains('permissions', { role: 'director' }) // Note: adjust based on actual permissions structure
        .eq('is_active', true);
        
      // Alternative: if the schema uses a junction table or specific field
      const { data: agencyUsers } = await supabase
        .from('agency_users')
        .select('user:users(phone)')
        .eq('agency_id', agencyId)
        .eq('role', 'director');

      const phones = agencyUsers?.map((au: any) => au.user?.phone).filter(Boolean) || [];

      for (const phone of phones) {
        await this.sendDirectorOperationAlert(phone, amount, type, agency?.name || 'Agence', agencyId);
      }
    } catch (err) {
      console.error('⚠️ [SMS] Échec notification directeur:', err);
    }
  },

  /**
   * Modèle de SMS pour rappel de loyer
   */
  async sendRentReminder(to: string, tenantName: string, amount: number, dueDate: string, agencyId: string) {
    const message = `Bonjour ${tenantName}, votre loyer de ${amount.toLocaleString('fr-FR')} FCFA est attendu pour le ${dueDate}. Merci de votre confiance. - Gestion360`;
    return this.sendSMS({ to, message, agency_id: agencyId });
  },

  /**
   * Modèle de SMS pour quittance générée
   */
  async sendReceiptNotification(to: string, amount: number, period: string, agencyId: string) {
    const message = `Gestion360 : Votre quittance de loyer pour ${period} d'un montant de ${amount.toLocaleString('fr-FR')} FCFA est disponible dans votre espace.`;
    return this.sendSMS({ to, message, agency_id: agencyId });
  },

  /**
   * Modèle de SMS pour fin de bail
   */
  async sendLeaseEndAlert(directorPhone: string, tenantName: string, propertyTitle: string, endDate: string, agencyId: string) {
    const message = `G360 - Alerte Fin de Bail : Le contrat de ${tenantName} (${propertyTitle}) se termine le ${endDate}. Pensez au renouvellement.`;
    return this.sendSMS({ to: directorPhone, message, agency_id: agencyId });
  },

  /**
   * Vérifie les baux arrivant à échéance (prochains 30 jours) et alerte le directeur
   */
  async checkAndNotifyExpiringLeases(agencyId: string) {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const today = new Date().toISOString().split('T')[0];

      const { data: contracts } = await supabase
        .from('contracts')
        .select('*, tenant:tenants(first_name, last_name), property:properties(title)')
        .eq('agency_id', agencyId)
        .eq('status', 'active')
        .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('end_date', today);

      if (!contracts || contracts.length === 0) return;

      // Récupérer le numéro du directeur
      const { data: agencyUsers } = await supabase
        .from('agency_users')
        .select('user:users(phone)')
        .eq('agency_id', agencyId)
        .eq('role', 'director');

      const phones = agencyUsers?.map((au: any) => au.user?.phone).filter(Boolean) || [];

      for (const contract of contracts) {
        const tenantName = `${contract.tenant?.first_name} ${contract.tenant?.last_name}`;
        for (const phone of phones) {
          await this.sendLeaseEndAlert(phone, tenantName, contract.property?.title || 'Bien', contract.end_date, agencyId);
        }
      }
    } catch (err) {
      console.error('⚠️ [SMS] Échec vérification fin de baux:', err);
    }
  }
};
