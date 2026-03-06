import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
  ) {}

  async getWatchlist() {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('watchlist')
      .select(
        `*,
        security:security_id (
          security_id,
          symbol,
          security_name,
          security_type
        )`,
      )
      .order('conviction', { ascending: false });

    if (error) throw new Error(error.message);

    const symbols: string[] = (data as any[])
      .map((item: any) => item.security?.symbol)
      .filter(Boolean);

    const prices = await this.fetchPrices(symbols);

    return (data as any[]).map((item: any) => ({
      ...item,
      currentPrice: item.security?.symbol ? (prices[item.security.symbol] ?? null) : null,
      jeffScreenScore: this.parseJeffScore(item.thesis),
      triggerStatus: this.computeTriggerStatus(
        item.security?.symbol ? prices[item.security.symbol] : null,
        item.entry_price_low,
        item.entry_price_high,
      ),
    }));
  }

  private parseJeffScore(thesis: string | null): string | null {
    if (!thesis) return null;
    const match = thesis.match(/(\d+)\/7/);
    return match ? match[0] : null;
  }

  private computeTriggerStatus(
    currentPrice: number | null | undefined,
    entryLow: number | null,
    entryHigh: number | null,
  ): 'Triggered' | 'Approaching' | 'Not Close' | 'Unknown' {
    if (currentPrice == null) return 'Unknown';
    if (entryLow != null && currentPrice <= entryLow) return 'Triggered';
    if (entryHigh != null && currentPrice <= entryHigh) return 'Approaching';
    return 'Not Close';
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
          // silently skip — price display will show '—'
        }
      }),
    );
    return prices;
  }
}
