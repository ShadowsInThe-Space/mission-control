'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useStore } from '@/lib/store';
import {
  MessageSquare,
  Kanban,
  ScrollText,
  Search,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Terminal,
  ArrowRightLeft,
  Brain,
  Image,
  Video,
  Music,
  Mic,
  Eye,
  FileText,
  Menu,
  X,
  MoreHorizontal,
  Activity,
} from 'lucide-react';
import { useState, useEffect } from 'react';

type ViewId =
  | 'sessions' | 'kanban' | 'logs' | 'seo' | 'agents' | 'handoff' | 'memory'
  | 'image-studio' | 'video-studio' | 'music-studio' | 'podcast-studio' | 'vision-studio' | 'blog-studio' | 'monitoring';

// On mobile we show 4 main items in the bottom-nav and put the rest behind
// the "More" sheet. The desktop sidebar still shows all 13.
const MOBILE_PRIMARY_IDS: ViewId[] = ['sessions', 'kanban', 'agents', 'memory'];
const MOBILE_MORE_IDS: ViewId[] = ['logs', 'seo', 'handoff', 'monitoring', 'image-studio', 'video-studio', 'music-studio', 'podcast-studio', 'vision-studio', 'blog-studio'];

const NAV_ITEMS: Array<{ id: ViewId; icon: typeof MessageSquare; label: string }> = [
  { id: 'sessions', icon: MessageSquare, label: 'Sessions' },
  { id: 'kanban', icon: Kanban, label: 'Kanban' },
  { id: 'logs', icon: ScrollText, label: 'Logs' },
  { id: 'seo', icon: Search, label: 'SEO / GEO' },
  { id: 'agents', icon: Cpu, label: 'Agents' },
  { id: 'handoff', icon: ArrowRightLeft, label: 'Handoff' },
  { id: 'memory', icon: Brain, label: 'Memory' },
  { id: 'monitoring', icon: Activity, label: 'Monitor' },
  { id: 'image-studio', icon: Image, label: 'Image' },
  { id: 'video-studio', icon: Video, label: 'Video' },
  { id: 'music-studio', icon: Music, label: 'Music' },
  { id: 'podcast-studio', icon: Mic, label: 'Podcast' },
  { id: 'vision-studio', icon: Eye, label: 'Vision' },
  { id: 'blog-studio', icon: FileText, label: 'Blog' },
];

export default function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar, sessions, activeSessionId } = useStore();

  const [isMobile, setIsMobile] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close More sheet on view change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMoreOpen(false); }, [activeView]);
  // Close drawer on view change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false); }, [activeView]);

  const onlineCount = sessions.filter((s) => s.status === 'active').length;

  // ── Mobile: bottom nav + drawer for sidebar + More sheet ──
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar with hamburger + page title */}
        <div
          className="mobile-topbar"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="mobile-topbar-btn"
            aria-label="Open navigation"
            data-testid="mobile-drawer-open"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {NAV_ITEMS.find((i) => i.id === activeView)?.label || 'Mission Control'}
            </div>
          </div>
          <div className="w-10" />
        </div>

        {/* Mobile drawer (slide-in) */}
        {drawerOpen && (
          <>
            <div
              className="mobile-drawer-overlay"
              onClick={() => setDrawerOpen(false)}
              data-testid="mobile-drawer-overlay"
              aria-hidden="true"
            />
            <aside
              className="mobile-drawer"
              style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              data-testid="mobile-drawer"
            >
              <div
                className="flex items-center justify-between px-3 py-4 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Terminal size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Mission Control</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{onlineCount} agents online</div>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="agent-detail-close"
                  aria-label="Close navigation"
                  data-testid="mobile-drawer-close"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 py-2 overflow-y-auto">
                {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                  const isActive = activeView === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveView(id)}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors"
                      style={{
                        background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-foreground)',
                        minHeight: '44px',
                      }}
                      data-testid={`mobile-nav-${id}`}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Bottom nav (4 items + More) */}
        <nav
          className="mobile-bottomnav"
          style={{ borderTop: '1px solid var(--color-border)' }}
          aria-label="Primary navigation"
        >
          {MOBILE_PRIMARY_IDS.map((id) => {
            const item = NAV_ITEMS.find((i) => i.id === id);
            if (!item) return null;
            const Icon = item.icon;
            const isActive = activeView === id;
            return (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className="mobile-bottomnav-item"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
                data-testid={`mobile-tab-${id}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="mobile-bottomnav-item"
            style={{
              color: MOBILE_MORE_IDS.includes(activeView) ? 'var(--color-accent)' : 'var(--color-muted)',
              minWidth: '44px',
              minHeight: '44px',
            }}
            data-testid="mobile-tab-more"
            aria-current={MOBILE_MORE_IDS.includes(activeView) ? 'page' : undefined}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </nav>

        {/* More sheet */}
        {moreOpen && (
          <>
            <div
              className="mobile-drawer-overlay"
              onClick={() => setMoreOpen(false)}
              data-testid="mobile-more-overlay"
              aria-hidden="true"
            />
            <div
              className="mobile-more-sheet"
              style={{ background: 'var(--color-surface)' }}
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              data-testid="mobile-more-sheet"
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>More</div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="agent-detail-close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-2">
                {MOBILE_MORE_IDS.map((id) => {
                  const item = NAV_ITEMS.find((i) => i.id === id);
                  if (!item) return null;
                  const Icon = item.icon;
                  const isActive = activeView === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveView(id)}
                      className="flex items-center gap-3 w-full px-3 py-3 text-left transition-colors rounded-lg"
                      style={{
                        background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-foreground)',
                        minHeight: '44px',
                      }}
                      data-testid={`mobile-more-${id}`}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Desktop / tablet: regular sidebar ──
  return (
    <aside
      className="flex flex-col h-full transition-all duration-200 sidebar-desktop"
      style={{
        width: sidebarCollapsed ? '56px' : '240px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'var(--color-accent)' }}>
          <Terminal size={16} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Mission Control</div>
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{onlineCount} agents online</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors rounded-lg mx-1"
              style={{
                background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
                minHeight: '44px',
              }}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={18} />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Session preview */}
      {!sidebarCollapsed && activeSessionId && (
        <div className="px-3 pb-3">
          <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>ACTIVE SESSION</div>
          {(() => {
            const s = sessions.find((x) => x.id === activeSessionId);
            if (!s) return null;
            const color = s.agentType === 'hermes' ? 'var(--color-hermes)' : s.agentType === 'openclaw' ? 'var(--color-openclaw)' : 'var(--color-claude)';
            return (
              <div className="p-2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-medium capitalize" style={{ color }}>{s.agentType}</span>
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-foreground)' }}>{s.title}</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center p-3 border-t transition-colors"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', minHeight: '44px' }}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
