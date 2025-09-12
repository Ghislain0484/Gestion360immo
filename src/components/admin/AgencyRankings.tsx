import React, { useState, useEffect, useCallback } from 'react';
import { Award, Trophy, Medal, Star, TrendingUp, Users, Building2, DollarSign, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { dbService } from '../../lib/supabase';
import { AgencyRanking, Reward, AuditLog } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export const AgencyRankings: React.FC = () => {
  const { admin, isLoading: authLoading } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [evaluationPeriodMonths, setEvaluationPeriodMonths] = useState<number>(6);
  const [rankings, setRankings] = useState<AgencyRanking[]>([]);
  const [agencyNames, setAgencyNames] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Log audit action
  const logAudit = useCallback(async (action: string, tableName: string, recordId: string | null, oldValues: any, newValues: any) => {
    try {
      const auditLog: Partial<AuditLog> = {
        user_id: admin?.id ?? null,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: 'unknown', // Replace with actual IP if available
        user_agent: navigator.userAgent,
      };
      await dbService.auditLogs.getAll(); // Placeholder; add insert method if needed
    } catch (err) {
      console.error('Erreur lors de l’enregistrement de l’audit:', err);
    }
  }, [admin]);

  // Charger les classements et les noms des agences
  const fetchRankings = useCallback(async () => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [rankingsData, settingsData, agencies] = await Promise.all([
        dbService.agencyRankings.getByPeriod(selectedYear),
        dbService.platformSettings.getAll(),
        dbService.agencies.getAll(),
      ]);
      const settingsMap = settingsData.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as { [key: string]: any });

      setEvaluationPeriodMonths(Number(settingsMap['ranking_evaluation_period_months']) || 6);
      setRankings(rankingsData);
      const names = agencies.reduce((acc, agency) => {
        acc[agency.id] = agency.name;
        return acc;
      }, {} as { [key: string]: string });
      setAgencyNames(names);
    } catch (err: any) {
      console.error('Erreur lors du chargement des classements:', err);
      const errorMessage = err.message || 'Erreur lors du chargement des classements';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, admin, showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }
    fetchRankings();
  }, [fetchRankings, admin, authLoading]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />;
      default:
        return <Star className="h-6 w-6 text-blue-500" />;
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generateNewRanking = useCallback(async () => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await dbService.agencyRankings.generate(selectedYear);
      await logAudit('generate', 'agency_rankings', null, null, { year: selectedYear });
      showToast('Classement généré avec succès ✅', 'success');
      await fetchRankings();
    } catch (err: any) {
      console.error('Erreur lors de la génération du classement:', err);
      const errorMessage = err.message || 'Erreur lors de la génération du classement';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, admin, fetchRankings, showToast, logAudit]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Classement des Agences</h2>
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchRankings}>
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Classement des Agences</h2>
        <div className="flex items-center space-x-3">
          <Input
            label="Année"
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
            min={2020}
            max={new Date().getFullYear() + 1}
          />
          <Button onClick={generateNewRanking} disabled={loading}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Générer Classement
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Ranking Criteria */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Critères de Classement (Période: {evaluationPeriodMonths} mois)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium text-blue-900">Volume des Biens</h4>
              <p className="text-sm text-blue-700">Propriétés + Contrats (50%)</p>
              <div className="mt-2 text-xs text-blue-600">
                <p>• Nombre de propriétés gérées</p>
                <p>• Nombre de contrats signés</p>
                <p>• Croissance du portefeuille</p>
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-medium text-green-900">Taux de Recouvrement</h4>
              <p className="text-sm text-green-700">Efficacité Encaissements (30%)</p>
              <div className="mt-2 text-xs text-green-600">
                <p>• Ponctualité des paiements</p>
                <p>• Réduction des impayés</p>
                <p>• Gestion des retards</p>
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <h4 className="font-medium text-purple-900">Satisfaction Clients</h4>
              <p className="text-sm text-purple-700">Propriétaires + Locataires (20%)</p>
              <div className="mt-2 text-xs text-purple-600">
                <p>• Fidélité des locataires</p>
                <p>• Rétention des propriétaires</p>
                <p>• Qualité de communication</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Rankings List */}
      {rankings.length > 0 ? (
        <div className="space-y-4">
          {rankings.map((ranking) => (
            <Card key={ranking.id} className="overflow-hidden">
              <div className={`h-2 ${getRankColor(ranking.rank)}`}></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg">
                      {getRankIcon(ranking.rank)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          #{ranking.rank} {agencyNames[ranking.agency_id] || 'Agence inconnue'}
                        </h3>
                        {ranking.rank <= 3 && <Badge variant="warning" size="sm">Podium</Badge>}
                      </div>
                      <p className="text-lg font-semibold text-gray-600">
                        Score: {ranking.total_score.toFixed(1)}/100
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Année</p>
                    <p className="font-medium">{ranking.year}</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {ranking.metrics.totalProperties}
                    </div>
                    <div className="text-xs text-gray-500">Propriétés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {ranking.metrics.totalContracts}
                    </div>
                    <div className="text-xs text-gray-500">Contrats</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {(ranking.metrics.totalRevenue / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-500">CA (FCFA)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {ranking.metrics.clientSatisfaction}%
                    </div>
                    <div className="text-xs text-gray-500">Satisfaction</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {ranking.metrics.collaborationScore}%
                    </div>
                    <div className="text-xs text-gray-500">Collaboration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {ranking.metrics.paymentReliability}%
                    </div>
                    <div className="text-xs text-gray-500">Fiabilité</div>
                  </div>
                </div>

                {/* Rewards */}
                {ranking.rewards && ranking.rewards.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Récompenses obtenues</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ranking.rewards.map((reward: Reward) => (
                        <div
                          key={reward.id}
                          className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-medium text-yellow-900">{reward.title}</h5>
                            {reward.type === 'cash_bonus' && (
                              <Badge variant="success" size="sm">
                                {formatCurrency(reward.value)}
                              </Badge>
                            )}
                            {reward.type === 'discount' && (
                              <Badge variant="info" size="sm">-{reward.value}%</Badge>
                            )}
                          </div>
                          <p className="text-sm text-yellow-800">{reward.description}</p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Valide jusqu'au{' '}
                            {new Date(reward.validUntil).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Award className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun classement</h3>
          <p className="text-gray-600">Aucun classement disponible pour l’année sélectionnée.</p>
        </Card>
      )}

      {/* Next Ranking Info */}
      <Card>
        <div className="p-6 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Prochain Classement</h3>
          <p className="text-gray-600 mb-4">
            Le classement pour {selectedYear + 1} sera généré automatiquement le 31 décembre {selectedYear + 1}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900">Période d'évaluation</p>
              <p className="text-blue-700">1er janvier - 31 décembre {selectedYear + 1}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="font-medium text-green-900">Récompenses totales</p>
              <p className="text-green-700">1,500,000 FCFA + réductions</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="font-medium text-purple-900">Agences éligibles</p>
              <p className="text-purple-700">Toutes les agences actives</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};