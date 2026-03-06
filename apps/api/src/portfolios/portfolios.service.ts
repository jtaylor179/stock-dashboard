import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

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
