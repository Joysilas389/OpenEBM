'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './AppProvider';
import { t } from '@/lib/i18n';

const TABS = [
  { href: '/', icon: 'bi-search', key: 'search' },
  { href: '/compare', icon: 'bi-columns-gap', key: 'compare' },
  { href: '/history', icon: 'bi-clock-history', key: 'history' },
  { href: '/saved', icon: 'bi-bookmark', key: 'saved' },
  { href: '/more', icon: 'bi-three-dots', key: 'more' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { lang } = useApp();
  return (
    <nav className="ebm-bottomnav">
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
        return (
          <Link key={tab.href} href={tab.href} className={active ? 'active' : ''}>
            <i className={`bi ${tab.icon}`} />
            <span>{t(tab.key, lang)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
