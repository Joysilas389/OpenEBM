'use client';
import { useState, KeyboardEvent } from 'react';
import { SimulationPlayer } from '@/components/SimulationPlayer';
import { generateSimulation } from '@/lib/api';
import { addSimulationToHistory } from '@/lib/storage';
import type { SimulationSpec } from '@/types';

const PRESETS = [
  'Cardiac cycle',
  'Action potential of a ventricular myocyte',
  'Renin–angiotensin–aldosterone system',
  'Glomerular filtration',
  'Oxygen–hemoglobin dissociation curve',
  'Insulin signaling and GLUT4 translocation',
  'Coagulation cascade',
  'Krebs cycle',
  'Nephron countercurrent multiplier',
  'Baroreceptor reflex',
];

export default function SimulationsPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spec, setSpec] = useState<SimulationSpec | null>(null);

  async function run(q?: string) {
    const query = (q ?? topic).trim();
    if (!query || loading) return;
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const s = (await generateSimulation(query)) as unknown as SimulationSpec;
      setSpec(s);
      try { addSimulationToHistory(query, s); } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to build simulation.');
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') run();
  }

  return (
    <>
      
      <main className="container-app py-3">
        <h1 className="h4 fw-bold mb-1">Simulations</h1>
        <p className="text-muted small mb-3">
          Interactive visual explanations of any mechanism, process, or pathway.
        </p>

        <div className="input-group mb-2">
          <input
            className="form-control"
            placeholder="e.g. Cardiac cycle, Krebs cycle, Coagulation cascade…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={onKey}
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={() => run()} disabled={loading || !topic.trim()}>
            {loading ? 'Building…' : 'Generate'}
          </button>
        </div>

        {!spec && !loading && (
          <div className="mb-3">
            <div className="small text-muted mb-1">Try a preset:</div>
            <div className="d-flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p} className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setTopic(p); run(p); }} disabled={loading}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status" />
            <div className="small text-muted mt-2">Building interactive visual…</div>
          </div>
        )}

        {error && <div className="alert alert-danger small">{error}</div>}

        {spec && <SimulationPlayer spec={spec} />}
      </main>
      
    </>
  );
}
