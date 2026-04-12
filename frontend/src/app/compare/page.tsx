'use client';
import { useState } from 'react';
import { ask, DEFAULT_SETTINGS } from '@/lib/api';
import { addToHistory, getSettings } from '@/lib/storage';
import { AnswerView } from '@/components/AnswerView';
import { AnswerSkeleton } from '@/components/AnswerSkeleton';
import { useApp } from '@/components/AppProvider';
import type { AnswerResponse } from '@/types';

export default function ComparePage() {
  const { lang } = useApp();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!a.trim() || !b.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const settings = { ...getSettings(), answer_language: lang };
      const res = await ask(context || `${a} vs ${b}`, 'compare', settings, [a, b]);
      setAnswer(res);
      addToHistory(`Compare: ${a} vs ${b}`, res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="ebm-answer-card">
        <h3><i className="bi bi-columns-gap me-1" />Compare</h3>
        <p className="text-muted-ebm small mb-3">Compare two diagnoses, drugs, or interventions side-by-side.</p>
        <div className="mb-2">
          <input
            className="form-control"
            placeholder="First item (e.g. amoxicillin)"
            value={a}
            onChange={(e) => setA(e.target.value)}
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          />
        </div>
        <div className="mb-2">
          <input
            className="form-control"
            placeholder="Second item (e.g. azithromycin)"
            value={b}
            onChange={(e) => setB(e.target.value)}
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          />
        </div>
        <div className="mb-2">
          <input
            className="form-control"
            placeholder="Optional context (e.g. for outpatient CAP)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          />
        </div>
        <button
          className="btn w-100"
          style={{ background: 'var(--ebm-primary)', color: '#fff' }}
          onClick={run}
          disabled={loading || !a || !b}
        >
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {loading && <AnswerSkeleton />}
      {error && <div className="ebm-warning"><i className="bi bi-exclamation-octagon-fill" /><div>{error}</div></div>}
      {answer && <AnswerView answer={answer} />}
    </div>
  );
}
