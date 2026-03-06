import { useEffect, useState } from 'react';
import { fetchWatchlist, fetchAnalyses } from '../lib/api';
import { timeAgo, cn } from '../lib/utils';

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: 'text-green-400 bg-green-500/10 border-green-500/20',
  bearish: 'text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const ANALYSIS_TYPE_COLORS: Record<string, string> = {
  fundamentals: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  technicals: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'ai-threat': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  thesis: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export default function AnalysisView() {
  const [securities, setSecurities] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loadingSec, setLoadingSec] = useState(true);
  const [loadingAn, setLoadingAn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWatchlist()
      .then(items => {
        setSecurities(items);
        if (items.length > 0) setSelectedId(items[0].security?.security_id ?? null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingSec(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingAn(true);
    fetchAnalyses(selectedId)
      .then(setAnalyses)
      .catch(() => setAnalyses([]))
      .finally(() => setLoadingAn(false));
  }, [selectedId]);

  const selectedSecurity = securities.find(s => s.security?.security_id === selectedId);

  return (
    <div className="flex h-full">
      {/* Left: security list */}
      <aside className="w-56 shrink-0 border-r border-[#2a2a2a] overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">Securities</p>
        </div>
        {loadingSec ? (
          <div className="p-4 text-[#64748b] text-xs">Loading...</div>
        ) : (
          <div className="p-2 space-y-0.5">
            {securities.map(item => (
              <button
                key={item.security?.security_id}
                onClick={() => setSelectedId(item.security?.security_id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded transition-colors',
                  selectedId === item.security?.security_id
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#94a3b8] hover:bg-[#151515] hover:text-white',
                )}
              >
                <div className="text-sm font-medium">{item.security?.symbol ?? '—'}</div>
                <div className="text-xs text-[#64748b] truncate">{item.security?.security_name ?? ''}</div>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Right: analyses */}
      <div className="flex-1 overflow-auto">
        {selectedSecurity && (
          <div className="px-6 py-4 border-b border-[#2a2a2a]">
            <h1 className="text-base font-semibold text-white">
              {selectedSecurity.security?.symbol} — Analyses
            </h1>
            <p className="text-xs text-[#64748b] mt-0.5">{selectedSecurity.security?.security_name}</p>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          {loadingAn && (
            <div className="text-[#64748b] text-sm">Loading analyses...</div>
          )}
          {!loadingAn && analyses.length === 0 && selectedId && (
            <div className="text-[#64748b] text-sm">No analyses found for this security.</div>
          )}
          {!loadingAn && (
            <div className="space-y-4 max-w-3xl">
              {analyses.map(a => (
                <div key={a.id} className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs border capitalize',
                          ANALYSIS_TYPE_COLORS[a.analysis_type?.toLowerCase()] ??
                            'bg-[#1a1a1a] text-[#94a3b8] border-[#2a2a2a]',
                        )}
                      >
                        {a.analysis_type ?? 'Unknown'}
                      </span>
                      {a.sentiment && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs border capitalize',
                            SENTIMENT_COLORS[a.sentiment?.toLowerCase()] ??
                              'bg-[#1a1a1a] text-[#94a3b8] border-[#2a2a2a]',
                          )}
                        >
                          {a.sentiment}
                        </span>
                      )}
                      {a.conviction != null && (
                        <span className="text-xs text-[#64748b]">
                          conviction: <span className="text-white font-medium">{a.conviction}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#444] shrink-0 ml-4">{timeAgo(a.created_at)}</span>
                  </div>

                  {a.narrative && (
                    <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">{a.narrative}</p>
                  )}

                  {a.metrics && Object.keys(a.metrics).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                      <p className="text-xs text-[#64748b] mb-2 font-medium">Metrics</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(a.metrics).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center py-1">
                            <span className="text-xs text-[#64748b] capitalize">{k.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-white font-mono ml-2">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
