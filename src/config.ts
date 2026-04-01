export const CONFIG = {
  STELLAR_SECRET_KEY: (process.env.STELLAR_SECRET_KEY ?? '').trim(),
  STELLAR_NETWORK: (process.env.STELLAR_NETWORK ?? 'testnet') as 'testnet' | 'mainnet',
  TAVILY_API_KEY: (process.env.TAVILY_API_KEY ?? '').trim(),
  PORT: Number(process.env.PORT ?? 4000),
  BASE_URL: (process.env.BASE_URL ?? 'http://localhost:4000').replace(/\/$/, ''),
} as const;
