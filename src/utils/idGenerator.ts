export class AgencyIdGenerator {
  private static getAgencyCode(agencyName: string): string {
    // Générer un code à partir du nom de l'agence
    const words = agencyName.toUpperCase().split(' ');
    if (words.length >= 2) {
      return words[0].substring(0, 2) + words[1].substring(0, 2);
    }
    return agencyName.toUpperCase().substring(0, 4).padEnd(4, 'X');
  }

  static generateOwnerId(agencyId: string, agencyName: string): string {
    const agencyCode = this.getAgencyCode(agencyName);
    const timestamp = Date.now().toString().slice(-6);
    return `${agencyCode}-PROP-${timestamp}`;
  }

  static generateTenantId(agencyId: string, agencyName: string): string {
    const agencyCode = this.getAgencyCode(agencyName);
    const timestamp = Date.now().toString().slice(-6);
    return `${agencyCode}-LOC-${timestamp}`;
  }

  static generatePropertyId(agencyId: string, agencyName: string): string {
    const agencyCode = this.getAgencyCode(agencyName);
    const timestamp = Date.now().toString().slice(-6);
    return `${agencyCode}-BIEN-${timestamp}`;
  }

  static generateReceiptNumber(agencyId: string, agencyName: string, month: string, year: number): string {
    const agencyCode = this.getAgencyCode(agencyName);
    const monthNum = String(new Date(`${month} 1, ${year}`).getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 999) + 1;
    return `${agencyCode}-${year}${monthNum}-${String(sequence).padStart(3, '0')}`;
  }
}

export class RankingCalculator {
  static calculateAgencyScore(metrics: {
    totalProperties: number;
    totalContracts: number;
    totalRevenue: number;
    clientSatisfaction: number;
    collaborationScore: number;
    paymentReliability: number;
    recoveryRate: number;
  }): number {
    // Pondération des critères
    const weights = {
      volume: 0.50,          // 50% - Volume des biens immobiliers (propriétés + contrats)
      recovery: 0.30,        // 30% - Taux de recouvrement des loyers
      satisfaction: 0.20     // 20% - Satisfaction clients (propriétaires + locataires)
    };

    // Normalisation des scores (0-100)
    const normalizedScores = {
      volume: Math.min((metrics.totalProperties * 2 + metrics.totalContracts) / 200 * 100, 100),
      recovery: Math.min(metrics.recoveryRate, 100),
      satisfaction: metrics.clientSatisfaction,
    };

    // Calcul du score final
    const finalScore = 
      normalizedScores.volume * weights.volume +
      normalizedScores.recovery * weights.recovery +
      normalizedScores.satisfaction * weights.satisfaction;

    return Math.round(finalScore * 100) / 100;
  }

  static generateRewards(rank: number, score: number): AgencyReward[] {
    const rewards: AgencyReward[] = [];
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    if (rank === 1) {
      rewards.push({
        id: `reward_${Date.now()}_1`,
        type: 'cash_bonus',
        title: 'Bonus Excellence',
        description: 'Prime de 2,000,000 FCFA pour la 1ère place',
        value: 2000000,
        validUntil
      });
      rewards.push({
        id: `reward_${Date.now()}_2`,
        type: 'discount',
        title: 'Abonnement Gratuit',
        description: 'Abonnement gratuit pendant 12 mois',
        value: 100,
        validUntil
      });
    } else if (rank === 2) {
      rewards.push({
        id: `reward_${Date.now()}_3`,
        type: 'cash_bonus',
        title: 'Bonus Performance',
        description: 'Prime de 1,200,000 FCFA pour la 2ème place',
        value: 1200000,
        validUntil
      });
      rewards.push({
        id: `reward_${Date.now()}_4`,
        type: 'discount',
        title: 'Réduction Avancée',
        description: '60% de réduction sur l\'abonnement pendant 8 mois',
        value: 60,
        validUntil
      });
    } else if (rank === 3) {
      rewards.push({
        id: `reward_${Date.now()}_5`,
        type: 'cash_bonus',
        title: 'Bonus Qualité',
        description: 'Prime de 800,000 FCFA pour la 3ème place',
        value: 800000,
        validUntil
      });
      rewards.push({
        id: `reward_${Date.now()}_6`,
        type: 'discount',
        title: 'Réduction Standard',
        description: '40% de réduction sur l\'abonnement pendant 6 mois',
        value: 40,
        validUntil
      });
    }

    if (score >= 85) {
      rewards.push({
        id: `reward_${Date.now()}_7`,
        type: 'badge',
        title: 'Badge Excellence',
        description: 'Badge de reconnaissance pour score supérieur à 85',
        value: 0,
        validUntil
      });
    }

    return rewards;
  }
}