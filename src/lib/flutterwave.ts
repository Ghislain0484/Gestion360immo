export const FLUTTERWAVE_CONFIG = {
  getPublicKey: () => {
    const key = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
    if (!key || key.includes('SANDBOX')) {
      console.error("CRITIQUE: La clé publique Flutterwave (VITE_FLUTTERWAVE_PUBLIC_KEY) est absente ou invalide dans Vercel !");
    }
    return key || '';
  },
};

export type PaymentType = 'subscription' | 'maintenance' | 'service_fee';

export interface FlutterwavePaymentData {
  amount: number;
  email: string;
  phone: string;
  name: string;
  title: string;
  description: string;
  tx_ref: string;
  payment_type: PaymentType;
  metadata?: Record<string, any>;
  logo_url?: string | null;
}

export const getFlutterwaveConfig = (data: FlutterwavePaymentData) => {
  return {
    public_key: FLUTTERWAVE_CONFIG.getPublicKey(),
    tx_ref: data.tx_ref,
    amount: data.amount,
    currency: 'XOF',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: data.email,
      phone_number: data.phone,
      name: data.name,
    },
    meta: {
      payment_type: data.payment_type,
      ...data.metadata
    },
    customizations: {
      title: data.title,
      description: data.description,
      logo: data.logo_url || 'https://jedknkbevxiyytsypjrv.supabase.co/storage/v1/object/public/platform/logo-main.png',
    },
  };
};
