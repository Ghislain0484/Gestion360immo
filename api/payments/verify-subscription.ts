import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleVerifySubscriptionRequest } from '../../server/payments/verifySubscription';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const result = await handleVerifySubscriptionRequest(req.body);
  return res.status(result.status).json(result.body);
}
