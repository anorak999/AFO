import { LayoutGrid, Zap, Copy, History, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import logo from '../assets/logo.png'; // the funnel mark — place the PNG here

type Section = 'organize' | 'rules' | 'duplicates' | 'history' | 'settings';

const NAV: { key: Section; label: string; icon: ReactNode; tint: string }[] = [
  { key: 'organize', label: 'Organize', icon: <LayoutGrid size={13} />, tint: 'bg-icon-organize' },
  { key: 'rules', label: 'Rule Builder', icon: <Zap size={13} />, tint: 'bg-icon-rules' },
  { key: 'duplicates', label: 'Duplicates', icon: <Copy size={13} />, tint: 'bg-icon-duplicates' },
  { key: 'history', label: 'History', icon: <History size={13} />, tint: 'bg-icon-history' },
  { key: 'settings', label: 'Settings', icon: <Settings size={13} />, tint: 'bg-icon-settings' },
];

export function Sidebar({
  active,
  onNavigate,
}: {
  active: Section;
  onNavigate: (s: Section) => void;
}) {
  return (
    <aside className="w-[230px] shrink-0 border-r border-border bg-sidebar p-3">
      <div className="mb-2 flex items-center gap-2.5 px-2 pb-4 pt-1.5">
        <img src={logo} alt="AFO" className="h-[34px] w-[34px] rounded-[9px] shadow-card" />
        <div>
          <div className="text-[14.5px] font-semibold leading-tight text-text">AFO</div>
          <div className="text-[10.5px] text-text-dim">v2.0 Tauri</div>
        </div>
      </div>

      <nav className="space-y-0.5">
        {NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={[
                'flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] transition-colors',
                isActive
                  ? 'bg-accent text-accent-contrast'
                  : 'text-text hover:bg-black/5 dark:hover:bg-white/5',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-white',
                  isActive ? 'bg-white/20' : item.tint,
                ].join(' ')}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
