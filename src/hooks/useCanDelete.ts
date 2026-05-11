import { useAuth } from '../contexts/AuthContext';

export const useCanDelete = () => {
  const { user, agencyId } = useAuth();

  if (!user || !agencyId) return false;

  // Seuls directeur et chef d'agence ont le droit de supprimer
  const hasDeleteRole = user.role === 'director' || user.role === 'agency_manager';
  if (!hasDeleteRole) return false;

  // Si le switch allow_data_deletion est explicitement défini à false, on le respecte
  // Sinon, par défaut les rôles autorisés peuvent supprimer
  const activeAgency = user.agencies?.find(a => a.agency_id === agencyId);
  const explicitlyDisabled = activeAgency?.settings?.allow_data_deletion === false;

  return !explicitlyDisabled;
};
