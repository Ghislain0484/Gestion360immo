import { Property, Owner, Tenant, Contract, ManagedContract } from '../types/db';
import { DashboardStats } from '../types/platform';
import { ModularTransaction } from '../types/modular';

export const DEMO_AGENCY_ID = '00000000-0000-0000-0000-000000000000';

export const MOCK_STATS: DashboardStats = {
  totalProperties: 24,
  totalOwners: 12,
  totalTenants: 18,
  totalContracts: 18,
  monthlyRevenue: 42500000,
  expectedRevenue: 45000000,
  remainingRevenue: 2500000,
  activeContracts: 18,
  occupancyRate: 92.5,
  agencyEarnings: 4250000,
  totalDeposits: 85000000,
};

export const MOCK_OWNERS: Owner[] = [
  { 
    id: 'demo-owner-1', first_name: 'Moussa', last_name: 'Camara', email: 'm.camara@invest-guinee.com', 
    agency_id: DEMO_AGENCY_ID, created_at: '2023-01-10', updated_at: '2023-01-10', phone: '+224 622 10 20 30', 
    address: 'Minière', city: 'Conakry', property_title: 'tf', marital_status: 'marie', children_count: 4 
  },
  { 
    id: 'demo-owner-2', first_name: 'Fatoumata', last_name: 'Sow', email: 'f.sow@patrimoine.gn', 
    agency_id: DEMO_AGENCY_ID, created_at: '2023-03-15', updated_at: '2023-03-15', phone: '+224 621 55 66 77', 
    address: 'Kipé', city: 'Conakry', property_title: 'acd', marital_status: 'marie', children_count: 2 
  },
  { 
    id: 'demo-owner-3', first_name: 'Thierno', last_name: 'Diallo', email: 't.diallo@business.com', 
    agency_id: DEMO_AGENCY_ID, created_at: '2023-05-20', updated_at: '2023-05-20', phone: '+224 620 88 99 00', 
    address: 'Kaloum', city: 'Conakry', property_title: 'cpf', marital_status: 'celibataire', children_count: 0 
  }
];

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'demo-prop-1', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-1',
    title: 'Résidence Atlantic - Penthouse A', standing: 'haut',
    description: 'Penthouse d\'exception avec terrasse de 150m² surplombant l\'Atlantique. Finitions marbre et domotique intégrée.',
    location: { commune: 'Dixinn', quartier: 'Camayenne', facilites: ['Piscine Infinity', 'Smart Home', 'Salle de Sport', 'Sécurité VIP'] },
    details: { type: 'appartement', numeroEtage: '12', numeroPorte: 'A', surface: 185 },
    rooms: [
      { type: 'sejour', superficie: 65, plafond: { type: 'staff' }, electricite: { nombrePrises: 12, nombreInterrupteurs: 4, nombreDismatique: 2, nombreAmpoules: 8, typeLuminaires: 'LED Spot' }, peinture: { couleur: 'Blanc Off-white', type: 'Satinée', marque: 'Astral' }, menuiserie: { materiau: 'alu', nombreFenetres: 4, typeFenetres: 'Baie Vitrée' }, serrure: { typePoignee: 'Inox', typeCle: 'Sécurisée' }, sol: { type: 'carrelage', details: 'Marbre d\'Italie' }, images: [] },
      { type: 'cuisine', superficie: 25, plafond: { type: 'staff' }, electricite: { nombrePrises: 8, nombreInterrupteurs: 2, nombreDismatique: 1, nombreAmpoules: 4, typeLuminaires: 'LED' }, peinture: { couleur: 'Gris', type: 'Satinée', marque: 'Astral' }, menuiserie: { materiau: 'alu', nombreFenetres: 1, typeFenetres: 'Coulissante' }, serrure: { typePoignee: 'Inox', typeCle: 'Sécurisée' }, sol: { type: 'carrelage' }, images: [] }
    ],
    is_available: false, for_rent: true, for_sale: false,
    monthly_rent: 15000000, sale_price: 2500000000,
    images: [{ id: 'p1', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', isPrimary: true, room: 'Salon Principal' }],
    created_at: '2023-01-15', updated_at: '2023-01-15'
  },
  {
    id: 'demo-prop-2', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-2',
    title: 'Villa Emeraude - Nongo', standing: 'haut',
    description: 'Propriété de prestige sur 1200m². 6 suites, bureau indépendant et dépendance pour le personnel.',
    location: { commune: 'Ratoma', quartier: 'Nongo', facilites: ['Piscine Chauffée', 'Forage Industriel', 'Jardin Tropical', 'Garage 4 Véhicules'] },
    details: { type: 'villa', surface: 450 },
    rooms: [
      { type: 'sejour', superficie: 120, plafond: { type: 'staff' }, electricite: { nombrePrises: 20, nombreInterrupteurs: 6, nombreDismatique: 3, nombreAmpoules: 15, typeLuminaires: 'Lustre Crystal' }, peinture: { couleur: 'Beige', type: 'Satinée', marque: 'Astral' }, menuiserie: { materiau: 'bois', nombreFenetres: 6, typeFenetres: 'Française' }, serrure: { typePoignee: 'Laiton', typeCle: 'Sécurisée' }, sol: { type: 'carrelage' }, images: [] }
    ],
    is_available: false, for_rent: true, for_sale: false,
    monthly_rent: 35000000, sale_price: 5200000000,
    images: [{ id: 'p2', url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80', isPrimary: true, room: 'Façade' }],
    created_at: '2023-02-10', updated_at: '2023-02-10'
  },
  {
    id: 'demo-prop-3', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-3',
    title: 'Business Center Kaloum - Plateau 5', standing: 'haut',
    description: 'Espace de bureaux open-space modulable de 350m². Idéal pour siège social ou ambassade.',
    location: { commune: 'Kaloum', quartier: 'Almamya', facilites: ['Fibre Dédiée', 'Contrôle d\'accès', 'Climatisation VRV'] },
    details: { type: 'autres', surface: 350 },
    rooms: [], is_available: false, for_rent: true, for_sale: false,
    monthly_rent: 55000000, sale_price: 8000000000,
    images: [{ id: 'p3', url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80', isPrimary: true, room: 'Open Space' }],
    created_at: '2023-04-05', updated_at: '2023-04-05'
  }
];

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'demo-tenant-1', first_name: 'Ibrahim', last_name: 'Barry', email: 'i.barry@expat-service.com',
    agency_id: DEMO_AGENCY_ID, phone: '+224 621 11 22 33', id_card_url: 'RG-001234', address: 'Camayenne', city: 'Conakry',
    profession: 'Directeur Régional ONU', marital_status: 'marie', children_count: 2, nationality: 'Guinéenne', 
    payment_status: 'bon', created_at: '2023-12-01', updated_at: '2023-12-01'
  },
  {
    id: 'demo-tenant-2', first_name: 'Claire', last_name: 'Dubois', email: 'c.dubois@ambassade-fr.org',
    agency_id: DEMO_AGENCY_ID, phone: '+224 625 44 55 66', id_card_url: 'FR-887766', address: 'Kipé', city: 'Conakry',
    profession: 'Attachée Culturelle', marital_status: 'celibataire', children_count: 0, nationality: 'Française',
    payment_status: 'bon', created_at: '2024-02-15', updated_at: '2024-02-15'
  }
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'demo-contract-1', agency_id: DEMO_AGENCY_ID, property_id: 'demo-prop-1', tenant_id: 'demo-tenant-1',
    owner_id: 'demo-owner-1', type: 'location', start_date: '2024-01-01', end_date: '2025-01-01', 
    monthly_rent: 15000000, deposit: 30000000, commission_rate: 10, commission_amount: 1500000,
    status: 'active', terms: 'Contrat de bail diplomatique', documents: [], created_at: '2023-12-20', updated_at: '2023-12-20'
  },
  {
    id: 'demo-contract-2', agency_id: DEMO_AGENCY_ID, property_id: 'demo-prop-2', tenant_id: 'demo-tenant-2',
    owner_id: 'demo-owner-2', type: 'location', start_date: '2024-03-01', end_date: '2025-03-01', 
    monthly_rent: 35000000, deposit: 70000000, commission_rate: 10, commission_amount: 3500000,
    status: 'active', terms: 'Bail villa de fonction', documents: [], created_at: '2024-02-25', updated_at: '2024-02-25'
  }
];

export const MOCK_RECEIPTS: any[] = [
  {
    id: 'r-demo-1', receipt_number: 'QU-202403-A1', period_month: 3, period_year: 2024,
    total_amount: 15000000, owner_payment: 13500000, commission_amount: 1500000,
    payment_date: '2024-03-05', payment_method: 'bank_transfer',
    contract_id: 'demo-contract-1', tenant_id: 'demo-tenant-1', property_id: 'demo-prop-1', owner_id: 'demo-owner-1',
    agency_id: DEMO_AGENCY_ID, created_at: '2024-03-05'
  },
  {
    id: 'r-demo-2', receipt_number: 'QU-202404-A1', period_month: 4, period_year: 2024,
    total_amount: 15000000, owner_payment: 13500000, commission_amount: 1500000,
    payment_date: '2024-04-04', payment_method: 'bank_transfer',
    contract_id: 'demo-contract-1', tenant_id: 'demo-tenant-1', property_id: 'demo-prop-1', owner_id: 'demo-owner-1',
    agency_id: DEMO_AGENCY_ID, created_at: '2024-04-04'
  }
];

export const MOCK_TRANSACTIONS: ModularTransaction[] = [
  {
    id: 't-demo-1', agency_id: DEMO_AGENCY_ID, type: 'income', amount: 45000000,
    description: 'Encaissement Caution + 1er mois (Résidence Atlantic)', category: 'rent_payment', transaction_date: '2024-01-02',
    payment_method: 'bank_transfer', created_at: '2024-01-02', updated_at: '2024-01-02'
  },
  {
    id: 't-demo-2', agency_id: DEMO_AGENCY_ID, type: 'expense', amount: 2500000,
    description: 'Entretien Jardins & Piscine (Villa Emeraude)', category: 'maintenance', transaction_date: '2024-03-15',
    payment_method: 'cash', created_at: '2024-03-15', updated_at: '2024-03-15'
  },
  {
    id: 't-demo-3', agency_id: DEMO_AGENCY_ID, type: 'expense', amount: 6500000,
    description: 'Campagne de Publicité "Luxe & Sud"', category: 'marketing', transaction_date: '2024-04-10',
    payment_method: 'bank_transfer', created_at: '2024-04-10', updated_at: '2024-04-10'
  },
  {
    id: 't-demo-4', agency_id: DEMO_AGENCY_ID, type: 'income', amount: 12500000,
    description: 'Honoraires Conseil (Projet Skyline)', category: 'agency_fees', transaction_date: '2024-04-12',
    payment_method: 'check', created_at: '2024-04-12', updated_at: '2024-04-12'
  }
];

export const MOCK_MANAGED_CONTRACTS: ManagedContract[] = [
  {
    id: 'mc1', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-1', property_id: 'demo-prop-1', tenant_id: null,
    contract_type: 'gestion', template_id: 'template-1', status: 'signed', effective_date: '2023-01-01', 
    end_date: '2025-01-01', renewal_date: null, document_url: null, financial_terms: {},
    context_snapshot: {}, created_by: 'system', updated_by: null, created_at: '2023-01-01', updated_at: '2023-01-01'
  }
];

export const MOCK_TICKETS: any[] = [
  {
    id: 't-demo-1', title: 'Fuite Plomberie Cuisine', description: 'Infiltration d\'eau constatée sous l\'évier principal. Nécessite intervention rapide.',
    status: 'in_progress', priority: 'high', estimated_cost: 45000, actual_cost: null,
    property_id: 'demo-prop-1', agency_id: DEMO_AGENCY_ID, created_at: '2024-03-25'
  },
  {
    id: 't-demo-2', title: 'Révision Climatisation Salon', description: 'Entretien annuel des unités VRV. Nettoyage filtres et recharge gaz.',
    status: 'resolved', priority: 'medium', estimated_cost: 85000, actual_cost: 85000,
    property_id: 'demo-prop-1', agency_id: DEMO_AGENCY_ID, created_at: '2024-02-10'
  },
  {
    id: 't-demo-3', title: 'Portail Électrique Bloqué', description: 'Le moteur du portail principal ne répond plus à la télécommande.',
    status: 'open', priority: 'urgent', estimated_cost: 125000, actual_cost: null,
    property_id: 'demo-prop-2', agency_id: DEMO_AGENCY_ID, created_at: '2024-03-28'
  }
];

export const MOCK_INVENTORIES: any[] = [
  {
    id: 'inv-demo-1', property_id: 'demo-prop-1', date: '2024-01-01', condition: 'excellent',
    comments: 'État neuf, remise des clés effectuée sans réserves.', status: 'signed'
  },
  {
    id: 'inv-demo-2', property_id: 'demo-prop-2', date: '2024-03-01', condition: 'good',
    comments: 'Quelques traces d\'usure sur les peintures du salon.', status: 'signed'
  }
];
