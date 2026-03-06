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
