'use client';
import { useApp } from './AppProvider';
import { t } from '@/lib/i18n';

export function TopBar({ title, onMenu }: { title?: string; onMenu?: () => void }) {
  const { lang, theme, setTheme, effectiveTheme } = useApp();
  return (
    <header className="ebm-topbar">
      <div className="ebm-topbar-title flex-grow-1">
        <img src="/icon.svg" alt="openEBM" width={26} height={26} style={{ borderRadius: 6 }} />
        <span>{title || t('app_name', lang)}</span>
      </div>
      <button
        className="btn btn-link p-1 text-muted-ebm"
        onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        <i className={`bi ${effectiveTheme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} style={{ fontSize: '1.15rem' }} />
      </button>
      {onMenu && (
        <button className="btn btn-link p-1 text-muted-ebm" onClick={onMenu} aria-label="Menu">
          <i className="bi bi-list" style={{ fontSize: '1.4rem' }} />
        </button>
      )}
    </header>
  );
}
