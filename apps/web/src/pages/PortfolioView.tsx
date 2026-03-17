import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Shield, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { fetchPortfolio, fetchPortfolioBeta } from '../lib/api';
import { formatPrice, formatCurrency, formatPercent, cn } from '../lib/utils';

const FRANK_ID = '9337772d-f399-45f7-85bf-892e478cc702';
const ETF_ID = '54860aa8-f04c-4520-a010-b8333a8e7a6f';
const BOB_ID = '3672bfa3-0583-47a7-a400-b402712e1181';

const TABS = [
  { id: 'combined', name: 'Combined' },
  { id: FRANK_ID, name: 'FrankPortfolio' },
  { id: ETF_ID, name: 'ETF Portfolio' },
  { id: BOB_ID, name: 'BobPortfolio' },
];

const PIE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#10b981', '#f43f5e', '#a855f7', '#14b8a6'];

function plColor(value: number) {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-[#94a3b8]';
}

function betaColor(beta: number) {
  if (Math.abs(beta) <= 0.15) return 'text-green-400';
  if (Math.abs(beta) <= 0.35) return 'text-yellow-400';
  return 'text-red-400';
}

function betaLabel(beta: number) {
  if (Math.abs(beta) <= 0.1) return 'Market Neutral ✅';
  if (Math.abs(beta) <= 0.25) return 'Near Neutral';
  if (Math.abs(beta) <= 0.5) return 'Low Beta';
  if (beta > 0.5) return 'Long Bias';
  return 'Short Bias';
}

function BetaGauge({ beta }: { beta: number }) {
  const clampedBeta = Math.max(-1, Math.min(1, beta));
  const pct = ((clampedBeta + 1) / 2) * 100;
  return (
    <div className="relative w-full h-6 bg-[#1a1a1a] rounded-full overflow-hidden mt-2">
      <div className="absolute inset-0 flex">
        <div className="w-1/2 bg-gradient-to-r from-blue-500/30 to-transparent" />
        <div className="w-1/2 bg-gradient-to-l from-red-500/30 to-transparent" />
      </div>
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#444]" />
      <div
        className="absolute top-1 bottom-1 w-3 rounded-full bg-white shadow-lg shadow-white/20 transition-all"
        style={{ left: `calc(${pct}% - 6px)` }}
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-blue-400">-β</span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-red-400">+β</span>
    </div>
  );
}

function BetaCard({ betaData }: { betaData: any }) {
  if (!betaData) return null;
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-blue-400" />
        <h2 className="text-sm font-medium text-white">Portfolio Beta (CAPM)</h2>
        <span className="text-xs text-[#444]">vs SPY</span>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div>
          <div className={cn('text-3xl font-bold', betaColor(betaData.portfolioBeta))}>
            β {betaData.portfolioBeta.toFixed(3)}
          </div>
          <div className={cn('text-xs font-medium mt-0.5', betaColor(betaData.portfolioBeta))}>
            {betaLabel(betaData.portfolioBeta)}
          </div>
        </div>
        <div className="flex-1">
          <BetaGauge beta={betaData.portfolioBeta} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#1a1a1a]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={12} className="text-red-400" />
            <span className="text-[10px] text-[#64748b]">Equity β</span>
          </div>
          <span className="text-sm font-mono text-red-400">+{betaData.equityBetaContribution?.toFixed(3) ?? '—'}</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown size={12} className="text-blue-400" />
            <span className="text-[10px] text-[#64748b]">Hedge β</span>
          </div>
          <span className="text-sm font-mono text-blue-400">{betaData.hedgeBetaContribution?.toFixed(3) ?? '—'}</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target size={12} className="text-[#64748b]" />
            <span className="text-[10px] text-[#64748b]">Cash wt</span>
          </div>
          <span className="text-sm font-mono text-[#94a3b8]">{(betaData.cashWeight * 100).toFixed(1)}%</span>
        </div>
      </div>
      {betaData.positions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
          <p className="text-[10px] text-[#64748b] mb-2 uppercase tracking-wide">Top Beta Contributors</p>
          <div className="space-y-1">
            {betaData.positions.slice(0, 8).map((p: any) => (
              <div key={p.symbol} className="flex justify-between text-xs">
                <span className="text-[#94a3b8] font-mono">{p.symbol}</span>
                <div className="flex gap-3">
                  <span className="text-[#64748b]">β {p.beta?.toFixed(2)}</span>
                  <span className="text-[#64748b]">{(p.weight * 100).toFixed(1)}%</span>
                  <span className={cn('font-mono', p.weightedBeta > 0 ? 'text-red-400' : 'text-blue-400')}>
                    {p.weightedBeta > 0 ? '+' : ''}{p.weightedBeta?.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PositionsTable({ positions }: { positions: any[] }) {
  const enriched = positions.map(p => {
    const currentPrice = p.currentPrice ?? p.purchase_price;
    const costBasis = p.quantity * p.purchase_price;
    const currentValue = p.quantity * currentPrice;
    const plDollar = currentValue - costBasis;
    const plPercent = costBasis > 0 ? (plDollar / costBasis) * 100 : 0;
    return { ...p, currentPrice, costBasis, currentValue, plDollar, plPercent };
  });

  const totalCost = enriched.reduce((sum, p) => sum + p.costBasis, 0);
  const totalValue = enriched.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Cost Basis', value: formatCurrency(totalCost) },
          { label: 'Current Value', value: formatCurrency(totalValue) },
          { label: 'P/L ($)', value: formatCurrency(totalPL), color: plColor(totalPL) },
          { label: 'P/L (%)', value: formatPercent(totalPLPct), color: plColor(totalPLPct) },
        ].map(card => (
          <div key={card.label} className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-[#64748b] mb-1">{card.label}</p>
            <p className={cn('text-xl font-semibold', card.color ?? 'text-white')}>{card.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-medium text-white">Holdings ({enriched.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {['Symbol', 'Qty', 'Cost Basis', 'Curr Price', 'Value', 'P/L $', 'P/L %'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs text-[#64748b] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched
              .sort((a, b) => b.currentValue - a.currentValue)
              .map(p => (
              <tr key={p.position_id ?? p.security?.symbol} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{p.security?.symbol ?? '—'}</div>
                  <div className="text-xs text-[#64748b] truncate max-w-[120px]">{p.security?.security_name ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{p.quantity}</td>
                <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{formatPrice(p.purchase_price)}</td>
                <td className="px-4 py-3 text-white font-mono text-xs">
                  {p.currentPrice != null ? formatPrice(p.currentPrice) : <span className="text-[#444]">—</span>}
                </td>
                <td className="px-4 py-3 text-white font-mono text-xs">{formatCurrency(p.currentValue)}</td>
                <td className={cn('px-4 py-3 font-mono text-xs', plColor(p.plDollar))}>
                  {p.plDollar >= 0 ? '+' : ''}{formatCurrency(p.plDollar)}
                </td>
                <td className={cn('px-4 py-3 font-mono text-xs', plColor(p.plPercent))}>
                  {formatPercent(p.plPercent)}
                </td>
              </tr>
            ))}
            {enriched.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[#64748b] text-sm">No positions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PortfolioView() {
  const [activeTab, setActiveTab] = useState('combined');
  const [frankData, setFrankData] = useState<any>(null);
  const [etfData, setEtfData] = useState<any>(null);
  const [singleData, setSingleData] = useState<any>(null);
  const [betaData, setBetaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (activeTab === 'combined') {
      Promise.all([
        fetchPortfolio(FRANK_ID),
        fetchPortfolio(ETF_ID),
        fetchPortfolioBeta().catch(() => null),
      ])
        .then(([frank, etf, beta]) => {
          setFrankData(frank);
          setEtfData(etf);
          setBetaData(beta);
          setSingleData(null);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        fetchPortfolio(activeTab),
        fetchPortfolioBeta().catch(() => null),
      ])
        .then(([data, beta]) => {
          setSingleData(data);
          setBetaData(beta);
          setFrankData(null);
          setEtfData(null);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const isCombined = activeTab === 'combined';
  const combinedPositions = isCombined
    ? [...(frankData?.positions ?? []), ...(etfData?.positions ?? [])]
    : (singleData?.positions ?? []);

  // Pie data for combined — group by type
  const pieData = isCombined
    ? (() => {
        const groups: Record<string, number> = { 'Quality Compounders': 0, 'International/EM': 0, 'Bonds/Defensive': 0, 'Real Assets': 0, 'Other': 0 };
        const compounders = ['ADBE', 'BX', 'MSFT', 'AXP', 'GOOG', 'INTU', 'PANW', 'BKNG', 'CRM', 'NVO'];
        const intl = ['EEM', 'EFA', 'EWZ'];
        const defensive = ['TLT', 'SJB'];
        const real = ['GLD', 'CPER', 'MOO'];

        for (const p of combinedPositions) {
          const sym = p.security?.symbol;
          const val = p.quantity * (p.currentPrice ?? p.purchase_price);
          if (compounders.includes(sym)) groups['Quality Compounders'] += val;
          else if (intl.includes(sym)) groups['International/EM'] += val;
          else if (defensive.includes(sym)) groups['Bonds/Defensive'] += val;
          else if (real.includes(sym)) groups['Real Assets'] += val;
          else groups['Other'] += val;
        }
        return Object.entries(groups)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value: Math.round(value) }));
      })()
    : combinedPositions.map((p: any) => ({
        name: p.security?.symbol ?? '?',
        value: Math.round(p.quantity * (p.currentPrice ?? p.purchase_price)),
      }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#2a2a2a]">
        <h1 className="text-base font-semibold text-white">Portfolios</h1>
      </div>

      <div className="px-6 border-b border-[#2a2a2a] flex gap-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-4 py-3 text-sm border-b-2 transition-colors',
              activeTab === t.id
                ? 'border-blue-500 text-white font-medium'
                : 'border-transparent text-[#64748b] hover:text-white',
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">Loading...</div>}
        {error && <div className="flex items-center justify-center h-48 text-red-400 text-sm">{error}</div>}
        {!loading && !error && (
          <div className="space-y-6">
            {/* Beta + Allocation row for combined view */}
            {isCombined && (
              <div className="grid grid-cols-2 gap-6">
                <BetaCard betaData={betaData} />
                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5">
                  <h2 className="text-sm font-medium text-white mb-2">Asset Allocation</h2>
                  <p className="text-xs text-[#64748b] mb-3">Target: 60% compounders / 15% intl / 10% bonds / 10% real / 5% tactical</p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} strokeWidth={0}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12 }}
                          formatter={(val: number) => formatCurrency(val)}
                        />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">No data</div>
                  )}
                </div>
              </div>
            )}

            {/* Single portfolio view — beta + pie in sidebar */}
            {!isCombined && (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <PositionsTable positions={combinedPositions} />
                </div>
                <div className="space-y-4">
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                    <h2 className="text-sm font-medium text-white mb-4">Allocation</h2>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} strokeWidth={0}>
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12 }}
                            formatter={(val: number) => formatCurrency(val)}
                          />
                          <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">No data</div>
                    )}
                  </div>
                  <BetaCard betaData={betaData} />
                </div>
              </div>
            )}

            {/* Combined positions table */}
            {isCombined && <PositionsTable positions={combinedPositions} />}
          </div>
        )}
      </div>
    </div>
  );
}
