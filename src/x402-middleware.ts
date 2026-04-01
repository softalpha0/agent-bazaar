import type { Request, Response, NextFunction } from 'express';
import { getPublicKey, verifyPayment, getAssetLabel } from './stellar-wallet.js';
import { CONFIG } from './config.js';

const usedHashes = new Map<string, number>();
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [h, t] of usedHashes) if (t < cutoff) usedHashes.delete(h);
}, 5 * 60 * 1000).unref();

export const callStats = {
  total: 0,
  earned: 0,
  byEndpoint: {} as Record<string, number>,
  startedAt: new Date().toISOString(),
};

function record(endpoint: string, amount: number) {
  callStats.total++;
  callStats.earned = Math.round((callStats.earned + amount) * 1e7) / 1e7;
  callStats.byEndpoint[endpoint] = (callStats.byEndpoint[endpoint] ?? 0) + 1;
}

export function x402Gate(price: number) {
  const network = CONFIG.STELLAR_NETWORK === 'mainnet' ? 'stellar-mainnet' : 'stellar-testnet';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = (req.headers['x-payment'] as string | undefined)?.trim();
    const endpoint = req.path.split('/').filter(Boolean)[0] ?? 'unknown';
    const asset = getAssetLabel();

    if (!paymentHeader) {
      const payTo = getPublicKey();
      res.status(402).json({
        error: 'Payment Required',
        x402: {
          version: 1,
          scheme: 'exact',
          network,
          maxAmountRequired: price.toFixed(7),
          asset,
          payTo,
          description: `AgentBazaar — ${req.method} ${req.path}`,
          instructions: [
            `Send ${price} ${asset} to ${payTo} on ${network}`,
            'Retry with header: X-Payment: <tx-hash>',
          ],
        },
      });
      return;
    }

    if (usedHashes.has(paymentHeader)) {
      res.status(402).json({ error: 'Payment already used', code: 'REPLAY_DETECTED' });
      return;
    }

    const result = await verifyPayment(paymentHeader, price, getPublicKey());
    if (!result.valid) {
      res.status(402).json({ error: 'Payment invalid', reason: result.reason, code: 'PAYMENT_INVALID' });
      return;
    }

    usedHashes.set(paymentHeader, Date.now());
    record(endpoint, price);
    console.log(`[x402] ✓ ${price} ${asset} — ${req.path} — tx ${paymentHeader.slice(0, 10)}…`);
    next();
  };
}
