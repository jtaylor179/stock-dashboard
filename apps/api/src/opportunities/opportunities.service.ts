import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const ETF_OPPS: Record<string, { symbol: string; name: string; category: string }[]> = {
  grain: [
    { symbol: 'CORN', name: 'Teucrium Corn', category: 'grain' },
    { symbol: 'WEAT', name: 'Teucrium Wheat', category: 'grain' },
    { symbol: 'SOYB', name: 'Teucrium Soybean', category: 'grain' },
    { symbol: 'DBA', name: 'Invesco DB Agriculture', category: 'grain' },
  ],
  reits: [
    { symbol: 'VNQ', name: 'Vanguard Real Estate', category: 'reits' },
    { symbol: 'O', name: 'Realty Income', category: 'reits' },
    { symbol: 'AMT', name: 'American Tower', category: 'reits' },
    { symbol: 'XLRE', name: 'RE Select Sector', category: 'reits' },
  ],
  foreign: [
    { symbol: 'EWJ', name: 'iShares Japan', category: 'foreign' },
    { symbol: 'EWG', name: 'iShares Germany', category: 'foreign' },
    { symbol: 'EWY', name: 'iShares South Korea', category: 'foreign' },
    { symbol: 'INDA', name: 'iShares India', category: 'foreign' },
    { symbol: 'FXI', name: 'iShares China Large-Cap', category: 'foreign' },
    { symbol: 'EWC', name: 'iShares Canada', category: 'foreign' },
  ],
  energy: [
    { symbol: 'XLE', name: 'Energy Select Sector', category: 'energy' },
    { symbol: 'XOP', name: 'S&P Oil & Gas E&P', category: 'energy' },
  ],
  credit: [
    { symbol: 'HYG', name: 'iShares High Yield Bond', category: 'credit' },
    { symbol: 'IEF', name: 'iShares 7-10yr Treasury', category: 'credit' },
  ],
};

@Injectable()
export class OpportunitiesService {
  constructor(private readonly httpService: HttpService) {}

  async getAll() {
    const allSymbols = Object.values(ETF_OPPS).flat();
    const results = await Promise.allSettled(
      allSymbols.map(async (etf) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${etf.symbol}?interval=1d&range=6mo`;
          const res = await firstValueFrom(
            this.httpService.get(url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 6000,
            }),
          );
          const result = res.data?.chart?.result?.[0];
          if (!result) return null;
          const closes: number[] = result.indicators?.quote?.[0]?.close?.filter((c: any) => c != null) ?? [];
          if (closes.length < 20) return null;

          const price = closes[closes.length - 1];
          const high52 = Math.max(...closes);
          const fromHigh = ((price / high52) - 1) * 100;
          const rsi = this.calcRsi(closes);

          let signal: string | null = null;
          if (rsi <= 35) signal = 'oversold';
          else if (rsi >= 72) signal = 'overbought';

          return {
            ...etf,
            price: Math.round(price * 100) / 100,
            rsi: Math.round(rsi * 10) / 10,
            fromHigh: Math.round(fromHigh * 10) / 10,
            signal,
          };
        } catch {
          return null;
        }
      }),
    );

    const data = results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => (r as any).value);

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const item of data) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }

    return grouped;
  }

  private calcRsi(closes: number[], period = 14): number {
    const deltas = closes.slice(1).map((c, i) => c - closes[i]);
    let avgGain = deltas.slice(0, period).filter(d => d > 0).reduce((a, b) => a + b, 0) / period;
    let avgLoss = deltas.slice(0, period).filter(d => d < 0).reduce((a, b) => a + Math.abs(b), 0) / period;
    for (let i = period; i < deltas.length; i++) {
      const gain = deltas[i] > 0 ? deltas[i] : 0;
      const loss = deltas[i] < 0 ? Math.abs(deltas[i]) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }
}
