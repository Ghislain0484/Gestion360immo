/**
 * Flutterwave Integration Service
 * Documentation: https://github.com/Flutterwave/flutterwave-react-v3
 */

export const FLUTTERWAVE_CONFIG = {
  getPublicKey: () => import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-SANDBOX-KEY',
};

export interface FlutterwavePaymentData {
  amount: number;
  email: string;
  phone: string;
  name: string;
  title: string;
  description: string;
  tx_ref: string;
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
    customizations: {
      title: data.title,
      description: data.description,
      logo: 'https://gestion360immo.com/logo.png', // À adapter
    },
  };
};
