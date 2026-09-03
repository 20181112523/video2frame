import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils.js';

const NAV_ITEMS = [
  {
    to: '/extract',
    label: '视频切帧',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4 8.5 15.5M8.5 8.5 20 20" />
      </svg>
    ),
  },
  {
    to: '/preview',
    label: '预览',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: '处理记录',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: '设置',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2.5M12 18.5V21M4.6 6.6l1.8 1.8M17.6 15.6l1.8 1.8M3 12h2.5M18.5 12H21M4.6 17.4l1.8-1.8M17.6 8.4l1.8-1.8" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const [ffmpegReady, setFfmpegReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    window.electronAPI.checkFFmpeg().then((result) => {
      if (mounted) setFfmpegReady(result.available);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <nav className="glass-panel relative z-10 flex h-screen w-60 flex-shrink-0 flex-col border-r-0">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="size-[18px]">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M8 5v14M16 5v14" />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-tight text-foreground">Video2Frame</span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-white/50 hover:text-foreground'
              )
            }
          >
            <span className="flex size-[18px] shrink-0 items-center justify-center">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
          <span
            className={cn(
              'size-[7px] shrink-0 rounded-full',
              ffmpegReady ? 'bg-success shadow-[0_0_0_2px_rgba(23,135,64,0.15)]' : 'bg-destructive'
            )}
          />
          <span className="flex-1">{ffmpegReady ? 'FFmpeg 就绪' : 'FFmpeg 未就绪'}</span>
        </div>
      </div>
    </nav>
  );
}
