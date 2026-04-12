'use client';
import Link from 'next/link';

const LINKS = [
  { href: '/simulations', icon: 'bi-activity', label: 'Simulations', desc: 'Interactive medical animations' },
  { href: '/settings', icon: 'bi-sliders', label: 'Settings', desc: 'Theme, language, answer style' },
  { href: '/about', icon: 'bi-info-circle', label: 'About', desc: 'How openEBM works' },
];

export default function MorePage() {
  return (
    <div>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="ebm-answer-card d-flex align-items-center text-decoration-none"
          style={{ color: 'var(--ebm-text)' }}
        >
          <i className={`bi ${l.icon} me-3`} style={{ fontSize: '1.5rem', color: 'var(--ebm-primary)' }} />
          <div className="flex-grow-1">
            <div className="fw-semibold">{l.label}</div>
            <div className="small text-muted-ebm">{l.desc}</div>
          </div>
          <i className="bi bi-chevron-right text-muted-ebm" />
        </Link>
      ))}
    </div>
  );
}
