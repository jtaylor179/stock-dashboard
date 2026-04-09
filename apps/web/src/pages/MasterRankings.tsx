import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { fetchWatchlist, fetchOpportunities, fetchEtfRankings } from '../lib/api';
import { formatCurrency, formatPrice, cn } from '../lib/utils';

type SortKey = 'conviction' | 'symbol' | 'cc_cost';
type SortDir = 'asc' | 'desc';
type Tab = 'equities' | 'etfs' | 'opportunities';

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

const CATEGORY_LABELS: Record<string, string> = {
  grain: '🌾 Grain & Agriculture',
  reits: '🏢 REITs',
  foreign: '🌍 Foreign Markets',
  energy: '⛽ Energy',
  credit: '💳 Credit / Bonds',
};

function convictionColor(c: number) {
  if (c >= 8) return 'text-green-400 font-semibold';
  if (c >= 6) return 'text-yellow-400 font-semibold';
  return 'text-[#64748b]';
}

function rsiColor(rsi: number) {
  if (rsi <= 35) return 'text-green-400 font-semibold';
  if (rsi >= 70) return 'text-red-400 font-semibold';
  if (rsi <= 45) return 'text-yellow-400';
  return 'text-[#94a3b8]';
}

function RsiBar({ rsi }: { rsi: number }) {
  const pct = Math.min(100, Math.max(0, rsi));
  const color = rsi <= 35 ? 'bg-green-500' : rsi >= 70 ? 'bg-red-500' : 'bg-[#3a3a3a]';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-mono', rsiColor(rsi))}>{rsi}</span>
    </div>
  );
}

// ─── Equities tab ───────────────────────────────────────────────────────────
function EquitiesTab({ data, loading, error, onRefresh }: any) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('conviction');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minConviction, setMinConviction] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const equityData = useMemo(
    () => data.filter((d: any) => d.security?.security_type === 'Equity' || !d.security?.security_type?.includes('ETF')),
    [data],
  );

  const sorted = useMemo(() => {
    let filtered = equityData.filter((item: any) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (item.conviction < minConviction) return false;
      return true;
    });
    filtered.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      if (sortKey === 'conviction') { aVal = a.conviction; bVal = b.conviction; }
      else if (sortKey === 'symbol') { aVal = a.security?.symbol ?? ''; bVal = b.security?.symbol ?? ''; }
      else { aVal = a.cc_cost ?? 0; bVal = b.cc_cost ?? 0; }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [equityData, sortKey, sortDir, statusFilter, minConviction]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown size={12} className="text-[#444] ml-1" />;
    return sortDir === 'desc' ? <ChevronDown size={12} className="text-blue-400 ml-1" /> : <ChevronUp size={12} className="text-blue-400 ml-1" />;
  }

  const statuses = ['all', 'active', 'building', 'watching', 'passed'];

  return (
    <>
      <div className="px-6 py-3 border-b border-[#2a2a2a] flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-2.5 py-1 text-xs rounded capitalize transition-colors',
                statusFilter === s ? 'bg-[#1a1a1a] text-white border border-[#3a3a3a]' : 'text-[#64748b] hover:text-white')}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-[#64748b]">Min conviction:</span>
          <select value={minConviction} onChange={e => setMinConviction(Number(e.target.value))}
            className="bg-[#111] border border-[#2a2a2a] text-white text-xs rounded px-2 py-1">
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <span className="text-xs text-[#444] ml-auto">{sorted.length} securities</span>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && <div className="flex items-center justify-center h-64 text-[#64748b] text-sm">Loading...</div>}
        {error && <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>}
        {!loading && !error && (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0d0d0d]">
              <tr className="border-b border-[#2a2a2a]">
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium w-8">#</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('symbol')}>
                  <span className="flex items-center">Symbol <SortIcon col="symbol" /></span>
                </th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('conviction')}>
                  <span className="flex items-center">Conviction <SortIcon col="conviction" /></span>
                </th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Jeff Score</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Status</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Entry Zone</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">RSI Gate</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Trigger</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('cc_cost')}>
                  <span className="flex items-center">CC Cost <SortIcon col="cc_cost" /></span>
                </th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Price</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item: any, idx: number) => {
                const expanded = expandedRows.has(item.id);
                return (
                  <>
                    <tr key={item.id} className="border-b border-[#1a1a1a] hover:bg-[#111] cursor-pointer transition-colors"
                      onClick={() => item.security?.security_id && navigate(`/security/${item.security.security_id}`)}>
                      <td className="px-4 py-3 text-[#444] text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{item.security?.symbol ?? '—'}</div>
                        <div className="text-xs text-[#64748b] truncate max-w-[140px]">{item.security?.security_name ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3"><span className={convictionColor(item.conviction)}>{item.conviction}/10</span></td>
                      <td className="px-4 py-3 text-[#94a3b8] text-xs">{item.jeffScreenScore ?? <span className="text-[#444]">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded text-xs border capitalize', STATUS_COLORS[item.status] ?? STATUS_COLORS.passed)}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] text-xs font-mono">
                        {item.entry_price_low != null && item.entry_price_high != null
                          ? `${formatPrice(item.entry_price_low)} – ${formatPrice(item.entry_price_high)}`
                          : <span className="text-[#444]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{item.entry_rsi ?? <span className="text-[#444]">—</span>}</td>
                      <td className={cn('px-4 py-3 text-xs font-medium', TRIGGER_COLORS[item.triggerStatus] ?? 'text-[#444]')}>{item.triggerStatus ?? '—'}</td>
                      <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{item.cc_cost != null ? formatCurrency(item.cc_cost) : <span className="text-[#444]">—</span>}</td>
                      <td className="px-4 py-3 text-white font-mono text-xs">{item.currentPrice != null ? formatPrice(item.currentPrice) : <span className="text-[#444]">—</span>}</td>
                      <td className="px-4 py-3">
                        {item.thesis && (
                          <button onClick={e => { e.stopPropagation(); setExpandedRows(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; }); }}
                            className="text-[#444] hover:text-[#94a3b8]">
                            <ChevronRight size={14} className={cn('transition-transform', expanded && 'rotate-90')} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && item.thesis && (
                      <tr key={`${item.id}-t`} className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
                        <td colSpan={11} className="px-8 py-3">
                          <p className="text-xs text-[#94a3b8] leading-relaxed max-w-3xl">{item.thesis}</p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── ETFs tab ────────────────────────────────────────────────────────────────

type EtfSortKey = 'symbol' | 'price' | 'rsi' | 'fromHigh' | 'entry';
type EtfRow = {
  symbol: string;
  name: string;
  category: string;
  price: number | null;
  rsi: number | null;
  rsiSignal: string;
  ema4hBull: boolean | null;
  fromHigh52: number | null;
  high52: number | null;
  entrySignal: string;
};

const CATEGORY_BADGE: Record<string, string> = {
  'REITs':         'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Gold/Bonds':    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'International': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Energy':        'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Agriculture':   'bg-green-500/15 text-green-400 border-green-500/30',
  'Credit':        'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const RSI_SIGNAL_BADGE: Record<string, string> = {
  'OVERSOLD':   'bg-red-500/15 text-red-400 border-red-500/30',
  'WATCH':      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'NEUTRAL':    'bg-[#2a2a2a] text-[#64748b] border-[#333]',
  'OVERBOUGHT': 'bg-red-500/15 text-red-400 border-red-500/30',
};

const ENTRY_BADGE: Record<string, string> = {
  'BUY NOW': 'bg-green-500/15 text-green-400 border-green-500/30',
  'STARTER': 'bg-green-500/15 text-green-400 border-green-500/30',
  'WATCH':   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'AVOID':   'bg-red-500/15 text-red-400 border-red-500/30',
  'NEUTRAL': 'bg-[#2a2a2a] text-[#64748b] border-[#333]',
};

const ENTRY_SORT_ORDER: Record<string, number> = {
  'BUY NOW': 1, 'STARTER': 2, 'WATCH': 3, 'NEUTRAL': 4, 'AVOID': 5,
};

function EtfsTab() {
  const [rows, setRows] = useState<EtfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<EtfSortKey>('rsi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchEtfRankings());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  function toggleSort(key: EtfSortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'rsi' ? 'asc' : 'desc'); }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'symbol')  { av = a.symbol;  bv = b.symbol; }
      if (sortKey === 'price')   { av = a.price ?? 0;   bv = b.price ?? 0; }
      if (sortKey === 'rsi')     { av = a.rsi ?? 999;   bv = b.rsi ?? 999; }
      if (sortKey === 'fromHigh'){ av = a.fromHigh52 ?? 0; bv = b.fromHigh52 ?? 0; }
      if (sortKey === 'entry')   { av = ENTRY_SORT_ORDER[a.entrySignal] ?? 99; bv = ENTRY_SORT_ORDER[b.entrySignal] ?? 99; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  function SortIcon({ col }: { col: EtfSortKey }) {
    if (sortKey !== col) return <ChevronDown size={12} className="text-[#444] ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-400 ml-1" />
      : <ChevronDown size={12} className="text-blue-400 ml-1" />;
  }

  const Th = ({ col, label }: { col: EtfSortKey; label: string }) => (
    <th className="px-4 py-3 text-xs text-[#64748b] font-medium cursor-pointer hover:text-white"
      onClick={() => toggleSort(col)}>
      <span className="flex items-center">{label}<SortIcon col={col} /></span>
    </th>
  );

  return (
    <>
      <div className="px-6 py-2.5 border-b border-[#2a2a2a] flex items-center justify-between">
        <span className="text-xs text-[#64748b]">{rows.length} ETFs · sorted by RSI ascending by default</span>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 text-xs text-[#94a3b8] border border-[#2a2a2a] rounded hover:border-[#3a3a3a] hover:text-white transition-colors disabled:opacity-40">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && <div className="flex items-center justify-center h-64 text-[#64748b] text-sm">Loading live data…</div>}
        {error && <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>}
        {!loading && !error && (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0d0d0d]">
              <tr className="border-b border-[#2a2a2a]">
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium w-8">#</th>
                <Th col="symbol"  label="Symbol" />
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">Category</th>
                <Th col="price"   label="Price" />
                <Th col="rsi"     label="RSI" />
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">RSI Signal</th>
                <th className="px-4 py-3 text-xs text-[#64748b] font-medium">4H EMA</th>
                <Th col="fromHigh" label="% from 52w Hi" />
                <Th col="entry"   label="Entry Signal" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const highlight = row.entrySignal === 'BUY NOW' || row.entrySignal === 'STARTER';
                return (
                  <tr key={row.symbol}
                    className={cn(
                      'border-b border-[#1a1a1a] transition-colors',
                      highlight ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-[#111]',
                    )}>
                    <td className="px-4 py-3 text-[#444] text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{row.symbol}</div>
                      <div className="text-xs text-[#64748b] truncate max-w-[160px]">{row.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs border', CATEGORY_BADGE[row.category] ?? 'bg-[#2a2a2a] text-[#64748b] border-[#333]')}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {row.price != null ? formatPrice(row.price) : <span className="text-[#444]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.rsi != null
                        ? <RsiBar rsi={row.rsi} />
                        : <span className="text-[#444] text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs border', RSI_SIGNAL_BADGE[row.rsiSignal] ?? RSI_SIGNAL_BADGE['NEUTRAL'])}>
                        {row.rsiSignal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {row.ema4hBull === null
                        ? <span className="text-[#444]">—</span>
                        : row.ema4hBull
                          ? <span className="text-green-400">BULL ✅</span>
                          : <span className="text-red-400">BEAR ❌</span>}
                    </td>
                    <td className={cn('px-4 py-3 font-mono text-xs',
                      row.fromHigh52 !== null && row.fromHigh52 < -15 ? 'text-green-400' :
                      row.fromHigh52 !== null && row.fromHigh52 < -8  ? 'text-yellow-400' : 'text-[#94a3b8]')}>
                      {row.fromHigh52 != null ? `${row.fromHigh52}%` : <span className="text-[#444]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs border font-medium', ENTRY_BADGE[row.entrySignal] ?? ENTRY_BADGE['NEUTRAL'])}>
                        {row.entrySignal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── Opportunities tab ───────────────────────────────────────────────────────
function OpportunitiesTab() {
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchOpportunities();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allItems = Object.values(data).flat();
  const signals = allItems.filter(i => i.signal);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {loading && <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">Loading live data...</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {!loading && !error && (
        <>
          {/* Signal banner */}
          {signals.length > 0 && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
              <p className="text-xs text-[#64748b] uppercase tracking-wide mb-3">🚨 Active Signals</p>
              <div className="flex flex-wrap gap-2">
                {signals.map(s => (
                  <div key={s.symbol} className={cn('flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium border',
                    s.signal === 'oversold' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400')}>
                    <span className="font-bold">{s.symbol}</span>
                    <span>RSI {s.rsi}</span>
                    <span className="text-[#64748b]">{s.signal === 'oversold' ? '↓ Oversold' : '↑ Overbought'}</span>
                    <span className="text-[#64748b]">{s.fromHigh}% from hi</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category tables */}
          {Object.entries(data).map(([cat, items]) => (
            <div key={cat} className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <h3 className="text-sm font-medium text-white">{CATEGORY_LABELS[cat] ?? cat}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    {['Symbol', 'Name', 'Price', 'RSI', '% from 52wH', 'Signal'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-[#64748b] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.sort((a: any, b: any) => a.rsi - b.rsi).map((item: any) => (
                    <tr key={item.symbol} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                      <td className="px-4 py-2.5 font-semibold text-white">{item.symbol}</td>
                      <td className="px-4 py-2.5 text-[#64748b] text-xs">{item.name}</td>
                      <td className="px-4 py-2.5 text-white font-mono text-xs">{formatPrice(item.price)}</td>
                      <td className="px-4 py-2.5"><RsiBar rsi={item.rsi} /></td>
                      <td className={cn('px-4 py-2.5 font-mono text-xs', item.fromHigh < -15 ? 'text-green-400' : item.fromHigh < -8 ? 'text-yellow-400' : 'text-[#94a3b8]')}>
                        {item.fromHigh}%
                      </td>
                      <td className="px-4 py-2.5">
                        {item.signal === 'oversold' && <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded">🟢 Oversold — watch for entry</span>}
                        {item.signal === 'overbought' && <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded">🔴 Overbought — avoid/trim</span>}
                        {!item.signal && <span className="text-[#444] text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function MasterRankings() {
  const [tab, setTab] = useState<Tab>('equities');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchWatchlist());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'equities', label: 'Equities' },
    { id: 'etfs', label: 'ETFs' },
    { id: 'opportunities', label: '🌍 Opportunities' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
        <h1 className="text-base font-semibold text-white">Master Rankings</h1>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#94a3b8] border border-[#2a2a2a] rounded hover:border-[#3a3a3a] hover:text-white transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-[#2a2a2a] flex gap-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-3 text-sm border-b-2 transition-colors',
              tab === t.id ? 'border-blue-500 text-white font-medium' : 'border-transparent text-[#64748b] hover:text-white')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'equities' && <EquitiesTab data={data} loading={loading} error={error} onRefresh={load} />}
      {tab === 'etfs' && <EtfsTab />}
      {tab === 'opportunities' && <OpportunitiesTab />}
    </div>
  );
}
