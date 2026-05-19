import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { Owner } from '../types/db';
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from './agencyBranding';

// Helper to convert number to words in French (simplified and robust for typical real estate amounts)
function numberToFrenchWords(num: number): string {
  if (num === 0) return 'zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  function convertChunk(n: number): string {
    let chunkStr = '';
    
    // Hundreds
    if (n >= 100) {
      const h = Math.floor(n / 100);
      if (h > 1) {
        chunkStr += units[h] + ' cent ';
      } else {
        chunkStr += 'cent ';
      }
      n %= 100;
    }

    // Tens and units
    if (n >= 10 && n <= 19) {
      chunkStr += teens[n - 10];
    } else if (n >= 20) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (t === 7 && u > 0) {
        chunkStr += 'soixante et ' + teens[u];
      } else if (t === 9 && u > 0) {
        chunkStr += 'quatre-vingt-' + teens[u];
      } else {
        chunkStr += tens[t];
        if (u > 0) {
          chunkStr += (u === 1 ? ' et ' : '-') + units[u];
        }
      }
    } else if (n > 0) {
      chunkStr += units[n];
    }

    return chunkStr.trim();
  }

  let result = '';
  
  // Billions
  if (num >= 1000000000) {
    const bil = Math.floor(num / 1000000000);
    result += convertChunk(bil) + ' milliard' + (bil > 1 ? 's' : '') + ' ';
    num %= 1000000000;
  }

  // Millions
  if (num >= 1000000) {
    const mil = Math.floor(num / 1000000);
    result += convertChunk(mil) + ' million' + (mil > 1 ? 's' : '') + ' ';
    num %= 1000000;
  }

  // Thousands
  if (num >= 1000) {
    const th = Math.floor(num / 1000);
    if (th > 1) {
      result += convertChunk(th) + ' mille ';
    } else {
      result += 'mille ';
    }
    num %= 1000;
  }

  // Remainder
  if (num > 0) {
    result += convertChunk(num);
  }

  return result.trim();
}

interface PayoutOrderParams {
  owner: Owner;
  agencyId: string;
  amount: number;
  reference?: string;
  agencyBankName?: string;
  agencyAccountNumber?: string;
  authorizedSignee?: string;
  withSignature?: boolean;
}

export async function generatePayoutOrderPDF({
  owner,
  agencyId,
  amount,
  reference = '',
  agencyBankName = '',
  agencyAccountNumber = '',
  authorizedSignee = 'La Direction',
  withSignature = false
}: PayoutOrderParams) {
  try {
    const branding = await getAgencyBranding(agencyId);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // 1. Header with branding
    let y = renderPDFHeader(doc, branding, 15);

    // 2. Document Title
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont('helvetica', 'bold');
    doc.text("ORDRE DE VIREMENT BANCAIRE", pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Reference & Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    const refStr = `Réf : ORD-VIR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    doc.text(refStr, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // 3. Recipient Bank Address Block
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(`Fait à Abidjan, le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, y, { align: 'right' });
    y += 8;

    const bankDest = agencyBankName ? `À l'attention de Monsieur le Directeur\nde la banque ${agencyBankName}` : "À l'attention de Monsieur le Directeur de la Banque";
    doc.setFont('helvetica', 'bold');
    doc.text(bankDest, 20, y);
    y += 18;

    // 4. Request intro text
    doc.setFont('helvetica', 'normal');
    doc.text(
      "Monsieur le Directeur,",
      20, y
    );
    y += 6;
    
    // Paragraph text with exact styling
    doc.setFontSize(10);
    const introParagraph = `Par la présente, nous vous prions d'effectuer par le débit de notre compte ci-dessous désigné, un virement bancaire d'un montant net de ${amount.toLocaleString('fr-FR')} FCFA au profit du bénéficiaire désigné dans le tableau ci-après :`;
    const splitParagraph = doc.splitTextToSize(introParagraph, pageWidth - 40);
    doc.text(splitParagraph, 20, y);
    y += splitParagraph.length * 5 + 6;

    // 5. Beautiful structured layout table
    const drawTableHeader = (title: string) => {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(20, y, pageWidth - 40, 7, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(20, y, pageWidth - 40, 7, 'D');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(title, 24, y + 5);
      y += 7;
    };

    const drawTableRow = (label: string, value: string, fontStyle = 'normal') => {
      doc.setDrawColor(226, 232, 240);
      doc.line(20, y, pageWidth - 20, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(label, 24, y + 5.5);
      
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(value, 85, y + 5.5);
      
      // vertical separator line
      doc.line(80, y, 80, y + 8);
      
      y += 8;
    };

    // Table 1: Debited Account (Agency)
    drawTableHeader("1. COMPTE À DÉBITER (ÉMETTEUR)");
    drawTableRow("Nom de l'émetteur :", branding.name);
    drawTableRow("Banque émettrice :", agencyBankName || "Non spécifié");
    drawTableRow("N° de compte à débiter :", agencyAccountNumber || "Non spécifié", 'bold');
    
    // Bottom border of table 1
    doc.setDrawColor(203, 213, 225);
    doc.line(20, y, pageWidth - 20, y);
    y += 6;

    // Table 2: Credited Account (Beneficiary Owner)
    drawTableHeader("2. COMPTE À CRÉDITER (BÉNÉFICIAIRE)");
    drawTableRow("Nom du bénéficiaire :", `${owner.first_name} ${owner.last_name}`);
    drawTableRow("Titulaire du compte :", owner.bank_account_holder || `${owner.first_name} ${owner.last_name}`);
    drawTableRow("Banque bénéficiaire :", owner.bank_name || "Non spécifié");
    drawTableRow("Numéro de compte :", owner.bank_account_number || "Non spécifié", 'bold');
    if (owner.bank_iban) {
      drawTableRow("IBAN :", owner.bank_iban);
    }
    if (owner.bank_swift) {
      drawTableRow("Code SWIFT / BIC :", owner.bank_swift);
    }

    // Bottom border of table 2
    doc.line(20, y, pageWidth - 20, y);
    y += 6;

    // Table 3: Transaction Details
    drawTableHeader("3. DÉTAILS DE L'OPÉRATION");
    drawTableRow("Montant en chiffres :", `${amount.toLocaleString('fr-FR')} FCFA`, 'bold');
    
    // Multi line amount in words
    const amountWords = numberToFrenchWords(amount).toUpperCase() + " FRANCS CFA";
    doc.setDrawColor(226, 232, 240);
    doc.line(20, y, pageWidth - 20, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Montant en lettres :", 24, y + 5.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(15, 23, 42);
    const splitWords = doc.splitTextToSize(amountWords, pageWidth - 90);
    doc.text(splitWords, 85, y + 5.5);
    doc.line(80, y, 80, y + 6 + splitWords.length * 4);
    y += 6 + splitWords.length * 4;

    if (reference) {
      drawTableRow("Référence / Motif :", reference);
    } else {
      drawTableRow("Référence / Motif :", `Reversement propriétaire ${owner.first_name} ${owner.last_name}`);
    }

    // Bottom border of table 3
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // 6. Request closing text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text("Nous vous remercions d'avance pour la diligence que vous apporterez à l'exécution de cet ordre.", 20, y);
    y += 14;

    // 7. Signature Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, 'F');
    doc.rect(20, y, pageWidth - 40, 35, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("POUR L'AGENCE GESTIONNAIRE :", 25, y + 6);
    doc.text(authorizedSignee, 25, y + 12);

    // If electronic signature is requested, render a beautiful seal or cursive signature
    if (withSignature) {
      // Beautiful background stamp circle
      doc.setDrawColor(59, 130, 246);
      doc.setFillColor(239, 246, 255);
      doc.circle(pageWidth - 55, y + 17, 10, 'FD');
      
      doc.setFont('courier', 'bolditalic');
      doc.setFontSize(12);
      doc.setTextColor(29, 78, 216); // blue-700
      doc.text("APPROUVÉ", pageWidth - 70, y + 16);
      
      // Dynamic signature script text
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Signature électronique sécurisée", pageWidth - 75, y + 22);
      doc.text(`ID: VIR-${Math.floor(Date.now() / 10000)}`, pageWidth - 75, y + 25);

      // Cursive handwriting style representation
      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.setTextColor(29, 78, 216);
      doc.text(authorizedSignee, pageWidth - 67, y + 11);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text("(Signature physique et cachet requis)", pageWidth - 80, y + 18);
    }

    renderPDFFooter(doc, branding);
    doc.save(`ordre-virement-${owner.last_name.toUpperCase()}.pdf`);
    toast.success("Ordre de virement PDF téléchargé !");
  } catch (err: any) {
    console.error(err);
    toast.error("Erreur PDF : " + err.message);
  }
}
