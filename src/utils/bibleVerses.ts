export interface BibleVerse {
  text: string;
  reference: string;
  theme: string;
}

export const bibleVerses: BibleVerse[] = [
  {
    text: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.",
    reference: "Jérémie 29:11",
    theme: "espoir"
  },
  {
    text: "Tout ce que vous ferez, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.",
    reference: "Colossiens 3:23",
    theme: "travail"
  },
  {
    text: "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse; reconnais-le dans toutes tes voies, et il aplanira tes sentiers.",
    reference: "Proverbes 3:5-6",
    theme: "confiance"
  },
  {
    text: "L'Éternel est ma lumière et mon salut: de qui aurais-je crainte? L'Éternel est le soutien de ma vie: de qui aurais-je peur?",
    reference: "Psaume 27:1",
    theme: "courage"
  },
  {
    text: "Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.",
    reference: "Matthieu 6:33",
    theme: "priorités"
  },
  {
    text: "Je puis tout par celui qui me fortifie.",
    reference: "Philippiens 4:13",
    theme: "force"
  },
  {
    text: "Heureux l'homme qui place en l'Éternel sa confiance, et qui ne se tourne pas vers les hautains et vers ceux qui s'égarent dans le mensonge!",
    reference: "Psaume 40:4",
    theme: "confiance"
  },
  {
    text: "L'Éternel combattra pour vous; et vous, gardez le silence.",
    reference: "Exode 14:14",
    theme: "protection"
  },
  {
    text: "Remets ton sort à l'Éternel, et il te soutiendra, il ne laissera jamais chanceler le juste.",
    reference: "Psaume 55:22",
    theme: "soutien"
  },
  {
    text: "Car mes pensées ne sont pas vos pensées, et vos voies ne sont pas mes voies, dit l'Éternel.",
    reference: "Ésaïe 55:8",
    theme: "sagesse"
  },
  {
    text: "Celui qui demeure sous l'abri du Très-Haut repose à l'ombre du Tout-Puissant.",
    reference: "Psaume 91:1",
    theme: "protection"
  },
  {
    text: "L'Éternel est près de ceux qui ont le cœur brisé, et il sauve ceux qui ont l'esprit dans l'abattement.",
    reference: "Psaume 34:18",
    theme: "réconfort"
  },
  {
    text: "Voici, je suis avec vous tous les jours, jusqu'à la fin du monde.",
    reference: "Matthieu 28:20",
    theme: "présence"
  },
  {
    text: "Que votre cœur ne se trouble point. Croyez en Dieu, et croyez en moi.",
    reference: "Jean 14:1",
    theme: "paix"
  },
  {
    text: "L'Éternel est bon, il est un refuge au jour de la détresse; il connaît ceux qui se confient en lui.",
    reference: "Nahum 1:7",
    theme: "refuge"
  },
  {
    text: "Mais ceux qui se confient en l'Éternel renouvellent leur force. Ils prennent le vol comme les aigles.",
    reference: "Ésaïe 40:31",
    theme: "renouvellement"
  },
  {
    text: "L'Éternel ton Dieu est au milieu de toi, comme un héros qui sauve; il fera de toi sa plus grande joie.",
    reference: "Sophonie 3:17",
    theme: "joie"
  },
  {
    text: "Ne crains rien, car je suis avec toi; ne promène pas des regards inquiets, car je suis ton Dieu.",
    reference: "Ésaïe 41:10",
    theme: "courage"
  },
  {
    text: "Béni soit l'homme qui se confie en l'Éternel, et dont l'Éternel est l'espérance!",
    reference: "Jérémie 17:7",
    theme: "bénédiction"
  },
  {
    text: "L'Éternel est ma force et mon bouclier; en lui mon cœur se confie, et je suis secouru.",
    reference: "Psaume 28:7",
    theme: "force"
  },
  {
    text: "Car l'Éternel prend plaisir à son peuple, il glorifie les malheureux en les sauvant.",
    reference: "Psaume 149:4",
    theme: "salut"
  },
  {
    text: "Recommande à l'Éternel tes œuvres, et tes projets réussiront.",
    reference: "Proverbes 16:3",
    theme: "succès"
  },
  {
    text: "L'Éternel est ma portion, dit mon âme; c'est pourquoi je veux espérer en lui.",
    reference: "Lamentations 3:24",
    theme: "espoir"
  },
  {
    text: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.",
    reference: "Matthieu 11:28",
    theme: "repos"
  },
  {
    text: "Et nous savons que toutes choses concourent au bien de ceux qui aiment Dieu.",
    reference: "Romains 8:28",
    theme: "providence"
  },
  {
    text: "L'Éternel gardera ton départ et ton arrivée, dès maintenant et à jamais.",
    reference: "Psaume 121:8",
    theme: "protection"
  },
  {
    text: "Que la grâce du Seigneur Jésus-Christ soit avec vous tous!",
    reference: "Apocalypse 22:21",
    theme: "grâce"
  },
  {
    text: "Car c'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c'est le don de Dieu.",
    reference: "Éphésiens 2:8",
    theme: "grâce"
  },
  {
    text: "L'Éternel bénira son peuple par la paix.",
    reference: "Psaume 29:11",
    theme: "paix"
  },
  {
    text: "Celui qui habite dans la secret du Très-Haut repose à l'ombre du Tout-Puissant.",
    reference: "Psaume 91:1",
    theme: "sécurité"
  }
];

export class DailyVerseService {
  private static readonly STORAGE_KEY = 'daily_bible_verse';
  
  /**
   * Obtient le verset du jour basé sur la date actuelle
   * Le même verset sera retourné pour toute la journée
   */
  static getDailyVerse(): BibleVerse {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (stored) {
      const { date, verse } = JSON.parse(stored);
      if (date === today) {
        return verse;
      }
    }
    
    // Générer un nouveau verset pour aujourd'hui
    const todayVerse = this.generateVerseForDate(today);
    
    // Sauvegarder pour la journée
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      date: today,
      verse: todayVerse
    }));
    
    return todayVerse;
  }
  
  /**
   * Génère un verset basé sur la date (même verset pour la même date)
   */
  private static generateVerseForDate(dateString: string): BibleVerse {
    // Utiliser la date comme seed pour avoir le même verset chaque jour
    const seed = this.hashCode(dateString);
    const index = Math.abs(seed) % bibleVerses.length;
    return bibleVerses[index];
  }
  
  /**
   * Fonction de hash simple pour générer un seed à partir d'une chaîne
   */
  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  /**
   * Obtient un verset aléatoire (pour test ou usage spécial)
   */
  static getRandomVerse(): BibleVerse {
    const randomIndex = Math.floor(Math.random() * bibleVerses.length);
    return bibleVerses[randomIndex];
  }
  
  /**
   * Obtient tous les versets par thème
   */
  static getVersesByTheme(theme: string): BibleVerse[] {
    return bibleVerses.filter(verse => verse.theme === theme);
  }
  
  /**
   * Obtient tous les thèmes disponibles
   */
  static getAvailableThemes(): string[] {
    const themes = [...new Set(bibleVerses.map(verse => verse.theme))];
    return themes.sort();
  }
}