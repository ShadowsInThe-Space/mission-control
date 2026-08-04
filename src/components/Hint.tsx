'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';

/**
 * Inline help hint. Renders a small ⓘ icon that shows a popup tooltip on hover.
 * Globally gated by the `hintsEnabled` store flag (toggled from the sidebar) —
 * renders nothing when hints are off, keeping the UI clean by default.
 *
 * Reuses the hover-delay + absolute-position pattern proven in SEOPanel's
 * TooltipIcon, but uses the app's CSS variables for theme consistency.
 */
export default function Hint({ tip }: { tip: string }) {
  const hintsEnabled = useStore((s) => s.hintsEnabled);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!hintsEnabled) return null;

  const showTip = () => {
    timer.current = setTimeout(() => setShow(true), 350);
  };
  const hideTip = () => {
    if (timer.current) clearTimeout(timer.current);
    setShow(false);
  };

  return (
    <span className="relative inline-flex items-center ml-1 cursor-help align-middle">
      <span
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        className="text-[11px] select-none"
        style={{ color: 'var(--color-accent)' }}
      >
        ⓘ
      </span>
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-xs rounded-lg px-3 py-2 shadow-xl z-50 pointer-events-none whitespace-pre-line"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-foreground)',
          }}
        >
          {tip}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: 'var(--color-surface)' }}
          />
        </span>
      )}
    </span>
  );
}
