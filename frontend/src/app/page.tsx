'use client';
import { useState, useEffect } from 'react';
import { Composer } from '@/components/Composer';
import { AnswerView } from '@/components/AnswerView';
import { AnswerSkeleton } from '@/components/AnswerSkeleton';
import { ProgressBar } from '@/components/ProgressBar';
import { useApp } from '@/components/AppProvider';
import { ask, DEFAULT_SETTINGS } from '@/lib/api';
import { addToHistory, getSettings } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { AnswerResponse, AnswerSettings } from '@/types';

const EXAMPLE_QUERIES_BY_LANG: Record<string, string[]> = {
  en: [
    'First-line treatment for community-acquired pneumonia in adults',
    'When to start statins for primary prevention',
    'Workup of new-onset atrial fibrillation',
    'Diagnosis of pulmonary embolism in pregnancy',
  ],
  fr: [
    'Traitement de première intention de la pneumonie',
    'Quand débuter les statines en prévention primaire',
  ],
  es: [
    'Tratamiento de primera línea para neumonía adquirida en la comunidad',
    'Cuándo iniciar estatinas en prevención primaria',
  ],
  ar: ['العلاج الأولي للالتهاب الرئوي المكتسب من المجتمع'],
  pt: ['Tratamento de primeira linha para pneumonia adquirida na comunidade'],
};

export default function Home() {
  const { lang } = useApp();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AnswerSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getSettings());
    if (typeof window !== 'undefined') {
      const prefill = sessionStorage.getItem('openebm_prefill');
      if (prefill) {
        sessionStorage.removeItem('openebm_prefill');
        setTimeout(() => send(prefill), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const examples = EXAMPLE_QUERIES_BY_LANG[lang] || EXAMPLE_QUERIES_BY_LANG.en;

  async function send(q?: string) {
    const finalQ = (q ?? query).trim();
    if (!finalQ) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setQuery('');
    try {
      const settingsWithLang = { ...settings, answer_language: lang };
      const res = await ask(finalQ, 'standard', settingsWithLang);
      setAnswer(res);
      addToHistory(finalQ, res);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!answer && !loading && !error && (
        <div className="ebm-hero">
          <h1>{t('app_name', lang)}</h1>
          <p>{t('tagline', lang)}</p>
          <div className="ebm-example-chips">
            {examples.map((ex, i) => (
              <button key={i} onClick={() => send(ex)}>
                <i className="bi bi-stars me-1" />
                {ex}
              </button>
            ))}
          </div>
          <p className="text-muted-ebm small mt-4 px-3">
            <i className="bi bi-shield-check me-1" />
            {t('not_substitute', lang)}
          </p>
        </div>
      )}

      {loading && <><ProgressBar /><AnswerSkeleton /></>}

      {error && (
        <div className="ebm-warning">
          <i className="bi bi-exclamation-octagon-fill" />
          <div>{error}</div>
        </div>
      )}

      {answer && <AnswerView answer={answer} onAsk={(q) => send(q)} />}

      <Composer value={query} onChange={setQuery} onSend={() => send()} disabled={loading} />
    </>
  );
}
