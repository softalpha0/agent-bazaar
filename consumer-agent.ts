import 'dotenv/config';
import {
  Keypair,
  Asset,
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
} from '@stellar/stellar-sdk';

const CONSUMER_SECRET = process.env.CONSUMER_SECRET ?? '';
const BAZAAR_URL      = (process.env.BAZAAR_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const QUERY           = process.env.QUERY ?? 'Stellar blockchain AI agents 2025';
const HORIZON_URL     = 'https://horizon-testnet.stellar.org';

if (!CONSUMER_SECRET) {
  console.error('\n  ✗  Set CONSUMER_SECRET=S... (your consumer wallet secret)\n');
  process.exit(1);
}

const consumer = Keypair.fromSecret(CONSUMER_SECRET);
const server   = new Horizon.Server(HORIZON_URL, { allowHttp: false });

function log(tag: string, msg: string) {
  const colors: Record<string, string> = {
    INFO:  '\x1b[36m',
    PAY:   '\x1b[33m',
    OK:    '\x1b[32m',
    ERR:   '\x1b[31m',
    STEP:  '\x1b[35m',
  };
  const reset = '\x1b[0m';
  console.log(`  ${colors[tag] ?? ''}[${tag}]${reset} ${msg}`);
}

async function sendXLM(destination: string, amount: string): Promise<string> {
  const account = await server.loadAccount(consumer.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination,
      asset: Asset.native(),
      amount,
    }))
    .setTimeout(30)
    .build();

  tx.sign(consumer);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

async function callWithPayment(
  path: string,
  params: Record<string, string>,
  price: number,
  payTo: string,
): Promise<unknown> {
  const url = new URL(`${BAZAAR_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  log('STEP', `GET ${path}?${url.searchParams}`);
  const probe = await fetch(url.toString());

  if (probe.status !== 402) {
    const data = await probe.json();
    return data;
  }

  const body = await probe.json() as { x402: { payTo: string; maxAmountRequired: string; asset: string } };
  const paymentDetails = body.x402;
  const actualDest    = payTo || paymentDetails.payTo;
  const actualAmount  = price.toFixed(7);

  log('PAY', `402 received — paying ${actualAmount} XLM to ${actualDest.slice(0, 8)}…`);

  const txHash = await sendXLM(actualDest, actualAmount);
  log('PAY', `tx submitted → ${txHash}`);

  log('STEP', `Retrying with X-Payment: ${txHash.slice(0, 12)}…`);
  const paid = await fetch(url.toString(), {
    headers: { 'X-Payment': txHash },
  });

  if (!paid.ok) {
    const err = await paid.json();
    throw new Error(`Server rejected payment: ${JSON.stringify(err)}`);
  }

  return await paid.json();
}

async function main() {
  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║       AGENTBAZAAR CONSUMER AGENT         ║');
  console.log('  ╚══════════════════════════════════════════╝\n');

  log('INFO', `Consumer wallet: ${consumer.publicKey()}`);

  try {
    const account = await server.loadAccount(consumer.publicKey());
    const xlm = account.balances.find(b => b.asset_type === 'native')?.balance ?? '0';
    log('INFO', `Balance: ${xlm} XLM`);
  } catch {
    log('ERR', 'Could not load consumer account — is it funded on testnet?');
    process.exit(1);
  }

  console.log('\n  ── Discovering services from registry ──────────────────────\n');
  const registryRes = await fetch(`${BAZAAR_URL}/registry`);
  const registry    = await registryRes.json() as { services: { id: string; name: string; capabilities: string[]; endpoints: { path: string; price: string; asset: string }[]; url: string }[]; total: number };

  log('OK', `Found ${registry.total} service(s) in the registry`);
  for (const svc of registry.services) {
    log('INFO', `  · ${svc.name}  [${svc.capabilities.join(', ')}]`);
    for (const ep of svc.endpoints) {
      log('INFO', `      ${ep.path}  →  ${ep.price} ${ep.asset}`);
    }
  }

  const searchSvc = registry.services.find(s => s.capabilities.includes('web-search'));
  if (!searchSvc) {
    log('ERR', 'No web-search service found in registry');
    process.exit(1);
  }
  const searchEndpoint = searchSvc.endpoints.find(e => e.path === '/search');
  const searchPrice    = parseFloat(searchEndpoint?.price ?? '0.01');
  const payTo          = '';

  console.log('\n  ── Web search (x402 payment) ────────────────────────────────\n');
  log('INFO', `Query: "${QUERY}"`);
  log('INFO', `Price: ${searchPrice} XLM`);

  const searchData = await callWithPayment('/search', { q: QUERY, count: '3' }, searchPrice, payTo) as {
    query: string;
    count: number;
    results: { title: string; url: string; description: string }[];
  };

  console.log('\n  ── Results ─────────────────────────────────────────────────\n');
  log('OK', `${searchData.count} result(s) for "${searchData.query}"`);
  for (const r of searchData.results) {
    console.log(`\n    ${r.title}`);
    console.log(`    \x1b[36m${r.url}\x1b[0m`);
    console.log(`    ${r.description.slice(0, 120)}${r.description.length > 120 ? '…' : ''}`);
  }

  console.log('\n  ── News search (x402 payment) ───────────────────────────────\n');
  const newsEndpoint = searchSvc.endpoints.find(e => e.path === '/news');
  const newsPrice    = parseFloat(newsEndpoint?.price ?? '0.02');

  log('INFO', `Query: "${QUERY}"`);
  log('INFO', `Price: ${newsPrice} XLM`);

  const newsData = await callWithPayment('/news', { q: QUERY, count: '3' }, newsPrice, payTo) as {
    query: string;
    count: number;
    results: { title: string; url: string; source: string }[];
  };

  console.log('\n  ── News Results ─────────────────────────────────────────────\n');
  log('OK', `${newsData.count} article(s) found`);
  for (const r of newsData.results) {
    console.log(`\n    ${r.title}`);
    console.log(`    \x1b[36m${r.url}\x1b[0m`);
    console.log(`    Source: ${r.source}`);
  }

  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║   x402 demo complete — payments verified  ║');
  console.log('  ╚══════════════════════════════════════════╝\n');
}

main().catch(e => {
  log('ERR', String(e));
  process.exit(1);
});
