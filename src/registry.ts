import { CONFIG } from './config.js';

export interface ServiceEndpoint {
  path: string;
  method: string;
  description: string;
  price: string;
  asset: string;
}

export interface Service {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  capabilities: string[];
  endpoints: ServiceEndpoint[];
  network: 'testnet' | 'mainnet';
  registeredAt: string;
  updatedAt: string;
}

const services = new Map<string, Service>();

function seed() {
  const network = CONFIG.STELLAR_NETWORK;
  const asset = network === 'mainnet' ? 'USDC' : 'XLM';

  register({
    id: 'agent-bazaar-search',
    name: 'AgentBazaar Search',
    tagline: 'Pay-per-query web & news search',
    description: 'Web search and news search powered by Brave. No subscriptions — pay per query on Stellar.',
    url: CONFIG.BASE_URL,
    capabilities: ['web-search', 'news-search'],
    endpoints: [
      { path: '/search', method: 'GET', description: 'Web search (returns title, URL, description)', price: '0.01', asset },
      { path: '/news',   method: 'GET', description: 'News search (returns recent articles)',        price: '0.02', asset },
    ],
    network,
  });

  register({
    id: 'risk-sentinel',
    name: 'Risk Sentinel',
    tagline: 'Solana memecoin intelligence',
    description: 'Rug-check and composite scoring for Solana tokens. Filters rugs, scores momentum, returns BUY/SKIP.',
    url: 'http://localhost:7379',
    capabilities: ['rug-check', 'token-scoring', 'market-scan'],
    endpoints: [
      { path: '/rug-check', method: 'GET', description: 'Full rug safety analysis',    price: '0.02', asset },
      { path: '/score',     method: 'GET', description: 'Composite 0–100 score',       price: '0.01', asset },
      { path: '/scan',      method: 'GET', description: 'Full live market scan',       price: '0.05', asset },
    ],
    network,
  });
}

export function register(data: Omit<Service, 'registeredAt' | 'updatedAt'>): Service {
  const now = new Date().toISOString();
  const existing = services.get(data.id);
  const service: Service = {
    ...data,
    registeredAt: existing?.registeredAt ?? now,
    updatedAt: now,
  };
  services.set(service.id, service);
  return service;
}

export function list(capability?: string): Service[] {
  const all = Array.from(services.values());
  if (!capability) return all;
  return all.filter(s => s.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase())));
}

export function get(id: string): Service | undefined {
  return services.get(id);
}

export function remove(id: string): boolean {
  return services.delete(id);
}

seed();
