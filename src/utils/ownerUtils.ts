import { PropertyTitle, MaritalStatus } from '../types/db';

type BadgeVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';

export const getPropertyTitleLabel = (title: PropertyTitle | undefined): string => {
  switch (title) {
    case 'tf':
      return 'Titre Foncier';
    case 'cpf':
      return 'Certificat de Propriété Foncière';
    case 'acd':
      return 'Arrêté de Concession Définitive';
    case 'lettre_attribution':
      return "Lettre d'attribution";
    case 'permis_habiter':
      return "Permis d'habiter";
    case 'attestation_villageoise':
      return 'Attestation villageoise';
    case 'autres':
      return 'Autres';
    default:
      return 'Non spécifié';
  }
};

export const getPropertyTitleColor = (title: PropertyTitle | undefined): BadgeVariant => {
  switch (title) {
    case 'tf':
      return 'success';
    case 'cpf':
      return 'primary';
    case 'acd':
      return 'info';
    case 'lettre_attribution':
      return 'warning';
    case 'permis_habiter':
      return 'secondary';
    case 'attestation_villageoise':
      return 'danger';
    case 'autres':
      return 'secondary';
    default:
      return 'secondary';
  }
};

export const getMaritalStatusLabel = (status: MaritalStatus | undefined): string => {
  switch (status) {
    case 'celibataire':
      return 'Célibataire';
    case 'marie':
      return 'Marié(e)';
    case 'divorce':
      return 'Divorcé(e)';
    case 'veuf':
      return 'Veuf/Veuve';
    default:
      return 'Non spécifié';
  }
};

export const getMaritalStatusColor = (status: MaritalStatus | undefined): BadgeVariant => {
  switch (status) {
    case 'celibataire':
      return 'info';
    case 'marie':
      return 'success';
    case 'divorce':
      return 'danger';
    case 'veuf':
      return 'warning';
    default:
      return 'secondary';
  }
};