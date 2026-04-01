import 'dotenv/config';
import express from 'express';
import { CONFIG } from './src/config.js';
import { x402Gate, callStats } from './src/x402-middleware.js';
import { webSearch, newsSearch } from './src/search.js';
import { list, get, register, remove } from './src/registry.js';
import { getPublicKey, getBalance, getAssetLabel } from './src/stellar-wallet.js';

const app = express();
app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment');
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AgentBazaar',
    version: '1.0.0',
    payment: {
      protocol: 'x402',
      network: CONFIG.STELLAR_NETWORK,
      asset: getAssetLabel(),
      payTo: CONFIG.STELLAR_SECRET_KEY ? getPublicKey() : 'not-configured',
    },
    endpoints: {
      'GET /search?q=':     `0.01 ${getAssetLabel()}`,
      'GET /news?q=':       `0.02 ${getAssetLabel()}`,
      'GET /registry':      'free',
      'POST /registry':     'free',
    },
  });
});

app.get('/balance', async (_req, res) => {
  try {
    const balance = await getBalance();
    res.json({ publicKey: getPublicKey(), balance, asset: getAssetLabel(), network: CONFIG.STELLAR_NETWORK });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/stats', (_req, res) => {
  res.json({
    totalCalls: callStats.total,
    totalEarned: callStats.earned,
    asset: getAssetLabel(),
    callCounts: { search: callStats.byEndpoint['search'] ?? 0, news: callStats.byEndpoint['news'] ?? 0 },
    startedAt: callStats.startedAt,
  });
});

app.get('/.well-known/x402', (_req, res) => {
  const asset = getAssetLabel();
  res.json({
    version: 1,
    network: CONFIG.STELLAR_NETWORK,
    payTo: CONFIG.STELLAR_SECRET_KEY ? getPublicKey() : null,
    services: [
      { path: '/search', method: 'GET', price: `0.01`, asset, description: 'Web search' },
      { path: '/news',   method: 'GET', price: `0.02`, asset, description: 'News search' },
    ],
  });
});

app.get('/registry', (req, res) => {
  const { capability } = req.query as { capability?: string };
  res.json({ services: list(capability), total: list(capability).length });
});

app.get('/registry/:id', (req, res) => {
  const service = get(req.params.id);
  if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
  res.json(service);
});

app.post('/registry', (req, res) => {
  const body = req.body as { id?: string; name?: string; url?: string; capabilities?: string[]; endpoints?: unknown[] };
  if (!body.id || !body.name || !body.url) {
    res.status(400).json({ error: 'id, name, and url are required' });
    return;
  }
  const service = register({
    id: body.id,
    name: body.name,
    tagline: (body as { tagline?: string }).tagline ?? body.name,
    description: (body as { description?: string }).description ?? '',
    url: body.url,
    capabilities: body.capabilities ?? [],
    endpoints: (body.endpoints as import('./src/registry.js').ServiceEndpoint[]) ?? [],
    network: CONFIG.STELLAR_NETWORK,
  });
  console.log(`[Registry] Registered: ${service.name} (${service.id})`);
  res.status(201).json(service);
});

app.delete('/registry/:id', (req, res) => {
  const ok = remove(req.params.id);
  res.json({ success: ok });
});

app.get('/search', x402Gate(0.01), async (req, res) => {
  const q = req.query.q as string | undefined;
  const count = Math.min(Number(req.query.count ?? 5), 10);
  if (!q?.trim()) { res.status(400).json({ error: 'Missing ?q=' }); return; }

  try {
    const results = await webSearch(q, count);
    res.json({ query: q, count: results.length, results });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/news', x402Gate(0.02), async (req, res) => {
  const q = req.query.q as string | undefined;
  const count = Math.min(Number(req.query.count ?? 5), 10);
  if (!q?.trim()) { res.status(400).json({ error: 'Missing ?q=' }); return; }

  try {
    const results = await newsSearch(q, count);
    res.json({ query: q, count: results.length, results });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(CONFIG.PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║           AGENT BAZAAR ONLINE            ║
╠══════════════════════════════════════════╣
║  Port    : ${CONFIG.PORT}                          ║
║  Network : ${CONFIG.STELLAR_NETWORK}                     ║
║  Asset   : ${getAssetLabel()}                          ║
╚══════════════════════════════════════════╝

  Free endpoints:
    GET /health
    GET /registry
    GET /registry/:id
    POST /registry

  Paid endpoints:
    GET /search?q=...    0.01 ${getAssetLabel()}
    GET /news?q=...      0.02 ${getAssetLabel()}
`);
});
