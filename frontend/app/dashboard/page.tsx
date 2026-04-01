'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';

interface Stats {
  totalCalls: number;
  totalEarned: number;
  asset: string;
  callCounts: { search: number; news: number };
  startedAt: string;
}

interface Balance {
  publicKey: string;
  balance: string;
  asset: string;
  network: string;
}

interface Payment {
  id: string;
  type: string;
  amount?: string;
  asset_type?: string;
  from?: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function StatCard({ label, value, sub, live }: { label: string; value: string | number; sub?: string; live?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 uppercase tracking-widest">{label}</span>
        {live && <span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>}
      </div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [uptime, setUptime] = useState('—');

  async function fetchAll() {
    try {
      const [sRes, bRes] = await Promise.all([
        fetch('/api/proxy/stats'),
        fetch('/api/proxy/balance'),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (bRes.ok) setBalance(await bRes.json());
    } catch { /* backend offline */ }
  }

  async function fetchPayments(publicKey: string) {
    try {
      const res = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}/payments?order=desc&limit=8`
      );
      const data = await res.json();
      setPayments(
        (data._embedded?.records ?? []).filter(
          (p: Payment) => p.type === 'payment' && p.asset_type === 'native'
        )
      );
    } catch { /* horizon offline */ }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (balance?.publicKey) fetchPayments(balance.publicKey);
    const interval = setInterval(() => {
      if (balance?.publicKey) fetchPayments(balance.publicKey);
    }, 8000);
    return () => clearInterval(interval);
  }, [balance?.publicKey]);

  useEffect(() => {
    if (!stats?.startedAt) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(stats.startedAt).getTime()) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptime(`${h}:${m}:${s}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [stats?.startedAt]);

  const earned = stats ? stats.totalEarned.toFixed(4) : '—';

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">

        {/* Page title */}
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Live</p>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
          </div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-white transition-colors">
            ← Back to registry
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total calls" value={stats?.totalCalls ?? '—'} live />
          <StatCard label="XLM earned" value={earned} sub={`${stats?.asset ?? 'XLM'} testnet`} live />
          <StatCard label="Uptime" value={uptime} sub="hh:mm:ss" />
          <StatCard
            label="Balance"
            value={balance ? `${parseFloat(balance.balance).toFixed(2)}` : '—'}
            sub={`${balance?.asset ?? 'XLM'} · ${balance?.network ?? ''}`}
            live
          />
        </div>

        {/* Endpoint breakdown + recent payments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          {/* Endpoint breakdown */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-5">Endpoint calls</p>
            <div className="flex flex-col gap-4">
              {[
                { label: '/search', price: '0.01 XLM', count: stats?.callCounts.search ?? 0, color: 'bg-sky-500' },
                { label: '/news',   price: '0.02 XLM', count: stats?.callCounts.news ?? 0,   color: 'bg-violet-500' },
              ].map(ep => {
                const total = (stats?.callCounts.search ?? 0) + (stats?.callCounts.news ?? 0);
                const pct   = total > 0 ? Math.round((ep.count / total) * 100) : 0;
                return (
                  <div key={ep.label}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ep.color}`} />
                        <span className="font-mono text-zinc-300">{ep.label}</span>
                        <span className="text-zinc-600 text-xs">{ep.price}</span>
                      </div>
                      <span className="tabular-nums text-zinc-400">{ep.count}</span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ep.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wallet info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-5">Receiving wallet</p>
            {balance ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Public key</p>
                  <p className="font-mono text-xs text-zinc-300 break-all leading-relaxed">{balance.publicKey}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Balance</p>
                    <p className="text-sm font-medium">{parseFloat(balance.balance).toFixed(4)} <span className="text-zinc-500">{balance.asset}</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Network</p>
                    <p className="text-sm font-medium capitalize">{balance.network}</p>
                  </div>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${balance.publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  View on Stellar Expert →
                </a>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Backend offline</p>
            )}
          </div>
        </div>

        {/* Recent payments feed */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Recent payments</p>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Horizon · 8s refresh
            </span>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">Waiting for payments…</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-900">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-mono text-zinc-400 text-xs truncate">
                      {p.from?.slice(0, 6)}…{p.from?.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-emerald-400 font-medium tabular-nums">+{parseFloat(p.amount ?? '0').toFixed(4)} XLM</span>
                    <span className="text-zinc-600 text-xs">{timeAgo(p.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API reference */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-5">API reference</p>
          <div className="flex flex-col divide-y divide-zinc-900">
            {[
              { method: 'GET', path: '/registry',       price: 'free',     desc: 'List all registered services' },
              { method: 'POST', path: '/registry',      price: 'free',     desc: 'Register a new service' },
              { method: 'GET', path: '/.well-known/x402', price: 'free',   desc: 'Machine-readable payment metadata' },
              { method: 'GET', path: '/search?q=',      price: '0.01 XLM', desc: 'Web search (x402)' },
              { method: 'GET', path: '/news?q=',        price: '0.02 XLM', desc: 'News search (x402)' },
            ].map(row => (
              <div key={`${row.method}:${row.path}`} className="flex items-center justify-between py-3 text-sm gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-mono font-semibold w-8 shrink-0 ${row.method === 'POST' ? 'text-amber-400' : 'text-sky-400'}`}>
                    {row.method}
                  </span>
                  <span className="font-mono text-zinc-300 text-xs">{row.path}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-zinc-500 hidden md:block">{row.desc}</span>
                  <span className={`text-xs tabular-nums ${row.price === 'free' ? 'text-zinc-600' : 'text-emerald-400'}`}>
                    {row.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
