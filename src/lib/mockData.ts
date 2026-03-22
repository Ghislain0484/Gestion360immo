import { Property, Owner, Tenant, Contract, ManagedContract } from '../types/db';
import { DashboardStats } from '../types/platform';
import { ModularTransaction } from '../types/modular';

export const DEMO_AGENCY_ID = '00000000-0000-0000-0000-000000000000';

export const MOCK_STATS: DashboardStats = {
  totalProperties: 5,
  totalOwners: 3,
  totalTenants: 4,
  totalContracts: 4,
  monthlyRevenue: 15840000,
  expectedRevenue: 18500000,
  remainingRevenue: 2660000,
  activeContracts: 4,
  occupancyRate: 80.0,
  agencyEarnings: 1584000,
  totalDeposits: 24500000,
};

export const MOCK_OWNERS: Owner[] = [
  { 
    id: 'demo-owner-1', first_name: 'Amadou', last_name: 'Diallo', email: 'amadou.diallo@demo-agence.com', 
    agency_id: DEMO_AGENCY_ID, created_at: '2023-01-10', updated_at: '2023-01-10', phone: '+224 620 11 22 33', 
    address: 'Camayenne', city: 'Conakry', property_title: 'tf', marital_status: 'marie', children_count: 3 
  },
  { 
    id: 'demo-owner-2', first_name: 'Mariama', last_name: 'Barry', email: 'mariama.barry@demo-proprio.com', 
    agency_id: DEMO_AGENCY_ID, created_at: '2023-03-15', updated_at: '2023-03-15', phone: '+224 621 44 55 66', 
    address: 'Kipé', city: 'Conakry', property_title: 'acd', marital_status: 'veuf', children_count: 2 
  },
  { 
    id: 'demo-owner-3', first_name: 'Jean-Pierre', last_name: 'Camara', email: 'jp.camara@example.com', 
    agency_id: DEMO_AGENCY_ID, created_at: '2023-05-20', updated_at: '2023-05-20', phone: '+224 622 77 88 99', 
    address: 'Kaloum', city: 'Conakry', property_title: 'cpf', marital_status: 'marie', children_count: 4 
  }
];

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'demo-prop-1', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-1',
    title: 'Résidence Palace - Appt 4B', standing: 'haut',
    description: 'Luxueux appartement avec vue panoramique sur l\'océan et finitions premium.',
    location: { commune: 'Dixinn', quartier: 'Camayenne', facilites: ['Groupe Électrogène', 'Sécurité 24/7', 'Ascenseur', 'Parking'] },
    details: { type: 'appartement', numeroEtage: '4', numeroPorte: 'B' },
    rooms: [], is_available: false, for_rent: true, for_sale: false,
    monthly_rent: 12500000, sale_price: 1850000000,
    images: [{ id: 'p1', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', isPrimary: true, room: 'Principale' }],
    created_at: '2023-01-15', updated_at: '2023-01-15'
  },
  {
    id: 'demo-prop-2', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-1',
    title: 'Villa Jasmine - Kipé', standing: 'haut',
    description: 'Splendide villa d\'architecte avec piscine olympique et jardin paysager.',
    location: { commune: 'Ratoma', quartier: 'Kipé', facilites: ['Piscine', 'Forage', 'Jardin', 'Garage Double'] },
    details: { type: 'villa' },
    rooms: [], is_available: false, for_rent: true, for_sale: false,
    monthly_rent: 28000000, sale_price: 4500000000,
    images: [{ id: 'p2', url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', isPrimary: true, room: 'Principale' }],
    created_at: '2023-02-10', updated_at: '2023-02-10'
  },
  {
    id: 'demo-prop-3', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-2',
    title: 'Bureaux Kaloum Centre', standing: 'haut',
    description: 'Plateau de bureaux moderne de 250m² au cœur du centre d\'affaires.',
    location: { commune: 'Kaloum', quartier: 'Almamya', facilites: ['Fibre Optique', 'Parking Privé', 'Climatisation Centrale'] },
    details: { type: 'autres' },
    rooms: [], is_available: false, for_rent: true, for_sale: false,
    monthly_rent: 45000000, sale_price: 6000000000,
    images: [{ id: 'p3', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', isPrimary: true, room: 'Bureaux' }],
    created_at: '2023-04-05', updated_at: '2023-04-05'
  },
  {
    id: 'demo-prop-4', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-3',
    title: 'Appartement Meublé - Nongo', standing: 'moyen',
    description: 'Studio entièrement équipé et décoré avec goût, idéal pour expatriés.',
    location: { commune: 'Ratoma', quartier: 'Nongo', facilites: ['Meublé', 'Climatisation', 'Wifi'] },
    details: { type: 'appartement', numeroEtage: '1' },
    rooms: [], is_available: false, for_rent: true, for_sale: false,
    monthly_rent: 8500000, sale_price: 950000000,
    images: [{ id: 'p4', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', isPrimary: true, room: 'Principale' }],
    created_at: '2023-06-12', updated_at: '2023-06-12'
  },
  {
    id: 'demo-prop-5', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-2',
    title: 'Résidence Horizon - 3 Pièces', standing: 'moyen',
    description: 'Appartement spacieux et lumineux dans un quartier calme.',
    location: { commune: 'Ratoma', quartier: 'Lambanyi', facilites: ['Balcon', 'Sécurité'] },
    details: { type: 'appartement', numeroEtage: '2' },
    rooms: [], is_available: true, for_rent: true, for_sale: false,
    monthly_rent: 5500000, sale_price: 650000000,
    images: [{ id: 'p5', url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', isPrimary: true, room: 'Principale' }],
    created_at: '2023-08-15', updated_at: '2023-08-15'
  }
];

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'demo-tenant-1', first_name: 'Ibrahim', last_name: 'Sow', email: 'ibrahim.sow@demo.com',
    agency_id: DEMO_AGENCY_ID, phone: '+224 621 99 88 77', id_card_url: 'RG-998877', address: 'Ratoma', city: 'Conakry',
    profession: 'Directeur Logistique', marital_status: 'marie', children_count: 2, nationality: 'Guinéenne', 
    payment_status: 'bon', created_at: '2023-12-01', updated_at: '2023-12-01'
  },
  {
    id: 'demo-tenant-2', first_name: 'Aissatou', last_name: 'Keita', email: 'a.keita@demo.com',
    agency_id: DEMO_AGENCY_ID, phone: '+224 624 55 44 33', id_card_url: 'RG-554433', address: 'Kipé', city: 'Conakry',
    profession: 'Médecin Spécialiste', marital_status: 'celibataire', children_count: 0, nationality: 'Guinéenne',
    payment_status: 'bon', created_at: '2024-02-15', updated_at: '2024-02-15'
  },
  {
    id: 'demo-tenant-3', first_name: 'Moussa', last_name: 'Condé', email: 'm.conde@demo.com',
    agency_id: DEMO_AGENCY_ID, phone: '+224 625 11 22 33', id_card_url: 'RG-112233', address: 'Kaloum', city: 'Conakry',
    profession: 'Consultant International', marital_status: 'marie', children_count: 4, nationality: 'Guinéenne',
    payment_status: 'bon', created_at: '2023-10-10', updated_at: '2023-10-10'
  },
  {
    id: 'demo-tenant-4', first_name: 'Ousmane', last_name: 'Bangoura', email: 'o.bangoura@demo.com',
    agency_id: DEMO_AGENCY_ID, phone: '+224 626 44 55 66', id_card_url: 'RG-445566', address: 'Dixinn', city: 'Conakry',
    profession: 'Expert Comptable', marital_status: 'marie', children_count: 1, nationality: 'Guinéenne',
    payment_status: 'bon', created_at: '2024-01-10', updated_at: '2024-01-10'
  }
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'demo-contract-1', agency_id: DEMO_AGENCY_ID, property_id: 'demo-prop-1', tenant_id: 'demo-tenant-1',
    owner_id: 'demo-owner-1', type: 'location', start_date: '2023-01-01', end_date: '2025-01-01', 
    monthly_rent: 12500000, deposit: 25000000, commission_rate: 10, commission_amount: 1250000,
    status: 'active', terms: 'Contrat de bail standard', documents: [], created_at: '2022-12-25', updated_at: '2022-12-25'
  },
  {
    id: 'demo-contract-2', agency_id: DEMO_AGENCY_ID, property_id: 'demo-prop-4', tenant_id: 'demo-tenant-2',
    owner_id: 'demo-owner-3', type: 'location', start_date: '2024-03-01', end_date: '2025-03-01', 
    monthly_rent: 8500000, deposit: 17000000, commission_rate: 10, commission_amount: 850000,
    status: 'active', terms: 'Contrat de bail standard', documents: [], created_at: '2024-02-20', updated_at: '2024-02-20'
  },
  {
    id: 'demo-contract-3', agency_id: DEMO_AGENCY_ID, property_id: 'demo-prop-3', tenant_id: 'demo-tenant-3',
    owner_id: 'demo-owner-2', type: 'location', start_date: '2023-11-01', end_date: '2024-11-01', 
    monthly_rent: 45000000, deposit: 90000000, commission_rate: 10, commission_amount: 4500000,
    status: 'active', terms: 'Bail commercial bureaux', documents: [], created_at: '2023-10-25', updated_at: '2023-10-25'
  },
  {
    id: 'demo-contract-4', agency_id: DEMO_AGENCY_ID, property_id: 'demo-prop-2', tenant_id: 'demo-tenant-4',
    owner_id: 'demo-owner-1', type: 'location', start_date: '2024-01-01', end_date: '2025-01-01', 
    monthly_rent: 28000000, deposit: 56000000, commission_rate: 10, commission_amount: 2800000,
    status: 'active', terms: 'Bail villa premium', documents: [], created_at: '2023-12-20', updated_at: '2023-12-20'
  }
];

// On génère 12 mois de quittances pour demo-owner-1
const generateReceipts = (): any[] => {
  const receipts: any[] = [];
  const contracts = ['demo-contract-1', 'demo-contract-4'];
  const now = new Date();
  
  for (let m = 0; m < 12; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 5);
    contracts.forEach(cId => {
      const isC1 = cId === 'demo-contract-1';
      const rent = isC1 ? 12500000 : 28000000;
      const ownerNet = rent * 0.9;
      
      receipts.push({
        id: `r-demo-${cId}-${m}`,
        receipt_number: `REC-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${cId.slice(-1)}`,
        period_month: d.getMonth() + 1,
        period_year: d.getFullYear(),
        total_amount: rent,
        owner_payment: ownerNet,
        commission_amount: rent * 0.1,
        payment_date: d.toISOString(),
        payment_method: 'bank_transfer',
        contract_id: cId,
        tenant_id: isC1 ? 'demo-tenant-1' : 'demo-tenant-4',
        property_id: isC1 ? 'demo-prop-1' : 'demo-prop-2',
        owner_id: 'demo-owner-1',
        agency_id: DEMO_AGENCY_ID,
        created_at: d.toISOString()
      });
    });
  }
  return receipts;
};

export const MOCK_RECEIPTS: any[] = [
  ...generateReceipts(),
  {
    id: 'r2', receipt_number: 'REC-202404-002', period_month: 4, period_year: 2024,
    total_amount: 8500000, owner_payment: 7650000, commission_amount: 850000,
    payment_date: '2024-04-06', payment_method: 'orange_money',
    contract_id: 'demo-contract-2', tenant_id: 'demo-tenant-2', property_id: 'demo-prop-4', owner_id: 'demo-owner-3',
    agency_id: DEMO_AGENCY_ID, created_at: '2024-04-06'
  }
];

const generatePayouts = (): ModularTransaction[] => {
  const payouts: ModularTransaction[] = [];
  const now = new Date();
  for (let m = 0; m < 12; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 10);
    const amount = (12500000 + 28000000) * 0.9; 
    payouts.push({
      id: `p-demo-owner-1-${m}`,
      agency_id: DEMO_AGENCY_ID,
      type: 'debit',
      amount,
      description: `Reversement Global - Période ${d.getMonth()+1}/${d.getFullYear()}`,
      category: 'owner_payout',
      transaction_date: d.toISOString(),
      payment_method: 'bank_transfer',
      related_owner_id: 'demo-owner-1',
      created_at: d.toISOString(),
      updated_at: d.toISOString()
    });
  }
  return payouts;
};

export const MOCK_TRANSACTIONS: ModularTransaction[] = [
  ...generatePayouts(),
  {
    id: 't1', agency_id: DEMO_AGENCY_ID, type: 'income', amount: 37500000,
    description: 'Paiement Caution + 1er mois (Résidence Palace)', category: 'loyer', transaction_date: '2024-01-05',
    payment_method: 'cash', created_at: '2024-01-05', updated_at: '2024-01-05'
  },
  {
    id: 't2', agency_id: DEMO_AGENCY_ID, type: 'income', amount: 12500000,
    description: 'Loyer Février 2024 - Résidence Palace', category: 'loyer', transaction_date: '2024-02-04',
    payment_method: 'orange_money', created_at: '2024-02-04', updated_at: '2024-02-04'
  }
];

export const MOCK_MANAGED_CONTRACTS: ManagedContract[] = [
  {
    id: 'mc1', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-1', property_id: 'demo-prop-1', tenant_id: null,
    contract_type: 'gestion', template_id: 'template-1', status: 'signed', effective_date: '2023-01-01', 
    end_date: '2025-01-01', renewal_date: null, document_url: null, financial_terms: {},
    context_snapshot: {}, created_by: 'system', updated_by: null, created_at: '2023-01-01', updated_at: '2023-01-01'
  },
  {
    id: 'mc2', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-1', property_id: 'demo-prop-2', tenant_id: null,
    contract_type: 'gestion', template_id: 'template-1', status: 'signed', effective_date: '2023-02-01',
    end_date: '2025-02-01', renewal_date: null, document_url: null, financial_terms: {},
    context_snapshot: {}, created_by: 'system', updated_by: null, created_at: '2023-02-01', updated_at: '2023-02-01'
  },
  {
    id: 'mc3', agency_id: DEMO_AGENCY_ID, owner_id: 'demo-owner-2', property_id: 'demo-prop-3', tenant_id: null,
    contract_type: 'gestion', template_id: 'template-1', status: 'signed', effective_date: '2023-04-01',
    end_date: '2025-04-01', renewal_date: null, document_url: null, financial_terms: {},
    context_snapshot: {}, created_by: 'system', updated_by: null, created_at: '2023-04-01', updated_at: '2023-04-01'
  }
];
