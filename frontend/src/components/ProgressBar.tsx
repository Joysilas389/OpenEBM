'use client';
import { useEffect, useState } from 'react';
import { useApp } from './AppProvider';
import { t } from '@/lib/i18n';

export function ProgressBar({ label }: { label?: string }) {
  const { lang } = useApp();
  const [pct, setPct] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const secs = (Date.now() - start) / 1000;
      setElapsed(secs);
      const p = Math.min(97, 100 * (1 - Math.exp(-secs / 20)));
      setPct(p);
    }, 200);
    return () => clearInterval(tick);
  }, []);

  return (
    <div style={{ padding: '1rem 0.25rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.82rem',
        color: 'var(--ebm-text-muted)',
        marginBottom: 6,
      }}>
        <span>{label || t('thinking', lang)}</span>
        <span>{Math.round(pct)}% · {Math.floor(elapsed)}s</span>
      </div>
      <div style={{
        height: 6,
        background: 'var(--ebm-bg-elev)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--ebm-primary), var(--ebm-accent))',
          transition: 'width 0.25s ease-out',
          borderRadius: 4,
        }} />
      </div>
    </div>
  );
}
