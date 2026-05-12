import { useAuth } from '../contexts/AuthContext';

export const useCanDelete = () => {
  const { user, agencyId } = useAuth();

  if (!user || !agencyId) return false;

  // Seuls directeur et chef d'agence ont le droit de supprimer
  const hasDeleteRole = user.role === 'director' || user.role === 'manager';
  if (!hasDeleteRole) return false;

  // 1. Vérifier localStorage en priorité (sauvegarde locale immédiate du toggle)
  const localKey = `agency_allow_delete_${agencyId}`;
  const storedLocal = localStorage.getItem(localKey);
  if (storedLocal !== null) {
    return storedLocal === 'true';
  }

  // 2. Fallback : lire depuis le contexte Auth (settings Supabase)
  const activeAgency = user.agencies?.find(a => a.agency_id === agencyId);
  // Si le switch est explicitement à false en base, on le respecte
  // Sinon, par défaut les rôles autorisés peuvent supprimer
  const explicitlyDisabled = activeAgency?.settings?.allow_data_deletion === false;
  return !explicitlyDisabled;
};
