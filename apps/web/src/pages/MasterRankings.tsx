import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { fetchWatchlist } from '../lib/api';
import { formatCurrency, formatPrice, cn } from '../lib/utils';

type SortKey = 'conviction' | 'symbol' | 'cc_cost';
type SortDir = 'asc' | 'desc';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  building: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  watching: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  passed: 'bg-[#2a2a2a] text-[#64748b] border-[#333]',
  sold: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const TRIGGER_COLORS: Record<string, string> = {
  Triggered: 'text-green-400',
  Approaching: 'text-yellow-400',
  'Not Close': 'text-[#64748b]',
  Unknown: 'text-[#444]',
};

function convictionColor(c: number) {
  if (c >= 8) return 'text-green-400 font-semibold';
  if (c >= 6) return 'text-yellow-400 font-semibold';
  return 'text-[#64748b]';
}

export default function MasterRankings() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('conviction');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minConviction, setMinConviction] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchWatchlist();
      setData(items);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    let filtered = data.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (item.conviction < minConviction) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortKey === 'conviction') { aVal = a.conviction; bVal = b.conviction; }
      else if (sortKey === 'symbol') { aVal = a.security?.symbol ?? ''; bVal = b.security?.symbol ?? ''; }
      else if (sortKey === 'cc_cost') { aVal = a.cc_cost ?? 0; bVal = b.cc_cost ?? 0; }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, sortKey, sortDir, statusFilter, minConviction]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown size={12} className="text-[#444] ml-1" />;
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="text-accent ml-1" />
      : <ChevronUp size={12} className="text-accent ml-1" />;
  }

  const statuses = ['all', 'active', 'building', 'watching', 'passed', 'sold'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">Master Rankings</h1>
          <p className="text-xs text-[#64748b] mt-0.5">{sorted.length} securities</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#94a3b8] border border-[#2a2a2a] rounded hover:border-[#3a3a3a] hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-[#2a2a2a] flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 text-xs rounded capitalize transition-colors',
                statusFilter === s
                  ? 'bg-[#1a1a1a] text-white border border-[#3a3a3a]'
                  : 'text-[#64748b] hover:text-white',
              )}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-[#64748b]">Min conviction:</span>
          <select
            value={minConviction}
            onChange={e => setMinConviction(Number(e.target.value))}
            className="bg-[#111] border border-[#2a2a2a] text-white text-xs rounded px-2 py-1"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-64 text-[#64748b] text-sm">
            Loading...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-64 text-red-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0d0d0d]">
              <tr className="text-left border-b border-[#2a2a2a]">
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium w-10">#</th>
                <th
                  className="px-4 py-3 text-xs text-[#64748b] font-medium cursor-pointer hover:text-white select-none"
                  onClick={() => toggleSort('symbol')}
                >
                  <span className="flex items-center">Symbol <SortIcon col="symbol" /></span>
                </th>
                <th
                  className="px-4 py-3 text-xs text-[#64748b] font-medium cursor-pointer hover:text-white select-none"
                  onClick={() => toggleSort('conviction')}
                >
                  <span className="flex items-center">Conviction <SortIcon col="conviction" /></span>
                </th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Jeff Score</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Status</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Entry Zone</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">RSI Gate</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Trigger</th>
                <th
                  className="px-4 py-3 text-xs text-[#64748b] font-medium cursor-pointer hover:text-white select-none"
                  onClick={() => toggleSort('cc_cost')}
                >
                  <span className="flex items-center">CC Cost <SortIcon col="cc_cost" /></span>
                </th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Price</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const expanded = expandedRows.has(item.id);
                return (
                  <>
                    <tr
                      key={item.id}
                      className="border-b border-[#1a1a1a] table-row-hover transition-colors"
                      onClick={() => item.security?.security_id && navigate(`/security/${item.security.security_id}`)}
                    >
                      <td className="px-4 py-3 text-[#444] text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{item.security?.symbol ?? '—'}</div>
                        <div className="text-xs text-[#64748b] mt-0.5 truncate max-w-[140px]">
                          {item.security?.security_name ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={convictionColor(item.conviction)}>
                          {item.conviction}/10
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8]">
                        {item.jeffScreenScore ?? <span className="text-[#444]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs border capitalize',
                            STATUS_COLORS[item.status] ?? STATUS_COLORS.passed,
                          )}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] text-xs font-mono">
                        {item.entry_price_low != null && item.entry_price_high != null
                          ? `${formatPrice(item.entry_price_low)} – ${formatPrice(item.entry_price_high)}`
                          : <span className="text-[#444]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">
                        {item.entry_rsi != null ? item.entry_rsi : <span className="text-[#444]">—</span>}
                      </td>
                      <td className={cn('px-4 py-3 text-xs font-medium', TRIGGER_COLORS[item.triggerStatus] ?? 'text-[#444]')}>
                        {item.triggerStatus ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">
                        {item.cc_cost != null ? formatCurrency(item.cc_cost) : <span className="text-[#444]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        {item.currentPrice != null ? formatPrice(item.currentPrice) : <span className="text-[#444]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {item.thesis && (
                          <button
                            onClick={(e) => toggleExpand(item.id, e)}
                            className="text-[#444] hover:text-[#94a3b8] transition-colors"
                          >
                            <ChevronRight
                              size={14}
                              className={cn('transition-transform', expanded && 'rotate-90')}
                            />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && item.thesis && (
                      <tr key={`${item.id}-thesis`} className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
                        <td colSpan={11} className="px-8 py-3">
                          <p className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap max-w-3xl">
                            {item.thesis}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-[#64748b] text-sm">
                    No securities match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
