import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Exports data to an Excel (.xlsx) file
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  try {
    // Create worksheet from JSON
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Create workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and save
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(dataBlob, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw new Error('Erreur lors de l’export Excel');
  }
};

/**
 * Formats owners data for export
 */
export const formatOwnersForExport = (owners: any[]) => {
  return owners.map(o => ({
    'ID Client': o.business_id || o.id,
    'Prénom': o.first_name,
    'Nom': o.last_name,
    'Email': o.email,
    'Téléphone': o.phone,
    'Adresse': o.address,
    'Créé le': new Date(o.created_at).toLocaleDateString('fr-FR')
  }));
};

/**
 * Formats tenants data for export
 */
export const formatTenantsForExport = (tenants: any[]) => {
  return tenants.map(t => ({
    'ID Locataire': t.business_id || t.id,
    'Prénom': t.first_name,
    'Nom': t.last_name,
    'Email': t.email,
    'Téléphone': t.phone,
    'Statut': t.status === 'active' ? 'Actif' : 'Ancien',
    'Bien Occupé': t.propertyTitle || 'N/A',
    'Créé le': t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : 'N/A'
  }));
};
