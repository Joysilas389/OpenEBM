'use client';
import { useApp } from './AppProvider';
import { t } from '@/lib/i18n';

export function AnswerSkeleton() {
  const { lang } = useApp();
  return (
    <div>
      <div className="text-center text-muted-ebm small mb-2">
        <div className="spinner-border spinner-border-sm me-2" /> {t('thinking', lang)}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="ebm-answer-card">
          <div className="ebm-skeleton mb-2" style={{ height: 18, width: '40%' }} />
          <div className="ebm-skeleton mb-2" style={{ height: 12, width: '100%' }} />
          <div className="ebm-skeleton mb-2" style={{ height: 12, width: '95%' }} />
          <div className="ebm-skeleton" style={{ height: 12, width: '85%' }} />
        </div>
      ))}
    </div>
  );
}
