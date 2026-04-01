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

const CAPABILITY_COLORS: Record<string, string> = {
  'web-search': 'bg-sky-950 text-sky-400 border-sky-900',
  'news-search': 'bg-violet-950 text-violet-400 border-violet-900',
  'rug-check': 'bg-rose-950 text-rose-400 border-rose-900',
  'token-scoring': 'bg-amber-950 text-amber-400 border-amber-900',
  'market-scan': 'bg-emerald-950 text-emerald-400 border-emerald-900',
};

const DEFAULT_CAP_COLOR = 'bg-zinc-900 text-zinc-400 border-zinc-800';

const SERVICE_ICONS: Record<string, string> = {
  'agent-bazaar-search': 'S',
  'risk-sentinel': 'R',
};

export default function ServiceCard({ service }: { service: Service }) {
  const icon = SERVICE_ICONS[service.id] ?? service.name[0].toUpperCase();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-300 shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate">{service.name}</h3>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Online" />
          </div>
          {service.description && (
            <p className="text-xs text-zinc-500 leading-relaxed">{service.description}</p>
          )}
          {service.baseUrl && (
            <p className="text-xs text-zinc-600 font-mono mt-0.5 truncate">{service.baseUrl}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {service.capabilities.map(cap => (
          <span
            key={cap}
            className={`px-2 py-0.5 rounded-full text-xs border font-medium ${CAPABILITY_COLORS[cap] ?? DEFAULT_CAP_COLOR}`}
          >
            {cap}
          </span>
        ))}
      </div>

      <div className="border-t border-zinc-900 pt-4 flex flex-col gap-2">
        {service.endpoints.map(ep => (
          <div key={ep.path} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-zinc-600 font-mono uppercase text-[10px] w-8 shrink-0">{ep.method}</span>
              <span className="font-mono text-zinc-300 truncate">{ep.path}</span>
            </div>
            <span className="text-zinc-400 shrink-0 ml-2 tabular-nums">
              {ep.price} <span className="text-zinc-600">{ep.asset}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
