// src/components/admin/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from '../ui/Tabs';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AgencyRequests } from './AgencyRequests';
import { AgencyManagement } from './AgencyManagement';
import { SubscriptionManagement } from './SubscriptionManagement';
import { PlatformSettings } from './PlatformSettings';
import { AgencyRankings } from './AgencyRankings';
import { dbService } from '../../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ agenciesApproved: number; agenciesPending: number; subscriptions: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await dbService.getPlatformStats();
        setStats(s);
      } catch (e) {
        console.error('Error fetching platform stats:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* En-tête KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-sm text-gray-500">Agences approuvées</div>
          <div className="text-2xl font-semibold">{stats?.agenciesApproved ?? (loading ? '…' : 0)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">Demandes en attente</div>
          <div className="text-2xl font-semibold">
            <Badge variant="warning">{stats?.agenciesPending ?? (loading ? '…' : 0)}</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">Abonnements</div>
          <div className="text-2xl font-semibold">{stats?.subscriptions ?? (loading ? '…' : 0)}</div>
        </Card>
      </div>

      {/* Tabs Admin */}
      <Tabs>
        <TabList>
          <Tab>Demandes d’agence</Tab>
          <Tab>Agences</Tab>
          <Tab>Abonnements</Tab>
          <Tab>Classements</Tab>
          <Tab>Paramètres plateforme</Tab>
        </TabList>

        <TabPanel>
          <AgencyRequests />
        </TabPanel>
        <TabPanel>
          <AgencyManagement />
        </TabPanel>
        <TabPanel>
          <SubscriptionManagement />
        </TabPanel>
        <TabPanel>
          <AgencyRankings />
        </TabPanel>
        <TabPanel>
          <PlatformSettings />
        </TabPanel>
      </Tabs>
    </div>
  );
};
