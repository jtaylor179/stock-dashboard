import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchPortfolio } from '../lib/api';
import { formatPrice, formatCurrency, formatPercent, cn } from '../lib/utils';

const PORTFOLIOS = [
  { id: '9337772d-f399-45f7-85bf-892e478cc702', name: 'FrankPortfolio' },
  { id: '54860aa8-f04c-4520-a010-b8333a8e7a6f', name: 'ETF Portfolio' },
  { id: '3672bfa3-0583-47a7-a400-b402712e1181', name: 'BobPortfolio' },
];

const PIE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

function plColor(value: number) {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-[#94a3b8]';
}

export default function PortfolioView() {
  const [activeId, setActiveId] = useState(PORTFOLIOS[0].id);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPortfolio(activeId)
      .then(setPortfolioData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeId]);

  const positions: any[] = portfolioData?.positions ?? [];

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

  const pieData = enriched.map(p => ({
    name: p.security?.symbol ?? p.security_id.slice(0, 8),
    value: parseFloat(p.currentValue.toFixed(2)),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a]">
        <h1 className="text-base font-semibold text-white">Portfolios</h1>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-[#2a2a2a] flex gap-0">
        {PORTFOLIOS.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={cn(
              'px-4 py-3 text-sm border-b-2 transition-colors',
              activeId === p.id
                ? 'border-blue-500 text-white font-medium'
                : 'border-transparent text-[#64748b] hover:text-white',
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">Loading...</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-48 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
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

            <div className="grid grid-cols-3 gap-6">
              {/* Holdings table */}
              <div className="col-span-2 bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a2a2a]">
                  <h2 className="text-sm font-medium text-white">Holdings</h2>
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
                    {enriched.map(p => (
                      <tr key={p.position_id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
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
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[#64748b] text-sm">
                          No positions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pie chart */}
              <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                <h2 className="text-sm font-medium text-white mb-4">Allocation</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        strokeWidth={0}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12 }}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">No data</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
