import React, { useState, useEffect } from "react";
import { dbService } from "../../lib/supabase";
import { Contract, Tenant, Owner, Property, RentReceipt } from "../../types/db";
import { PayMethod } from "../../types/enums";
import toast from "react-hot-toast";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { jsPDF } from "jspdf";

export interface ReceiptGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  contractId?: string;
  tenantId: string;
  propertyId?: string;
  ownerId?: string;
  onReceiptGenerated?: (receipt: RentReceipt) => Promise<void>;
  preFilledData?: Partial<RentReceipt>;
}

const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  isOpen,
  onClose,
  contractId,
  tenantId,
  propertyId,
  ownerId,
  onReceiptGenerated,
  preFilledData,
}) => {
  // Infos récupérées
  const [contractInfo, setContractInfo] = useState<Contract | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<Property | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<Owner | null>(null);

  // Form state
  const [rentAmount, setRentAmount] = useState<number>(preFilledData?.rent_amount || 0);
  const [charges, setCharges] = useState<number>(preFilledData?.charges || 0);
  const [paymentDate, setPaymentDate] = useState<string>(preFilledData?.payment_date || "");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>(
    preFilledData?.payment_method || "especes"
  );
  const [notes, setNotes] = useState<string>(preFilledData?.notes || "");

  const [receipt, setReceipt] = useState<RentReceipt | null>(null);

  // Charger les données liées
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          if (contractId) setContractInfo(await dbService.contracts.findOne(contractId));
          if (tenantId) setTenantInfo(await dbService.tenants.findOne(tenantId));
          if (propertyId) setPropertyInfo(await dbService.properties.findOne(propertyId));
          if (ownerId) setOwnerInfo(await dbService.owners.findOne(ownerId));
        } catch (error: any) {
          toast.error("Erreur récupération des informations: " + error.message);
        }
      };
      fetchData();
    } else {
      setContractInfo(null);
      setTenantInfo(null);
      setPropertyInfo(null);
      setOwnerInfo(null);
      setReceipt(null);
      setRentAmount(preFilledData?.rent_amount || 0);
      setCharges(preFilledData?.charges || 0);
      setPaymentDate(preFilledData?.payment_date || "");
      setPaymentMethod(preFilledData?.payment_method || "especes");
      setNotes(preFilledData?.notes || "");
    }
  }, [isOpen, contractId, tenantId, propertyId, ownerId, preFilledData]);

  // Génération quittance
  const generateReceipt = async () => {
    if (!contractId || !tenantId || !propertyId || !ownerId || !paymentDate) {
      toast.error("Informations incomplètes pour générer la quittance");
      return;
    }

    const month = new Date(paymentDate).toLocaleString("fr-FR", { month: "long" });
    const year = new Date(paymentDate).getFullYear();

    try {
      const newReceipt: RentReceipt = {
        id: crypto.randomUUID(),
        receipt_number: `REC-${Date.now()}`,
        contract_id: contractId,
        tenant_id: tenantId,
        property_id: propertyId,
        owner_id: ownerId,
        agency_id: contractInfo?.agency_id,
        period_month: month,
        period_year: year,
        rent_amount: rentAmount,
        charges,
        total_amount: rentAmount + charges,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes || null,
        issued_by: "Agence 360 Immo",
        created_at: new Date().toISOString(),
        commission_amount: 0,
        owner_payment: rentAmount + charges,
      };

      const saved = await dbService.rentReceipts.create(newReceipt);
      setReceipt(saved);
      toast.success("✅ Quittance générée avec succès");

      if (onReceiptGenerated) await onReceiptGenerated(saved);
    } catch (error: any) {
      toast.error("Erreur génération quittance: " + error.message);
    }
  };

  // Export PDF
  const exportPDF = () => {
    if (!receipt) return;
    const doc = new jsPDF();
    doc.text(`Quittance de loyer - ${receipt.receipt_number}`, 10, 10);
    doc.text(`Locataire: ${tenantInfo?.first_name} ${tenantInfo?.last_name}`, 10, 20);
    doc.text(`Propriété: ${propertyInfo?.title ?? propertyInfo?.location.commune}`, 10, 30);
    doc.text(`Loyer: ${receipt.rent_amount} €`, 10, 40);
    doc.text(`Charges: ${receipt.charges} €`, 10, 50);
    doc.text(`Total: ${receipt.total_amount} €`, 10, 60);
    doc.text(`Payé le: ${receipt.payment_date}`, 10, 70);
    doc.save(`quittance-${receipt.receipt_number}.pdf`);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <DialogPanel className="bg-white p-6 rounded-md shadow-md w-full max-w-3xl">
        <DialogTitle className="text-xl font-bold mb-4">Générer une quittance</DialogTitle>

        {/* Bloc infos */}
        {(contractInfo || tenantInfo || propertyInfo || ownerInfo) && (
          <Card className="p-4 mb-4 bg-gray-50">
            <h4 className="font-bold mb-2">Informations liées</h4>
            {contractInfo && <div><strong>Contrat:</strong> {contractInfo.type ?? contractInfo.id} ({contractInfo.start_date} → {contractInfo.end_date})</div>}
            {propertyInfo && <div><strong>Propriété:</strong> {propertyInfo.title ?? propertyInfo.id} - {propertyInfo.location.commune ?? "-"}</div>}
            {tenantInfo && <div><strong>Locataire:</strong> {tenantInfo.first_name} {tenantInfo.last_name} - {tenantInfo.phone ?? "-"} - {tenantInfo.email ?? "-"}</div>}
            {ownerInfo && <div><strong>Propriétaire:</strong> {ownerInfo.first_name} {ownerInfo.last_name} - {ownerInfo.phone ?? "-"} - {ownerInfo.email ?? "-"}</div>}
          </Card>
        )}

        {/* Formulaire */}
        {!receipt && (
          <div className="space-y-4">
            <div>
              <label>Montant du loyer (FCFA)</label>
              <input type="number" className="input" value={rentAmount} onChange={(e) => setRentAmount(Number(e.target.value))} />
            </div>
            <div>
              <label>Charges (FCFA)</label>
              <input type="number" className="input" value={charges} onChange={(e) => setCharges(Number(e.target.value))} />
            </div>
            <div>
              <label>Date de paiement</label>
              <input type="date" className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <label>Mode de paiement</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                <option value="especes">Espèces</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
            <div>
              <label>Notes</label>
              <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button onClick={generateReceipt}>Générer la quittance</Button>
          </div>
        )}

        {/* Aperçu quittance */}
        {receipt && (
          <div className="mt-4">
            <h3 className="font-bold mb-2">Aperçu de la quittance</h3>
            <Card className="p-4">
              <p><strong>Numéro:</strong> {receipt.receipt_number}</p>
              <p><strong>Montant total:</strong> {receipt.total_amount} €</p>
              <p><strong>Payé le:</strong> {receipt.payment_date}</p>
              <p><strong>Mode:</strong> {receipt.payment_method}</p>
              {notes && <p><strong>Notes:</strong> {notes}</p>}
            </Card>
            <div className="flex space-x-2 mt-4">
              <Button onClick={exportPDF}>Télécharger PDF</Button>
              <Button onClick={() => window.print()}>Imprimer</Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};

export default ReceiptGenerator;
