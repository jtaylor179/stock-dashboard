import { Outlet, NavLink } from 'react-router-dom';
import { BarChart2, TrendingUp, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

const nav = [
  { to: '/', label: 'Rankings', icon: BarChart2, end: true },
  { to: '/portfolios', label: 'Portfolios', icon: TrendingUp, end: false },
  { to: '/analyses', label: 'Analyses', icon: BookOpen, end: false },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <aside className="w-52 shrink-0 border-r border-[#2a2a2a] flex flex-col">
        <div className="px-4 py-4 border-b border-[#2a2a2a]">
          <p className="text-sm font-semibold text-white tracking-wide">Stock Dashboard</p>
          <p className="text-xs text-[#64748b] mt-0.5">Portfolio Manager</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                  isActive
                    ? 'bg-[#1a1a1a] text-white font-medium'
                    : 'text-[#94a3b8] hover:bg-[#151515] hover:text-white',
                )
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[#2a2a2a]">
          <p className="text-[10px] text-[#3a3a3a]">stock-dashboard v1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
