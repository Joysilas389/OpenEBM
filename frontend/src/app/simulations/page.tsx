'use client';
import { useState } from 'react';
import { generateSimulation } from '@/lib/api';
import { SimulationPlayer } from '@/components/SimulationPlayer';
import { useApp } from '@/components/AppProvider';
import { ProgressBar } from '@/components/ProgressBar';

interface VisualSpec {
  title: string;
  archetype?: string;
  artifact_html: string;
  mechanism_first_principles: string;
  clinical_application: string;
  pearls?: string[];
}

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
  'Baroreceptor reflex',
  'Insulin signaling',
  'HPA axis',
  'Beta-lactam mechanism of action',
];

export default function SimulationsPage() {
  const { lang } = useApp();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState<VisualSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(t: string) {
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const s = await generateSimulation(t, lang);
      setSpec(s as VisualSpec);
    } catch (e: any) {
      setError(e.message || 'Failed to generate simulation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="ebm-answer-card">
        <h3><i className="bi bi-activity me-1" />Interactive Simulations</h3>
        <p className="text-muted-ebm small mb-3">
          Type any medical topic. openEBM generates a self-contained interactive visual plus a
          first-principles mechanism and bedside clinical notes.
        </p>
        <div className="input-group mb-3">
          <input
            className="form-control"
            placeholder="Any medical concept…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && topic.trim()) run(topic); }}
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          />
          <button
            className="btn"
            style={{ background: 'var(--ebm-primary)', color: '#fff' }}
            disabled={loading || !topic.trim()}
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
        <div className="ebm-answer-card">
          <ProgressBar label="Building interactive visual…" />
          <div className="text-muted-ebm small mt-2" style={{ fontSize: '.78rem' }}>
            Claude is selecting an archetype, authoring the artifact, and self-checking it.
          </div>
        </div>
      )}
      {error && (
        <div className="ebm-warning">
          <i className="bi bi-exclamation-octagon-fill" />
          <div>{error}</div>
        </div>
      )}
      {spec && <SimulationPlayer spec={spec} />}
    </div>
  );
}
