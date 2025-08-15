import React, { useState } from 'react';
import { Save, User, MapPin, Phone, FileText, Heart, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { OwnerFormData } from '../../types/owner';
import { ContractForm } from '../contracts/ContractForm';
import { AgencyIdGenerator } from '../../utils/idGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { OHADAContractGenerator } from '../../utils/contractTemplates';
import { dbService } from '../../lib/supabase';

interface OwnerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (owner: OwnerFormData) => void;
  initialData?: Partial<OwnerFormData>;
}

export const OwnerForm: React.FC<OwnerFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { user } = useAuth();
  const [showContractForm, setShowContractForm] = useState(false);
  const [createdOwner, setCreatedOwner] = useState<any>(null);
  
  const [formData, setFormData] = useState<OwnerFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    propertyTitle: 'attestation_villageoise',
    propertyTitleDetails: '',
    maritalStatus: 'celibataire',
    spouseName: '',
    spousePhone: '',
    childrenCount: 0,
    agencyId: '1',
    ...initialData,
  });

  const propertyTitleOptions = [
    { value: 'attestation_villageoise', label: 'Attestation villageoise' },
    { value: 'lettre_attribution', label: 'Lettre d\'attribution' },
    { value: 'permis_habiter', label: 'Permis d\'habiter' },
    { value: 'acd', label: 'ACD (Arrêté de Concession Définitive)' },
    { value: 'tf', label: 'TF (Titre Foncier)' },
    { value: 'cpf', label: 'CPF (Certificat de Propriété Foncière)' },
    { value: 'autres', label: 'Autres' },
  ];

  const maritalStatusOptions = [
    { value: 'celibataire', label: 'Célibataire' },
    { value: 'marie', label: 'Marié(e)' },
    { value: 'divorce', label: 'Divorcé(e)' },
    { value: 'veuf', label: 'Veuf/Veuve' },
  ];

  const updateFormData = (updates: Partial<OwnerFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs obligatoires
    if (!formData.firstName.trim()) {
      alert('Le prénom est obligatoire');
      return;
    }
    
    if (!formData.lastName.trim()) {
      alert('Le nom est obligatoire');
      return;
    }
    
    if (!formData.phone.trim()) {
      alert('Le téléphone est obligatoire');
      return;
    }
    
    if (!formData.address.trim()) {
      alert('L\'adresse est obligatoire');
      return;
    }
    
    if (!formData.city.trim()) {
      alert('La ville est obligatoire');
      return;
    }
    
    // Validation du téléphone
    const phoneRegex = /^(\+225)?[0-9\s-]{8,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert('Format de téléphone invalide. Exemple: +225 01 02 03 04 05');
      return;
    }
    
    // Validation email si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Format d\'email invalide');
      return;
    }
    
    // Validation des données du conjoint si marié
    if (formData.maritalStatus === 'marie') {
      if (!formData.spouseName?.trim()) {
        alert('Le nom du conjoint est obligatoire pour une personne mariée');
        return;
      }
      if (!formData.spousePhone?.trim()) {
        alert('Le téléphone du conjoint est obligatoire pour une personne mariée');
        return;
      }
      if (!phoneRegex.test(formData.spousePhone)) {
        alert('Format de téléphone du conjoint invalide');
        return;
      }
    }
    
    // Validation du nombre d'enfants
    if (formData.childrenCount < 0 || formData.childrenCount > 20) {
      alert('Le nombre d\'enfants doit être entre 0 et 20');
      return;
    }
    
    // Validation du titre de propriété "autres"
    if (formData.propertyTitle === 'autres' && !formData.propertyTitleDetails?.trim()) {
      alert('Veuillez préciser le type de titre de propriété');
      return;
    }
    
    try {
      await onSubmit(formData);
      
      // Créer un objet propriétaire pour le contrat
      const ownerForContract = {
        id: `owner_${Date.now()}`,
        ...formData,
        createdAt: new Date(),
      };
      setCreatedOwner(ownerForContract);
      
      // Générer automatiquement le contrat de gestion OHADA
      try {
        if (!user?.agencyId) {
          throw new Error('❌ Aucune agence associée à votre compte');
        }
        
        console.log('🔄 Génération contrat de gestion pour propriétaire:', ownerForContract.id);
        
        // Récupérer les données de l'agence OBLIGATOIREMENT
        const agencyData = await dbService.getAgency(user.agencyId);
        if (!agencyData) {
          throw new Error('❌ Impossible de récupérer les données de l\'agence');
        }
        
        console.log('✅ Données agence récupérées:', agencyData.name);

        const managementContract = await OHADAContractGenerator.generateManagementContractForOwner(
          ownerForContract,
          agencyData,
          10 // 10% de commission
        );

        // Créer le contrat OBLIGATOIREMENT en base
        console.log('🔄 Création contrat en base de données...');
        const contractResult = await dbService.createContract({
          ...managementContract,
          property_id: null, // Sera défini lors de l'ajout de propriété
          owner_id: ownerForContract.id,
          tenant_id: null,
          agency_id: user.agencyId,
        });
        
        console.log('✅ Contrat de gestion créé en base:', contractResult);

        // Proposition d'impression immédiate
        const shouldPrint = confirm(`✅ Propriétaire créé avec succès !

📋 CONTRAT DE GESTION AUTOMATIQUE :
• Type : Mandat de gestion immobilière
• Commission : 10% des loyers encaissés
• Conforme : Législation ivoirienne et OHADA
• Statut : Créé en base de données
• ID Contrat : ${contractResult.id}

Le contrat de gestion a été créé automatiquement en base de données selon la réglementation OHADA.
Vous pouvez le consulter et le modifier dans la section "Contrats".

Voulez-vous imprimer le contrat maintenant ?`);

        if (shouldPrint) {
          OHADAContractGenerator.printContract(contractResult, agencyData, ownerForContract);
        }

      } catch (contractError) {
        console.error('Erreur génération contrat:', contractError);
        
        // Message d'erreur spécifique selon le type d'erreur
        let errorMessage = '';
        if (contractError instanceof Error) {
          if (contractError.message.includes('Invalid API key')) {
            errorMessage = `🔑 Configuration Supabase invalide
            
SOLUTION :
1. Vérifiez les variables d'environnement sur Vercel
2. VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être correctes
3. Redéployez l'application après correction

Le propriétaire a été créé mais le contrat n'a pas pu être généré.`;
          } else if (contractError.message.includes('agence associée')) {
            errorMessage = `👤 Aucune agence associée à votre compte
            
SOLUTION :
Veuillez vous reconnecter à votre compte.`;
          } else {
            errorMessage = `⚠️ Erreur technique lors de la génération du contrat
            
Erreur: ${contractError.message}

Le propriétaire a été créé mais le contrat doit être créé manuellement.`;
          }
        }

        alert(`✅ Propriétaire créé avec succès !

❌ ERREUR CONTRAT AUTOMATIQUE :
${errorMessage}

Vous pouvez créer manuellement un contrat dans la section "Contrats".`);
      }
      
      onClose();
      
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Erreur lors de l\'enregistrement du propriétaire. Veuillez vérifier vos données et réessayer.');
    }
  };

  const isMarried = formData.maritalStatus === 'marie';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Ajouter un propriétaire">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={formData.firstName}
                onChange={(e) => updateFormData({ firstName: e.target.value })}
                required
                placeholder="Prénom du propriétaire"
              />
              <Input
                label="Nom de famille"
                value={formData.lastName}
                onChange={(e) => updateFormData({ lastName: e.target.value })}
                required
                placeholder="Nom de famille"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Téléphone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                required
                placeholder="+225 XX XX XX XX XX"
              />
              <Input
                label="Email (optionnel)"
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateFormData({ email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
          </Card>

          {/* Localisation */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="flex items-center mb-4">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Localisation</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Adresse"
                value={formData.address}
                onChange={(e) => updateFormData({ address: e.target.value })}
                required
                placeholder="Adresse complète"
              />
              <Input
                label="Ville"
                value={formData.city}
                onChange={(e) => updateFormData({ city: e.target.value })}
                required
                placeholder="Ville de résidence"
              />
            </div>
          </Card>

          {/* Titre de propriété */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Titre de propriété</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de titre de propriété
                </label>
                <select
                  value={formData.propertyTitle}
                  onChange={(e) => updateFormData({ propertyTitle: e.target.value as OwnerFormData['propertyTitle'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                  required
                >
                  {propertyTitleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.propertyTitle === 'autres' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Précisez le type de titre
                  </label>
                  <textarea
                    value={formData.propertyTitleDetails || ''}
                    onChange={(e) => updateFormData({ propertyTitleDetails: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                    placeholder="Décrivez le type de titre de propriété..."
                    required
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Situation familiale */}
          <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
            <div className="flex items-center mb-4">
              <Heart className="h-5 w-5 text-pink-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Situation familiale</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Situation matrimoniale
                </label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => updateFormData({ maritalStatus: e.target.value as OwnerFormData['maritalStatus'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                  required
                >
                  {maritalStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {isMarried && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-pink-50/80 rounded-lg backdrop-blur-sm">
                  <Input
                    label="Nom du conjoint"
                    value={formData.spouseName || ''}
                    onChange={(e) => updateFormData({ spouseName: e.target.value })}
                    required={isMarried}
                    placeholder="Nom complet du conjoint"
                  />
                  <Input
                    label="Téléphone du conjoint"
                    type="tel"
                    value={formData.spousePhone || ''}
                    onChange={(e) => updateFormData({ spousePhone: e.target.value })}
                    required={isMarried}
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
              )}

              <Input
                label="Nombre d'enfants"
                type="number"
                value={formData.childrenCount}
                onChange={(e) => updateFormData({ childrenCount: parseInt(e.target.value) || 0 })}
                min="0"
                max="20"
                placeholder="0"
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-green-200">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contract Form Modal */}
      {createdOwner && (
        <ContractForm
          isOpen={showContractForm}
          onClose={() => {
            setShowContractForm(false);
            setCreatedOwner(null);
            onClose();
          }}
          onSubmit={(contractData) => {
            console.log('Contrat créé pour le propriétaire:', createdOwner.id);
            setShowContractForm(false);
            setCreatedOwner(null);
            onClose();
          }}
          initialData={{
            ownerId: createdOwner.id,
            agencyId: user?.agencyId || '',
            type: 'location',
            status: 'draft',
            commissionRate: 10,
            commissionAmount: 0,
            terms: `Contrat de location pour ${createdOwner.firstName} ${createdOwner.lastName}`,
            documents: [],
            renewalHistory: [],
          }}
        />
      )}
    </>
  );
};