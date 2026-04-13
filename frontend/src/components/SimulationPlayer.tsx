'use client';
import { useEffect, useRef, useState } from 'react';
import type { SimulationSpec, SimulationStep } from '@/types';

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--ebm-primary)',
  accent: 'var(--ebm-accent)',
  success: 'var(--ebm-success)',
  warning: 'var(--ebm-warning)',
  danger: 'var(--ebm-danger)',
  muted: 'var(--ebm-text-muted)',
  text: 'var(--ebm-text)',
};
const color = (c?: string) => (c ? COLOR_MAP[c] || c : 'var(--ebm-primary)');

const SPEEDS = [
  { label: 'Slow', value: 0.5 },
  { label: 'Normal', value: 1 },
  { label: 'Fast', value: 1.75 },
  { label: 'Very Fast', value: 3 },
];

function StepVisual({ step }: { step: SimulationStep }) {
  const els = Array.isArray(step?.visual?.elements) ? step.visual.elements : [];
  return (
    <svg viewBox="0 0 500 300" style={{ width: '100%', height: 'auto', maxHeight: 300 }}>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ebm-primary)" />
        </marker>
      </defs>
      {els.map((e: any, i: number) => {
        switch (e.kind) {
          case 'circle':
            return (
              <g key={i}>
                <circle cx={+e.x || 0} cy={+e.y || 0} r={+e.r || 24} fill={color(e.color)} opacity={0.88} />
                {e.text && <text x={e.x} y={(+e.y || 0) + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">{e.text}</text>}
              </g>
            );
          case 'rect':
            return (
              <g key={i}>
                <rect x={+e.x || 0} y={+e.y || 0} width={e.w ?? 80} height={e.h ?? 40} rx={6} fill={color(e.color)} opacity={0.88} />
                {e.text && (
                  <text x={(+e.x || 0) + (e.w ?? 80) / 2} y={(+e.y || 0) + (e.h ?? 40) / 2 + 4}
                        textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">{e.text}</text>
                )}
              </g>
            );
          case 'arrow':
          case 'line':
            return (
              <line key={i} x1={e.x} y1={e.y} x2={e.x2 ?? (+e.x || 0) + 50} y2={e.y2 ?? e.y}
                    stroke={color(e.color)} strokeWidth={2.5}
                    markerEnd={e.kind === 'arrow' ? 'url(#arr)' : undefined} />
            );
          case 'label':
            return <text key={i} x={e.x} y={e.y} fill="var(--ebm-text)" fontSize="12" fontWeight="500">{e.text}</text>;
          default:
            return null;
        }
      })}
    </svg>
  );
}

export function SimulationPlayer({ spec }: { spec: SimulationSpec & { mechanism_first_principles?: string } }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  if (!spec || !Array.isArray(spec.steps) || spec.steps.length === 0) {
    return (
      <div className="ebm-answer-card">
        <h5>{spec?.title || 'Simulation'}</h5>
        <p className="text-muted-ebm small">No steps were generated. Try another topic.</p>
      </div>
    );
  }

  const step = spec.steps[Math.min(idx, spec.steps.length - 1)];
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!playing || reduceMotion) return;
    const dur = (step?.duration_ms || 1800) / speed;
    timerRef.current = window.setTimeout(() => {
      setIdx((i) => (i + 1 >= spec.steps.length ? 0 : i + 1));
    }, dur);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [playing, idx, speed, step, spec.steps.length, reduceMotion]);

  const currentSpeedLabel = SPEEDS.find((s) => s.value === speed)?.label || 'Normal';

  return (
    <>
      <div className="ebm-sim-canvas">
        <h5 className="mb-1" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{spec.title}</h5>
        <p className="text-muted-ebm small mb-2">{spec.short_explanation}</p>

        <StepVisual step={step} />

        <div className="mt-2 mb-1 small"><strong>Step {idx + 1}/{spec.steps.length}: {step.title}</strong></div>
        <p className="small text-muted-ebm mb-0">{step.description}</p>

        {/* Transport controls */}
        <div className="ebm-sim-controls">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} aria-label="Back">
            <i className="bi bi-skip-backward-fill" />
          </button>
          <button className="primary" onClick={() => setPlaying((p) => !p)} aria-label="Play/Pause">
            <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} />
          </button>
          <button onClick={() => setIdx((i) => Math.min(spec.steps.length - 1, i + 1))} aria-label="Next">
            <i className="bi bi-skip-forward-fill" />
          </button>
          <button onClick={() => { setIdx(0); setPlaying(false); }} aria-label="Reset">
            <i className="bi bi-arrow-counterclockwise" />
          </button>
          <button onClick={() => setSpeedOpen(true)} aria-label="Speed">
            <i className="bi bi-speedometer2 me-1" />{currentSpeedLabel}
          </button>
        </div>

        {/* Numbered pagination */}
        <div className="d-flex flex-wrap gap-1 justify-content-center mt-3">
          {spec.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setPlaying(false); }}
              aria-label={`Go to step ${i + 1}`}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--ebm-border)',
                background: i === idx ? 'var(--ebm-primary)' : 'var(--ebm-bg-elev)',
                color: i === idx ? '#fff' : 'var(--ebm-text)',
                fontSize: '.78rem', fontWeight: 600,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Mechanism (First Principles) */}
      {spec.mechanism_first_principles && (
        <div className="ebm-answer-card">
          <h3><i className="bi bi-diagram-3 me-1" />Mechanism (First Principles)</h3>
          <p className="small">{spec.mechanism_first_principles}</p>
        </div>
      )}

      {/* Clinical Application / Bedside */}
      {spec.clinical_application && (
        <div className="ebm-answer-card">
          <h3><i className="bi bi-hospital me-1" />Clinical Application / Bedside</h3>
          <p className="small">{spec.clinical_application}</p>
        </div>
      )}

      {/* Speed picker modal */}
      {speedOpen && (
        <div className="ebm-drawer-backdrop" onClick={() => setSpeedOpen(false)} style={{ alignItems: 'center' }}>
          <div
            className="ebm-answer-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 340, width: '86%', margin: '0 auto', borderRadius: 16 }}
          >
            <h3 style={{ marginTop: 0, fontSize: '1.05rem' }}>
              <i className="bi bi-speedometer2 me-2" style={{ color: 'var(--ebm-primary)' }} />
              Playback speed
            </h3>
            <div className="d-flex flex-column gap-2">
              {SPEEDS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setSpeed(s.value); setSpeedOpen(false); }}
                  className="btn text-start"
                  style={{
                    background: speed === s.value ? 'var(--ebm-primary)' : 'var(--ebm-bg-elev)',
                    color: speed === s.value ? '#fff' : 'var(--ebm-text)',
                    border: '1px solid var(--ebm-border)',
                    borderRadius: 10, padding: '.7rem 1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span><strong>{s.label}</strong></span>
                  <span style={{ opacity: .7, fontSize: '.82rem' }}>{s.value}×</span>
                </button>
              ))}
            </div>
            <button
              className="btn w-100 mt-3"
              onClick={() => setSpeedOpen(false)}
              style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
