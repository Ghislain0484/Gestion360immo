import React, { useState } from 'react';
import { Star, Users, Home } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface SatisfactionMetrics {
  tenantSatisfaction: {
    renewalRate: number; // Taux de renouvellement (40%)
    complaintRate: number; // Taux de plaintes (30%)
    averageStayDuration: number; // Durée moyenne de séjour en mois (30%)
    overallScore: number;
  };
  ownerSatisfaction: {
    paymentPunctuality: number; // Ponctualité des reversements (40%)
    communicationScore: number; // Score de communication (30%)
    retentionRate: number; // Taux de rétention (30%)
    overallScore: number;
  };
  globalScore: number;
}

interface SatisfactionTrackerProps {
  agencyId: string;
  period: string;
}

export const SatisfactionTracker: React.FC<SatisfactionTrackerProps> = ({
  agencyId,
  period
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Mock satisfaction data
  const metrics: SatisfactionMetrics = {
    tenantSatisfaction: {
      renewalRate: 85, // 85% des locataires renouvellent
      complaintRate: 8, // 8% de plaintes (inversé pour le score)
      averageStayDuration: 18, // 18 mois en moyenne
      overallScore: 88.2
    },
    ownerSatisfaction: {
      paymentPunctuality: 95, // 95% des paiements à temps
      communicationScore: 92, // Score de communication
      retentionRate: 90, // 90% des propriétaires restent
      overallScore: 92.6
    },
    globalScore: 90.4
  };

  const calculateTenantSatisfaction = () => {
    const renewalScore = metrics.tenantSatisfaction.renewalRate;
    const complaintScore = 100 - metrics.tenantSatisfaction.complaintRate; // Inverser les plaintes
    const durationScore = Math.min(metrics.tenantSatisfaction.averageStayDuration / 24 * 100, 100);
    
    return (renewalScore * 0.4 + complaintScore * 0.3 + durationScore * 0.3);
  };

  const calculateOwnerSatisfaction = () => {
    const punctualityScore = metrics.ownerSatisfaction.paymentPunctuality;
    const communicationScore = metrics.ownerSatisfaction.communicationScore;
    const retentionScore = metrics.ownerSatisfaction.retentionRate;
    
    return (punctualityScore * 0.4 + communicationScore * 0.3 + retentionScore * 0.3);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'warning';
    if (score >= 60) return 'info';
    return 'danger';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Satisfaction Clients - {period}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
          Voir détails
        </Button>
      </div>

      {/* Global Score */}
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <div className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Star className="h-8 w-8 text-yellow-500 mr-2" />
            <div className={`text-3xl font-bold ${getScoreColor(metrics.globalScore)}`}>
              {metrics.globalScore.toFixed(1)}/100
            </div>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">Score Global de Satisfaction</h4>
          <Badge variant={getScoreBadge(metrics.globalScore)} size="md">
            {metrics.globalScore >= 90 ? 'Excellent' : 
             metrics.globalScore >= 75 ? 'Bon' : 
             metrics.globalScore >= 60 ? 'Moyen' : 'À améliorer'}
          </Badge>
        </div>
      </Card>

      {/* Detailed Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-gray-900">Satisfaction Locataires</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taux de renouvellement</span>
                <span className="font-medium text-blue-600">
                  {metrics.tenantSatisfaction.renewalRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taux de plaintes</span>
                <span className="font-medium text-red-600">
                  {metrics.tenantSatisfaction.complaintRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Durée moyenne séjour</span>
                <span className="font-medium text-green-600">
                  {metrics.tenantSatisfaction.averageStayDuration} mois
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Score final</span>
                  <Badge variant={getScoreBadge(metrics.tenantSatisfaction.overallScore)} size="sm">
                    {metrics.tenantSatisfaction.overallScore.toFixed(1)}/100
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-green-200">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Home className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-medium text-gray-900">Satisfaction Propriétaires</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ponctualité paiements</span>
                <span className="font-medium text-green-600">
                  {metrics.ownerSatisfaction.paymentPunctuality}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Score communication</span>
                <span className="font-medium text-blue-600">
                  {metrics.ownerSatisfaction.communicationScore}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taux de rétention</span>
                <span className="font-medium text-purple-600">
                  {metrics.ownerSatisfaction.retentionRate}%
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Score final</span>
                  <Badge variant={getScoreBadge(metrics.ownerSatisfaction.overallScore)} size="sm">
                    {metrics.ownerSatisfaction.overallScore.toFixed(1)}/100
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Analyse détaillée de la satisfaction"
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Méthodologie de calcul</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Satisfaction Locataires (15% du classement) :</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Taux de renouvellement (40%) : Fidélité des locataires</li>
                <li>• Taux de plaintes (30%) : Qualité du service</li>
                <li>• Durée moyenne de séjour (30%) : Stabilité locative</li>
              </ul>
              
              <p className="mt-3"><strong>Satisfaction Propriétaires (10% du classement) :</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Ponctualité des reversements (40%) : Fiabilité financière</li>
                <li>• Score de communication (30%) : Relation client</li>
                <li>• Taux de rétention (30%) : Confiance à long terme</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Améliorer la satisfaction locataires</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Réduire les délais de réparation</li>
                <li>• Améliorer la communication</li>
                <li>• Proposer des renouvellements attractifs</li>
                <li>• Traiter rapidement les réclamations</li>
              </ul>
            </div>

            <div className="p-4 border border-green-200 rounded-lg">
              <h5 className="font-medium text-green-900 mb-2">Améliorer la satisfaction propriétaires</h5>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Respecter les dates de reversement</li>
                <li>• Envoyer des rapports réguliers</li>
                <li>• Être transparent sur les charges</li>
                <li>• Maintenir une communication proactive</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};