import { useEffect, useState } from 'react';
import { TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { fetchCoveredCalls } from '../lib/api';
import { formatCurrency, formatPrice, cn } from '../lib/utils';

function statusIcon(status: string) {
  if (status === 'open') return <Clock size={12} className="text-blue-400" />;
  if (status === 'expired') return <CheckCircle size={12} className="text-green-400" />;
  if (status === 'assigned') return <AlertCircle size={12} className="text-yellow-400" />;
  if (status === 'closed') return <XCircle size={12} className="text-[#64748b]" />;
  return null;
}

function statusColor(status: string) {
  if (status === 'open') return 'text-blue-400 bg-blue-400/10';
  if (status === 'expired') return 'text-green-400 bg-green-400/10';
  if (status === 'assigned') return 'text-yellow-400 bg-yellow-400/10';
  return 'text-[#64748b] bg-[#64748b]/10';
}

function daysToExpiry(expDate: string) {
  const diff = new Date(expDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function plColor(v: number) {
  return v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-[#94a3b8]';
}

export default function CoveredCalls() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCoveredCalls()
      .then(setCalls)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const open = calls.filter(c => c.status === 'open');
  const closed = calls.filter(c => c.status !== 'open');

  const totalCollected = calls.reduce((s, c) => s + Number(c.premium_total), 0);
  const totalRealized = closed.reduce((s, c) => {
    if (!c.close_price) return s + Number(c.premium_total);
    const buyback = c.contracts * 100 * Number(c.close_price);
    return s + Number(c.premium_total) - buyback;
  }, 0);
  const openPremium = open.reduce((s, c) => s + Number(c.premium_total), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
        <TrendingUp size={16} className="text-green-400" />
        <h1 className="text-base font-semibold text-white">Covered Calls</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">Loading...</div>}
        {error && <div className="flex items-center justify-center h-48 text-red-400 text-sm">{error}</div>}
        {!loading && !error && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Premium Collected', value: formatCurrency(totalCollected), color: 'text-green-400' },
                { label: 'Open Premium (at risk)', value: formatCurrency(openPremium), color: 'text-blue-400' },
                { label: 'Realized P/L', value: formatCurrency(totalRealized), color: plColor(totalRealized) },
              ].map(c => (
                <div key={c.label} className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                  <p className="text-xs text-[#64748b] mb-1">{c.label}</p>
                  <p className={cn('text-2xl font-semibold', c.color)}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Open positions */}
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
                <Clock size={14} className="text-blue-400" />
                <h2 className="text-sm font-medium text-white">Open Positions ({open.length})</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    {['Symbol', 'Strike', 'Expiry', 'DTE', 'Contracts', 'Premium/sh', 'Total Premium', 'Break-even', 'Notes'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs text-[#64748b] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {open.map(c => {
                    const dte = daysToExpiry(c.expiration_date);
                    const breakeven = Number(c.strike_price) - Number(c.premium_per_share);
                    return (
                      <tr key={c.call_id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                        <td className="px-4 py-3 font-semibold text-white">{c.security?.symbol}</td>
                        <td className="px-4 py-3 text-white font-mono">{formatPrice(c.strike_price)}</td>
                        <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{c.expiration_date?.slice(0,10)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-mono', dte < 30 ? 'text-yellow-400' : 'text-[#94a3b8]')}>{dte}d</span>
                        </td>
                        <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{c.contracts}</td>
                        <td className="px-4 py-3 text-green-400 font-mono text-xs">{formatPrice(c.premium_per_share)}</td>
                        <td className="px-4 py-3 text-green-400 font-semibold">{formatCurrency(c.premium_total)}</td>
                        <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{formatPrice(breakeven)}</td>
                        <td className="px-4 py-3 text-[#64748b] text-xs max-w-[200px] truncate">{c.notes}</td>
                      </tr>
                    );
                  })}
                  {open.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-[#64748b] text-sm">No open positions.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Closed / history */}
            {closed.length > 0 && (
              <div className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a2a2a]">
                  <h2 className="text-sm font-medium text-white">History ({closed.length})</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      {['Symbol', 'Strike', 'Expiry', 'Status', 'Premium', 'Close Price', 'P/L', 'Opened'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs text-[#64748b] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closed.map(c => {
                      const pl = c.close_price
                        ? Number(c.premium_total) - (c.contracts * 100 * Number(c.close_price))
                        : Number(c.premium_total);
                      return (
                        <tr key={c.call_id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                          <td className="px-4 py-3 font-semibold text-white">{c.security?.symbol}</td>
                          <td className="px-4 py-3 text-white font-mono">{formatPrice(c.strike_price)}</td>
                          <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{c.expiration_date?.slice(0,10)}</td>
                          <td className="px-4 py-3">
                            <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit', statusColor(c.status))}>
                              {statusIcon(c.status)} {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-green-400 font-mono text-xs">{formatCurrency(c.premium_total)}</td>
                          <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{c.close_price ? formatPrice(c.close_price) : '—'}</td>
                          <td className={cn('px-4 py-3 font-semibold font-mono text-xs', plColor(pl))}>
                            {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                          </td>
                          <td className="px-4 py-3 text-[#64748b] text-xs">{c.open_date?.slice(0,10)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
