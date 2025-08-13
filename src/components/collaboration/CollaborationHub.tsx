import React, { useState } from 'react';
import { MessageSquare, Megaphone, Search, Eye, Heart, Send, Filter, Users, UserCheck, History } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Announcement, AnnouncementInterest } from '../../types/collaboration';
import { TenantHistorySearch } from './TenantHistorySearch';
import { OwnerHistorySearch } from './OwnerHistorySearch';

export const CollaborationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'messages' | 'tenant_history' | 'owner_history'>('announcements');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Mock data
  const [announcements] = useState<Announcement[]>([
    {
      id: '1',
      agencyId: '2',
      propertyId: '1',
      title: 'Villa moderne 4 chambres - Cocody Angré',
      description: 'Magnifique villa avec jardin, piscine et garage. Quartier résidentiel calme.',
      type: 'location',
      isActive: true,
      views: 24,
      interests: [
        {
          id: '1',
          announcementId: '1',
          agencyId: '1',
          userId: '1',
          message: 'Nous avons un client intéressé par ce type de bien',
          status: 'pending',
          createdAt: new Date()
        }
      ],
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-01')
    },
    {
      id: '2',
      agencyId: '3',
      propertyId: '2',
      title: 'Appartement 3 pièces - Plateau Centre-ville',
      description: 'Appartement moderne au cœur du Plateau, proche de tous commerces.',
      type: 'vente',
      isActive: true,
      views: 18,
      interests: [],
      createdAt: new Date('2024-03-02'),
      updatedAt: new Date('2024-03-02')
    }
  ]);

  const handleInterest = (announcementId: string) => {
    console.log('Expressing interest for announcement:', announcementId);
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || announcement.type === filterType;
    
    return matchesSearch && matchesType && announcement.isActive;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collaboration Inter-Agences</h1>
          <p className="text-gray-600 mt-1">
            Partagez et découvrez des opportunités immobilières
          </p>
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
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Megaphone className="h-4 w-4 inline mr-2" />
            Annonces ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab('tenant_history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tenant_history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserCheck className="h-4 w-4 inline mr-2" />
            Historique Locataires
          </button>
          <button
            onClick={() => setActiveTab('owner_history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'owner_history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Historique Propriétaires
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'messages'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-2" />
            Messages
          </button>
        </nav>
      </div>

      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher dans les annonces..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
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
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {announcement.title}
                        </h3>
                        <Badge 
                          variant={announcement.type === 'location' ? 'info' : 'success'} 
                          size="sm"
                        >
                          {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">
                        {announcement.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Agence #{announcement.agencyId}</span>
                        <span>•</span>
                        <span>{announcement.views} vues</span>
                        <span>•</span>
                        <span>{announcement.interests.length} intérêt(s)</span>
                        <span>•</span>
                        <span>{announcement.createdAt.toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {announcement.interests.length > 0 && (
                        <Badge variant="warning" size="sm">
                          {announcement.interests.length} demande(s) d'intérêt
                        </Badge>
                      )}
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
                Aucune annonce trouvée
              </h3>
              <p className="text-gray-600 mb-4">
                Aucune annonce ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tenant_history' && (
        <TenantHistorySearch />
      )}

      {activeTab === 'owner_history' && (
        <OwnerHistorySearch />
      )}

      {activeTab === 'messages' && (
        <div className="space-y-6">
          <Card className="p-8 text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Messagerie Inter-Agences
            </h3>
            <p className="text-gray-600 mb-4">
              Communiquez directement avec les autres agences pour vos collaborations.
            </p>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Nouveau message
            </Button>
          </Card>
        </div>
      )}

      {/* Announcement Form Modal */}
      <Modal
        isOpen={showAnnouncementForm}
        onClose={() => setShowAnnouncementForm(false)}
        title="Publier une annonce"
        size="lg"
      >
        <form className="space-y-4">
          <Input
            label="Titre de l'annonce"
            placeholder="Ex: Villa moderne 4 chambres - Cocody"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'annonce
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="location">Location</option>
              <option value="vente">Vente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez le bien et ses avantages..."
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