import React, { useState, useEffect } from 'react';
import { MessageSquare, Megaphone, Search, Eye, Heart, Send, Users, UserCheck, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Announcement, AnnouncementInterest, Message, Notification, Property } from '../../types/db';
import { TenantHistorySearch } from './TenantHistorySearch';
import { OwnerHistorySearch } from './OwnerHistorySearch';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { dbService } from '../../lib/supabase';
import toast from 'react-hot-toast';

import { Upload, FileText, X } from 'lucide-react';

type PropertySource = 'registered' | 'external';

interface FormData {
  title: string;
  description: string;
  type: 'location' | 'vente';
  propertySource: PropertySource;
  propertyId: string;
  externalPropertyRef: string;
  mandateType: 'vente' | 'gestion' | '';
  mandateFile: File | null;
  photoFiles: File[];  // max 5, 2 MB each
}

export const CollaborationHub: React.FC = () => {
  const { user, agencyId: authAgencyId, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'announcements' | 'messages' | 'tenant_history' | 'owner_history' | 'requests'>('announcements');
  const [collaborationRequests, setCollaborationRequests] = useState<any[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'location' | 'vente'>('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allAgencies, setAllAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencyProperties, setAgencyProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState<FormData>({
    title: '',
    description: '',
    type: 'location',
    propertySource: 'registered',
    propertyId: '',
    externalPropertyRef: '',
    mandateType: '',
    mandateFile: null,
    photoFiles: [],
  });
  const [mandateUploadProgress, setMandateUploadProgress] = useState<number | null>(null);

  // Messaging State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({
    recipientId: '',
    recipientAgencyId: '',
    subject: '',
    content: '',
    isPublic: false,
  });
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || !authAgencyId) {
        if (!authLoading && !authAgencyId) {
          setError('Veuillez sélectionner une agence active');
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch announcements (all public or agency-specific)
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*, agency:agencies!announcements_agency_id_fkey(name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (announcementsError) {
          throw new Error(`❌ announcements.select | ${announcementsError.message}`);
        }
        setAnnouncements(announcementsData ?? []);

        // Fetch messages (own messages + messages received + public messages)
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*, sender:users!messages_sender_id_fkey(first_name, last_name), agency:agencies!messages_agency_id_fkey(name)')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},receiver_id.is.null`)
          .order('created_at', { ascending: false });

        if (messagesError) {
          throw new Error(`❌ messages.select | ${messagesError.message}`);
        }
        setMessages(messagesData ?? []);

        // Fetch all approved agencies
        const { data: agenciesData, error: agenciesError } = await supabase
          .from('agencies')
          .select('id, name')
          .eq('status', 'approved');
        
        if (agenciesError) {
          console.error('Error fetching agencies:', agenciesError);
        } else {
          setAllAgencies(agenciesData ?? []);
        }

        // Fetch collaboration requests
        try {
          const { data: requestsData, error: requestsError } = await supabase
            .from('collaboration_requests')
            .select('*, requester_agency:agencies!collaboration_requests_requester_agency_id_fkey(name), requester:users!collaboration_requests_requester_id_fkey(first_name, last_name)')
            .eq('target_agency_id', authAgencyId)
            .order('created_at', { ascending: false });

          if (requestsError) {
            console.warn('⚠️ Table collaboration_requests non trouvée ou inaccessible:', requestsError.message);
            setCollaborationRequests([]);
          } else {
            setCollaborationRequests(requestsData ?? []);
          }
        } catch (tableErr) {
          console.error('Erreur silencieuse collaboration_requests:', tableErr);
          setCollaborationRequests([]);
        }
      } catch (err: any) {
        console.error('Erreur chargement données:', err);
        setError(err.message || 'Erreur lors du chargement des données');
        toast.error(err.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, authAgencyId, authLoading]);

  // Load agency properties when modal opens
  const openAnnouncementForm = async () => {
    setShowAnnouncementForm(true);
    if (!authAgencyId) return;

    setPropertiesLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, location')
        .eq('agency_id', authAgencyId)
        .order('title', { ascending: true });

      if (error) throw error;
      setAgencyProperties(data ?? []);
    } catch (err: any) {
      console.error('Erreur chargement propriétés:', err);
      toast.error('Impossible de charger la liste des propriétés');
    } finally {
      setPropertiesLoading(false);
    }
  };

  const publishAnnouncement = async () => {
    if (!user?.id || !authAgencyId) {
      toast.error('Utilisateur non authentifié ou agence non sélectionnée');
      return;
    }

    const { title, description, type, propertySource, propertyId, externalPropertyRef, mandateType, mandateFile, photoFiles } = announcementForm;

    if (!title.trim() || !description.trim()) {
      toast.error('Veuillez remplir le titre et la description');
      return;
    }

    if (propertySource === 'registered' && !propertyId) {
      toast.error('Veuillez sélectionner une propriété enregistrée');
      return;
    }

    if (propertySource === 'external' && !externalPropertyRef.trim()) {
      toast.error('Veuillez indiquer une référence pour le bien externe');
      return;
    }

    if (propertySource === 'external' && !mandateFile) {
      toast.error('Veuillez uploader votre mandat de vente ou de gestion');
      return;
    }

    setSubmitting(true);
    let mandateUrl: string | null = null;

    try {
      // 1. Upload mandate file if provided
      if (mandateFile) {
        setMandateUploadProgress(0);
        const safeName = mandateFile.name.replace(/[^a-z0-9._-]/gi, '_');
        const path = `mandates/${authAgencyId}/${Date.now()}-${safeName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images') // reuse existing bucket
          .upload(path, mandateFile, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error('Erreur upload mandat: ' + uploadError.message);
        const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(uploadData.path);
        mandateUrl = urlData?.publicUrl ?? null;
        setMandateUploadProgress(100);
      }

      // 2. Upload announcement photos (parallel)
      let photoUrls: string[] = [];
      if (photoFiles.length > 0) {
        const uploaded = await Promise.all(
          photoFiles.map(async (file) => {
            const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
            const path = `announcements/${authAgencyId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safeName}`;
            const { data: up, error: upErr } = await supabase.storage
              .from('property-images')
              .upload(path, file, { cacheControl: '3600', upsert: false });
            if (upErr) throw new Error('Erreur upload photo: ' + upErr.message);
            const { data: urlD } = supabase.storage.from('property-images').getPublicUrl(up.path);
            return urlD?.publicUrl ?? '';
          })
        );
        photoUrls = uploaded.filter(Boolean);
      }

      // 2. Create announcement
      const newAnnouncement: Partial<Announcement> = {
        agency_id: authAgencyId,
        property_id: propertySource === 'registered' ? propertyId : null,
        title: title.trim(),
        description: description.trim(),
        type,
        is_active: true,
        views: 0,
        mandate_url: mandateUrl,
        mandate_type: mandateType || null,
        external_property_ref: propertySource === 'external' ? externalPropertyRef.trim() : null,
        photos: photoUrls.length > 0 ? photoUrls : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const createdAnnouncement = await dbService.announcements.create(newAnnouncement);
      setAnnouncements([createdAnnouncement, ...announcements]);
      toast.success('Annonce publiée avec succès !');
      setShowAnnouncementForm(false);
      setAnnouncementForm({
        title: '', description: '', type: 'location', propertySource: 'registered',
        propertyId: '', externalPropertyRef: '', mandateType: '', mandateFile: null, photoFiles: [],
      });
      setMandateUploadProgress(null);
    } catch (err: any) {
      console.error('Erreur publication annonce:', err);
      toast.error(err.message || 'Erreur lors de la publication de l\'annonce');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterest = async (announcementId: string) => {
    if (!user?.id || !authAgencyId) {
      toast.error('Utilisateur non authentifié ou agence non sélectionnée');
      return;
    }

    try {
      const interest: Partial<AnnouncementInterest> = {
        announcement_id: announcementId,
        agency_id: authAgencyId,
        user_id: user.id,
        status: 'pending',
        message: 'Intérêt manifesté via le hub de collaboration',
      };

      await dbService.announcementInterests.create(interest);

      // Fetch the announcement to get its agency_id
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .select('agency_id')
        .eq('id', announcementId)
        .single();

      if (announcementError || !announcement) {
        throw new Error('Annonce introuvable');
      }

      // Fetch the director of the announcement's agency
      const { data: agencyDirector, error: directorError } = await supabase
        .from('agency_users')
        .select('user_id')
        .eq('agency_id', announcement.agency_id)
        .eq('role', 'director')
        .single();

      if (directorError || !agencyDirector) {
        throw new Error('Directeur de l\'agence introuvable');
      }

      // Create notification for the director
      const notification: Partial<Notification> = {
        user_id: agencyDirector.user_id,
        type: 'new_interest' as 'new_interest',
        title: 'Nouvel intérêt pour votre annonce',
        message: `L'agence ${authAgencyId} a manifesté un intérêt pour votre annonce.`,
        priority: 'medium' as 'medium',
        data: { announcement_id: announcementId },
        is_read: false,
        created_at: new Date().toISOString(),
      };

      await dbService.notifications.create(notification);

      toast.success('Intérêt manifesté ! L\'agence propriétaire sera notifiée.');
    } catch (err: any) {
      console.error('Erreur manifestation intérêt:', err);
      toast.error(err.message || 'Erreur lors de la manifestation d\'intérêt');
    }
  };

  const handleSendMessage = async () => {
    if (!user?.id || !authAgencyId) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    if (!messageForm.content.trim()) {
      toast.error('Veuillez saisir un message');
      return;
    }

    setSendingMessage(true);
    try {
      let targetRecipientId = messageForm.recipientId;

      // Fallback: If no specific recipient but we have an agency, target the director
      if (!targetRecipientId && messageForm.recipientAgencyId) {
        const { data: director } = await supabase
          .from('agency_users')
          .select('user_id')
          .eq('agency_id', messageForm.recipientAgencyId)
          .eq('role', 'director')
          .maybeSingle();
        
        if (director) {
          targetRecipientId = director.user_id;
        } else {
          // Fallback to any user of the agency if no director
          const { data: anyUser } = await supabase
            .from('agency_users')
            .select('user_id')
            .eq('agency_id', messageForm.recipientAgencyId)
            .limit(1)
            .maybeSingle();
          
          if (anyUser) {
            targetRecipientId = anyUser.user_id;
          } else {
            throw new Error("L'agence sélectionnée n'a aucun utilisateur pour recevoir le message.");
          }
        }
      }

      if (!messageForm.isPublic && !targetRecipientId) {
        throw new Error('Veuillez sélectionner un destinataire ou une agence');
      }

      const messageData: Partial<Message> = {
        sender_id: user.id,
        receiver_id: messageForm.isPublic ? undefined : (targetRecipientId || undefined),
        agency_id: authAgencyId,
        subject: messageForm.subject || 'Nouveau message',
        content: messageForm.content.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      };

      await dbService.messages.create(messageData as any);
      
      // Update local messages list
      const { data: updatedMessages } = await supabase
        .from('messages')
        .select('*, sender:users!messages_sender_id_fkey(first_name, last_name), agency:agencies!messages_agency_id_fkey(name)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},receiver_id.is.null`)
        .order('created_at', { ascending: false });
      
      setMessages(updatedMessages ?? []);
      
      toast.success('Message envoyé avec succès');
      setShowMessageModal(false);
      setMessageForm({ recipientId: '', recipientAgencyId: '', subject: '', content: '', isPublic: false });
    } catch (err: any) {
      console.error('Erreur envoi message:', err);
      toast.error(err.message || 'Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const openMessageModal = (recipientId: string = '', agencyId: string = '', subject: string = '') => {
    setMessageForm({
      recipientId,
      recipientAgencyId: agencyId || authAgencyId || '',
      subject,
      content: '',
      isPublic: !recipientId && !agencyId,
    });
    setShowMessageModal(true);
  };

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || announcement.type === filterType;
    return matchesSearch && matchesType && announcement.is_active;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-6">
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collaboration Inter-Agences</h1>
          <p className="text-gray-600 mt-1">Partagez et découvrez des opportunités immobilières</p>
        </div>
        <Button onClick={openAnnouncementForm} className="flex items-center space-x-2">
          <Megaphone className="h-4 w-4" />
          <span>Publier une annonce</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'announcements'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Megaphone className="h-4 w-4" />
            <span>Annonces ({announcements.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tenant_history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'tenant_history'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Historique Locataires</span>
          </button>
          <button
            onClick={() => setActiveTab('owner_history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'owner_history'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Users className="h-4 w-4" />
            <span>Historique Propriétaires</span>
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'messages'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Messages ({messages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'requests'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Shield className="h-4 w-4" />
            <span>Demandes ({collaborationRequests.length})</span>
          </button>
        </nav>
      </div>

      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row gap-4 p-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher dans les annonces..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'location' | 'vente')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les types</option>
                  <option value="location">Location</option>
                  <option value="vente">Vente</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Announcements List */}
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{announcement.title}</h3>
                        <Badge
                          variant={announcement.type === 'location' ? 'info' : 'success'}
                          size="sm"
                        >
                          {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                        </Badge>
                      </div>

                      {/* Photos Display */}
                      {announcement.photos && announcement.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                          {announcement.photos.slice(0, 5).map((photoUrl, index) => (
                            <img 
                              key={index} 
                              src={photoUrl} 
                              alt={`${announcement.title} - ${index + 1}`}
                              className="w-full h-24 object-cover rounded-md border border-gray-100 shadow-sm"
                            />
                          ))}
                        </div>
                      )}

                      <p className="text-gray-600 mb-3">{announcement.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {announcement.agency?.name || (announcement.agency_id ? `Agence # ${announcement.agency_id.slice(0, 8)}` : 'Agence inconnue')}
                        </span>
                        <span>•</span>
                        <span>{announcement.views} vues</span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Fetch interests count dynamically if needed */}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Voir détails
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleInterest(announcement.id)}
                        disabled={announcement.agency_id === authAgencyId}
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        Intéressé
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openMessageModal('', announcement.agency_id, `Collaboration: ${announcement.title}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Contacter
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredAnnouncements.length === 0 && (
            <div className="text-center py-12">
              <Megaphone className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {announcements.length === 0 ? 'Aucune annonce disponible' : 'Aucune annonce trouvée'}
              </h3>
              <p className="text-gray-600 mb-4">
                {announcements.length === 0
                  ? 'Les annonces des autres agences apparaîtront ici.'
                  : 'Aucune annonce ne correspond à vos critères de recherche.'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tenant_history' && <TenantHistorySearch />}

      {activeTab === 'owner_history' && <OwnerHistorySearch />}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {collaborationRequests.length > 0 ? (
            collaborationRequests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'danger'}>
                        {request.status === 'pending' ? 'En attente' : request.status === 'approved' ? 'Approuvé' : 'Refusé'}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">
                        Demande de : {request.requester_agency?.name || 'Agence inconnue'}
                        {request.requester && (
                          <span className="text-gray-500 font-normal">
                            {' '} (par {request.requester.first_name} {request.requester.last_name})
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      Souhaite accéder au dossier {request.tier_type === 'tenant' ? 'du locataire' : 'du propriétaire'} (ID: {request.tier_id.slice(0, 8)})
                    </p>
                    <p className="text-xs text-gray-500">
                      Reçue le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('collaboration_requests')
                              .update({ status: 'approved', updated_at: new Date().toISOString() })
                              .eq('id', request.id);

                            if (error) throw error;

                            toast.success('Demande approuvée');
                            setCollaborationRequests(prev =>
                              prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r)
                            );
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                      >
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('collaboration_requests')
                              .update({ status: 'rejected', updated_at: new Date().toISOString() })
                              .eq('id', request.id);

                            if (error) throw error;

                            toast.success('Demande refusée');
                            setCollaborationRequests(prev =>
                              prev.map(r => r.id === request.id ? { ...r, status: 'rejected' } : r)
                            );
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                      >
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center border-dashed border-2">
              <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune demande reçue
              </h3>
              <p className="text-gray-600">
                Les demandes d'accès aux dossiers de vos tiers apparaîtront ici.
              </p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
            <Button onClick={() => openMessageModal()}>
              <Send className="h-4 w-4 mr-2" />
              Nouveau message
            </Button>
          </div>

          {messages.length > 0 ? (
            messages.map((message) => (
              <Card key={message.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                       <h3 className="font-semibold text-gray-900">{message.subject}</h3>
                       {!message.receiver_id && (
                         <Badge variant="info" size="sm">Public</Badge>
                       )}
                    </div>
                    <p className="text-gray-600 mb-2">{message.content}</p>
                    <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-2">
                      <span className="font-medium text-blue-700">
                        De: {message.sender ? `${message.sender.first_name} ${message.sender.last_name}` : 'Système'}
                      </span>
                      {message.agency && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1 bg-gray-50">
                          {message.agency.name}
                        </Badge>
                      )}
                      <span className="text-gray-400"> • </span>
                      <span>{new Date(message.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {message.is_read && <span className="text-green-600 font-medium ml-2">✓ Lu</span>}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openMessageModal(message.sender_id, message.agency_id, `RE: ${message.subject}`)}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Répondre
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun message
              </h3>
              <p className="text-gray-600">
                Communiquez directement avec les autres agences pour vos collaborations.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Announcement Form Modal */}
      <Modal
        isOpen={showAnnouncementForm}
        onClose={() => {
          setShowAnnouncementForm(false);
          setMandateUploadProgress(null);
        }}
        title="Publier une annonce"
        size="lg"
      >
        <div className="space-y-5">
          {/* Titre */}
          <Input
            label="Titre de l'annonce"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Villa moderne 4 chambres - Cocody"
            required
          />

          {/* Type d'annonce */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d'annonce</label>
            <select
              value={announcementForm.type}
              onChange={(e) => setAnnouncementForm(prev => ({ ...prev, type: e.target.value as 'location' | 'vente' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="location">Location</option>
              <option value="vente">Vente</option>
            </select>
          </div>

          {/* Source du bien : enregistré ou externe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bien immobilier</label>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => setAnnouncementForm(prev => ({ ...prev, propertySource: 'registered', propertyId: '' }))}
                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  announcementForm.propertySource === 'registered'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                📂 Bien enregistré
              </button>
              <button
                type="button"
                onClick={() => setAnnouncementForm(prev => ({ ...prev, propertySource: 'external', propertyId: '' }))}
                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  announcementForm.propertySource === 'external'
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                📄 Bien avec mandat
              </button>
            </div>

            {announcementForm.propertySource === 'registered' ? (
              propertiesLoading ? (
                <div className="flex items-center space-x-2 py-2 text-gray-500 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  <span>Chargement des propriétés...</span>
                </div>
              ) : agencyProperties.length === 0 ? (
                <p className="text-sm text-amber-600 py-2 bg-amber-50 px-3 rounded-md">
                  ⚠️ Aucun bien enregistré. Utilisez l'option "Bien avec mandat" pour un bien externe.
                </p>
              ) : (
                <select
                  value={announcementForm.propertyId}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, propertyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sélectionner une propriété --</option>
                  {agencyProperties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.title}
                      {prop.location?.quartier ? ` — ${prop.location.quartier}` : ''}
                      {prop.location?.commune ? `, ${prop.location.commune}` : ''}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <div className="space-y-3">
                <Input
                  label="Référence / Description du bien"
                  value={announcementForm.externalPropertyRef}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, externalPropertyRef: e.target.value }))}
                  placeholder="Ex: Appartement F3, Plateau, Abidjan"
                  required
                />

                {/* Type de mandat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de mandat</label>
                  <select
                    value={announcementForm.mandateType}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, mandateType: e.target.value as 'vente' | 'gestion' | '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Type de mandat --</option>
                    <option value="vente">Mandat de vente</option>
                    <option value="gestion">Mandat de gestion</option>
                  </select>
                </div>

                {/* Upload mandat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mandat <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-gray-400 font-normal">(PDF, JPG, PNG — max 5 Mo)</span>
                  </label>
                  {announcementForm.mandateFile ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">{announcementForm.mandateFile.name}</span>
                        <span className="text-xs text-green-600">({(announcementForm.mandateFile.size / 1024).toFixed(0)} Ko)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAnnouncementForm(prev => ({ ...prev, mandateFile: null }))}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                      <Upload className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-sm text-gray-500">Cliquer pour uploader le mandat</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (file && file.size > 5 * 1024 * 1024) {
                            toast.error('Fichier trop volumineux (max 5 Mo)');
                            return;
                          }
                          setAnnouncementForm(prev => ({ ...prev, mandateFile: file }));
                        }}
                      />
                    </label>
                  )}
                  {mandateUploadProgress !== null && mandateUploadProgress < 100 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${mandateUploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={announcementForm.description}
              onChange={(e) => setAnnouncementForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez le bien et ses avantages..."
              required
            />
          </div>

          {/* Photos du bien (Max 5) */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos du bien <span className="text-xs text-gray-400 font-normal">(Max 5 photos, 2 Mo chacune)</span>
            </label>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {announcementForm.photoFiles.map((file, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newFiles = [...announcementForm.photoFiles];
                      newFiles.splice(index, 1);
                      setAnnouncementForm(prev => ({ ...prev, photoFiles: newFiles }));
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {announcementForm.photoFiles.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-[10px] text-gray-500 mt-1">Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const availableSlots = 5 - announcementForm.photoFiles.length;
                      const validFiles: File[] = [];
                      
                      files.slice(0, availableSlots).forEach(file => {
                        if (file.size <= 2 * 1024 * 1024) {
                          validFiles.push(file);
                        } else {
                          toast.error(`"${file.name}" est trop volumineux (> 2 Mo)`);
                        }
                      });
                      
                      if (validFiles.length > 0) {
                        setAnnouncementForm(prev => ({ 
                          ...prev, 
                          photoFiles: [...prev.photoFiles, ...validFiles] 
                        }));
                      }
                      
                      if (files.length > availableSlots) {
                        toast(`Seulement ${availableSlots} photos supplémentaires autorisées.`, { icon: '⚠️' });
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAnnouncementForm(false);
                setAnnouncementForm({ title: '', description: '', type: 'location', propertySource: 'registered', propertyId: '', externalPropertyRef: '', mandateType: '', mandateFile: null, photoFiles: [] });
                setMandateUploadProgress(null);
              }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={publishAnnouncement}
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Publication...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <Megaphone className="h-4 w-4" />
                  <span>Publier l'annonce</span>
                </span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Message Modal */}
      <Modal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageForm.recipientId ? 'Répondre au message' : 'Nouveau message'}
        size="md"
      >
        <div className="space-y-4">
          {!messageForm.recipientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Déstinataire (Agence)</label>
              <select
                value={messageForm.recipientAgencyId}
                onChange={(e) => setMessageForm(prev => ({ ...prev, recipientAgencyId: e.target.value, isPublic: false }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={messageForm.isPublic}
              >
                <option value="">Sélectionner une agence</option>
                {allAgencies
                  .filter(a => a.id !== authAgencyId)
                  .map(agency => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
            <Input
              value={messageForm.subject}
              onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Sujet du message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              rows={5}
              value={messageForm.content}
              onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Écrivez votre message ici..."
              required
            />
          </div>
          {!messageForm.recipientId && (
            <div className="flex items-center space-x-2 py-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={messageForm.isPublic}
                onChange={(e) => setMessageForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                Message public (diffusé à toutes les agences)
              </label>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowMessageModal(false)}
              disabled={sendingMessage}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendingMessage}
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};