import React, { useState, useEffect } from 'react';
import { User, Calendar, MapPin, CheckCircle, LogOut, Loader2, Shield, Phone, Mail } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { dbService } from '../../lib/supabase';
import { usePriceCalculator } from '../../hooks/usePriceCalculator';
import { ReceiptPrinter } from '../../lib/utils/receiptPrinter';
import { useAuth } from '../../contexts/AuthContext';
import { getCalendarDate, formatCalendarDate } from '../../lib/utils/dateUtils';
import toast from 'react-hot-toast';

interface ResidenceUnitDetailsModalProps {
    unit: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const ResidenceUnitDetailsModal: React.FC<ResidenceUnitDetailsModalProps> = ({ unit, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any>(null);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    const { formatPrice } = usePriceCalculator(null);
    const { agencyId, agencies } = useAuth();
    const currentAgency = agencies.find(a => a.agency_id === agencyId);
    const agencyName = currentAgency?.name;

    useEffect(() => {
        if (unit?.id) {
            fetchDetails();
        }
    }, [unit?.id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const data = await dbService.modular.getUnitWithBooking(unit.id);
            setDetails(data);
        } catch (error) {
            console.error('Error fetching unit details:', error);
            toast.error('Erreur lors du chargement des détails');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (!details?.booking?.id) return;
        
        try {
            setIsCheckingOut(true);
            await dbService.modular.checkoutBooking(details.booking.id, unit.id, 'residence');
            toast.success('La résidence a été libérée. Elle est maintenant en attente de ménage.');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error during checkout:', error);
            toast.error('Erreur lors de la libération de la résidence');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!details?.booking?.id) return;
        if (paymentAmount <= 0) {
            toast.error('Veuillez entrer un montant valide');
            return;
        }

        try {
            setIsSavingPayment(true);
            const transaction: any = {
                agency_id: details.booking.agency_id,
                amount: paymentAmount,
                type: 'income',
                category: 'stay_payment',
                description: `Paiement Séjour - ${details.booking.residence_name || unit.unit_name}`,
                payment_method: paymentMethod,
                transaction_date: new Date().toISOString(),
                related_id: details.booking.id,
                module_type: 'residences'
            };

            await dbService.modular.createTransaction(transaction);
            await dbService.modular.syncBookingPaymentStatus(details.booking.id);
            
            // Generate receipt automatically
            const { booking, client } = details;
            ReceiptPrinter.printTransactionReceipt(transaction, client, booking, agencyName, unit.site?.name, unit.unit_name);

            // Update client stats (spent, stays, etc)
            if (client?.id) {
                await dbService.modular.updateClientStats(client.id);
            }

            // Re-fetch details to update stats and history
            await fetchDetails();
            setIsAddingPayment(false);
            setPaymentAmount(0);
            toast.success('Paiement enregistré et reçu généré');
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error('Erreur lors de l’enregistrement du paiement');
        } finally {
            setIsSavingPayment(false);
        }
    };

    const printPoliceFile = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Fiche de Police - ${client?.first_name} ${client?.last_name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                        .content { line-height: 1.6; }
                        .field { margin-bottom: 15px; }
                        .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; }
                        .value { font-size: 18px; border-bottom: 1px dotted #ccc; display: inline-block; min-width: 200px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>FICHE DE POLICE / RENSEIGNEMENTS</h1>
                        <p>Gestion360 - Module Résidences</p>
                    </div>
                    <div class="content">
                        <div class="field"><span class="label">Nom & Prénoms :</span> <span class="value">${client?.first_name} ${client?.last_name}</span></div>
                        <div class="field"><span class="label">Téléphone :</span> <span class="value">${client?.phone}</span></div>
                        <div class="field"><span class="label">Nationalité :</span> <span class="value">${client?.nationality || 'Non précisée'}</span></div>
                        <div class="field"><span class="label">N° Pièce d'identité :</span> <span class="value">${client?.id_card_number || 'Non précisée'}</span></div>
                        <div class="field"><span class="label">Résidence :</span> <span class="value">${unit.unit_name}</span></div>
                        <div class="field"><span class="label">Date d'arrivée :</span> <span class="value">${formatCalendarDate(booking.check_in)}</span></div>
                        <div class="field"><span class="label">Date de départ :</span> <span class="value">${formatCalendarDate(booking.check_out)}</span></div>
                    </div>
                    <button class="no-print" onclick="window.print()" style="margin-top: 50px; padding: 10px 20px; background: #000; color: #fff; border: none; cursor: pointer;">Imprimer</button>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center bg-white rounded-3xl">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Récupération des données résident...</p>
            </div>
        );
    }

    if (!details?.booking) {
        return (
            <div className="p-20 text-center bg-white rounded-3xl">
                <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                <p className="text-sm font-black text-slate-800 uppercase">Aucune occupation active found</p>
                <Button variant="outline" size="sm" onClick={onClose} className="mt-4">Fermer</Button>
            </div>
        );
    }

    const { booking, client } = details;
    const checkIn = getCalendarDate(booking.check_in);
    const checkOutPlaned = getCalendarDate(booking.check_out);
    const stayNights = Math.max(1, Math.round((checkOutPlaned.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    return (
        <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-2xl mx-auto rounded-3xl">
            <div className="bg-slate-900 p-8 text-white relative">
                <div className="absolute right-0 top-0 p-8 opacity-10">
                    <User size={120} />
                </div>
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2 block">Détails Occupation</span>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                            {unit.unit_name}
                        </h3>
                        <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                            <MapPin size={14} className="text-indigo-400" />
                            {unit.site?.name || 'Site Prestige'}
                        </p>
                    </div>
                    <div className="bg-indigo-600 px-4 py-2 rounded-xl text-center">
                        <p className="text-[10px] font-black uppercase opacity-60">Statut</p>
                        <p className="text-xs font-black uppercase">Occupé</p>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Resident Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                             Resident <User size={12} />
                        </h4>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500" />
                            <p className="text-xl font-black text-slate-900 uppercase italic">
                                {client?.first_name} {client?.last_name}
                            </p>
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                    <Phone size={12} className="text-indigo-500" />
                                    {client?.phone}
                                </p>
                                {client?.email && (
                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                        <Mail size={12} className="text-indigo-500" />
                                        {client?.email}
                                    </p>
                                )}
                            </div>
                            <span className="inline-block mt-4 px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black uppercase text-indigo-600 shadow-sm">
                                Client {client?.client_type || 'Régulier'}
                            </span>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                             Séjour <Calendar size={12} />
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Arrivée</span>
                                <span className="text-xs font-black text-slate-700">{checkIn.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Départ Prévu</span>
                                <span className="text-xs font-black text-slate-700">{checkOutPlaned.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <span className="text-[10px] font-black text-indigo-600 uppercase">Durée Totale</span>
                                <span className="text-xs font-black text-indigo-900">{stayNights} Nuits</span>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Financial Summary */}
                <section className="pt-6 border-t border-slate-100 space-y-4">
                    {/* Payment Form (Conditional) */}
                    {isAddingPayment ? (
                        <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest italic">Enregistrer un versement</h4>
                                <Button variant="ghost" size="sm" onClick={() => setIsAddingPayment(false)} className="text-amber-600 hover:bg-amber-100">Annuler</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-amber-500">Montant (FCFA)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-2 text-sm font-black focus:border-amber-500 outline-none"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        placeholder="Ex: 15000"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-amber-500">Mode de paiement</label>
                                    <select 
                                        className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-2 text-sm font-black focus:border-amber-500 outline-none"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    >
                                        <option value="cash">Espèces</option>
                                        <option value="card">Carte Bancaire</option>
                                        <option value="transfer">Virement</option>
                                        <option value="mobile_money">Mobile Money</option>
                                    </select>
                                </div>
                            </div>
                            <Button 
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black italic shadow-lg shadow-amber-200"
                                onClick={handleRecordPayment}
                                isLoading={isSavingPayment}
                            >
                                VALIDER LE PAIEMENT
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl text-white shadow-xl italic relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div>
                                <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Total du Séjour</p>
                                <p className="text-2xl font-black mt-1 leading-none">
                                    {formatPrice(booking.total_amount || 0)}
                                </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                    booking.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                    {booking.payment_status === 'paid' ? 'Soldé' : 'En attente'}
                                </span>
                                {booking.payment_status !== 'paid' && (
                                    <Button 
                                        size="sm" 
                                        className="h-7 text-[9px] font-black bg-white text-slate-900 hover:bg-amber-400 border-0 uppercase italic"
                                        onClick={() => setIsAddingPayment(true)}
                                    >
                                        Payer maintenant
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Transaction History */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Historique des paiements</h4>
                        {details.transactions && details.transactions.length > 0 ? (
                            <div className="space-y-2">
                                {details.transactions.map((tx: any) => (
                                    <div key={tx.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase italic">{tx.description}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">{new Date(tx.transaction_date).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-emerald-600">+{formatPrice(tx.amount)}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{tx.payment_method}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-400 italic">Aucun paiement enregistré pour ce séjour.</p>
                        )}
                    </div>
                </section>

                <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={onClose} className="font-black italic">RETOUR</Button>
                    <div className="flex gap-3">
                        <Button 
                            variant="primary" 
                            className="bg-indigo-600 hover:bg-indigo-700 font-black italic shadow-lg shadow-indigo-100 border-0"
                            leftIcon={<Shield size={16} />}
                            onClick={printPoliceFile}
                        >
                            FICHE POLICE
                        </Button>
                        <Button 
                            variant="primary" 
                            className="bg-rose-600 hover:bg-rose-700 font-black italic shadow-lg shadow-rose-100 border-0"
                            leftIcon={<LogOut size={16} />}
                            onClick={handleCheckout}
                            isLoading={isCheckingOut}
                        >
                            LIBÉRER LA RÉSIDENCE
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};
