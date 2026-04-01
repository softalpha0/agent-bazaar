import { CONFIG } from './config.js';

const TAVILY_BASE = 'https://api.tavily.com';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

export interface NewsResult {
  title: string;
  url: string;
  description: string;
  source: string;
  age?: string;
}

function mockWebResults(query: string): SearchResult[] {
  return [
    { title: `${query} — Overview`, url: `https://example.com/${query.replace(/\s+/g, '-')}`, description: `Comprehensive overview of ${query}. [DEMO — add TAVILY_API_KEY for live results]`, age: '1 day ago' },
    { title: `${query} latest news`, url: 'https://example.com/news', description: `Latest updates about ${query}. [DEMO — add TAVILY_API_KEY for live results]`, age: '2 hours ago' },
    { title: `Understanding ${query}`, url: 'https://example.com/guide', description: `Deep dive into ${query} and how it works. [DEMO — add TAVILY_API_KEY for live results]`, age: '3 days ago' },
  ];
}

function mockNewsResults(query: string): NewsResult[] {
  return [
    { title: `Breaking: ${query} development`, url: 'https://example.com/news/1', description: `Latest news on ${query}. [DEMO — add TAVILY_API_KEY for live results]`, source: 'Demo News', age: '1 hour ago' },
    { title: `${query} analysis`, url: 'https://example.com/news/2', description: `In-depth analysis of ${query}. [DEMO — add TAVILY_API_KEY for live results]`, source: 'Demo Times', age: '3 hours ago' },
  ];
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

export async function webSearch(query: string, count = 5): Promise<SearchResult[]> {
  if (!CONFIG.TAVILY_API_KEY) {
    console.log('[Search] No TAVILY_API_KEY — returning mock results');
    return mockWebResults(query);
  }

  const res = await fetch(`${TAVILY_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: CONFIG.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: Math.min(count, 10),
      include_answer: false,
    }),
  });

  if (!res.ok) throw new Error(`Tavily search error: ${res.status}`);
  const data = await res.json() as TavilyResponse;

  return (data.results ?? []).map(r => ({
    title: r.title,
    url: r.url,
    description: r.content,
    age: r.published_date,
  }));
}

export async function newsSearch(query: string, count = 5): Promise<NewsResult[]> {
  if (!CONFIG.TAVILY_API_KEY) {
    console.log('[News] No TAVILY_API_KEY — returning mock results');
    return mockNewsResults(query);
  }

  const res = await fetch(`${TAVILY_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: CONFIG.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      topic: 'news',
      max_results: Math.min(count, 10),
      include_answer: false,
    }),
  });

  if (!res.ok) throw new Error(`Tavily news error: ${res.status}`);
  const data = await res.json() as TavilyResponse;

  return (data.results ?? []).map(r => {
    const hostname = (() => { try { return new URL(r.url).hostname; } catch { return 'Unknown'; } })();
    return {
      title: r.title,
      url: r.url,
      description: r.content,
      source: hostname,
      age: r.published_date,
    };
  });
}
