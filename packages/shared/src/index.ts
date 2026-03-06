export interface Security {
  security_id: string;
  symbol: string;
  security_name: string;
  security_type: string;
}

export interface WatchlistItem {
  id: string;
  security_id: string;
  status: 'active' | 'watching' | 'building' | 'passed' | 'sold';
  conviction: number;
  entry_rsi: number | null;
  entry_price_low: number | null;
  entry_price_high: number | null;
  target_entry_price: number | null;
  cc_target_shares: number;
  cc_cost: number | null;
  thesis: string | null;
  updated_at: string;
  security?: Security;
}

export interface WatchlistRankingItem extends WatchlistItem {
  currentPrice?: number | null;
  jeffScreenScore?: string | null;
  triggerStatus?: 'Triggered' | 'Approaching' | 'Not Close' | 'Unknown';
}

export interface Position {
  position_id: string;
  security_id: string;
  portfolio_id: string;
  quantity: number;
  purchase_price: number;
  security?: Security;
  currentPrice?: number | null;
}

export interface Portfolio {
  portfolio_id: string;
  portfolio_name: string;
  owner_id: string;
}

export interface SecurityAnalysis {
  id: string;
  security_id: string;
  analysis_type: string;
  sentiment: string | null;
  conviction: number | null;
  narrative: string | null;
  metrics: Record<string, unknown> | null;
  created_at: string;
}
