import React, { useState } from 'react';
import { Calendar, DollarSign, Home, User, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Rental, PaymentRecord, RenewalRecord } from '../../types/tenant';

interface RentalHistoryProps {
  tenantId: string;
  rentals: Rental[];
}

export const RentalHistory: React.FC<RentalHistoryProps> = ({ tenantId, rentals }) => {
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'actif': return 'success';
      case 'termine': return 'secondary';
      case 'resilie': return 'danger';
      default: return 'secondary';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paye': return 'success';
      case 'retard': return 'warning';
      case 'impaye': return 'danger';
      default: return 'secondary';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paye': return <CheckCircle className="h-4 w-4" />;
      case 'retard': return <AlertTriangle className="h-4 w-4" />;
      case 'impaye': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotalPaid = (payments: PaymentRecord[]) => {
    return payments
      .filter(p => p.status === 'paye')
      .reduce((total, p) => total + p.amount, 0);
  };

  const calculateOutstanding = (rental: Rental) => {
    const totalDue = rental.paymentHistory.length * rental.monthlyRent;
    const totalPaid = calculateTotalPaid(rental.paymentHistory);
    return totalDue - totalPaid;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Historique des locations</h3>
        <Badge variant="info" size="sm">
          {rentals.length} location{rentals.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {rentals.length === 0 ? (
        <Card className="text-center py-8">
          <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Aucun historique de location</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => (
            <Card key={rental.id} className="hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Home className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Propriété #{rental.propertyId}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Propriétaire: #{rental.ownerId}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(rental.status)} size="sm">
                    {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">Début</p>
                      <p className="text-sm font-medium">
                        {rental.startDate.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  {rental.endDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-xs text-gray-500">Fin</p>
                        <p className="text-sm font-medium">
                          {rental.endDate.toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-xs text-gray-500">Loyer mensuel</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(rental.monthlyRent)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total payé</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(calculateTotalPaid(rental.paymentHistory))}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Impayés</p>
                      <p className="font-medium text-red-600">
                        {formatCurrency(calculateOutstanding(rental))}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Caution</p>
                      <p className="font-medium text-blue-600">
                        {formatCurrency(rental.deposit)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-900">
                    Derniers paiements
                  </h5>
                  <div className="space-y-1">
                    {rental.paymentHistory.slice(-3).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {getPaymentStatusIcon(payment.status)}
                          <span>
                            {payment.month} {payment.year}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>{formatCurrency(payment.amount)}</span>
                          <Badge variant={getPaymentStatusColor(payment.status)} size="sm">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Renewals */}
                {rental.renewalHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      Renouvellements ({rental.renewalHistory.length})
                    </h5>
                    <div className="space-y-1">
                      {rental.renewalHistory.map((renewal) => (
                        <div key={renewal.id} className="text-sm text-gray-600">
                          Renouvelé le {renewal.renewalDate.toLocaleDateString('fr-FR')} 
                          jusqu'au {renewal.newEndDate.toLocaleDateString('fr-FR')}
                          {renewal.newRent && (
                            <span className="ml-2 text-green-600">
                              (Nouveau loyer: {formatCurrency(renewal.newRent)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRental(rental);
                      setShowPaymentHistory(true);
                    }}
                  >
                    Voir détails
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Payment History Modal */}
      <Modal
        isOpen={showPaymentHistory}
        onClose={() => {
          setShowPaymentHistory(false);
          setSelectedRental(null);
        }}
        title="Historique des paiements"
        size="lg"
      >
        {selectedRental && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                Propriété #{selectedRental.propertyId}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Période</p>
                  <p className="font-medium">
                    {selectedRental.startDate.toLocaleDateString('fr-FR')} - 
                    {selectedRental.endDate ? selectedRental.endDate.toLocaleDateString('fr-FR') : 'En cours'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Loyer mensuel</p>
                  <p className="font-medium">{formatCurrency(selectedRental.monthlyRent)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {selectedRental.paymentHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getPaymentStatusIcon(payment.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.month} {payment.year}
                      </p>
                      <p className="text-sm text-gray-500">
                        Échéance: {payment.dueDate.toLocaleDateString('fr-FR')}
                      </p>
                      {payment.paidDate && (
                        <p className="text-sm text-green-600">
                          Payé le: {payment.paidDate.toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <Badge variant={getPaymentStatusColor(payment.status)} size="sm">
                      {payment.status}
                    </Badge>
                    {payment.paymentMethod && (
                      <p className="text-xs text-gray-500 mt-1">
                        {payment.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};