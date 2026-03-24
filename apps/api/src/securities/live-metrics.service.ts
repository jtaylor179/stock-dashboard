import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LiveMetricsService {
  constructor(private readonly httpService: HttpService) {}

  async getLiveMetrics(symbol: string) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
      const res = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000,
        }),
      );

      const result = res.data?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const closes: number[] = result.indicators?.quote?.[0]?.close?.filter((c: any) => c != null) ?? [];
      const volumes: number[] = result.indicators?.quote?.[0]?.volume?.filter((v: any) => v != null) ?? [];

      const price = meta.regularMarketPrice ?? closes[closes.length - 1];
      const prevClose = meta.previousClose ?? meta.chartPreviousClose;
      const dayChange = prevClose ? ((price - prevClose) / prevClose) * 100 : null;

      // RSI
      const rsi = this.calcRsi(closes);

      // SMAs
      const sma50 = closes.length >= 50 ? this.avg(closes.slice(-50)) : null;
      const sma200 = closes.length >= 200 ? this.avg(closes.slice(-200)) : null;

      // 52w high/low
      const high52 = Math.max(...closes);
      const low52 = Math.min(...closes);
      const fromHigh = high52 ? ((price - high52) / high52) * 100 : null;

      // Avg volume
      const avgVol = volumes.length >= 20 ? Math.round(this.avg(volumes.slice(-20))) : null;

      return {
        symbol,
        price: Math.round(price * 100) / 100,
        dayChangePct: dayChange ? Math.round(dayChange * 100) / 100 : null,
        rsi: rsi ? Math.round(rsi * 10) / 10 : null,
        sma50: sma50 ? Math.round(sma50 * 100) / 100 : null,
        sma200: sma200 ? Math.round(sma200 * 100) / 100 : null,
        high52: Math.round(high52 * 100) / 100,
        low52: Math.round(low52 * 100) / 100,
        fromHigh52: fromHigh ? Math.round(fromHigh * 10) / 10 : null,
        avgVolume20d: avgVol,
        marketCap: meta.marketCap ?? null,
        currency: meta.currency ?? 'USD',
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private calcRsi(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    const deltas = closes.slice(1).map((c, i) => c - closes[i]);
    let avgGain = deltas.slice(0, period).filter(d => d > 0).reduce((a, b) => a + b, 0) / period;
    let avgLoss = deltas.slice(0, period).filter(d => d < 0).reduce((a, b) => a + Math.abs(b), 0) / period;
    for (let i = period; i < deltas.length; i++) {
      avgGain = (avgGain * (period - 1) + Math.max(0, deltas[i])) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -deltas[i])) / period;
    }
    return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  private avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
