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

function color(c?: string) {
  if (!c) return 'var(--ebm-primary)';
  return COLOR_MAP[c] || c;
}

function StepVisual({ step }: { step: SimulationStep }) {
  const els = Array.isArray(step?.visual?.elements) ? step.visual.elements : [];
  const labels = Array.isArray(step?.labels) ? step.labels : [];
  return (
    <svg viewBox="0 0 500 300" style={{ width: '100%', height: 'auto', maxHeight: 280 }}>
      {els.map((e, i) => {
        switch (e.kind) {
          case 'circle':
            return (
              <g key={i}>
                <circle cx={Number(e.x)||0} cy={Number(e.y)||0} r={Number(e.r)||30} fill={color(e.color)} opacity={0.85} />
                {e.text && (
                  <text x={e.x} y={e.y + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">
                    {e.text}
                  </text>
                )}
              </g>
            );
          case 'rect':
            return (
              <g key={i}>
                <rect
                  x={Number(e.x)||0}
                  y={Number(e.y)||0}
                  width={e.w ?? 80}
                  height={e.h ?? 40}
                  rx={6}
                  fill={color(e.color)}
                  opacity={0.85}
                />
                {e.text && (
                  <text
                    x={e.x + (e.w ?? 80) / 2}
                    y={e.y + (e.h ?? 40) / 2 + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {e.text}
                  </text>
                )}
              </g>
            );
          case 'arrow':
          case 'line':
            return (
              <line
                key={i}
                x1={e.x}
                y1={e.y}
                x2={e.x2 ?? e.x + 50}
                y2={e.y2 ?? e.y}
                stroke={color(e.color)}
                strokeWidth={2.5}
                markerEnd={e.kind === 'arrow' ? 'url(#arr)' : undefined}
              />
            );
          case 'label':
            return (
              <text key={i} x={e.x} y={e.y} fill="var(--ebm-text)" fontSize="12">
                {e.text}
              </text>
            );
          default:
            return null;
        }
      })}
      {labels.map((l, i) => (
        <text key={`l${i}`} x={l.x} y={l.y} fill="var(--ebm-text-muted)" fontSize="11">
          {l.text}
        </text>
      ))}
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ebm-primary)" />
        </marker>
      </defs>
    </svg>
  );
}

export function SimulationPlayer({ spec }: { spec: SimulationSpec }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<number | null>(null);

  // Defensive: handle missing/empty steps gracefully
  if (!spec || !Array.isArray(spec.steps) || spec.steps.length === 0) {
    return (
      <div className="ebm-answer-card">
        <h5>{spec?.title || 'Simulation'}</h5>
        <p className="text-muted-ebm small">No steps were generated. Please try a different topic.</p>
      </div>
    );
  }

  const step = spec.steps[Math.min(stepIdx, spec.steps.length - 1)];
  if (!step) return null;
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!playing || reduceMotion) return;
    const dur = (step?.duration_ms || 1500) / speed;
    timerRef.current = window.setTimeout(() => {
      setStepIdx((i) => (i + 1 >= spec.steps.length ? 0 : i + 1));
    }, dur);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [playing, stepIdx, speed, step, spec.steps.length, reduceMotion]);

  if (!step) return null;

  return (
    <div className="ebm-sim-canvas">
      <h5 className="mb-1" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
        {spec.title}
      </h5>
      <p className="text-muted-ebm small mb-2">{spec.short_explanation}</p>

      <StepVisual step={step} />

      <div className="mt-2 mb-1 small">
        <strong>
          Step {stepIdx + 1}/{spec.steps.length}: {step.title}
        </strong>
      </div>
      <p className="small text-muted-ebm mb-0">{step.description}</p>

      <div className="ebm-sim-controls">
        <button onClick={() => setStepIdx((i) => Math.max(0, i - 1))}>
          <i className="bi bi-skip-backward-fill" />
        </button>
        <button className="primary" onClick={() => setPlaying((p) => !p)}>
          <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} />
        </button>
        <button onClick={() => setStepIdx((i) => Math.min(spec.steps.length - 1, i + 1))}>
          <i className="bi bi-skip-forward-fill" />
        </button>
        <button
          onClick={() => {
            setStepIdx(0);
            setPlaying(false);
          }}
        >
          <i className="bi bi-arrow-counterclockwise" />
        </button>
        <select
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={{
            background: 'var(--ebm-bg-elev)',
            border: '1px solid var(--ebm-border)',
            color: 'var(--ebm-text)',
            borderRadius: 10,
            padding: '.45rem .5rem',
            fontSize: '.8rem',
          }}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      {spec.clinical_application && (
        <div className="mt-3 p-2" style={{ background: 'var(--ebm-bg-elev)', borderRadius: 10 }}>
          <div className="small fw-bold mb-1">
            <i className="bi bi-hospital me-1" />
            Clinical application
          </div>
          <div className="small text-muted-ebm">{spec.clinical_application}</div>
        </div>
      )}
    </div>
  );
}
