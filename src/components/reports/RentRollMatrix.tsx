import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Check, X, Calendar, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { formatAmount } from '../../utils/format';

interface MatrixData {
  owner_id: string;
  owner_name: string;
  contracts: {
    contract_id: string;
    tenant_name: string;
    property_title: string;
    monthly_rent: number;
    start_date: string;
    end_date?: string;
    receipts: Record<number, boolean>; // key: month (1-12), value: true if paid
  }[];
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export const RentRollMatrix: React.FC = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState<MatrixData[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');

  useEffect(() => {
    fetchMatrixData();
  }, [user?.agency_id, selectedYear]);

  const fetchMatrixData = async () => {
    if (!user?.agency_id) return;
    setLoading(true);
    try {
      // 1. Fetch contracts with deep joins using standard aliases
      // We use the same join pattern as in contractsService.ts for consistency
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id, 
          monthly_rent, 
          start_date,
          end_date,
          status,
          property:properties(id, title, owner:owners(id, first_name, last_name)),
          tenant:tenants(id, first_name, last_name)
        `)
        .eq('agency_id', user.agency_id);
        // Temporarily removed status filter to see all data

      if (contractsError) throw contractsError;

      if (!contractsData || contractsData.length === 0) {
        console.log('No contracts found for agency:', user.agency_id);
        setMatrixData([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all rent receipts for this agency for the selected year
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('rent_receipts')
        .select('contract_id, period_month')
        .eq('agency_id', user.agency_id)
        .eq('period_year', selectedYear);

      if (receiptsError) {
        // Fallback for older schema if agency_id is missing on receipts
        const { data: fallbackData } = await supabase
          .from('rent_receipts')
          .select('contract_id, period_month, contracts!inner(agency_id)')
          .eq('contracts.agency_id', user.agency_id)
          .eq('period_year', selectedYear);
        
        setMatrixDataFromResults(contractsData, fallbackData || []);
      } else {
        setMatrixDataFromResults(contractsData, receiptsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching Rent Roll:', err);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const setMatrixDataFromResults = (contracts: any[], receipts: any[]) => {
    const receiptMap: Record<string, Set<number>> = {};
    receipts?.forEach(r => {
      if (!receiptMap[r.contract_id]) {
        receiptMap[r.contract_id] = new Set();
      }
      receiptMap[r.contract_id].add(r.period_month);
    });

    const ownerMap = new Map<string, MatrixData>();

    contracts.forEach(c => {
      // Robust extraction based on aliases
      const prop = c.property;
      const ten = c.tenant;
      
      if (!prop || !ten) return;

      const own = prop.owner || c.owner; // Some schemas have owner on contract directly
      const ownerId = own?.id || 'unknown-owner';
      const ownerName = own ? `${own.first_name || ''} ${own.last_name || ''}`.trim() : 'Propriétaire inconnu';

      if (!ownerMap.has(ownerId)) {
        ownerMap.set(ownerId, {
          owner_id: ownerId,
          owner_name: ownerName,
          contracts: []
        });
      }

      const ownerGroup = ownerMap.get(ownerId)!;
      
      const receiptsObj: Record<number, boolean> = {};
      for (let i = 1; i <= 12; i++) {
        receiptsObj[i] = receiptMap[c.id]?.has(i) || false;
      }

      ownerGroup.contracts.push({
        contract_id: c.id,
        tenant_name: `${ten.first_name || ''} ${ten.last_name || ''}`.trim() || 'Locataire inconnu',
        property_title: prop.title || 'Bien inconnu',
        monthly_rent: c.monthly_rent || 0,
        start_date: c.start_date,
        end_date: c.end_date,
        receipts: receiptsObj
      });
    });

    setMatrixData(Array.from(ownerMap.values()));
  };

  const filteredMatrixData = selectedOwnerId === 'all' 
    ? matrixData 
    : matrixData.filter(o => o.owner_id === selectedOwnerId);

  const ownersList = matrixData.map(o => ({ id: o.owner_id, name: o.owner_name }));

  const handleExportPDF = () => {
    try {
      const dataToExport = filteredMatrixData;
      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.text(`Tableau Matriciel des Loyers - ${selectedYear}`, 14, 20);
      
      doc.setFontSize(10);
      let y = 30;
      
      dataToExport.forEach(owner => {
        if (y > 180) { doc.addPage(); y = 20; }
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Proprietaire: ${owner.owner_name}`, 14, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        let x = 14;
        doc.text('Locataire / Bien', x, y);
        x += 60;
        doc.text('Loyer', x, y);
        x += 20;
        
        MONTHS.forEach(m => {
          doc.text(m, x, y);
          x += 15;
        });
        
        y += 6;
        
        owner.contracts.forEach(contract => {
          if (y > 190) { doc.addPage(); y = 20; }
          
          let x = 14;
          const label = `${contract.tenant_name} (${contract.property_title})`;
          doc.text(label.substring(0, 40), x, y);
          x += 60;
          doc.text(`${formatAmount(contract.monthly_rent)}F`, x, y);
          x += 20;
          
          for (let i = 1; i <= 12; i++) {
            const cellDate = new Date(selectedYear, i - 1, 1);
            const isPaid = contract.receipts[i];
            
            if (isPaid) {
               doc.setTextColor(0, 150, 0);
               doc.text('PAYE', x, y);
            } else {
               const contractStart = new Date(contract.start_date);
               const contractEnd = contract.end_date ? new Date(contract.end_date) : null;
               
               const isBeforeContract = cellDate < new Date(contractStart.getFullYear(), contractStart.getMonth(), 1);
               const isAfterContract = contractEnd && cellDate > new Date(contractEnd.getFullYear(), contractEnd.getMonth(), 1);
               
               if (isBeforeContract || isAfterContract) {
                 doc.setTextColor(150, 150, 150);
                 doc.text('-', x, y);
               } else {
                 doc.setTextColor(200, 0, 0);
                 doc.text('IMPAYE', x, y);
               }
            }
            doc.setTextColor(0, 0, 0);
            x += 15;
          }
          y += 6;
        });
        
        y += 5;
      });
      
      doc.save(`Matrice_Loyers_${selectedYear}.pdf`);
      toast.success('Tableau exporte avec succes !');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  if (loading) {
    return (
      <Card className="p-12 flex justify-center items-center">
        <LoadingSpinner size="lg" color="indigo" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Matrice des Encaissements
          </h2>
          <p className="text-sm text-gray-500 mt-1">Vision radar instantanée de la santé de votre parc immobilier</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Filtrer par Propriétaire</span>
            <select 
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
            >
              <option value="all">Tous les propriétaires</option>
              {ownersList.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Année</span>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>
              })}
            </select>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-transparent ml-1 mb-1">Actions</span>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg transition-colors border border-indigo-100"
            >
              <Download className="w-4 h-4" />
              Exporter PDF
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4 w-1/4 min-w-[250px] sticky left-0 bg-slate-900 z-10">Locataire / Bien</th>
              <th className="px-4 py-4 w-32">Loyer</th>
              {MONTHS.map((month) => (
                <th key={month} className="px-2 py-4 text-center min-w-[60px]">{month}</th>
              ))}
              <th className="px-4 py-4 text-right bg-slate-900 sticky right-0 z-10">Total Encaissé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMatrixData.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                  Aucun contrat actif trouvé pour cette sélection.
                </td>
              </tr>
            ) : (
              <>
                {filteredMatrixData.map((ownerGroup) => (
                  <React.Fragment key={ownerGroup.owner_id}>
                    {/* Owner Header Row */}
                    <tr className="bg-slate-100 border-t-4 border-slate-300">
                      <td colSpan={15} className="px-6 py-3 font-bold text-slate-800 sticky left-0 bg-slate-100">
                        Propriétaire : {ownerGroup.owner_name}
                      </td>
                    </tr>
                    
                    {/* Contracts Rows */}
                    {ownerGroup.contracts.map((contract) => {
                      const contractStart = new Date(contract.start_date);
                      let rowTotal = 0;
                      
                      return (
                        <tr key={contract.contract_id} className="hover:bg-blue-50/50 transition-colors bg-white">
                          <td className="px-6 py-3 sticky left-0 bg-white border-r border-gray-100">
                            <p className="font-semibold text-gray-900 truncate max-w-[200px]" title={contract.tenant_name}>
                              {contract.tenant_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5" title={contract.property_title}>
                              {contract.property_title}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">
                            {formatAmount(contract.monthly_rent)}
                          </td>
                          
                          {/* Month Cells */}
                          {[...Array(12)].map((_, i) => {
                            const monthNum = i + 1;
                            const isPaid = contract.receipts[monthNum];
                            if (isPaid) rowTotal += contract.monthly_rent;
                            
                            const contractEnd = contract.end_date ? new Date(contract.end_date) : null;
                            const isBeforeContract = cellDate < new Date(contractStart.getFullYear(), contractStart.getMonth(), 1);
                            const isAfterContract = contractEnd && cellDate > new Date(contractEnd.getFullYear(), contractEnd.getMonth(), 1);
                            
                            if (isBeforeContract || isAfterContract) {
                              return (
                                <td key={monthNum} className="px-2 py-3 text-center border-l border-gray-50">
                                  <div className="w-6 h-6 mx-auto rounded-full bg-gray-100 flex items-center justify-center" title="Contrat non démarré">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                  </div>
                                </td>
                              );
                            }
                            
                            if (isPaid) {
                              return (
                                <td key={monthNum} className="px-2 py-3 text-center border-l border-gray-50">
                                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm" title="Payé">
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  </div>
                                </td>
                              );
                            }
                            
                            return (
                              <td key={monthNum} className="px-2 py-3 text-center border-l border-gray-50">
                                <div className="w-7 h-7 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm" title="Impayé">
                                  <X className="w-4 h-4 stroke-[3]" />
                                </div>
                              </td>
                            );
                          })}
                          
                          {/* Row Total */}
                          <td className="px-4 py-3 text-right font-black text-indigo-700 bg-indigo-50/30 sticky right-0 border-l-2 border-indigo-100">
                            {formatAmount(rowTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* Footer Totals Row */}
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-white">
                  <td className="px-6 py-4 sticky left-0 bg-slate-900 z-10">TOTAL GÉNÉRAL</td>
                  <td className="px-4 py-4 bg-slate-800">
                    {formatAmount(filteredMatrixData.reduce((sum, owner) => 
                      sum + owner.contracts.reduce((cSum, c) => cSum + c.monthly_rent, 0), 0
                    ))}
                  </td>
                  {[...Array(12)].map((_, i) => {
                    const monthNum = i + 1;
                    const monthTotal = filteredMatrixData.reduce((sum, owner) => 
                      sum + owner.contracts.reduce((cSum, c) => 
                        cSum + (c.receipts[monthNum] ? c.monthly_rent : 0), 0
                      ), 0
                    );
                    return (
                      <td key={monthNum} className="px-2 py-4 text-center bg-slate-800">
                        <span className={monthTotal > 0 ? "text-emerald-400" : "text-slate-400"}>
                          {formatAmount(monthTotal)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-right bg-slate-900 sticky right-0 z-10 text-emerald-400 text-base">
                    {formatAmount(filteredMatrixData.reduce((sum, owner) => 
                      sum + owner.contracts.reduce((cSum, c) => {
                        // Sum up only PAID months
                        const paidMonthsCount = Object.values(c.receipts).filter(Boolean).length;
                        return cSum + paidMonthsCount * c.monthly_rent;
                      }, 0), 0
                    ))}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
