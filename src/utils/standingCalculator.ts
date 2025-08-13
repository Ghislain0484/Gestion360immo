import { RoomDetails } from '../types/property';

export class StandingCalculator {
  static calculateStanding(rooms: RoomDetails[]): 'economique' | 'moyen' | 'haut' {
    if (rooms.length === 0) return 'economique';

    let score = 0;
    let totalRooms = rooms.length;

    rooms.forEach(room => {
      // Points pour le type de plafond
      switch (room.plafond.type) {
        case 'staff':
          score += 3;
          break;
        case 'plafond_bois':
        case 'lambris_bois':
          score += 2;
          break;
        case 'lambris_pvc':
          score += 1;
          break;
        case 'dalle_simple':
          score += 0;
          break;
        default:
          score += 0;
      }

      // Points pour le sol
      switch (room.sol.type) {
        case 'parquet':
          score += 3;
          break;
        case 'carrelage':
          score += 2;
          break;
        default:
          score += 1;
      }

      // Points pour la menuiserie
      if (room.menuiserie.materiau === 'alu') {
        score += 2;
      } else {
        score += 1;
      }

      // Points pour l'électricité (qualité des installations)
      const electriciteScore = Math.min(
        (room.electricite.nombrePrises + 
         room.electricite.nombreInterrupteurs + 
         room.electricite.nombreDismatique) / 10, 
        2
      );
      score += electriciteScore;

      // Points pour la peinture (marque connue)
      const marquesHautStanding = ['dulux', 'seigneurie', 'zolpan'];
      const marquesMoyenStanding = ['astral', 'ripolin'];
      
      const marque = room.peinture.marque.toLowerCase();
      if (marquesHautStanding.some(m => marque.includes(m))) {
        score += 2;
      } else if (marquesMoyenStanding.some(m => marque.includes(m))) {
        score += 1;
      }
    });

    // Calcul du score moyen par pièce
    const averageScore = score / totalRooms;

    // Détermination du standing
    if (averageScore >= 8) {
      return 'haut';
    } else if (averageScore >= 5) {
      return 'moyen';
    } else {
      return 'economique';
    }
  }

  static getStandingDescription(standing: 'economique' | 'moyen' | 'haut'): string {
    switch (standing) {
      case 'economique':
        return 'Finitions de base, matériaux standards';
      case 'moyen':
        return 'Finitions correctes, matériaux de qualité moyenne';
      case 'haut':
        return 'Finitions haut de gamme, matériaux de qualité supérieure';
    }
  }
}