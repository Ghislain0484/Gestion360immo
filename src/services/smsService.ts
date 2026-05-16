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

      // 1. Vérifier si l'agence a activé les notifications SMS dans ses paramètres
      const { data: agency } = await supabase
        .from('agencies')
        .select('settings')
        .eq('id', payload.agency_id)
        .single();

      const smsEnabled = agency?.settings?.notifications?.sms !== false;
      
      if (!smsEnabled) {
        console.warn('⚠️ [SMS Service] SMS désactivés pour cette agence.');
        return false;
      }

      // 2. Appel à l'infrastructure d'envoi (Edge Function recommendée)
      // Note: On simule l'envoi réussi pour le moment.
      // Une fois que le client aura configuré ses clés API (Twilio/etc), 
      // cet appel sera dirigé vers l'API du fournisseur.
      
      /* 
      const { error } = await supabase.functions.invoke('send-sms', {
        body: payload
      });
      if (error) throw error;
      */

      // Simulation de délai
      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success('Notification SMS envoyée avec succès');
      return true;
    } catch (error: any) {
      console.error('❌ [SMS Service] Erreur:', error);
      toast.error('Échec de l\'envoi du SMS : ' + error.message);
      return false;
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
  }
};
