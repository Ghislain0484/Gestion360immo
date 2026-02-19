import React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '../ui/Button';
import { Inventory, Agency, Property, Tenant } from '../../types/db';

interface InventoryDocumentProps {
    inventory: Inventory;
    agency?: Agency;
    property?: Property;
    tenant?: Tenant;
}

export const InventoryDocument: React.FC<InventoryDocumentProps> = ({
    inventory,
    agency,
    property,
    tenant
}) => {

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Construct the HTML for the print window
        // We duplicate the component structure into a string since we can't easily transfer React state/styles to a new window without a bundler setup for it.
        // This is a robust way to ensure exactly what we want is printed.

        const roomsToDisplay = inventory.rooms && inventory.rooms.length > 0 ? inventory.rooms : [
            { name: 'Entrée / Couloir', elements: [{ name: 'Porte', condition: 'neuf' }, { name: 'Murs', condition: 'neuf' }, { name: 'Sol', condition: 'neuf' }, { name: 'Plafond', condition: 'neuf' }, { name: 'Eclairage', condition: 'neuf' }] },
            { name: 'Séjour / Salon', elements: [{ name: 'Murs', condition: 'neuf' }, { name: 'Sol', condition: 'neuf' }, { name: 'Plafond', condition: 'neuf' }, { name: 'Fenêtres', condition: 'neuf' }, { name: 'Prises/Interrupteurs', condition: 'neuf' }] },
            { name: 'Cuisine', elements: [{ name: 'Evier/Robinetterie', condition: 'neuf' }, { name: 'Murs', condition: 'neuf' }, { name: 'Sol', condition: 'neuf' }, { name: 'Placards', condition: 'neuf' }] },
            { name: 'Chambre 1', elements: [{ name: 'Murs', condition: 'neuf' }, { name: 'Sol', condition: 'neuf' }, { name: 'Fenêtres', condition: 'neuf' }, { name: 'Porte', condition: 'neuf' }] },
            { name: 'Salle d\'eau / WC', elements: [{ name: 'Lavabo', condition: 'neuf' }, { name: 'Douche/Baignoire', condition: 'neuf' }, { name: 'WC', condition: 'neuf' }, { name: 'Carrelage', condition: 'neuf' }] },
        ];

        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etat des Lieux - ${property?.title || 'Bien'}</title>
          <style>
             body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; padding: 20px; }
             h1 { font-size: 18px; font-weight: bold; text-transform: uppercase; text-align: center; margin-bottom: 5px; }
             .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: center; }
             .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
             .box { border: 1px solid #ccc; padding: 10px; background: #f9f9f9; }
             .box h3 { border-bottom: 1px solid #ddd; margin-top: 0; padding-bottom: 5px; font-size: 14px; }
             table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
             th, td { border: 1px solid #999; padding: 4px; }
             th { background: #eee; text-align: left; }
             .text-center { text-align: center; }
             .checkbox { width: 12px; height: 12px; border: 1px solid #000; display: inline-block; }
             .room-title { background: #ddd; font-weight: bold; padding: 5px; border: 1px solid #999; border-bottom: none; margin-top: 10px; text-transform: uppercase; }
             .signature-section { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
             .signature-box { width: 45%; border-top: 1px solid #000; padding-top: 10px; }
             @media print { 
               body { padding: 0; }
               .no-print { display: none; } 
             }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ÉTAT DES LIEUX ${inventory.type === 'entry' ? "D'ENTRÉE" : "DE SORTIE"}</h1>
            <div>Date : ${new Date(inventory.date).toLocaleDateString('fr-FR')}</div>
          </div>

          <div class="grid">
            <div class="box">
              <h3>BAILLEUR / AGENCE</h3>
              <strong>${agency?.name || 'Nom Agence'}</strong><br>
              ${agency?.address || ''}<br>
              ${agency?.phone || ''}
            </div>
            <div class="box">
              <h3>LOCATAIRE</h3>
              <strong>${tenant ? `${tenant.first_name} ${tenant.last_name}` : '______________________'}</strong><br>
              ${tenant?.phone || 'Tél: ________________'}
            </div>
          </div>

          <div class="box" style="margin-bottom: 20px;">
            <h3>LE LOGEMENT</h3>
            <strong>${property?.location?.commune || ''}, ${property?.location?.quartier || ''}</strong><br>
            ${property?.details?.type || ''} - ${property?.description || ''}<br>
            <div style="display: flex; gap: 20px; margin-top: 5px;">
                <span>Elec: ${inventory.meter_readings?.electricity?.index || '.......'} kWh</span>
                <span>Eau: ${inventory.meter_readings?.water?.index || '.......'} m3</span>
                <span>Clés: ${inventory.keys_count || '.......'}</span>
            </div>
          </div>

          ${roomsToDisplay.map(room => `
            <div>
              <div class="room-title">${room.name}</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 30%;">Élément</th>
                    <th class="text-center" style="width: 30px;">N</th>
                    <th class="text-center" style="width: 30px;">B</th>
                    <th class="text-center" style="width: 30px;">U</th>
                    <th class="text-center" style="width: 30px;">M</th>
                    <th>Observations</th>
                  </tr>
                </thead>
                <tbody>
                  ${room.elements.map(el => `
                    <tr>
                      <td>${el.name}</td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td></td>
                    </tr>
                  `).join('')}
                   <tr>
                      <td style="font-style: italic; color: #666;">Autre / Divers...</td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td class="text-center"><div class="checkbox"></div></td>
                      <td></td>
                    </tr>
                </tbody>
              </table>
            </div>
          `).join('')}

          <div style="font-size: 10px; font-style: italic; margin-top: 10px;">
            Légende : N = Neuf, B = Bon état, U = État d'usage, M = Mauvais état
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <strong>Le Locataire</strong><br>
              <span style="font-size: 10px;">(Lu et approuvé, bon pour accord)</span>
              <br><br><br><br>
            </div>
            <div class="signature-box">
              <strong>L'Agence</strong><br>
              <span style="font-size: 10px;">(Pour le propriétaire)</span>
              <br><br><br><br>
            </div>
          </div>
        </body>
      </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        // Wait for images logic? No images currently.
        printWindow.print();
    };

    return (
        <div className="bg-white p-8 rounded shadow-sm text-center">
            <Printer className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">État des Lieux Prêt</h3>
            <p className="text-gray-500 mb-6">
                Vous pouvez imprimer le formulaire d'état des lieux pour signature manuscrite.
            </p>
            <Button onClick={handlePrint} className="w-full sm:w-auto">
                <Printer className="w-4 h-4 mr-2" />
                Imprimer le Document
            </Button>
        </div>
    );
};
