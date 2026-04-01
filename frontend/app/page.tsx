'use client';

import { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import Header from '@/components/Header';

interface Endpoint {
  path: string;
  method: string;
  price: string;
  asset: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  baseUrl?: string;
  capabilities: string[];
  endpoints: Endpoint[];
  registeredAt: string;
  updatedAt: string;
}

const CAPABILITY_LABELS: Record<string, string> = {
  'web-search': 'Web Search',
  'news-search': 'News',
  'rug-check': 'Rug Check',
  'token-scoring': 'Token Scoring',
  'market-scan': 'Market Scan',
};

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [allCaps, setAllCaps] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/proxy/registry')
      .then(r => r.json())
      .then((data: { services: Service[] } | Service[]) => {
        const list = Array.isArray(data) ? data : (data as { services: Service[] }).services ?? [];
        setServices(list);
        const caps = Array.from(new Set(list.flatMap(s => s.capabilities)));
        setAllCaps(caps);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? services : services.filter(s => s.capabilities.includes(filter));

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <section className="relative dot-grid overflow-hidden">
        <div className="glow absolute inset-x-0 top-0 h-80 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 text-zinc-400 text-xs mb-8 bg-zinc-950/60">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Built for the machine economy · Stellar x402
          </div>
          <h1 className="text-5xl font-semibold tracking-tight leading-tight mb-5">
            The service registry<br />
            <span className="text-zinc-400">for AI agents</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Discover, pay for, and integrate AI services using x402 micropayments on Stellar.
            No subscriptions. No keys. Pay per query.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="#catalogue"
              className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Browse services
            </a>
            <a
              href="#how-it-works"
              className="px-5 py-2.5 border border-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:border-zinc-600 hover:text-white transition-colors"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      <div className="border-y border-zinc-900 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-center gap-10 text-sm">
          <div className="flex items-center gap-2.5 text-zinc-400">
            <span className="text-white font-medium">{services.length}</span>
            services registered
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2.5 text-zinc-400">
            <span className="text-white font-medium">{allCaps.length}</span>
            capabilities
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Stellar testnet live
          </div>
        </div>
      </div>

      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">Protocol</p>
        <h2 className="text-2xl font-semibold mb-12">How x402 payments work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-900 rounded-xl overflow-hidden">
          {[
            {
              step: '01',
              title: 'Discover',
              desc: 'Query the registry to find services by capability. Every service exposes its price and payment address.',
            },
            {
              step: '02',
              title: 'Pay',
              desc: 'Send XLM (testnet) or USDC (mainnet) to the service wallet. Include the tx hash in your request header.',
            },
            {
              step: '03',
              title: 'Receive',
              desc: 'The service verifies your payment on Horizon and returns the result. No API keys, no subscriptions.',
            },
          ].map(item => (
            <div key={item.step} className="bg-zinc-950 p-8">
              <div className="text-5xl font-bold text-zinc-800 mb-4 select-none">{item.step}</div>
              <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-6">Payment flow</p>
          <div className="flex flex-col gap-3">
            {[
              { from: 'Agent', arrow: '→', to: 'Service', label: 'GET /search?q=...', color: 'text-sky-400' },
              { from: 'Service', arrow: '→', to: 'Agent', label: '402 Payment Required  ·  price: 0.01 XLM  ·  dest: G...', color: 'text-amber-400' },
              { from: 'Agent', arrow: '→', to: 'Stellar', label: 'Send 0.01 XLM  →  get txHash', color: 'text-violet-400' },
              { from: 'Agent', arrow: '→', to: 'Service', label: 'GET /search?q=...  X-Payment: txHash', color: 'text-sky-400' },
              { from: 'Service', arrow: '→', to: 'Agent', label: '200 OK  ·  { results: [...] }', color: 'text-emerald-400' },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-right text-zinc-400 shrink-0">{row.from}</span>
                <span className="text-zinc-600">{row.arrow}</span>
                <span className="w-16 text-zinc-400 shrink-0">{row.to}</span>
                <span className={`font-mono text-xs ${row.color}`}>{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogue" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Registry</p>
            <h2 className="text-2xl font-semibold">Available services</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
              }`}
            >
              All
            </button>
            {allCaps.map(cap => (
              <button
                key={cap}
                onClick={() => setFilter(cap)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === cap
                    ? 'bg-white text-black'
                    : 'border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                }`}
              >
                {CAPABILITY_LABELS[cap] ?? cap}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-52 rounded-xl shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 text-sm">
            No services found for this capability.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-zinc-900">
        <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Register your service</h3>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              Any x402-compatible HTTP service can list itself here. Agents discover and pay you automatically — no integration work.
            </p>
          </div>
          <div className="shrink-0">
            <code className="block bg-zinc-950 border border-zinc-800 rounded-lg px-5 py-3 text-xs text-zinc-300 font-mono leading-relaxed">
              POST /registry<br />
              <span className="text-zinc-500">{'{ id, name, capabilities, endpoints }'}</span>
            </code>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-zinc-600">
          <span>AgentBazaar · Built on Stellar</span>
          <span>x402 · Stellar Testnet</span>
        </div>
      </footer>
    </div>
  );
}
