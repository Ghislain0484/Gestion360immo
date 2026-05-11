import { supabase } from '../config';

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
  },

  /**
   * Utilise un crédit de collaboration
   */
  async useCollaborationCredit(agencyId: string): Promise<boolean> {
    const wallet = await this.getWallet(agencyId);
    
    if (wallet.bonus_credits <= 0 && wallet.balance < 1000) { // Supposons 1000 FCFA par crédit si solde monétaire utilisé
      throw new Error("Crédits insuffisants. Veuillez recharger votre portefeuille.");
    }

    let updates: any = {};
    if (wallet.bonus_credits > 0) {
      updates.bonus_credits = wallet.bonus_credits - 1;
    } else {
      updates.balance = wallet.balance - 1000;
    }

    const { error } = await supabase
      .from('agency_wallets')
      .update(updates)
      .eq('agency_id', agencyId);

    if (error) throw error;

    // Enregistrer la transaction
    await supabase.from('wallet_transactions').insert([{
      agency_id: agencyId,
      amount: wallet.bonus_credits > 0 ? 0 : -1000,
      type: 'sollicitation',
      description: 'Utilisation d\'un crédit de collaboration inter-agence',
      status: 'completed'
    }]);

    return true;
  },

  /**
   * Ajoute un crédit bonus à l'agence (récompense partage d'historique)
   */
  async addBonusCredit(agencyId: string, reason: string = 'Récompense collaboration'): Promise<void> {
    const wallet = await this.getWallet(agencyId);

    const { error } = await supabase
      .from('agency_wallets')
      .update({ bonus_credits: (wallet.bonus_credits || 0) + 1 })
      .eq('agency_id', agencyId);

    if (error) throw error;

    await supabase.from('wallet_transactions').insert([{
      agency_id: agencyId,
      amount: 0,
      type: 'reward',
      description: reason,
      status: 'completed'
    }]);
  }
};
