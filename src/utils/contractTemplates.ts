import { Contract } from '../types/contracts';
import { Property, Agency, Tenant } from '../types/db';

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

    return `CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE

En application des dispositions du Code Civil ivoirien et de l'Acte Uniforme OHADA relatif au Droit Commercial Général

ENTRE LES SOUSSIGNÉS :

D'UNE PART,
${data.agencyName.toUpperCase()}
Société de gestion immobilière
Registre de Commerce : ${data.agencyRegister || 'En cours'}
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
Le PROPRIÉTAIRE donne mandat à L'AGENCE pour la gestion, l'administration et la mise en location de son bien immobilier, conformément aux dispositions légales en vigueur et aux Actes Uniformes OHADA.

ARTICLE 2 - OBLIGATIONS DE L'AGENCE
L'AGENCE s'engage à :
- Rechercher des locataires solvables et de bonne moralité.
- Établir les contrats de bail conformément à la législation en vigueur.
- Percevoir les loyers et charges pour le compte du PROPRIÉTAIRE.
- Effectuer les reversements après déduction de sa commission.
- Assurer le suivi des relations locatives et l'entretien courant.

ARTICLE 3 - OBLIGATIONS DU PROPRIÉTAIRE
Le PROPRIÉTAIRE s'engage à fournir tous les documents de propriété et à maintenir le bien dans un état décent de location.

ARTICLE 4 - RÉMUNÉRATION ET COMMISSIONS
En contrepartie, L'AGENCE percevra :
- Une commission de gestion de ${data.commissionRate}% sur chaque loyer encaissé.
- Des frais de dossiers et de rédaction de contrat à la charge du locataire.

ARTICLE 5 - DURÉE ET RÉSILIATION
Le présent contrat est conclu pour une durée d'un (1) an renouvelable par tacite reconduction. Il peut être résilié avec un préavis de trois (3) mois.

Fait à ${data.agencyAddress ? data.agencyAddress.split(',')[0] : 'Abidjan'}, le ${data.contractDate.toLocaleDateString('fr-FR')}
En deux (2) exemplaires originaux.
`;
  }

  // Template de contrat de location (Agence - Locataire)
  static generateRentalContract(agencyData: any, tenantData: any, propertyData: any, rentalTerms: any): string {
    const endDate = new Date(rentalTerms.startDate);
    endDate.setMonth(endDate.getMonth() + (rentalTerms.duration || 12));

    const totalDueAtSigning = (rentalTerms.monthlyRent * 2) + (rentalTerms.deposit || (rentalTerms.monthlyRent * 2)) + (rentalTerms.agencyFee || rentalTerms.monthlyRent);

    return `
CONTRAT DE BAIL D'HABITATION

En application du Code Civil ivoirien, de la Loi n°96-669 du 29 août 1996 et des Actes Uniformes OHADA

ENTRE LES SOUSSIGNÉS :

D'UNE PART,
${agencyData.name.toUpperCase()}
Société de gestion immobilière
Registre de Commerce : ${agencyData.commercial_register || 'En cours'}
Siège social : ${agencyData.address}
Téléphone : ${agencyData.phone}
Email : ${agencyData.email}
Agissant en qualité de mandataire du propriétaire
Ci-après dénommée "LE BAILLEUR"

ET D'AUTRE PART,
Monsieur/Madame ${tenantData.first_name.toUpperCase()} ${tenantData.last_name.toUpperCase()}
Profession : ${tenantData.profession || 'Non spécifiée'}
Nationalité : ${tenantData.nationality || 'Ivoirienne'}
Domicilié(e) à : ${tenantData.address || 'Abidjan'}
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
Le présent bail est consenti pour une durée de ${rentalTerms.duration || 12} (${this.numberToWords(rentalTerms.duration || 12)}) mois, 
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

ARTICLE ${rentalTerms.charges ? '6' : '5'} - DÉPÔT DE GARANTIE ET PAIEMENTS
${rentalTerms.isExistingTenant ? `Le PRENEUR déclare et les parties reconnaissent que les sommes suivantes ont déjà été versées antérieurement à la signature des présentes (Reprise de bail) :
- Dépôt de garantie (Caution) : ${(rentalTerms.deposit || (rentalTerms.monthlyRent * 2)).toLocaleString()} FRANCS CFA
- Caution détenue par : ${rentalTerms.depositHeldBy || 'Ancien gestionnaire / Propriétaire'}
- Date de début de facturation par l'Agence : ${rentalTerms.billingStartDate ? new Date(rentalTerms.billingStartDate).toLocaleDateString('fr-FR') : 'À la signature'}
` : `Le PRENEUR verse à la signature des présentes :
- Deux (2) mois de loyer d'avance : ${(rentalTerms.monthlyRent * 2).toLocaleString()} FRANCS CFA
- Dépôt de garantie (Caution) : ${(rentalTerms.deposit || (rentalTerms.monthlyRent * 2)).toLocaleString()} FRANCS CFA  
- Frais d'agence : ${(rentalTerms.agencyFee || rentalTerms.monthlyRent).toLocaleString()} FRANCS CFA

TOTAL À PAYER À LA SIGNATURE : ${totalDueAtSigning.toLocaleString()} (${this.numberToWords(totalDueAtSigning)}) FRANCS CFA
`}

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

Fait à ${agencyData.address?.split(',')[0] || 'Abidjan'}, le ${rentalTerms.startDate.toLocaleDateString('fr-FR')}
En trois (3) exemplaires originaux

LE PRENEUR                               LE BAILLEUR
${tenantData.first_name} ${tenantData.last_name}                    ${agencyData.name}

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
    let tempNum = num;

    while (tempNum > 0) {
      const chunk = tempNum % 1000;
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
            chunkText += '-' + ones[onesDigit];
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
      tempNum = Math.floor(tempNum / 1000);
      thousandIndex++;
    }

    return result.trim();
  }

  // Générer contrat de gestion automatiquement
  static async generateManagementContractForOwner(
    ownerData: any,
    agencyData: any,
    propertyData: any,
    commissionRate: number = 10
  ) {
    return {
      type: 'gestion' as const,
      owner_id: ownerData.id,
      tenant_id: '00000000-0000-0000-0000-000000000000',
      property_id: propertyData.id,
      agency_id: agencyData.id,
      start_date: new Date().toISOString().split('T')[0],
      commission_rate: commissionRate,
      commission_amount: 0,
      status: 'active' as const,
      terms: this.generateManagementContract(agencyData, ownerData, commissionRate),
      documents: [],
    };
  }

  // Générer contrat de location automatiquement
  static generateRentalContractForTenant(
    tenant: Tenant,
    agency: Agency,
    property: Property,
    rentalParams: {
      monthlyRent: number;
      deposit: number;
      agencyFee?: number;
      advance?: number;
      duration: number;
      startDate: Date;
      usage?: 'habitation' | 'professionnel' | 'commercial';
      isExistingTenant?: boolean;
      depositHeldBy?: string;
      billingStartDate?: string;
    }
  ): Partial<Contract> {
    const endDate = new Date(rentalParams.startDate);
    endDate.setMonth(endDate.getMonth() + (rentalParams.duration || 12));

    const agencyFee = rentalParams.agencyFee || rentalParams.monthlyRent;
    
    return {
      agency_id: agency.id,
      property_id: property.id,
      owner_id: property.owner_id,
      tenant_id: tenant.id,
      monthly_rent: rentalParams.monthlyRent,
      deposit: rentalParams.deposit,
      commission_rate: 10,
      commission_amount: rentalParams.monthlyRent * 0.1,
      start_date: rentalParams.startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      type: 'location',
      extra_data: {
        lease_usage: rentalParams.usage || 'habitation'
      },
      terms: (rentalParams.usage === 'commercial' || rentalParams.usage === 'professionnel')
        ? `BAIL PROFESSIONNEL/COMMERCIAL - ${property.title}`
        : this.generateRentalContract(agency, tenant, property, {
          monthlyRent: rentalParams.monthlyRent,
          deposit: rentalParams.deposit,
          agencyFee: agencyFee,
          duration: rentalParams.duration,
          startDate: rentalParams.startDate,
          charges: 0,
          isExistingTenant: rentalParams.isExistingTenant,
          depositHeldBy: rentalParams.depositHeldBy,
          billingStartDate: rentalParams.billingStartDate
      }),
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

  static generateContractNumber(agencyCode: string, type: 'gestion' | 'location'): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 9999) + 1;
    const typeCode = type === 'gestion' ? 'GES' : 'LOC';
    return `${agencyCode}-${typeCode}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  static async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      console.warn('Could not load image, skipping:', url);
      return '';
    }
  }

  static getContractHTML(contractData: any, agencyData: any, clientData: any, _propertyData?: any): string {
    const title = contractData.type === 'gestion' ? 'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE' : 'CONTRAT DE BAIL D\'HABITATION';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${agencyData.name}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { 
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              color: #1a1a1a;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .page {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { 
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .agency-info { text-align: right; font-size: 12px; color: #4b5563; }
            .agency-name { font-size: 20px; font-weight: 800; color: #1e40af; margin-bottom: 2px; }
            .agency-logo { max-height: 60px; max-width: 180px; object-fit: contain; }
            
            .contract-title { 
              text-align: center;
              margin: 30px 0;
              padding: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
            }
            .contract-title h1 { 
              font-size: 16px; 
              color: #1e293b; 
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .content { 
              font-size: 13.5px; 
              text-align: justify;
              white-space: pre-line;
            }
            
            .signature-section { 
              margin-top: 50px; 
              display: grid; 
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              page-break-inside: avoid;
            }
            .signature-box { 
              padding: 15px;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              min-height: 150px;
              position: relative;
            }
            .signature-label { 
              font-size: 11px; 
              font-weight: 700; 
              text-transform: uppercase; 
              color: #64748b;
              margin-bottom: 10px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 5px;
            }
            .signature-name { font-size: 13px; font-weight: 600; color: #0f172a; }
            .signature-space { 
              margin-top: 35px; 
              border-top: 1px dashed #cbd5e1; 
              padding-top: 8px;
              font-style: italic;
              font-size: 10px;
              color: #94a3b8;
            }
            .footer { 
              position: fixed; bottom: 15px; left: 20mm; right: 20mm;
              text-align: center; font-size: 9px; color: #94a3b8;
              border-top: 1px solid #f1f5f9; padding-top: 8px;
            }
            @media print {
              .header { border-bottom-color: #000; }
              .agency-name { color: #000; }
              .content { font-size: 12pt; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="logo-container">
                {LOGO_PLACEHOLDER}
              </div>
              <div class="agency-info">
                <div class="agency-name">${agencyData.name}</div>
                <div>${agencyData.address || ''}</div>
                <div>Tél: ${agencyData.phone || ''}</div>
                <div>Email: ${agencyData.email || ''}</div>
                ${agencyData.commercial_register ? `<div>RC: ${agencyData.commercial_register}</div>` : ''}
              </div>
            </div>
            
            <div class="contract-title">
              <h1>${title}</h1>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Conforme aux Actes Uniformes OHADA</div>
            </div>
            
            <div class="content">
              ${contractData.terms}
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-label">Le ${contractData.type === 'gestion' ? 'Mandant (Propriétaire)' : 'Preneur (Locataire)'}</div>
                <div class="signature-name">${clientData.first_name || clientData.firstName} ${clientData.last_name || clientData.lastName}</div>
                <div class="signature-space">Mention "Lu et approuvé" suivie de la signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-label">Le Mandataire (L'Agence)</div>
                <div class="signature-name">${agencyData.name}</div>
                <div class="signature-space">Signature et Cachet de l'Agence</div>
              </div>
            </div>
            
            <div class="footer">
              Document généré par GESTION360 le ${new Date().toLocaleDateString('fr-FR')} - Conforme à la législation ivoirienne.
            </div>
          </div>
          {WATERMARK_PLACEHOLDER}
        </body>
      </html>
    `;
  }

  static async printContract(contractData: any, agencyData: any, clientData: any, propertyData?: any, targetWindow?: Window | null) {
    const printWindow = targetWindow || window.open('', '_blank');
    if (!printWindow) return;

    let logoBase64 = '';
    if (agencyData.logo_url) {
      logoBase64 = await OHADAContractGenerator.fetchImageAsBase64(agencyData.logo_url);
    }
    
    let html = this.getContractHTML(contractData, agencyData, clientData, propertyData);
    
    const logoHtml = logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="agency-logo">` : `<div class="agency-name">${agencyData.name.toUpperCase()}</div>`;
    const watermarkHtml = logoBase64 ? `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.05; z-index: -1; pointer-events: none; width: 80%; text-align: center;">
        <img src="${logoBase64}" alt="Watermark" style="width: 100%; max-width: 600px; height: auto;">
      </div>` : '';

    html = html.replace('{LOGO_PLACEHOLDER}', logoHtml).replace('{WATERMARK_PLACEHOLDER}', watermarkHtml);

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  }

  static async previewContract(contractData: any, agencyData: any, clientData: any, propertyData?: any) {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) return;

    let logoBase64 = '';
    if (agencyData.logo_url) {
      logoBase64 = await OHADAContractGenerator.fetchImageAsBase64(agencyData.logo_url);
    }
    
    let html = this.getContractHTML(contractData, agencyData, clientData, propertyData);
    
    const logoHtml = logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="agency-logo">` : `<div class="agency-name">${agencyData.name.toUpperCase()}</div>`;
    const watermarkHtml = logoBase64 ? `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.05; z-index: -1; pointer-events: none; width: 80%; text-align: center;">
        <img src="${logoBase64}" alt="Watermark" style="width: 100%; max-width: 600px; height: auto;">
      </div>` : '';

    html = html.replace('{LOGO_PLACEHOLDER}', logoHtml).replace('{WATERMARK_PLACEHOLDER}', watermarkHtml);

    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
  }

  static async downloadContract(contractData: any, agencyData: any, clientData: any, propertyData?: any) {
    let logoBase64 = '';
    if (agencyData.logo_url) {
      logoBase64 = await OHADAContractGenerator.fetchImageAsBase64(agencyData.logo_url);
    }
    
    let html = this.getContractHTML(contractData, agencyData, clientData, propertyData);
    const logoHtml = logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="agency-logo">` : `<div class="agency-name">${agencyData.name.toUpperCase()}</div>`;
    html = html.replace('{LOGO_PLACEHOLDER}', logoHtml).replace('{WATERMARK_PLACEHOLDER}', '');

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contrat_${contractData.type}_${clientData.last_name || clientData.lastName}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Permet de régénérer les termes d'un contrat existant selon le nouveau template OHADA
  static regenerateTerms(contract: any, agency: any, tenant: any, owner: any, property: any): string {
    if (contract.type === 'location' && tenant) {
      return this.generateRentalContract(agency, tenant, property, {
        monthlyRent: contract.monthly_rent,
        deposit: contract.deposit,
        duration: contract.duration || 12,
        startDate: new Date(contract.start_date),
        charges: contract.charges || 0,
        isExistingTenant: contract.extra_data?.is_existing_tenant,
        depositHeldBy: contract.extra_data?.deposit_held_by,
        billingStartDate: contract.extra_data?.billing_start_date
      });
    } else if (contract.type === 'gestion' && owner) {
      return this.generateManagementContract(agency, owner, contract.commission_rate || 10);
    }
    return contract.terms || '';
  }
}