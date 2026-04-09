const BASE = '/api';

export async function fetchWatchlist() {
  const res = await fetch(`${BASE}/watchlist`);
  if (!res.ok) throw new Error(`Failed to fetch watchlist: ${res.statusText}`);
  return res.json();
}

export async function fetchPortfolio(portfolioId: string) {
  const res = await fetch(`${BASE}/portfolios/${portfolioId}`);
  if (!res.ok) throw new Error(`Failed to fetch portfolio: ${res.statusText}`);
  return res.json();
}

export async function fetchSecurity(securityId: string) {
  const res = await fetch(`${BASE}/securities/${securityId}`);
  if (!res.ok) throw new Error(`Failed to fetch security: ${res.statusText}`);
  return res.json();
}

export async function fetchAnalyses(securityId: string) {
  const res = await fetch(`${BASE}/securities/${securityId}/analyses`);
  if (!res.ok) throw new Error(`Failed to fetch analyses: ${res.statusText}`);
  return res.json();
}

export async function fetchPortfolioBeta() {
  const res = await fetch(`${BASE}/portfolios/beta/combined`);
  if (!res.ok) throw new Error(`Failed to fetch beta: ${res.statusText}`);
  return res.json();
}

export async function fetchCoveredCalls() {
  const res = await fetch(`${BASE}/covered-calls`);
  if (!res.ok) throw new Error('Failed to fetch covered calls');
  return res.json();
}

export async function fetchOpportunities() {
  const res = await fetch(`${BASE}/opportunities`);
  if (!res.ok) throw new Error('Failed to fetch opportunities');
  return res.json();
}

export async function fetchLiveMetrics(symbol: string) {
  const res = await fetch(`${BASE}/securities/${symbol}/live`);
  if (!res.ok) throw new Error('Failed to fetch live metrics');
  return res.json();
}

export async function fetchEtfRankings() {
  const res = await fetch(`${BASE}/etfs/rankings`);
  if (!res.ok) throw new Error('Failed to fetch ETF rankings');
  return res.json();
}
