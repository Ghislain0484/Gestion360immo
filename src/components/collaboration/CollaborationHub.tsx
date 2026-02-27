import React, { useState, useEffect } from 'react';
import { MessageSquare, Megaphone, Search, Eye, Heart, Send, Users, UserCheck, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Announcement, AnnouncementInterest, Message, Notification } from '../../types/db';
import { TenantHistorySearch } from './TenantHistorySearch';
import { OwnerHistorySearch } from './OwnerHistorySearch';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { dbService } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface FormData {
  title: string;
  description: string;
  type: 'location' | 'vente';
  propertyId: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (announcementsError) {
          throw new Error(`❌ announcements.select | ${announcementsError.message}`);
        }
        setAnnouncements(announcementsData ?? []);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('agency_id', authAgencyId)
          .order('created_at', { ascending: false });

        if (messagesError) {
          throw new Error(`❌ messages.select | ${messagesError.message}`);
        }
        setMessages(messagesData ?? []);

        // Fetch collaboration requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('collaboration_requests')
          .select('*, requester_agency:requester_agency_id(name)')
          .eq('target_agency_id', authAgencyId)
          .order('created_at', { ascending: false });

        if (requestsError) {
          throw new Error(`❌ requests.select | ${requestsError.message}`);
        }
        setCollaborationRequests(requestsData ?? []);
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

  const publishAnnouncement = async (data: FormData) => {
    if (!user?.id || !authAgencyId) {
      toast.error('Utilisateur non authentifié ou agence non sélectionnée');
      return;
    }

    try {
      // Validate property exists
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', data.propertyId)
        .eq('agency_id', authAgencyId)
        .single();

      if (propertyError || !property) {
        throw new Error('Propriété invalide ou non trouvée');
      }

      const newAnnouncement: Partial<Announcement> = {
        agency_id: authAgencyId,
        property_id: data.propertyId,
        title: data.title,
        description: data.description,
        type: data.type,
        is_active: true,
        views: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const createdAnnouncement = await dbService.announcements.create(newAnnouncement);
      setAnnouncements([createdAnnouncement, ...announcements]);
      toast.success('Annonce publiée avec succès !');
      setShowAnnouncementForm(false);
    } catch (err: any) {
      console.error('Erreur publication annonce:', err);
      toast.error(err.message || 'Erreur lors de la publication de l\'annonce');
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
        <Button onClick={() => setShowAnnouncementForm(true)} className="flex items-center space-x-2">
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
                      <p className="text-gray-600 mb-3">{announcement.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Agence #{announcement.agency_id}</span>
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
                      <Button variant="ghost" size="sm">
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
          {messages.length > 0 ? (
            messages.map((message) => (
              <Card key={message.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{message.subject}</h3>
                    <p className="text-gray-600">{message.content}</p>
                    <div className="text-sm text-gray-500 mt-2">
                      <span>De: Utilisateur #{message.sender_id}</span>
                      <span> • </span>
                      <span>{new Date(message.created_at).toLocaleDateString('fr-FR')}</span>
                      {message.is_read && <span> • Lu</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
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
              <p className="text-gray-600 mb-4">
                Communiquez directement avec les autres agences pour vos collaborations.
              </p>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Nouveau message
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Announcement Form Modal */}
      <Modal
        isOpen={showAnnouncementForm}
        onClose={() => setShowAnnouncementForm(false)}
        title="Publier une annonce"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            publishAnnouncement({
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              type: formData.get('type') as 'location' | 'vente',
              propertyId: formData.get('propertyId') as string,
            });
          }}
        >
          <Input
            label="Titre de l'annonce"
            name="title"
            placeholder="Ex: Villa moderne 4 chambres - Cocody"
            required
          />
          <Input
            label="ID de la propriété"
            name="propertyId"
            placeholder="ID de la propriété (UUID)"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'annonce
            </label>
            <select
              name="type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="location">Location</option>
              <option value="vente">Vente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez le bien et ses avantages..."
              required
            />
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowAnnouncementForm(false)}>
              Annuler
            </Button>
            <Button type="submit">
              <Megaphone className="h-4 w-4 mr-2" />
              Publier l'annonce
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};