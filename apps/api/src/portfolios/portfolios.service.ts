import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

const FRANK_PORTFOLIO = '9337772d-f399-45f7-85bf-892e478cc702';
const ETF_PORTFOLIO = '54860aa8-f04c-4520-a010-b8333a8e7a6f';
const ESTIMATED_CASH = 247332;

// Hardcoded betas (1Y calculated vs SPY) — refreshed periodically
const BETAS: Record<string, number> = {
  ADBE: 0.84, BX: 1.58, AXP: 1.33, MSFT: 0.87, GOOG: 0.98,
  INTU: 0.88, PANW: 1.13, BKNG: 0.99, CRM: 1.07, NVO: 0.54,
  TLT: 0.06, GLD: 0.04, SJB: -0.24, EWZ: 0.67, EEM: 0.73,
  EFA: 0.71, MOO: 0.60, CPER: 0.74, TZA: -3.14,
};

@Injectable()
export class PortfoliosService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
  ) {}

  async getPortfolioPositions(portfolioId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolio')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .single();

    if (portfolioError) throw new Error(portfolioError.message);

    const { data: positions, error: positionsError } = await supabase
      .from('position')
      .select(
        `*,
        security:security_id (
          security_id,
          symbol,
          security_name,
          security_type
        )`,
      )
      .eq('portfolio_id', portfolioId);

    if (positionsError) throw new Error(positionsError.message);

    const symbols: string[] = (positions as any[])
      .map((p: any) => p.security?.symbol)
      .filter(Boolean);

    const prices = await this.fetchPrices(symbols);

    const positionsWithPrices = (positions as any[]).map((position: any) => ({
      ...position,
      currentPrice: position.security?.symbol
        ? (prices[position.security.symbol] ?? null)
        : null,
    }));

    return { portfolio, positions: positionsWithPrices };
  }

  async getCombinedBeta() {
    const supabase = this.supabaseService.getClient();

    // Get all positions from both portfolios
    const { data: positions, error } = await supabase
      .from('position')
      .select(
        `*, security:security_id ( symbol )`,
      )
      .in('portfolio_id', [FRANK_PORTFOLIO, ETF_PORTFOLIO])
      .gt('quantity', 0);

    if (error) throw new Error(error.message);

    const symbols = (positions as any[])
      .map((p: any) => p.security?.symbol)
      .filter(Boolean);

    const prices = await this.fetchPrices(symbols);

    let totalValue = ESTIMATED_CASH;
    let weightedBeta = 0;
    const positionDetails: any[] = [];

    for (const p of positions as any[]) {
      const sym = p.security?.symbol;
      if (!sym) continue;
      const qty = Number(p.quantity);
      const price = prices[sym] ?? Number(p.purchase_price);
      const mv = qty * price;
      const beta = BETAS[sym] ?? null;
      totalValue += mv;

      positionDetails.push({
        symbol: sym,
        quantity: qty,
        marketValue: Math.round(mv * 100) / 100,
        beta,
        portfolioId: p.portfolio_id,
      });
    }

    // Calculate weights and weighted beta
    for (const pd of positionDetails) {
      pd.weight = Math.round((pd.marketValue / totalValue) * 10000) / 10000;
      if (pd.beta !== null) {
        pd.weightedBeta = Math.round(pd.beta * pd.weight * 10000) / 10000;
        weightedBeta += pd.weightedBeta;
      }
    }

    const cashWeight = Math.round((ESTIMATED_CASH / totalValue) * 10000) / 10000;

    // Sort by absolute weighted beta contribution
    positionDetails.sort((a: any, b: any) =>
      Math.abs(b.weightedBeta ?? 0) - Math.abs(a.weightedBeta ?? 0),
    );

    // Beta target analysis
    const equityBeta = positionDetails
      .filter((p: any) => !['TLT', 'GLD', 'SJB', 'TZA'].includes(p.symbol))
      .reduce((sum: number, p: any) => sum + (p.weightedBeta ?? 0), 0);
    const hedgeBeta = positionDetails
      .filter((p: any) => ['TLT', 'GLD', 'SJB', 'TZA'].includes(p.symbol))
      .reduce((sum: number, p: any) => sum + (p.weightedBeta ?? 0), 0);

    return {
      portfolioBeta: Math.round(weightedBeta * 1000) / 1000,
      totalValue: Math.round(totalValue),
      cash: ESTIMATED_CASH,
      cashWeight,
      equityBetaContribution: Math.round(equityBeta * 1000) / 1000,
      hedgeBetaContribution: Math.round(hedgeBeta * 1000) / 1000,
      zeroBetaGap: Math.round(weightedBeta * 1000) / 1000,
      positions: positionDetails,
    };
  }

  async fetchPrices(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
          const response = await firstValueFrom(
            this.httpService.get(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; stock-dashboard/1.0)' },
              timeout: 6000,
            }),
          );
          const price = response.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (price != null) prices[symbol] = price;
        } catch {
          // silently skip
        }
      }),
    );
    return prices;
  }
}
