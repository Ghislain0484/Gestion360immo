import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Copy, 
  Check, 
  Send, 
  MessageSquare, 
  Share2, 
  Smartphone,
  ExternalLink,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: any;
  tenantName: string;
  tenantPhone: string;
  amount: number;
  periodName: string;
}

export const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  isOpen,
  onClose,
  receipt,
  tenantName,
  tenantPhone,
  amount,
  periodName
}) => {
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const paymentUrl = `${window.location.origin}/reglement/${receipt.id}`;
  
  const greeting = "Bonjour " + tenantName;
  const messageText = `${greeting},\n\nVoici le lien sécurisé pour effectuer le règlement de votre loyer de ${periodName} d'un montant de ${amount.toLocaleString('fr-FR')} FCFA :\n${paymentUrl}\n\nCordialement,\nLa Direction`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast.success("Lien de paiement copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Échec de la copie du lien.");
    }
  };

  const handleWhatsAppShare = () => {
    // Clean phone number (WhatsApp needs country code without + or leading zeros)
    let cleanPhone = tenantPhone.replace(/\s+/g, '').replace('+', '');
    if (!cleanPhone.startsWith('225') && cleanPhone.length === 10) {
      // Default to Ivory Coast country code if 10 digits
      cleanPhone = '225' + cleanPhone;
    }

    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  const handleSMSShare = () => {
    let cleanPhone = tenantPhone.replace(/\s+/g, '');
    const encodedText = encodeURIComponent(messageText);
    const smsUrl = `sms:${cleanPhone}?body=${encodedText}`;
    window.open(smsUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Partager le lien de paiement" size="md">
      <div className="space-y-6 text-slate-900">
        
        {/* Quick Summary Info Card */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-indigo-900">Lien de paiement sécurisé activé</p>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Le locataire <strong>{tenantName}</strong> pourra régler son loyer de <strong>{periodName}</strong> ({amount.toLocaleString('fr-FR')} FCFA) directement sur son smartphone via Mobile Money ou Carte de crédit sans aucune installation requise.
            </p>
          </div>
        </div>

        {/* Link display & copy section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500">Adresse URL de paiement</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono select-all overflow-x-auto whitespace-nowrap scrollbar-none text-slate-700">
              {paymentUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              title="Copier le lien"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="text-xs font-bold">{copied ? 'Copié' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Message preview details */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500">Aperçu du message à envoyer</label>
          <Card className="bg-emerald-50/50 border border-emerald-100 p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans relative">
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[9px]">
              <MessageSquare className="w-2.5 h-2.5" />
              <span>WhatsApp / SMS</span>
            </div>
            {messageText}
          </Card>
        </div>

        {/* Sharing Action buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleWhatsAppShare}
            className="h-12 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4.5 h-4.5" />
            <span>Partager sur WhatsApp</span>
          </button>
          <button
            onClick={handleSMSShare}
            className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4.5 h-4.5" />
            <span>Envoyer par SMS</span>
          </button>
        </div>

        {/* Closing actions */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
