# AgentBazaar

A service registry and pay-per-query search API for AI agents, powered by x402 micropayments on Stellar.

Agents discover services, pay per request in XLM (testnet) or USDC (mainnet), and receive results — no API keys, no subscriptions, no human in the loop.

**Live:** https://agent-bazaar-frontend-production.up.railway.app
**API:** https://agent-bazaar-production-064c.up.railway.app

---

## What it does

**Registry** — Any x402-compatible service can register itself with a list of capabilities and pricing. Agents query the registry to discover what's available.

**Pay-per-query search** — Web search and news search endpoints gated by x402. An agent sends a query, receives a `402 Payment Required` response with payment details, pays on Stellar, then retries with the transaction hash to get real results.

**Machine-to-machine** — The entire flow is automated. No human approves payments. Agents discover, pay, and receive — autonomously.

---

## How x402 works

```
Agent  →  Service    GET /search?q=...
Service →  Agent     402 Payment Required
                     { payTo: G..., price: 0.01, asset: XLM }

Agent  →  Stellar    Send 0.01 XLM → get txHash
Agent  →  Service    GET /search?q=...
                     X-Payment: txHash
Service →  Horizon   Verify payment on-chain
Service →  Agent     200 OK { results: [...] }
```

---

## API

All endpoints are at `https://agent-bazaar-production-064c.up.railway.app`

### Free

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service info and payment metadata |
| GET | `/registry` | List all registered services |
| GET | `/registry/:id` | Get a specific service |
| POST | `/registry` | Register a new service |
| GET | `/.well-known/x402` | Machine-readable payment configuration |

### Paid (x402)

| Method | Path | Price | Description |
|--------|------|-------|-------------|
| GET | `/search?q=` | 0.01 XLM | Web search |
| GET | `/news?q=` | 0.02 XLM | News search |

#### Making a paid request

```bash
# Step 1 — probe (returns 402 with payment details)
curl https://agent-bazaar-production-064c.up.railway.app/search?q=stellar

# Step 2 — pay on Stellar, get txHash

# Step 3 — retry with payment proof
curl https://agent-bazaar-production-064c.up.railway.app/search?q=stellar \
  -H "X-Payment: <txHash>"
```

#### Registering a service

```bash
curl -X POST https://agent-bazaar-production-064c.up.railway.app/registry \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-service",
    "name": "My Service",
    "url": "https://my-service.com",
    "capabilities": ["image-analysis"],
    "endpoints": [
      {
        "path": "/analyze",
        "method": "GET",
        "description": "Analyze an image",
        "price": "0.05",
        "asset": "XLM"
      }
    ]
  }'
```

---

## Running locally

### Prerequisites
- Node.js 22+
- A Stellar testnet wallet (funded via [friendbot](https://friendbot.stellar.org))
- Tavily API key (free at [app.tavily.com](https://app.tavily.com))

### Backend

```bash
cd AgentBazaar
cp .env.example .env
# Fill in STELLAR_SECRET_KEY and TAVILY_API_KEY
npm install
npm run dev
# Runs on http://localhost:4000
```

### Frontend

```bash
cd AgentBazaar/frontend
npm install
npm run dev
# Runs on http://localhost:3001
```

### Consumer agent

Demonstrates the full x402 payment flow end-to-end:

```bash
cd AgentBazaar
CONSUMER_SECRET=S... QUERY="your search query" npm run consumer
```

The consumer agent will:
1. Query the registry to discover available services
2. Hit `/search` — receive a `402` with payment details
3. Submit XLM payment on Stellar testnet
4. Retry with the transaction hash
5. Print real search results

---

## Environment variables

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `STELLAR_SECRET_KEY` | Secret key of the wallet that receives payments |
| `STELLAR_NETWORK` | `testnet` or `mainnet` |
| `TAVILY_API_KEY` | Tavily search API key |
| `BASE_URL` | Public URL of this server |
| `PORT` | Port to listen on (default: 4000) |

### Frontend

| Variable | Description |
|----------|-------------|
| `BAZAAR_API_URL` | URL of the backend API |

---

## Architecture

```
┌─────────────────┐     registry (free)      ┌──────────────────┐
│  Consumer Agent │ ───────────────────────► │                  │
│                 │                           │  AgentBazaar API │
│                 │  GET /search (402)        │  Express + x402  │
│                 │ ───────────────────────► │                  │
│                 │                           │  Verifies on     │
│                 │  Send XLM on Stellar      │  Stellar Horizon │
│                 │ ──────────────────┐       │                  │
│                 │                   ▼       │                  │
│                 │  Retry + txHash   Stellar │                  │
│                 │ ───────────────────────► │  200 + results   │
└─────────────────┘                           └──────────────────┘
```

**Payment verification** — the server calls `horizon-testnet.stellar.org` to confirm the transaction hash matches the expected destination, amount, and asset before serving the response.

**Replay protection** — used transaction hashes are stored in memory with a 10-minute TTL so the same payment cannot be reused.

**Service registry** — in-memory Map, pre-seeded with AgentBazaar Search and Risk Sentinel. Any agent or service can register via `POST /registry`.

---

## Stack

- **Stellar SDK** — payment signing, Horizon verification
- **Express 5** — API server
- **Next.js 15** — frontend
- **Tavily** — search provider
- **TypeScript** — throughout
- **Railway** — deployment
