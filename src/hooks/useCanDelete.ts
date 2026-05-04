import { useAuth } from '../contexts/AuthContext';

export const useCanDelete = () => {
  const { user, agencyId } = useAuth();

  if (!user || !agencyId) return false;

  // 1. Vérification du rôle
  const hasDeleteRole = user.role === 'director' || user.role === 'agency_manager';
  
  if (!hasDeleteRole) return false;

  // 2. Vérification du Master Switch de l'agence active
  const activeAgency = user.agencies.find(a => a.agency_id === agencyId);
  const allowDataDeletion = activeAgency?.settings?.allow_data_deletion === true;

  return allowDataDeletion;
};
