import { ModularTransaction, ModularClient, ModularBooking } from '../../types/modular';
import { getCalendarDate } from './dateUtils';

export const ReceiptPrinter = {
    printTransactionReceipt(tx: ModularTransaction, client?: ModularClient, booking?: ModularBooking, agencyName?: string, siteName?: string, unitName?: string) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const formatPrice = (amount: number) => {
            return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
        };

        const calculateNights = () => {
            if (!booking) return null;
            const start = getCalendarDate(booking.check_in);
            const end = getCalendarDate(booking.check_out);
            const diffTime = end.getTime() - start.getTime();
            return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        };

        const nights = calculateNights();

        const html = `
            <html>
                <head>
                    <title>Reçu de Paiement - ${tx.id.slice(0, 8)}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        body { 
                            font-family: 'Inter', sans-serif; 
                            padding: 40px; 
                            color: #1e293b;
                            line-height: 1.5;
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        .header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: start;
                            border-bottom: 4px solid #000; 
                            padding-bottom: 30px; 
                            margin-bottom: 40px; 
                        }
                        .agency-info h1 { font-weight: 900; font-size: 32px; margin: 0; letter-spacing: -1px; text-transform: uppercase; font-style: italic; }
                        .agency-info p { font-size: 10px; font-weight: 700; color: #64748b; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px; }
                        
                        .receipt-meta { text-align: right; }
                        .receipt-meta h2 { font-weight: 900; font-size: 20px; margin: 0; text-transform: uppercase; }
                        .receipt-meta p { font-size: 12px; font-weight: 600; color: #64748b; margin: 5px 0 0 0; }

                        .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px; }
                        
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                        
                        .info-box { background: #f8fafc; padding: 20px; rounded: 15px; border: 1px solid #e2e8f0; border-radius: 12px; }
                        .info-item { margin-bottom: 15px; }
                        .info-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
                        .info-value { font-size: 14px; font-weight: 700; color: #0f172a; }

                        .table { w-full; margin-bottom: 40px; border-collapse: collapse; width: 100%; }
                        .table th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
                        .table td { padding: 20px 0; border-bottom: 1px solid #f1f5f9; }
                        
                        .description { font-size: 14px; font-weight: 700; color: #0f172a; }
                        .category { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; }
                        
                        .total-section { margin-top: 40px; display: flex; flex-direction: column; align-items: end; gap: 10px; }
                        .total-row { display: flex; justify-content: space-between; width: 300px; padding: 10px 0; }
                        .total-label { font-size: 12px; font-weight: 700; color: #64748b; }
                        .total-value { font-size: 14px; font-weight: 800; }
                        
                        .grand-total { 
                            background: #0f172a; 
                            color: #fff; 
                            padding: 20px; 
                            border-radius: 12px;
                            width: 300px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-top: 10px;
                        }
                        .grand-total-label { font-size: 14px; font-weight: 900; text-transform: uppercase; }
                        .grand-total-value { font-size: 20px; font-weight: 900; color: #fbbf24; }

                        .footer { margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 30px; }
                        .footer p { font-size: 12px; font-weight: 700; italic; color: #94a3b8; }
                        .signature { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 40px; }
                        .sig-box { text-align: center; width: 200px; border-top: 1px solid #000; padding-top: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; }

                        @media print { 
                            .no-print { display: none; }
                            body { padding: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="agency-info">
                            <h1>${agencyName || 'GESTION 360'}</h1>
                            <p>${siteName ? `Site: ${siteName}` : 'Expertise Côte d\'Ivoire'}</p>
                            ${unitName ? `<p style="font-size: 14px; color: #0f172a; font-weight: 900; margin-top: 5px;">UNITÉ : ${unitName}</p>` : ''}
                        </div>
                        <div class="receipt-meta">
                            <h2>RECU DE PAIEMENT</h2>
                            <p>N° ${tx.id.slice(0, 8).toUpperCase()}</p>
                            <p>Date: ${new Date(tx.transaction_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>

                    <div class="grid">
                        <div class="info-box">
                            <div class="section-title">Informations Client</div>
                            <div class="info-item">
                                <div class="info-label">Client</div>
                                <div class="info-value">${client ? client.first_name + ' ' + client.last_name : 'Client Divers'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Contact</div>
                                <div class="info-value">${client?.phone || 'N/A'}</div>
                            </div>
                            ${booking ? `
                            <div class="info-item" style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
                                <div class="info-label">Période du Séjour</div>
                                <div class="info-value">DU ${new Date(booking.check_in).toLocaleDateString('fr-FR')} AU ${new Date(booking.check_out).toLocaleDateString('fr-FR')}</div>
                                <div class="info-label" style="margin-top: 5px;">Durée</div>
                                <div class="info-value">${nights} Nuitée(s)</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="info-box">
                            <div class="section-title">Détails de Réglement</div>
                            <div class="info-item">
                                <div class="info-label">Description</div>
                                <div class="info-value">${tx.description || 'Paiement de séjour'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Mode de Paiement</div>
                                <div class="info-value" style="text-transform: uppercase;">${tx.payment_method}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Statut</div>
                                <div class="info-value" style="color: #10b981;">ENCAISSÉ</div>
                            </div>
                        </div>
                    </div>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>Désignation / Détails</th>
                                <th style="text-align: center;">Quantité / Durée</th>
                                <th style="text-align: right;">Prix Unitaire</th>
                                <th style="text-align: right;">Montant Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div class="description">${siteName || 'Séjour'} - ${tx.description || 'Période de séjour'}</div>
                                    <div class="category">${tx.category} ${tx.module_type ? '• ' + tx.module_type : ''}</div>
                                </td>
                                <td style="text-align: center;" class="info-value">
                                    ${nights ? `${nights} Nuitée(s)` : '1'}
                                </td>
                                <td style="text-align: right;" class="info-value">
                                    ${nights ? formatPrice(tx.amount / nights) : formatPrice(tx.amount)}
                                </td>
                                <td style="text-align: right;" class="info-value">
                                    ${formatPrice(tx.amount)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="total-section">
                        <div class="total-row">
                            <span class="total-label">Détail du calcul</span>
                            <span class="total-value">${nights ? `${formatPrice(tx.amount / nights)}/nuit x ${nights} nuits` : `Total forfaitaire`}</span>
                        </div>
                        <div class="total-row" style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
                            <span class="total-label">NET À PAYER</span>
                            <span class="total-value">${formatPrice(tx.amount)}</span>
                        </div>
                        <div class="grand-total">
                            <span class="grand-total-label">TOTAL REÇU</span>
                            <span class="grand-total-value">${formatPrice(tx.amount)}</span>
                        </div>
                    </div>

                    <div class="signature">
                        <div class="sig-box">Le Client (Bon pour accord)</div>
                        <div class="sig-box">La Caisse (Cachet & Signature)</div>
                    </div>

                    <div class="footer">
                        <p>"Merci de nous avoir choisi pour votre séjour. À bientôt !"</p>
                    </div>

                    <center class="no-print" style="margin-top: 50px;">
                        <button onclick="window.print()" style="padding: 15px 40px; background: #0f172a; color: #fff; border: none; cursor: pointer; border-radius: 50px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Imprimer le Reçu</button>
                    </center>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    }
};
