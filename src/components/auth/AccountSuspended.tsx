import React from 'react';
import { ShieldAlert, Mail, Phone, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export const AccountSuspended: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70 animate-fade-in dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 transition-transform hover:rotate-6 dark:bg-rose-500/10">
          <ShieldAlert className="h-10 w-10 text-rose-600 dark:text-rose-300" />
        </div>

        <h1 className="mb-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Acces restreint</h1>
        <p className="mb-8 leading-relaxed text-slate-500 dark:text-slate-300">
          Le compte de votre agence a ete temporairement suspendu par l'administration de{' '}
          <span className="font-bold text-slate-900 dark:text-white">Gestion360Immo</span>.
          Cette mesure est generalement liee a un impaye ou a une revue administrative en cours.
        </p>

        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800/80">
            <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Contact support
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">support@gestion360immo.ci</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800/80">
            <Phone className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Assistance mobile
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">+225 27 24 35 12 12</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            className="w-full rounded-2xl bg-rose-600 py-4 font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 dark:shadow-rose-900/20"
            onClick={() => {
              window.location.href = 'mailto:support@gestion360immo.ci';
            }}
          >
            Contacter l'administration
          </Button>
          <Button
            variant="ghost"
            className="flex w-full items-center justify-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Se deconnecter
          </Button>
        </div>

        <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">
          Systeme de gestion immobiliere intelligent
        </p>
      </div>
    </div>
  );
};
