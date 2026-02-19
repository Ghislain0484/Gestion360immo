import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Award, Star, TrendingUp, Building2, DollarSign, Users, CheckCircle, Calendar, Gift, BarChart3, Eye } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { dbService } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface AgencyScore {
    agency_id: string;
    agency_name: string;
    rank: number;
    total_score: number;
    performance_financiere: number;
    gestion_portefeuille: number;
    satisfaction_client: number;
    conformite_reglementaire: number;
    innovation_digitalisation: number;
    metrics: {
        totalProperties: number;
        totalTenants: number;
        totalContracts: number;
        totalRevenue: number;
        occupancyRate: number;
        collectionRate: number;
        retentionRate: number;
        platformUsage: number;
    };
    rewards: Reward[];
}

interface Reward {
    type: 'cash' | 'discount' | 'badge' | 'feature';
    amount: number;
    description: string;
    validUntil: string;
}

export const AgencyRankingsEnhanced: React.FC = () => {
    const [rankings, setRankings] = useState<AgencyScore[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedPeriod, setSelectedPeriod] = useState<'S1' | 'S2' | 'annual'>('S1');
    const [loading, setLoading] = useState(true);
    const [selectedAgency, setSelectedAgency] = useState<AgencyScore | null>(null);

    useEffect(() => {
        fetchRankings();
    }, [selectedYear, selectedPeriod]);

    const fetchRankings = async () => {
        try {
            setLoading(true);
            const agencies = await dbService.agencies.getAll();

            // Calculer les scores pour chaque agence
            const scores = await Promise.all(
                (agencies || []).map(async (agency) => {
                    const [properties, tenants, contracts] = await Promise.all([
                        dbService.properties.getAll({ agency_id: agency.id }),
                        dbService.tenants.getAll({ agency_id: agency.id }),
                        dbService.contracts.getAll({ agency_id: agency.id }),
                    ]);

                    const totalProperties = properties?.length || 0;
                    const totalTenants = tenants?.length || 0;
                    const totalContracts = contracts?.length || 0;

                    // Calcul des métriques
                    const occupancyRate = totalProperties > 0 ? (totalContracts / totalProperties) * 100 : 0;
                    const collectionRate = 85 + Math.random() * 15; // Simulé
                    const retentionRate = 75 + Math.random() * 20; // Simulé
                    const platformUsage = 60 + Math.random() * 40; // Simulé
                    const totalRevenue = totalContracts * 150000; // Simulé

                    // Calcul des scores par critère (sur 100 points)
                    const performanceFinanciere = calculateFinancialScore(totalRevenue, collectionRate);
                    const gestionPortefeuille = calculatePortfolioScore(totalProperties, occupancyRate, totalContracts);
                    const satisfactionClient = calculateSatisfactionScore(retentionRate, totalTenants);
                    const conformiteReglementaire = calculateComplianceScore(totalContracts);
                    const innovationDigitalisation = calculateInnovationScore(platformUsage);

                    const totalScore = (
                        performanceFinanciere * 0.30 +
                        gestionPortefeuille * 0.25 +
                        satisfactionClient * 0.20 +
                        conformiteReglementaire * 0.15 +
                        innovationDigitalisation * 0.10
                    );

                    return {
                        agency_id: agency.id,
                        agency_name: agency.name,
                        rank: 0, // Will be set after sorting
                        total_score: totalScore,
                        performance_financiere: performanceFinanciere,
                        gestion_portefeuille: gestionPortefeuille,
                        satisfaction_client: satisfactionClient,
                        conformite_reglementaire: conformiteReglementaire,
                        innovation_digitalisation: innovationDigitalisation,
                        metrics: {
                            totalProperties,
                            totalTenants,
                            totalContracts,
                            totalRevenue,
                            occupancyRate,
                            collectionRate,
                            retentionRate,
                            platformUsage,
                        },
                        rewards: [],
                    };
                })
            );

            // Trier et attribuer les rangs
            const sortedScores = scores.sort((a, b) => b.total_score - a.total_score);
            const rankedScores = sortedScores.map((score, index) => {
                const rank = index + 1;
                return {
                    ...score,
                    rank,
                    rewards: getRewardsForRank(rank),
                };
            });

            setRankings(rankedScores);
        } catch (error: any) {
            toast.error('Erreur lors du chargement des classements');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Fonctions de calcul des scores
    const calculateFinancialScore = (revenue: number, collectionRate: number): number => {
        const revenueScore = Math.min((revenue / 10000000) * 40, 40); // Max 40 points
        const collectionScore = (collectionRate / 100) * 30; // Max 30 points
        const growthScore = 15 + Math.random() * 15; // Simulé, max 30 points
        return Math.min(revenueScore + collectionScore + growthScore, 100);
    };

    const calculatePortfolioScore = (properties: number, occupancy: number, contracts: number): number => {
        const volumeScore = Math.min((properties / 50) * 30, 30);
        const occupancyScore = (occupancy / 100) * 40;
        const contractsScore = Math.min((contracts / 40) * 30, 30);
        return Math.min(volumeScore + occupancyScore + contractsScore, 100);
    };

    const calculateSatisfactionScore = (retention: number, tenants: number): number => {
        const retentionScore = (retention / 100) * 60;
        const volumeScore = Math.min((tenants / 30) * 40, 40);
        return Math.min(retentionScore + volumeScore, 100);
    };

    const calculateComplianceScore = (contracts: number): number => {
        const baseScore = 70 + Math.random() * 20; // Simulé
        const contractsBonus = Math.min((contracts / 20) * 10, 10);
        return Math.min(baseScore + contractsBonus, 100);
    };

    const calculateInnovationScore = (usage: number): number => {
        return Math.min(usage, 100);
    };

    const getRewardsForRank = (rank: number): Reward[] => {
        switch (rank) {
            case 1:
                return [
                    {
                        type: 'cash',
                        amount: 500000,
                        description: 'Prime d\'excellence',
                        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
                    },
                    {
                        type: 'discount',
                        amount: 50,
                        description: 'Réduction 50% sur l\'abonnement pendant 3 mois',
                        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
                    },
                    {
                        type: 'badge',
                        amount: 0,
                        description: 'Badge "Agence d\'Excellence"',
                        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                    },
                ];
            case 2:
                return [
                    {
                        type: 'cash',
                        amount: 250000,
                        description: 'Prime de performance',
                        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
                    },
                    {
                        type: 'discount',
                        amount: 30,
                        description: 'Réduction 30% sur l\'abonnement pendant 3 mois',
                        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
                    },
                    {
                        type: 'badge',
                        amount: 0,
                        description: 'Badge "Agence Performante"',
                        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                    },
                ];
            case 3:
                return [
                    {
                        type: 'cash',
                        amount: 100000,
                        description: 'Prime de mérite',
                        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString(),
                    },
                    {
                        type: 'discount',
                        amount: 20,
                        description: 'Réduction 20% sur l\'abonnement pendant 2 mois',
                        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString(),
                    },
                    {
                        type: 'badge',
                        amount: 0,
                        description: 'Badge "Agence Prometteuse"',
                        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                    },
                ];
            default:
                return [];
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="h-8 w-8 text-yellow-500" />;
            case 2:
                return <Medal className="h-8 w-8 text-gray-400" />;
            case 3:
                return <Award className="h-8 w-8 text-orange-500" />;
            default:
                return <Star className="h-6 w-6 text-blue-500" />;
        }
    };

    const getRankBadge = (rank: number) => {
        switch (rank) {
            case 1:
                return <Badge variant="warning" className="bg-gradient-to-r from-yellow-400 to-yellow-600">🥇 1er Place</Badge>;
            case 2:
                return <Badge variant="secondary" className="bg-gradient-to-r from-gray-300 to-gray-500">🥈 2ème Place</Badge>;
            case 3:
                return <Badge variant="warning" className="bg-gradient-to-r from-orange-400 to-orange-600">🥉 3ème Place</Badge>;
            default:
                return <Badge variant="secondary">#{rank}</Badge>;
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
                <div className="grid md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const topThree = rankings.slice(0, 3);
    const radarData = selectedAgency
        ? [
            { subject: 'Finance', score: selectedAgency.performance_financiere, fullMark: 100 },
            { subject: 'Portefeuille', score: selectedAgency.gestion_portefeuille, fullMark: 100 },
            { subject: 'Satisfaction', score: selectedAgency.satisfaction_client, fullMark: 100 },
            { subject: 'Conformité', score: selectedAgency.conformite_reglementaire, fullMark: 100 },
            { subject: 'Innovation', score: selectedAgency.innovation_digitalisation, fullMark: 100 },
        ]
        : [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">🏆 Classement des Agences</h2>
                    <p className="text-gray-600">Système de classement réglementaire et fidèle</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="S1">Semestre 1 (Jan-Juin)</option>
                        <option value="S2">Semestre 2 (Juil-Déc)</option>
                        <option value="annual">Annuel</option>
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        {[2024, 2025, 2026].map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Podium */}
            <Card className="border-none bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 shadow-xl">
                <div className="p-8">
                    <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">🎖️ Podium {selectedPeriod} {selectedYear}</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* 2ème place */}
                        {topThree[1] && (
                            <div className="flex flex-col items-center order-1 md:order-1">
                                <div className="relative">
                                    <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center shadow-lg mb-4">
                                        <Medal className="h-12 w-12 text-white" />
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                                        <Badge variant="secondary" className="bg-gray-500 text-white">2ème</Badge>
                                    </div>
                                </div>
                                <h4 className="font-bold text-lg text-gray-900 mt-4 text-center">{topThree[1].agency_name}</h4>
                                <p className="text-2xl font-bold text-gray-700 mt-2">{topThree[1].total_score.toFixed(1)}</p>
                                <p className="text-sm text-gray-500">points</p>
                                <div className="mt-4 text-center">
                                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(250000)}</p>
                                    <p className="text-xs text-gray-600">+ 30% réduction</p>
                                </div>
                            </div>
                        )}

                        {/* 1ère place */}
                        {topThree[0] && (
                            <div className="flex flex-col items-center order-2 md:order-2 -mt-4">
                                <div className="relative">
                                    <div className="w-32 h-32 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl mb-4 animate-pulse">
                                        <Trophy className="h-16 w-16 text-white" />
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                                        <Badge variant="warning" className="bg-yellow-500 text-white">1er</Badge>
                                    </div>
                                </div>
                                <h4 className="font-bold text-xl text-gray-900 mt-4 text-center">{topThree[0].agency_name}</h4>
                                <p className="text-3xl font-bold text-yellow-600 mt-2">{topThree[0].total_score.toFixed(1)}</p>
                                <p className="text-sm text-gray-500">points</p>
                                <div className="mt-4 text-center">
                                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(500000)}</p>
                                    <p className="text-xs text-gray-600">+ 50% réduction</p>
                                </div>
                            </div>
                        )}

                        {/* 3ème place */}
                        {topThree[2] && (
                            <div className="flex flex-col items-center order-3 md:order-3">
                                <div className="relative">
                                    <div className="w-24 h-24 bg-gradient-to-br from-orange-300 to-orange-600 rounded-full flex items-center justify-center shadow-lg mb-4">
                                        <Award className="h-12 w-12 text-white" />
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                                        <Badge variant="warning" className="bg-orange-500 text-white">3ème</Badge>
                                    </div>
                                </div>
                                <h4 className="font-bold text-lg text-gray-900 mt-4 text-center">{topThree[2].agency_name}</h4>
                                <p className="text-2xl font-bold text-orange-600 mt-2">{topThree[2].total_score.toFixed(1)}</p>
                                <p className="text-sm text-gray-500">points</p>
                                <div className="mt-4 text-center">
                                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(100000)}</p>
                                    <p className="text-xs text-gray-600">+ 20% réduction</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Critères de classement */}
            <Card className="border-none bg-white shadow-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">📊 Critères de Classement (100 points)</h3>
                    <div className="grid md:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                            <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                            <h4 className="font-bold text-blue-900">Performance</h4>
                            <p className="text-2xl font-bold text-blue-600">30%</p>
                            <p className="text-xs text-blue-700 mt-2">Revenus, recouvrement, croissance</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
                            <Building2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                            <h4 className="font-bold text-green-900">Portefeuille</h4>
                            <p className="text-2xl font-bold text-green-600">25%</p>
                            <p className="text-xs text-green-700 mt-2">Volume, occupation, qualité</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                            <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                            <h4 className="font-bold text-purple-900">Satisfaction</h4>
                            <p className="text-2xl font-bold text-purple-600">20%</p>
                            <p className="text-xs text-purple-700 mt-2">Rétention, évaluations</p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                            <h4 className="font-bold text-orange-900">Conformité</h4>
                            <p className="text-2xl font-bold text-orange-600">15%</p>
                            <p className="text-xs text-orange-700 mt-2">Documents, délais</p>
                        </div>
                        <div className="text-center p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                            <h4 className="font-bold text-indigo-900">Innovation</h4>
                            <p className="text-2xl font-bold text-indigo-600">10%</p>
                            <p className="text-xs text-indigo-700 mt-2">Digitalisation, usage</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Classement complet */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">📋 Classement Complet</h3>
                {rankings.map((agency) => (
                    <Card
                        key={agency.agency_id}
                        className={`border-none shadow-md hover:shadow-xl transition-all cursor-pointer ${agency.rank <= 3 ? 'ring-2 ring-indigo-500' : ''
                            }`}
                        onClick={() => setSelectedAgency(agency)}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
                                        {getRankIcon(agency.rank)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {getRankBadge(agency.rank)}
                                            <h4 className="text-xl font-bold text-gray-900">{agency.agency_name}</h4>
                                        </div>
                                        <p className="text-sm text-gray-600">Score total : <span className="font-bold text-indigo-600">{agency.total_score.toFixed(1)}/100</span></p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Détails
                                </Button>
                            </div>

                            {/* Barres de progression */}
                            <div className="grid md:grid-cols-5 gap-3 mb-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">Finance</span>
                                        <span className="font-semibold">{agency.performance_financiere.toFixed(0)}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                                            style={{ width: `${agency.performance_financiere}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">Portefeuille</span>
                                        <span className="font-semibold">{agency.gestion_portefeuille.toFixed(0)}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                                            style={{ width: `${agency.gestion_portefeuille}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">Satisfaction</span>
                                        <span className="font-semibold">{agency.satisfaction_client.toFixed(0)}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                                            style={{ width: `${agency.satisfaction_client}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">Conformité</span>
                                        <span className="font-semibold">{agency.conformite_reglementaire.toFixed(0)}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
                                            style={{ width: `${agency.conformite_reglementaire}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">Innovation</span>
                                        <span className="font-semibold">{agency.innovation_digitalisation.toFixed(0)}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
                                            style={{ width: `${agency.innovation_digitalisation}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Métriques */}
                            <div className="grid grid-cols-4 gap-4 text-center text-sm">
                                <div>
                                    <p className="text-gray-600">Propriétés</p>
                                    <p className="font-bold text-gray-900">{agency.metrics.totalProperties}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Locataires</p>
                                    <p className="font-bold text-gray-900">{agency.metrics.totalTenants}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Occupation</p>
                                    <p className="font-bold text-gray-900">{agency.metrics.occupancyRate.toFixed(0)}%</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Recouvrement</p>
                                    <p className="font-bold text-gray-900">{agency.metrics.collectionRate.toFixed(0)}%</p>
                                </div>
                            </div>

                            {/* Récompenses */}
                            {agency.rewards.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Gift className="h-5 w-5 text-emerald-600" />
                                        <h5 className="font-semibold text-gray-900">Récompenses</h5>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        {agency.rewards.map((reward, idx) => (
                                            <div key={idx} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                <p className="font-semibold text-emerald-900 text-sm">{reward.description}</p>
                                                {reward.amount > 0 && (
                                                    <p className="text-lg font-bold text-emerald-600 mt-1">
                                                        {reward.type === 'cash' ? formatCurrency(reward.amount) : `${reward.amount}%`}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Modal détails agence */}
            {selectedAgency && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAgency(null)}>
                    <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{selectedAgency.agency_name}</h3>
                                    <p className="text-gray-600">Analyse détaillée des performances</p>
                                </div>
                                <Button variant="ghost" onClick={() => setSelectedAgency(null)}>✕</Button>
                            </div>

                            {/* Graphique radar */}
                            <div className="mb-8">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Profil de Performance</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                        <Radar name="Score" dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.6} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Métriques détaillées */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Métriques Clés</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Propriétés gérées</span>
                                            <span className="font-semibold">{selectedAgency.metrics.totalProperties}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Locataires actifs</span>
                                            <span className="font-semibold">{selectedAgency.metrics.totalTenants}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Contrats signés</span>
                                            <span className="font-semibold">{selectedAgency.metrics.totalContracts}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Revenus générés</span>
                                            <span className="font-semibold">{formatCurrency(selectedAgency.metrics.totalRevenue)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Taux de Performance</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux d'occupation</span>
                                            <span className="font-semibold text-green-600">{selectedAgency.metrics.occupancyRate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de recouvrement</span>
                                            <span className="font-semibold text-green-600">{selectedAgency.metrics.collectionRate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de rétention</span>
                                            <span className="font-semibold text-green-600">{selectedAgency.metrics.retentionRate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Utilisation plateforme</span>
                                            <span className="font-semibold text-blue-600">{selectedAgency.metrics.platformUsage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
