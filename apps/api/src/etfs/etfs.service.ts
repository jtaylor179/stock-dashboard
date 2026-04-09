import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const ETF_LIST = [
  { symbol: 'VNQ',  name: 'Vanguard Real Estate ETF',           category: 'REITs'         },
  { symbol: 'XLRE', name: 'Real Estate Select Sector SPDR',     category: 'REITs'         },
  { symbol: 'GLD',  name: 'SPDR Gold Shares',                   category: 'Gold/Bonds'    },
  { symbol: 'TLT',  name: 'iShares 20+ Year Treasury Bond',     category: 'Gold/Bonds'    },
  { symbol: 'EWZ',  name: 'iShares MSCI Brazil ETF',            category: 'International' },
  { symbol: 'INDA', name: 'iShares MSCI India ETF',             category: 'International' },
  { symbol: 'EWG',  name: 'iShares MSCI Germany ETF',           category: 'International' },
  { symbol: 'FXI',  name: 'iShares China Large-Cap ETF',        category: 'International' },
  { symbol: 'EEM',  name: 'iShares MSCI Emerging Markets',      category: 'International' },
  { symbol: 'XLE',  name: 'Energy Select Sector SPDR',          category: 'Energy'        },
  { symbol: 'XOP',  name: 'SPDR S&P Oil & Gas E&P ETF',        category: 'Energy'        },
  { symbol: 'DBA',  name: 'Invesco DB Agriculture Fund',        category: 'Agriculture'   },
  { symbol: 'CORN', name: 'Teucrium Corn Fund',                 category: 'Agriculture'   },
  { symbol: 'HYG',  name: 'iShares iBoxx $ HY Corp Bond ETF',  category: 'Credit'        },
  { symbol: 'IEF',  name: 'iShares 7-10 Year Treasury Bond',   category: 'Credit'        },
];

@Injectable()
export class EtfsService {
  constructor(private readonly httpService: HttpService) {}

  async getRankings() {
    const results = await Promise.allSettled(
      ETF_LIST.map(etf => this.fetchEtfData(etf)),
    );

    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => (r as PromiseFulfilledResult<any>).value);
  }

  private async fetchEtfData(etf: { symbol: string; name: string; category: string }) {
    const [dailyResult, ema4hResult] = await Promise.allSettled([
      this.fetchDailyData(etf.symbol),
      this.fetch4hEmaStatus(etf.symbol),
    ]);

    if (dailyResult.status !== 'fulfilled' || !dailyResult.value) return null;

    const { price, rsi, high52, fromHigh52 } = dailyResult.value;
    const ema4hBull: boolean | null =
      ema4hResult.status === 'fulfilled' ? ema4hResult.value : null;

    return {
      symbol:      etf.symbol,
      name:        etf.name,
      category:    etf.category,
      price,
      rsi,
      rsiSignal:   this.rsiSignal(rsi),
      ema4hBull,
      fromHigh52,
      high52,
      entrySignal: this.entrySignal(rsi, ema4hBull),
    };
  }

  // ── Daily data: price, RSI, 52w high ─────────────────────────────────────

  private async fetchDailyData(symbol: string) {
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
    if (closes.length < 15) return null;

    const price   = meta.regularMarketPrice ?? closes[closes.length - 1];
    const high52  = Math.max(...closes);
    const fromHigh52 = high52 ? Math.round(((price - high52) / high52) * 1000) / 10 : null;
    const rsi     = this.calcRsi(closes);

    return {
      price:     Math.round(price * 100) / 100,
      rsi:       rsi !== null ? Math.round(rsi * 10) / 10 : null,
      high52:    Math.round(high52 * 100) / 100,
      fromHigh52,
    };
  }

  // ── 4H EMA status via hourly candles aggregated into 4H bars ─────────────

  private async fetch4hEmaStatus(symbol: string): Promise<boolean | null> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1h&range=3mo`;
    const res = await firstValueFrom(
      this.httpService.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000,
      }),
    );

    const result = res.data?.chart?.result?.[0];
    if (!result) return null;

    const hourlyCloses: number[] =
      result.indicators?.quote?.[0]?.close?.filter((c: any) => c != null) ?? [];
    if (hourlyCloses.length < 30) return null;

    // Aggregate into 4H bars (close of each 4-bar window)
    const bars4h: number[] = [];
    for (let i = 3; i < hourlyCloses.length; i += 4) {
      bars4h.push(hourlyCloses[i]);
    }
    if (bars4h.length < 26) return null;

    const ema6  = this.calcEma(bars4h, 6);
    const ema26 = this.calcEma(bars4h, 26);
    if (ema6 === null || ema26 === null) return null;

    return ema6 > ema26;
  }

  // ── Signal logic ─────────────────────────────────────────────────────────

  private rsiSignal(rsi: number | null): string {
    if (rsi === null) return 'NEUTRAL';
    if (rsi < 30)  return 'OVERSOLD';
    if (rsi <= 35) return 'WATCH';
    if (rsi >= 70) return 'OVERBOUGHT';
    return 'NEUTRAL';
  }

  private entrySignal(rsi: number | null, bull: boolean | null): string {
    if (rsi === null)               return 'NEUTRAL';
    if (rsi > 72)                   return 'AVOID';
    if (rsi < 25)                   return 'BUY NOW';
    if (rsi < 30 && bull === true)  return 'STARTER';
    if (rsi < 35 && bull === true)  return 'WATCH';
    return 'NEUTRAL';
  }

  // ── Math helpers ─────────────────────────────────────────────────────────

  private calcRsi(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    const deltas = closes.slice(1).map((c, i) => c - closes[i]);
    let avgGain = deltas.slice(0, period).filter(d => d > 0).reduce((a, b) => a + b, 0) / period;
    let avgLoss = deltas.slice(0, period).filter(d => d < 0).reduce((a, b) => a + Math.abs(b), 0) / period;
    for (let i = period; i < deltas.length; i++) {
      avgGain = (avgGain * (period - 1) + Math.max(0, deltas[i]))  / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -deltas[i])) / period;
    }
    return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  private calcEma(closes: number[], period: number): number | null {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  }
}
