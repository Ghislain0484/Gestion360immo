import { supabase } from '../lib/config';
import { dbService } from '../lib/supabase';
import { Message, Notification, Owner } from '../types/db';
import toast from 'react-hot-toast';

export const sendContactMessage = async (
  userId: string,
  owner: Owner,
  entity: 'owner' | 'property',
  entityId: string,
  entityTitle: string
) => {
  try {
    const { data: agencyDirector, error: directorError } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', owner.agency_id)
      .eq('role', 'director')
      .single();

    if (directorError || !agencyDirector) {
      throw new Error('Directeur de l\'agence introuvable');
    }

    const message: Partial<Message> = {
      sender_id: userId,
      receiver_id: agencyDirector.user_id,
      agency_id: owner.agency_id,
      [entity === 'owner' ? 'owner_id' : 'property_id']: entityId,
      subject: `Demande de collaboration pour ${entityTitle}`,
      content: `Bonjour, je suis intéressé par une collaboration concernant ${entity === 'owner' ? 'le propriétaire' : 'le bien'} ${entityTitle}. Merci de me contacter pour discuter.`,
      is_read: false,
      created_at: new Date().toISOString(),
      attachments: [],
    };

    await dbService.messages.create(message);

    const notification: Partial<Notification> = {
      user_id: agencyDirector.user_id,
      type: 'new_message' as 'new_message',
      title: `Nouveau message concernant ${entity === 'owner' ? 'un propriétaire' : 'un bien'}`,
      message: `Une agence vous a envoyé un message à propos ${entity === 'owner' ? 'du propriétaire' : 'du bien'} ${entityTitle}.`,
      priority: 'medium' as 'medium',
      data: { [entity === 'owner' ? 'owner_id' : 'property_id']: entityId },
      is_read: false,
      created_at: new Date().toISOString(),
    };

    await dbService.notifications.create(notification);

    toast.success('Message envoyé à l\'agence !');
  } catch (err: any) {
    console.error('Erreur lors de l\'envoi du message:', err);
    toast.error(err.message || 'Erreur lors de l\'envoi du message');
  }
};