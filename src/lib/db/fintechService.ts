import { supabase } from '../supabase';

export const FintechService = {
  /**
   * Calcule le potentiel mensuel de l'agence (somme des loyers des baux actifs)
   */
  async getMonthlyPotential(agencyId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contracts')
      .select('monthly_rent, charges, type, status')
      .eq('agency_id', agencyId)
      .in('status', ['active', 'renewed'])
      .eq('type', 'location');
    
    if (error) {
      console.error('❌ Error calculating monthly potential:', error);
      return 0;
    }
    
    const potential = data?.reduce((sum, c) => sum + (Number(c.monthly_rent) || 0) + (Number(c.charges) || 0), 0) || 0;
    console.log(`✅ Potentiel calculé: ${potential} FCFA (${data?.length || 0} baux actifs)`);
    return potential;
  },

  /**
   * Récupère le solde et les crédits bonus de l'agence
   */
  async getWallet(agencyId: string) {
    const { data, error } = await supabase
      .from('agency_wallets')
      .select('*')
      .eq('agency_id', agencyId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Wallet non trouvé, on le crée
      const { data: newWallet, error: createError } = await supabase
        .from('agency_wallets')
        .insert([{ agency_id: agencyId, balance: 0, bonus_credits: 3 }])
        .select()
        .single();
      
      if (createError) throw createError;
      return newWallet;
    }
    
    if (error) throw error;
    return data;
  },

  /**
   * Récupère l'historique des transactions
   */
  async getTransactions(agencyId: string) {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Calcule la commission de la plateforme (1% du potentiel)
   */
  calculatePlatformFee(potential: number): number {
    return potential * 0.01;
  }
};
