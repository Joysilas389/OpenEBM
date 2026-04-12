'use client';
import { useState } from 'react';
import { generateSimulation } from '@/lib/api';
import { SimulationPlayer } from '@/components/SimulationPlayer';
import { useApp } from '@/components/AppProvider';
import type { SimulationSpec } from '@/types';

const PRESETS = [
  'Cardiac cycle',
  'Nephron function',
  'Renin–Angiotensin–Aldosterone System',
  'Coagulation cascade',
  'Oxygen-hemoglobin dissociation curve',
  'Acid-base physiology',
  'Neuronal action potential',
  'Skeletal muscle contraction',
  'Glycolysis',
  'Krebs cycle',
  'Electron transport chain',
];

export default function SimulationsPage() {
  const { lang } = useApp();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState<SimulationSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(t: string) {
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const s = await generateSimulation(t, lang);
      setSpec(s);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="ebm-answer-card">
        <h3><i className="bi bi-activity me-1" />Interactive Simulations</h3>
        <p className="text-muted-ebm small mb-3">
          Step-by-step animations of physiology, biochemistry, and pharmacology — generated on demand.
        </p>
        <div className="input-group mb-3">
          <input
            className="form-control"
            placeholder="Any medical concept…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          />
          <button
            className="btn"
            style={{ background: 'var(--ebm-primary)', color: '#fff' }}
            disabled={loading || !topic}
            onClick={() => run(topic)}
          >
            {loading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-magic" />}
          </button>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setTopic(p); run(p); }}
              className="btn btn-sm"
              style={{
                background: 'var(--ebm-bg-elev)',
                border: '1px solid var(--ebm-border)',
                color: 'var(--ebm-text)',
                fontSize: '.78rem',
                borderRadius: 14,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="ebm-answer-card text-center py-4">
          <div className="spinner-border text-primary" />
          <div className="text-muted-ebm small mt-2">Generating simulation…</div>
        </div>
      )}
      {error && <div className="ebm-warning"><i className="bi bi-exclamation-octagon-fill" /><div>{error}</div></div>}
      {spec && <SimulationPlayer spec={spec} />}
      {spec?.educational_notes?.length ? (
        <div className="ebm-answer-card">
          <h3><i className="bi bi-lightbulb me-1" />Notes</h3>
          <ul className="mb-0 ps-3">
            {spec.educational_notes.map((n, i) => <li key={i} className="small mb-1">{n}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
