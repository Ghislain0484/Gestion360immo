export interface ContractTemplate {
  type: 'gestion' | 'location';
  title: string;
  content: string;
  requiredFields: string[];
}

export class OHADAContractGenerator {
  // Template de contrat de gestion (Agence - Propriétaire)
  static generateManagementContract(agencyData: any, ownerData: any, commissionRate: number = 10): string {
    const data = {
      agencyName: agencyData.name,
      agencyAddress: agencyData.address,
      agencyPhone: agencyData.phone,
      agencyEmail: agencyData.email,
      agencyRegister: agencyData.commercial_register,
      ownerFirstName: ownerData.first_name,
      ownerLastName: ownerData.last_name,
      ownerAddress: ownerData.address,
      ownerPhone: ownerData.phone,
      ownerEmail: ownerData.email,
      propertyTitle: this.getPropertyTitleLabel(ownerData.property_title),
      propertyTitleDetails: ownerData.property_title_details,
      commissionRate,
      contractDate: new Date(),
    };

    return `
CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE

En application des dispositions du Code Civil ivoirien et de l'Acte Uniforme OHADA relatif au Droit Commercial Général

ENTRE LES SOUSSIGNÉS :

D'UNE PART,
${data.agencyName.toUpperCase()}
Société de gestion immobilière
Registre de Commerce : ${data.agencyRegister}
Siège social : ${data.agencyAddress}
Téléphone : ${data.agencyPhone}
Email : ${data.agencyEmail}
Représentée par son Directeur, dûment habilité aux fins des présentes,
Ci-après dénommée "L'AGENCE" ou "LE MANDATAIRE"

ET D'AUTRE PART,
Monsieur/Madame ${data.ownerFirstName.toUpperCase()} ${data.ownerLastName.toUpperCase()}
Domicilié(e) à : ${data.ownerAddress}
Téléphone : ${data.ownerPhone}
${data.ownerEmail ? `Email : ${data.ownerEmail}` : ''}
Propriétaire du bien immobilier objet du présent contrat
Titre de propriété : ${data.propertyTitle.toUpperCase()}
${data.propertyTitleDetails ? `Détails : ${data.propertyTitleDetails}` : ''}
Ci-après dénommé(e) "LE MANDANT" ou "LE PROPRIÉTAIRE"

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 - OBJET DU CONTRAT
Le PROPRIÉTAIRE donne mandat à L'AGENCE pour la gestion, l'administration et la mise en location de son bien immobilier, conformément aux dispositions légales en vigueur en Côte d'Ivoire et aux Actes Uniformes OHADA.

ARTICLE 2 - OBLIGATIONS DE L'AGENCE
L'AGENCE s'engage à :
- Rechercher des locataires solvables et de bonne moralité
- Établir les contrats de bail conformément à la législation ivoirienne
- Percevoir les loyers et charges pour le compte du PROPRIÉTAIRE
- Effectuer les reversements dans les délais convenus
- Assurer le suivi des relations locatives
- Tenir une comptabilité détaillée des opérations

ARTICLE 3 - OBLIGATIONS DU PROPRIÉTAIRE
Le PROPRIÉTAIRE s'engage à :
- Fournir tous les documents relatifs à la propriété du bien
- Maintenir le bien en bon état de location
- Informer L'AGENCE de tout changement concernant le bien
- Respecter les termes du présent contrat

ARTICLE 4 - RÉMUNÉRATION
En contrepartie de ses services, L'AGENCE percevra une commission de ${data.commissionRate}% (${this.numberToWords(data.commissionRate)} pour cent) du montant des loyers encaissés, TTC.
Cette commission de ${data.commissionRate}% sera prélevée à titre de gestion locative sur chaque loyer perçu.
Cette commission sera prélevée avant reversement au PROPRIÉTAIRE.

ARTICLE 5 - REVERSEMENTS
L'AGENCE s'engage à reverser au PROPRIÉTAIRE le montant des loyers perçus, déduction faite de sa commission de ${data.commissionRate}%, dans un délai maximum de 10 (dix) jours ouvrables suivant l'encaissement.

ARTICLE 6 - DURÉE
Le présent contrat est conclu pour une durée indéterminée à compter du ${data.contractDate.toLocaleDateString('fr-FR')}.
Il peut être résilié par chacune des parties moyennant un préavis de trois (3) mois par lettre recommandée avec accusé de réception.

ARTICLE 7 - RÉSILIATION
En cas de manquement grave aux obligations contractuelles, le présent contrat pourra être résilié de plein droit après mise en demeure restée sans effet pendant quinze (15) jours.

ARTICLE 8 - LITIGES
Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis aux juridictions compétentes de la République de Côte d'Ivoire.
Le droit applicable est le droit ivoirien et les Actes Uniformes OHADA.

ARTICLE 9 - DISPOSITIONS DIVERSES
Le présent contrat constitue l'intégralité des accords entre les parties. Toute modification devra faire l'objet d'un avenant écrit et signé par les deux parties.

Fait à ${data.agencyAddress.split(',')[0] || 'Abidjan'}, le ${data.contractDate.toLocaleDateString('fr-FR')}
En deux (2) exemplaires originaux

LE PROPRIÉTAIRE                           L'AGENCE
${data.ownerFirstName} ${data.ownerLastName}                    ${data.agencyName}

Signature :                               Signature et cachet :




_____________________                     _____________________

Conformément aux articles 1984 et suivants du Code Civil ivoirien et aux dispositions de l'Acte Uniforme OHADA relatif au Droit Commercial Général.
`;
  }

  // Template de contrat de location (Agence - Locataire)
  static generateRentalContract(agencyData: any, tenantData: any, propertyData: any, rentalTerms: any): string {
    const endDate = new Date(rentalTerms.startDate);
    endDate.setMonth(endDate.getMonth() + rentalTerms.duration);

    const totalDueAtSigning = (rentalTerms.monthlyRent * 2) + (rentalTerms.monthlyRent * 2) + rentalTerms.monthlyRent; // 2 mois avance + 2 mois caution + 1 mois frais

    return `
CONTRAT DE BAIL D'HABITATION

En application du Code Civil ivoirien, de la Loi n°96-669 du 29 août 1996 et des Actes Uniformes OHADA

ENTRE LES SOUSSIGNÉS :

D'UNE PART,
${agencyData.name.toUpperCase()}
Société de gestion immobilière
Registre de Commerce : ${agencyData.commercial_register}
Siège social : ${agencyData.address}
Téléphone : ${agencyData.phone}
Email : ${agencyData.email}
Agissant en qualité de mandataire du propriétaire
Ci-après dénommée "LE BAILLEUR"

ET D'AUTRE PART,
Monsieur/Madame ${tenantData.first_name.toUpperCase()} ${tenantData.last_name.toUpperCase()}
Profession : ${tenantData.profession}
Nationalité : ${tenantData.nationality}
Domicilié(e) à : ${tenantData.address}
Téléphone : ${tenantData.phone}
${tenantData.email ? `Email : ${tenantData.email}` : ''}
Ci-après dénommé(e) "LE PRENEUR" ou "LE LOCATAIRE"

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 - OBJET DE LA LOCATION
Le BAILLEUR donne à bail au PRENEUR qui accepte, le bien immobilier suivant :
Désignation : ${propertyData?.title || 'Bien immobilier'}
Situé à : ${propertyData?.location?.commune || 'Adresse à définir'}
Description : ${propertyData?.description || 'Description à compléter'}

ARTICLE 2 - DESTINATION
Le bien loué est destiné exclusivement à l'habitation du PRENEUR et de sa famille.
Toute autre utilisation est formellement interdite sans accord écrit préalable du BAILLEUR.

ARTICLE 3 - DURÉE
Le présent bail est consenti pour une durée de ${rentalTerms.duration} (${this.numberToWords(rentalTerms.duration)}) mois, 
soit du ${rentalTerms.startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}.

À défaut de congé donné par l'une ou l'autre des parties dans les formes et délais légaux, 
le bail se renouvellera tacitement par périodes successives d'une année.

ARTICLE 4 - LOYER
Le loyer mensuel est fixé à ${rentalTerms.monthlyRent.toLocaleString()} (${this.numberToWords(rentalTerms.monthlyRent)}) FRANCS CFA.
Il est payable d'avance, le 5 de chaque mois, sans qu'il soit besoin de demande.

${rentalTerms.charges ? `
ARTICLE 5 - CHARGES
Les charges locatives s'élèvent à ${rentalTerms.charges.toLocaleString()} (${this.numberToWords(rentalTerms.charges)}) FRANCS CFA par mois.
Elles comprennent : eau, électricité, entretien des parties communes.
` : ''}

ARTICLE ${rentalTerms.charges ? '6' : '5'} - DÉPÔT DE GARANTIE ET PAIEMENTS À LA SIGNATURE
Le PRENEUR verse à la signature des présentes :
- Deux (2) mois de loyer d'avance : ${(rentalTerms.monthlyRent * 2).toLocaleString()} FRANCS CFA
- Deux (2) mois de caution : ${(rentalTerms.monthlyRent * 2).toLocaleString()} FRANCS CFA  
- Un (1) mois de frais d'agence : ${rentalTerms.monthlyRent.toLocaleString()} FRANCS CFA

TOTAL À PAYER À LA SIGNATURE : ${totalDueAtSigning.toLocaleString()} (${this.numberToWords(totalDueAtSigning)}) FRANCS CFA

La caution sera restituée en fin de bail, déduction faite des sommes éventuellement dues.

ARTICLE ${rentalTerms.charges ? '7' : '6'} - OBLIGATIONS DU PRENEUR
Le PRENEUR s'engage à :
- Payer le loyer et les charges aux échéances convenues
- User du bien en bon père de famille
- Ne pas sous-louer sans autorisation écrite
- Souscrire une assurance multirisques habitation
- Permettre les visites pour travaux ou vente éventuelle

ARTICLE ${rentalTerms.charges ? '8' : '7'} - OBLIGATIONS DU BAILLEUR
Le BAILLEUR s'engage à :
- Délivrer le bien en bon état de location
- Assurer la jouissance paisible du bien
- Effectuer les grosses réparations
- Maintenir le bien en état de servir à l'usage prévu

ARTICLE ${rentalTerms.charges ? '9' : '8'} - RÉSILIATION
Le présent bail pourra être résilié :
- Par le PRENEUR moyennant un préavis de trois (3) mois
- Par le BAILLEUR en cas de non-paiement ou manquement grave
- De plein droit en cas de non-respect des clauses essentielles

ARTICLE ${rentalTerms.charges ? '10' : '9'} - CLAUSE RÉSOLUTOIRE
À défaut de paiement du loyer ou des charges à leur échéance, et un mois après commandement de payer demeuré infructueux, le présent bail sera résilié de plein droit.

ARTICLE ${rentalTerms.charges ? '11' : '10'} - LITIGES
Tout litige relatif au présent contrat sera de la compétence exclusive des tribunaux de la République de Côte d'Ivoire.
Le droit applicable est le droit ivoirien.

ARTICLE ${rentalTerms.charges ? '12' : '11'} - ENREGISTREMENT
Le présent contrat sera enregistré conformément aux dispositions fiscales en vigueur, les frais étant à la charge du PRENEUR.

Fait à ${agencyData.address.split(',')[0] || 'Abidjan'}, le ${rentalTerms.startDate.toLocaleDateString('fr-FR')}
En trois (3) exemplaires originaux

LE PRENEUR                               LE BAILLEUR
${tenantData.first_name} ${tenantData.last_name}                    ${agencyData.name}

Signature :                              Signature et cachet :




_____________________                    _____________________

Conformément à la Loi n°96-669 du 29 août 1996 et aux Actes Uniformes OHADA.
`;
  }

  // Générer contrat de gestion automatiquement avec vraies données agence
  static async generateManagementContractForOwner(data: {
    agencyName: string;
    agencyAddress: string;
    agencyPhone: string;
    agencyEmail: string;
    agencyRegister: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerAddress: string;
    ownerPhone: string;
    ownerEmail?: string;
    propertyTitle: string;
    propertyTitleDetails?: string;
    commissionRate: number;
    contractDate: Date;
  }): Promise<string> {
    return `
CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE

En application des dispositions du Code Civil ivoirien et de l'Acte Uniforme OHADA relatif au Droit Commercial Général

ENTRE LES SOUSSIGNÉS :

D'UNE PART,
${data.agencyName.toUpperCase()}
Société de gestion immobilière
Registre de Commerce : ${data.agencyRegister}
Siège social : ${data.agencyAddress}
Téléphone : ${data.agencyPhone}
Email : ${data.agencyEmail}
Représentée par son Directeur, dûment habilité aux fins des présentes,
Ci-après dénommée "L'AGENCE" ou "LE MANDATAIRE"

ET D'AUTRE PART,
Monsieur/Madame ${data.ownerFirstName.toUpperCase()} ${data.ownerLastName.toUpperCase()}
Domicilié(e) à : ${data.ownerAddress}
Téléphone : ${data.ownerPhone}
${data.ownerEmail ? `Email : ${data.ownerEmail}` : ''}
Propriétaire du bien immobilier objet du présent contrat
Titre de propriété : ${data.propertyTitle.toUpperCase()}
${data.propertyTitleDetails ? `Détails : ${data.propertyTitleDetails}` : ''}
Ci-après dénommé(e) "LE MANDANT" ou "LE PROPRIÉTAIRE"

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 - OBJET DU CONTRAT
Le PROPRIÉTAIRE donne mandat à L'AGENCE pour la gestion, l'administration et la mise en location de son bien immobilier, conformément aux dispositions légales en vigueur en Côte d'Ivoire et aux Actes Uniformes OHADA.

ARTICLE 2 - OBLIGATIONS DE L'AGENCE
L'AGENCE s'engage à :
- Rechercher des locataires solvables et de bonne moralité
- Établir les contrats de bail conformément à la législation ivoirienne
- Percevoir les loyers et charges pour le compte du PROPRIÉTAIRE
- Effectuer les reversements dans les délais convenus
- Assurer le suivi des relations locatives
- Tenir une comptabilité détaillée des opérations

ARTICLE 3 - OBLIGATIONS DU PROPRIÉTAIRE
Le PROPRIÉTAIRE s'engage à :
- Fournir tous les documents relatifs à la propriété du bien
- Maintenir le bien en bon état de location
- Informer L'AGENCE de tout changement concernant le bien
- Respecter les termes du présent contrat

ARTICLE 4 - RÉMUNÉRATION
En contrepartie de ses services, L'AGENCE percevra une commission de ${data.commissionRate}% (${this.numberToWords(data.commissionRate)} pour cent) du montant des loyers encaissés, TTC.
Cette commission sera prélevée avant reversement au PROPRIÉTAIRE.

ARTICLE 5 - REVERSEMENTS
L'AGENCE s'engage à reverser au PROPRIÉTAIRE le montant des loyers perçus, déduction faite de sa commission, dans un délai maximum de 10 (dix) jours ouvrables suivant l'encaissement.

ARTICLE 6 - DURÉE
Le présent contrat est conclu pour une durée indéterminée à compter du ${data.contractDate.toLocaleDateString('fr-FR')}.
Il peut être résilié par chacune des parties moyennant un préavis de trois (3) mois par lettre recommandée avec accusé de réception.

ARTICLE 7 - RÉSILIATION
En cas de manquement grave aux obligations contractuelles, le présent contrat pourra être résilié de plein droit après mise en demeure restée sans effet pendant quinze (15) jours.

ARTICLE 8 - LITIGES
Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis aux juridictions compétentes de la République de Côte d'Ivoire.
Le droit applicable est le droit ivoirien et les Actes Uniformes OHADA.

ARTICLE 9 - DISPOSITIONS DIVERSES
Le présent contrat constitue l'intégralité des accords entre les parties. Toute modification devra faire l'objet d'un avenant écrit et signé par les deux parties.

Fait à Abidjan, le ${data.contractDate.toLocaleDateString('fr-FR')}
En deux (2) exemplaires originaux

LE PROPRIÉTAIRE                           L'AGENCE
${data.ownerFirstName} ${data.ownerLastName}                    ${data.agencyName}

Signature :                               Signature et cachet :




_____________________                     _____________________

Conformément aux articles 1984 et suivants du Code Civil ivoirien et aux dispositions de l'Acte Uniforme OHADA relatif au Droit Commercial Général.
`;
  }

  // Template de contrat de location (Agence - Locataire)
  static generateRentalContract(data: {
    agencyName: string;
    agencyAddress: string;
    agencyPhone: string;
    agencyEmail: string;
    agencyRegister: string;
    tenantFirstName: string;
    tenantLastName: string;
    tenantAddress: string;
    tenantPhone: string;
    tenantEmail?: string;
    tenantProfession: string;
    tenantNationality: string;
    propertyTitle: string;
    propertyAddress: string;
    propertyDescription: string;
    monthlyRent: number;
    deposit: number;
    charges?: number;
    startDate: Date;
    duration: number; // en mois
  }): string {
    const endDate = new Date(data.startDate);
    endDate.setMonth(endDate.getMonth() + data.duration);

    return `
CONTRAT DE BAIL D'HABITATION

En application du Code Civil ivoirien, de la Loi n°96-669 du 29 août 1996 et des Actes Uniformes OHADA

ENTRE LES SOUSSIGNÉS :

D'UNE PART,
${data.agencyName.toUpperCase()}
Société de gestion immobilière
Registre de Commerce : ${data.agencyRegister}
Siège social : ${data.agencyAddress}
Téléphone : ${data.agencyPhone}
Email : ${data.agencyEmail}
Agissant en qualité de mandataire du propriétaire
Ci-après dénommée "LE BAILLEUR"

ET D'AUTRE PART,
Monsieur/Madame ${data.tenantFirstName.toUpperCase()} ${data.tenantLastName.toUpperCase()}
Profession : ${data.tenantProfession}
Nationalité : ${data.tenantNationality}
Domicilié(e) à : ${data.tenantAddress}
Téléphone : ${data.tenantPhone}
${data.tenantEmail ? `Email : ${data.tenantEmail}` : ''}
Ci-après dénommé(e) "LE PRENEUR" ou "LE LOCATAIRE"

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 - OBJET DE LA LOCATION
Le BAILLEUR donne à bail au PRENEUR qui accepte, le bien immobilier suivant :
Désignation : ${data.propertyTitle}
Situé à : ${data.propertyAddress}
Description : ${data.propertyDescription}

ARTICLE 2 - DESTINATION
Le bien loué est destiné exclusivement à l'habitation du PRENEUR et de sa famille.
Toute autre utilisation est formellement interdite sans accord écrit préalable du BAILLEUR.

ARTICLE 3 - DURÉE
Le présent bail est consenti pour une durée de ${data.duration} (${this.numberToWords(data.duration)}) mois, 
soit du ${data.startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}.

À défaut de congé donné par l'une ou l'autre des parties dans les formes et délais légaux, 
le bail se renouvellera tacitement par périodes successives d'une année.

ARTICLE 4 - LOYER
Le loyer mensuel est fixé à ${data.monthlyRent.toLocaleString()} (${this.numberToWords(data.monthlyRent)}) FRANCS CFA.
Il est payable d'avance, le 5 de chaque mois, sans qu'il soit besoin de demande.

${data.charges ? `
ARTICLE 5 - CHARGES
Les charges locatives s'élèvent à ${data.charges.toLocaleString()} (${this.numberToWords(data.charges)}) FRANCS CFA par mois.
Elles comprennent : eau, électricité, entretien des parties communes.
` : ''}

ARTICLE ${data.charges ? '6' : '5'} - DÉPÔT DE GARANTIE
Le PRENEUR verse à la signature des présentes un dépôt de garantie de ${data.deposit.toLocaleString()} (${this.numberToWords(data.deposit)}) FRANCS CFA.
Ce dépôt sera restitué en fin de bail, déduction faite des sommes éventuellement dues.

ARTICLE ${data.charges ? '7' : '6'} - OBLIGATIONS DU PRENEUR
Le PRENEUR s'engage à :
- Payer le loyer et les charges aux échéances convenues
- User du bien en bon père de famille
- Ne pas sous-louer sans autorisation écrite
- Souscrire une assurance multirisques habitation
- Permettre les visites pour travaux ou vente éventuelle

ARTICLE ${data.charges ? '8' : '7'} - OBLIGATIONS DU BAILLEUR
Le BAILLEUR s'engage à :
- Délivrer le bien en bon état de location
- Assurer la jouissance paisible du bien
- Effectuer les grosses réparations
- Maintenir le bien en état de servir à l'usage prévu

ARTICLE ${data.charges ? '9' : '8'} - RÉSILIATION
Le présent bail pourra être résilié :
- Par le PRENEUR moyennant un préavis de trois (3) mois
- Par le BAILLEUR en cas de non-paiement ou manquement grave
- De plein droit en cas de non-respect des clauses essentielles

ARTICLE ${data.charges ? '10' : '9'} - CLAUSE RÉSOLUTOIRE
À défaut de paiement du loyer ou des charges à leur échéance, et un mois après commandement de payer demeuré infructueux, le présent bail sera résilié de plein droit.

ARTICLE ${data.charges ? '11' : '10'} - LITIGES
Tout litige relatif au présent contrat sera de la compétence exclusive des tribunaux de la République de Côte d'Ivoire.
Le droit applicable est le droit ivoirien.

ARTICLE ${data.charges ? '12' : '11'} - ENREGISTREMENT
Le présent contrat sera enregistré conformément aux dispositions fiscales en vigueur, les frais étant à la charge du PRENEUR.

Fait à Abidjan, le ${data.startDate.toLocaleDateString('fr-FR')}
En trois (3) exemplaires originaux

LE PRENEUR                               LE BAILLEUR
${data.tenantFirstName} ${data.tenantLastName}                    ${data.agencyName}

Signature :                              Signature et cachet :




_____________________                    _____________________

Conformément à la Loi n°96-669 du 29 août 1996 et aux Actes Uniformes OHADA.
`;
  }

  // Convertir nombres en lettres (français)
  static numberToWords(num: number): string {
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    const thousands = ['', 'mille', 'million', 'milliard'];

    if (num === 0) return 'zéro';
    if (num < 0) return 'moins ' + this.numberToWords(-num);

    let result = '';
    let thousandIndex = 0;

    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        let chunkText = '';
        
        const hundreds = Math.floor(chunk / 100);
        const remainder = chunk % 100;
        
        if (hundreds > 0) {
          chunkText += (hundreds === 1 ? 'cent' : ones[hundreds] + ' cent');
          if (remainder > 0) chunkText += ' ';
        }
        
        if (remainder >= 20) {
          const tensDigit = Math.floor(remainder / 10);
          const onesDigit = remainder % 10;
          chunkText += tens[tensDigit];
          if (onesDigit > 0) {
            chunkText += (tensDigit === 8 ? '-' : '-') + ones[onesDigit];
          }
        } else if (remainder >= 10) {
          chunkText += teens[remainder - 10];
        } else if (remainder > 0) {
          chunkText += ones[remainder];
        }
        
        if (thousands[thousandIndex]) {
          chunkText += ' ' + thousands[thousandIndex];
        }
        
        result = chunkText + (result ? ' ' + result : '');
      }
      
      num = Math.floor(num / 1000);
      thousandIndex++;
    }

    return result.trim();
  }

  // Générer contrat de gestion automatiquement
  static async generateManagementContractForOwner(
    ownerData: any,
    agencyData: any,
    commissionRate: number = 10
  ) {
    return {
      type: 'gestion' as const,
      owner_id: ownerData.id,
      tenant_id: null,
      agency_id: agencyData.id,
      start_date: new Date(),
      commission_rate: commissionRate,
      commission_amount: 0, // Sera calculé lors de la location
      status: 'active' as const,
      terms: this.generateManagementContract(agencyData, ownerData, commissionRate),
      documents: [],
    };
  }

  // Générer contrat de location automatiquement
  static generateRentalContractForTenant(
    tenantData: any,
    agencyData: any,
    propertyData?: any,
    rentalTerms?: {
      monthlyRent: number;
      deposit: number;
      charges?: number;
      duration: number;
      startDate: Date;
    }
  ) {
    const finalRentalTerms = {
      monthlyRent: rentalTerms?.monthlyRent || 350000,
      deposit: rentalTerms?.deposit || (rentalTerms?.monthlyRent || 350000) * 2,
      charges: rentalTerms?.charges,
      duration: rentalTerms?.duration || 12,
      startDate: rentalTerms?.startDate || new Date(),
    };

    return {
      type: 'location' as const,
      owner_id: propertyData?.owner_id || null,
      tenant_id: tenantData.id,
      property_id: propertyData?.id || null,
      agency_id: agencyData.id,
      start_date: finalRentalTerms.startDate,
      end_date: new Date(finalRentalTerms.startDate.getTime() + (finalRentalTerms.duration * 30 * 24 * 60 * 60 * 1000)),
      monthly_rent: finalRentalTerms.monthlyRent,
      deposit: finalRentalTerms.deposit,
      charges: finalRentalTerms.charges,
      commission_rate: 10,
      commission_amount: finalRentalTerms.monthlyRent * 0.1,
      status: 'draft' as const,
      terms: this.generateRentalContract(agencyData, tenantData, propertyData, finalRentalTerms),
      documents: [],
    };
  }

  static getPropertyTitleLabel(title: string): string {
    const labels = {
      attestation_villageoise: 'Attestation Villageoise',
      lettre_attribution: 'Lettre d\'Attribution',
      permis_habiter: 'Permis d\'Habiter',
      acd: 'Arrêté de Concession Définitive (ACD)',
      tf: 'Titre Foncier (TF)',
      cpf: 'Certificat de Propriété Foncière (CPF)',
      autres: 'Autre Titre de Propriété'
    };
    return labels[title as keyof typeof labels] || title;
  }

  // Validation conformité OHADA
  static validateOHADACompliance(contractData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifications obligatoires OHADA
    if (!contractData.agencyRegister) {
      errors.push('Numéro de registre de commerce obligatoire (OHADA)');
    }

    if (!contractData.contractDate) {
      errors.push('Date de signature obligatoire');
    }

    if (contractData.type === 'location') {
      if (!contractData.monthlyRent || contractData.monthlyRent <= 0) {
        errors.push('Montant du loyer obligatoire et positif');
      }

      if (!contractData.deposit || contractData.deposit < contractData.monthlyRent) {
        errors.push('Dépôt de garantie obligatoire (minimum 1 mois de loyer)');
      }

      if (!contractData.duration || contractData.duration < 1) {
        errors.push('Durée du bail obligatoire (minimum 1 mois)');
      }
    }

    if (contractData.type === 'gestion') {
      if (!contractData.commissionRate || contractData.commissionRate <= 0 || contractData.commissionRate > 50) {
        errors.push('Taux de commission obligatoire (entre 0 et 50%)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Générer numéro de contrat conforme
  static generateContractNumber(agencyCode: string, type: 'gestion' | 'location'): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 9999) + 1;
    const typeCode = type === 'gestion' ? 'GES' : 'LOC';
    
    return `${agencyCode}-${typeCode}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  // Fonction d'impression de contrat
  static printContract(contractData: any, agencyData: any, clientData: any, propertyData?: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const contractHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrat ${contractData.type} - ${agencyData.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #333; }
            .contract-title { font-size: 20px; margin: 20px 0; text-align: center; }
            .content { margin: 30px 0; }
            .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; width: 45%; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${agencyData.name.toUpperCase()}</div>
            <div>${agencyData.address}</div>
            <div>Tél: ${agencyData.phone}</div>
            <div>Email: ${agencyData.email}</div>
            ${agencyData.commercial_register ? `<div>RC: ${agencyData.commercial_register}</div>` : ''}
          </div>
          
          <div class="contract-title">
            <strong>${contractData.type === 'gestion' ? 'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE' : 'CONTRAT DE BAIL D\'HABITATION'}</strong>
          </div>
          
          <div class="content">
            ${contractData.terms.replace(/\n/g, '<br>')}
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <p><strong>${contractData.type === 'gestion' ? 'LE PROPRIÉTAIRE' : 'LE LOCATAIRE'}</strong></p>
              <p>${clientData.firstName || clientData.first_name} ${clientData.lastName || clientData.last_name}</p>
              <br><br><br>
              <p>Signature: ________________</p>
            </div>
            <div class="signature-box">
              <p><strong>L'AGENCE</strong></p>
              <p>${agencyData.name}</p>
              <br><br><br>
              <p>Signature et cachet: ________________</p>
            </div>
          </div>
          
          <div class="footer">
            <div>Contrat généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
            <div>Conforme à la législation ivoirienne et aux Actes Uniformes OHADA</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(contractHtml);
    printWindow.document.close();
    printWindow.print();
  }
}