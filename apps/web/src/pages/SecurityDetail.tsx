import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, TrendingUp, FileText, BarChart3, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchSecurity, fetchAnalyses, fetchLiveMetrics } from '../lib/api';
import { formatPrice, formatCurrency, timeAgo, cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  building: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  watching: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  passed: 'bg-[#2a2a2a] text-[#64748b] border-[#333]',
  sold: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: 'text-green-400 bg-green-500/10 border-green-500/20',
  bearish: 'text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const ANALYSIS_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  fundamental: { label: 'Fundamentals', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: '📊' },
  fundamentals: { label: 'Fundamentals', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: '📊' },
  technical: { label: 'Technical', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: '📈' },
  technicals: { label: 'Technical', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: '📈' },
  ai_threat: { label: 'AI/Competitive Threat', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: '🤖' },
  'ai-threat': { label: 'AI/Competitive Threat', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: '🤖' },
  thesis: { label: 'Thesis Summary', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: '📝' },
  thesis_summary: { label: 'Thesis Summary', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: '📝' },
};

function convictionColor(c: number) {
  if (c >= 8) return 'text-green-400';
  if (c >= 6) return 'text-yellow-400';
  if (c >= 4) return 'text-orange-400';
  return 'text-[#64748b]';
}

function convictionBar(c: number) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('text-lg font-bold', convictionColor(c))}>{c}/10</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-4 rounded-sm',
              i < c
                ? c >= 8 ? 'bg-green-500' : c >= 6 ? 'bg-yellow-500' : c >= 4 ? 'bg-orange-500' : 'bg-[#444]'
                : 'bg-[#1a1a1a]'
            )}
          />
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-[#1a1a1a] last:border-0">
      <span className="text-xs text-[#64748b]">{label}</span>
      <span className="text-xs text-right text-white font-mono ml-4">{value ?? '—'}</span>
    </div>
  );
}

// Group metrics into categories for cleaner display
function groupMetrics(metrics: Record<string, any>) {
  const valuation: Record<string, any> = {};
  const growth: Record<string, any> = {};
  const quality: Record<string, any> = {};
  const technical: Record<string, any> = {};
  const other: Record<string, any> = {};

  for (const [k, v] of Object.entries(metrics)) {
    const kl = k.toLowerCase();
    if (kl.includes('pe') || kl.includes('fcf') || kl.includes('peg') || kl.includes('ev_') || kl.includes('price') || kl.includes('52w') || kl.includes('split') || kl.includes('pre_split') || kl.includes('beta') || kl.includes('debt') || kl.includes('net_cash') || kl.includes('buyback') || kl.includes('shares_change')) {
      valuation[k] = v;
    } else if (kl.includes('growth') || kl.includes('rpo') || kl.includes('crpo') || kl.includes('revenue') || kl.includes('sub') || kl.includes('fy20')) {
      growth[k] = v;
    } else if (kl.includes('margin') || kl.includes('roic') || kl.includes('roe') || kl.includes('retention') || kl.includes('subscription_pct')) {
      quality[k] = v;
    } else if (kl.includes('rsi') || kl.includes('sma') || kl.includes('ema') || kl.includes('volume') || kl.includes('below') || kl.includes('near') || kl.includes('bollinger') || kl.includes('support') || kl.includes('resistance')) {
      technical[k] = v;
    } else {
      other[k] = v;
    }
  }

  return { valuation, growth, quality, technical, other };
}

function MetricGroup({ title, metrics }: { title: string; metrics: Record<string, any> }) {
  if (Object.keys(metrics).length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-medium text-[#64748b] mb-2 uppercase tracking-wide">{title}</h4>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
        {Object.entries(metrics).map(([k, v]) => (
          <div key={k} className="flex justify-between py-1 border-b border-[#111]">
            <span className="text-xs text-[#64748b] capitalize">{k.replace(/_/g, ' ')}</span>
            <span className={cn(
              'text-xs font-mono ml-2',
              typeof v === 'boolean' ? (v ? 'text-green-400' : 'text-red-400') :
              typeof v === 'number' && v < 0 ? 'text-red-400' : 'text-white'
            )}>
              {typeof v === 'boolean' ? (v ? '✓' : '✗') :
               typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: any }) {
  const [expanded, setExpanded] = useState(true);
  const typeInfo = ANALYSIS_TYPE_LABELS[analysis.analysis_type?.toLowerCase()] ?? {
    label: analysis.analysis_type ?? 'Analysis',
    color: 'bg-[#1a1a1a] text-[#94a3b8] border-[#2a2a2a]',
    icon: '📋',
  };
  const grouped = analysis.metrics ? groupMetrics(analysis.metrics) : null;

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#151515] transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-base">{typeInfo.icon}</span>
          <span className={cn('px-2.5 py-1 rounded text-xs border font-medium', typeInfo.color)}>
            {typeInfo.label}
          </span>
          {analysis.sentiment && (
            <span className={cn(
              'px-2 py-0.5 rounded text-xs border capitalize',
              SENTIMENT_COLORS[analysis.sentiment?.toLowerCase()] ?? 'bg-[#1a1a1a] text-[#94a3b8] border-[#2a2a2a]'
            )}>
              {analysis.sentiment}
            </span>
          )}
          {analysis.conviction != null && (
            <span className="text-xs text-[#64748b]">
              conviction: <span className={cn('font-bold', convictionColor(analysis.conviction))}>{analysis.conviction}/10</span>
            </span>
          )}
          {analysis.price_at_analysis && (
            <span className="text-xs text-[#444]">@ {formatPrice(analysis.price_at_analysis)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#444]">{timeAgo(analysis.created_at)}</span>
          {expanded ? <ChevronUp size={14} className="text-[#444]" /> : <ChevronDown size={14} className="text-[#444]" />}
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Summary — the main human-readable content */}
          {analysis.summary && (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:text-[#cbd5e1] prose-p:leading-relaxed prose-p:text-sm prose-p:my-2
              prose-strong:text-white prose-strong:font-semibold
              prose-li:text-[#cbd5e1] prose-li:text-sm
              prose-headings:text-white prose-headings:text-sm prose-headings:mt-4 prose-headings:mb-2
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-code:text-green-400 prose-code:bg-[#1a1a1a] prose-code:px-1 prose-code:rounded
            ">
              <ReactMarkdown>{analysis.summary}</ReactMarkdown>
            </div>
          )}

          {/* Metrics — grouped and clean */}
          {grouped && (
            <div className="pt-3 border-t border-[#1a1a1a] space-y-4">
              <MetricGroup title="Valuation & Price" metrics={grouped.valuation} />
              <MetricGroup title="Growth" metrics={grouped.growth} />
              <MetricGroup title="Quality & Margins" metrics={grouped.quality} />
              <MetricGroup title="Technical Levels" metrics={grouped.technical} />
              <MetricGroup title="Other" metrics={grouped.other} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LiveMetricsCard({ metrics }: { metrics: any }) {
  if (!metrics) return null;
  const dayUp = (metrics.dayChangePct ?? 0) >= 0;
  const rsiColor = metrics.rsi <= 30 ? 'text-green-400' : metrics.rsi >= 70 ? 'text-red-400' : metrics.rsi <= 45 ? 'text-yellow-400' : 'text-[#94a3b8]';

  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={13} className="text-yellow-400" />
        <span className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Live Data</span>
        <span className="text-[10px] text-[#333] ml-auto">{new Date(metrics.fetchedAt).toLocaleTimeString()}</span>
      </div>
      <div className="grid grid-cols-4 gap-4 lg:grid-cols-8">
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">Price</p>
          <p className="text-sm font-bold text-white">{formatPrice(metrics.price)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">Day Chg</p>
          <p className={cn('text-sm font-mono font-semibold', dayUp ? 'text-green-400' : 'text-red-400')}>
            {metrics.dayChangePct != null ? `${dayUp ? '+' : ''}${metrics.dayChangePct}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">RSI (14d)</p>
          <p className={cn('text-sm font-mono font-semibold', rsiColor)}>{metrics.rsi ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">vs 50d SMA</p>
          <p className={cn('text-sm font-mono', metrics.sma50 && metrics.price < metrics.sma50 ? 'text-red-400' : 'text-green-400')}>
            {metrics.sma50 ? `${((metrics.price / metrics.sma50 - 1) * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">vs 200d SMA</p>
          <p className={cn('text-sm font-mono', metrics.sma200 && metrics.price < metrics.sma200 ? 'text-red-400' : 'text-green-400')}>
            {metrics.sma200 ? `${((metrics.price / metrics.sma200 - 1) * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">52w High</p>
          <p className="text-sm font-mono text-[#94a3b8]">{metrics.high52 ? formatPrice(metrics.high52) : '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">From High</p>
          <p className={cn('text-sm font-mono', (metrics.fromHigh52 ?? 0) < -20 ? 'text-green-400' : 'text-[#94a3b8]')}>
            {metrics.fromHigh52 != null ? `${metrics.fromHigh52}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b] mb-0.5">Mkt Cap</p>
          <p className="text-sm font-mono text-[#94a3b8]">
            {metrics.marketCap ? `$${(metrics.marketCap / 1e9).toFixed(0)}B` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SecurityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [secData, setSecData] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chart4hOk, setChart4hOk] = useState(false);
  const [chart1hOk, setChart1hOk] = useState(false);
  const [activeChart, setActiveChart] = useState<'4hour' | '1hour'>('4hour');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchSecurity(id), fetchAnalyses(id)])
      .then(([sec, an]) => {
        setSecData(sec);
        setAnalyses(an);
        const sym = sec.security?.symbol;
        if (sym) {
          fetch(`/api/securities/${sym}/chart/4hour`, { method: 'HEAD' })
            .then(r => setChart4hOk(r.ok)).catch(() => {});
          fetch(`/api/securities/${sym}/chart/1hour`, { method: 'HEAD' })
            .then(r => setChart1hOk(r.ok)).catch(() => {});
          // Fetch live metrics
          fetchLiveMetrics(sym).then(setLiveMetrics).catch(() => {});
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#64748b] text-sm">
        Loading...
      </div>
    );
  }

  if (error || !secData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400 text-sm">{error ?? 'Security not found'}</p>
        <button onClick={() => navigate('/')} className="text-xs text-[#94a3b8] hover:text-white">
          ← Back to Rankings
        </button>
      </div>
    );
  }

  const { security, watchlistItem: wl } = secData;
  const hasChart = chart4hOk || chart1hOk;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="h-4 w-px bg-[#2a2a2a]" />
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white">{security.symbol}</span>
          <span className="text-sm text-[#94a3b8]">{security.security_name}</span>
          {wl && (
            <span
              className={cn(
                'px-2.5 py-1 rounded text-xs border capitalize font-medium',
                STATUS_COLORS[wl.status] ?? STATUS_COLORS.passed,
              )}
            >
              {wl.status}
            </span>
          )}
        </div>
        {wl?.conviction != null && (
          <div className="ml-auto">{convictionBar(wl.conviction)}</div>
        )}
      </div>

      <div className="p-6 space-y-6 max-w-6xl">
        {/* Live metrics bar */}
        {liveMetrics && <LiveMetricsCard metrics={liveMetrics} />}

        {/* Top row: Entry Setup + CC Plan + Thesis */}
        {wl && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-blue-400" />
                <h2 className="text-sm font-medium text-white">Entry Setup</h2>
              </div>
              <InfoRow label="Entry Low" value={wl.entry_price_low != null ? formatPrice(wl.entry_price_low) : null} />
              <InfoRow label="Entry High" value={wl.entry_price_high != null ? formatPrice(wl.entry_price_high) : null} />
              <InfoRow label="RSI Gate" value={wl.entry_rsi != null ? `≤ ${wl.entry_rsi}` : null} />
              <InfoRow label="Target Entry" value={wl.target_entry_price != null ? formatPrice(wl.target_entry_price) : null} />
            </div>

            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-green-400" />
                <h2 className="text-sm font-medium text-white">Covered Call Plan</h2>
              </div>
              <InfoRow label="Target Shares" value={wl.cc_target_shares ?? 100} />
              <InfoRow label="Cost (100 shares)" value={wl.cc_cost != null ? formatCurrency(wl.cc_cost) : null} />
              <InfoRow label="Updated" value={wl.updated_at ? new Date(wl.updated_at).toLocaleDateString() : null} />
            </div>

            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={14} className="text-yellow-400" />
                <h2 className="text-sm font-medium text-white">Thesis</h2>
              </div>
              {wl.thesis ? (
                <p className="text-xs text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">{wl.thesis}</p>
              ) : (
                <p className="text-xs text-[#444] italic">No thesis recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Technical Chart */}
        {hasChart && (
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-purple-400" />
                <h2 className="text-sm font-medium text-white">Technical Chart</h2>
                <span className="text-xs text-[#444]">EMA(6/26) + RSI</span>
              </div>
              <div className="flex gap-1">
                {chart1hOk && (
                  <button
                    onClick={() => setActiveChart('1hour')}
                    className={cn(
                      'px-3 py-1 rounded text-xs transition-colors',
                      activeChart === '1hour'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-[#64748b] hover:text-white'
                    )}
                  >
                    1H
                  </button>
                )}
                {chart4hOk && (
                  <button
                    onClick={() => setActiveChart('4hour')}
                    className={cn(
                      'px-3 py-1 rounded text-xs transition-colors',
                      activeChart === '4hour'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-[#64748b] hover:text-white'
                    )}
                  >
                    4H
                  </button>
                )}
              </div>
            </div>
            <img
              src={`/api/securities/${security.symbol}/chart/${activeChart}`}
              alt={`${security.symbol} ${activeChart} chart`}
              className="w-full rounded border border-[#1a1a1a]"
            />
          </div>
        )}

        {/* Analyses */}
        <div>
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            Analysis History
            <span className="text-xs text-[#64748b] font-normal">({analyses.length} reports)</span>
          </h2>
          {analyses.length === 0 ? (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-8 text-center text-[#64748b] text-sm">
              No analyses on record.
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map(a => (
                <AnalysisCard key={a.id} analysis={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
