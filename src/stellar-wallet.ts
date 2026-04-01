import { Keypair, Asset, Horizon } from '@stellar/stellar-sdk';
import { CONFIG } from './config.js';

const USDC_ISSUER_MAINNET = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const HORIZON_URL = CONFIG.STELLAR_NETWORK === 'mainnet'
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

export function getPaymentAsset(): Asset {
  return CONFIG.STELLAR_NETWORK === 'mainnet'
    ? new Asset('USDC', USDC_ISSUER_MAINNET)
    : Asset.native();
}

export function getAssetLabel(): string {
  return CONFIG.STELLAR_NETWORK === 'mainnet' ? 'USDC' : 'XLM';
}

export function getKeypair(): Keypair {
  if (!CONFIG.STELLAR_SECRET_KEY) throw new Error('STELLAR_SECRET_KEY not set');
  return Keypair.fromSecret(CONFIG.STELLAR_SECRET_KEY);
}

export function getPublicKey(): string {
  return getKeypair().publicKey();
}

export function getServer(): Horizon.Server {
  return new Horizon.Server(HORIZON_URL, { allowHttp: false });
}

export async function getBalance(): Promise<string> {
  const server = getServer();
  const account = await server.loadAccount(getPublicKey());
  if (CONFIG.STELLAR_NETWORK !== 'mainnet') {
    return account.balances.find(b => b.asset_type === 'native')?.balance ?? '0';
  }
  const usdc = account.balances.find(
    b => b.asset_type !== 'native' &&
    (b as Horizon.HorizonApi.BalanceLineAsset).asset_code === 'USDC' &&
    (b as Horizon.HorizonApi.BalanceLineAsset).asset_issuer === USDC_ISSUER_MAINNET
  ) as Horizon.HorizonApi.BalanceLineAsset | undefined;
  return usdc?.balance ?? '0';
}

export interface VerifyResult { valid: boolean; reason?: string; amount?: string }

export async function verifyPayment(
  txHash: string,
  minAmount: number,
  destination: string,
): Promise<VerifyResult> {
  try {
    const server = getServer();
    const asset = getPaymentAsset();
    const page = await server.payments().forTransaction(txHash).limit(20).call();
    const records = page.records as Horizon.HorizonApi.PaymentOperationResponse[];

    const match = records.find(op => {
      if (op.type !== 'payment' || op.to !== destination) return false;
      if (parseFloat(op.amount) < minAmount) return false;
      return asset.isNative() ? op.asset_type === 'native' : (op.asset_code === 'USDC' && op.asset_issuer === USDC_ISSUER_MAINNET);
    });

    if (!match) return { valid: false, reason: `No matching payment >= ${minAmount} ${getAssetLabel()} found` };
    return { valid: true, amount: match.amount };
  } catch (e) {
    return { valid: false, reason: `Horizon error: ${e instanceof Error ? e.message : e}` };
  }
}
