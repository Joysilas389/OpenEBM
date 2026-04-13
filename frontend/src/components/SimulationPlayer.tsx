import type { SimulationSpec } from '@/types';
'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './AppProvider';

interface VisualSpec {
  title: string;
  archetype?: string;
  artifact_html: string;
  mechanism_first_principles: string;
  clinical_application: string;
  pearls?: string[];
  self_check?: Record<string, boolean>;
}

const ARCHETYPE_LABEL: Record<string, string> = {
  cyclic_process: 'Cyclic process',
  flow_pathway: 'Flow pathway',
  membrane_dynamics: 'Membrane dynamics',
  anatomical_cross_section: 'Anatomy',
  feedback_loop: 'Feedback loop',
  comparison_curve: 'Curve',
  phase_timeline: 'Timeline',
  reaction_mechanism: 'Reaction',
};

/** Minimal sanitizer for defense-in-depth. Sandboxed iframe does the heavy lifting. */
function sanitizeArtifact(html: string): string {
  if (!html) return '';
  let out = html;
  // Strip <script src="..."> with external src (inline <script>...</script> is fine — sandbox contains it)
  out = out.replace(/<script\b[^>]*\bsrc\s*=\s*["'][^"']*["'][^>]*>\s*<\/script>/gi, '');
  // Strip any <link rel="stylesheet" href="...">
  out = out.replace(/<link\b[^>]*rel\s*=\s*["']?stylesheet[^>]*>/gi, '');
  // Strip external iframe tags (nested iframes not allowed)
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  return out;
}

export function SimulationPlayer({ spec }: { spec: VisualSpec }) {
  const { effectiveTheme } = useApp();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(520);
  const [failed, setFailed] = useState(false);

  const html = sanitizeArtifact(spec.artifact_html || '');

  // Re-render iframe with updated theme by appending ?theme=... via srcdoc refresh
  const srcdoc = html && html.includes('?theme=')
    ? html
    : html.replace(
        '<head>',
        `<head><script>try{var u=new URL("a://x/?theme=${effectiveTheme}");` +
        `Object.defineProperty(window,"location",{value:{...window.location,search:"?theme=${effectiveTheme}"}});}catch(e){}</script>`
      );

  // Simpler approach: pass theme via a data attribute the artifact can read
  const themedHtml = html.replace(
    '<html',
    `<html data-openebm-theme="${effectiveTheme}"`
  ).replace(
    '</head>',
    `<script>(function(){try{var t=document.documentElement.getAttribute("data-openebm-theme")||"light";` +
    `document.documentElement.setAttribute("data-theme",t);` +
    `var u=new URL(location.href);u.searchParams.set("theme",t);` +
    `history.replaceState&&history.replaceState(null,"",u.pathname+u.search);}catch(e){}})();</script></head>`
  );

  if (!spec || !spec.artifact_html || spec.artifact_html.length < 500) {
    return (
      <div className="ebm-answer-card">
        <h5>{spec?.title || 'Simulation'}</h5>
        <p className="text-muted-ebm small">
          The visualization could not be generated for this topic. Try rephrasing or picking a preset.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="ebm-sim-canvas" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1rem 0' }}>
          <h5 className="mb-1" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{spec.title}</h5>
          {spec.archetype && (
            <div className="text-muted-ebm" style={{ fontSize: '.72rem', marginBottom: 6 }}>
              <i className="bi bi-diagram-2 me-1" />
              {ARCHETYPE_LABEL[spec.archetype] || spec.archetype}
            </div>
          )}
        </div>
        {failed ? (
          <div style={{ padding: '1rem', color: 'var(--ebm-text-muted)', fontSize: '.85rem' }}>
            The interactive visual could not be loaded. The mechanism and bedside notes below still apply.
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title={spec.title}
            sandbox="allow-scripts"
            srcDoc={themedHtml}
            style={{
              width: '100%',
              height: iframeHeight,
              border: 0,
              display: 'block',
              background: 'var(--ebm-bg-card)',
            }}
            onLoad={(e) => {
              try {
                const doc = (e.currentTarget as HTMLIFrameElement).contentDocument;
                if (doc && doc.body) {
                  const h = Math.min(720, Math.max(420, doc.body.scrollHeight + 20));
                  setIframeHeight(h);
                }
              } catch {
                /* cross-origin — keep default */
              }
            }}
            onError={() => setFailed(true)}
          />
        )}
      </div>

      {spec.mechanism_first_principles && (
        <div className="ebm-answer-card">
          <h3><i className="bi bi-diagram-3 me-1" />Mechanism (First Principles)</h3>
          <p className="small mb-0">{spec.mechanism_first_principles}</p>
        </div>
      )}

      {spec.clinical_application && (
        <div className="ebm-answer-card">
          <h3><i className="bi bi-hospital me-1" />Clinical Application / Bedside</h3>
          <p className="small mb-0">{spec.clinical_application}</p>
        </div>
      )}

      {spec.pearls && spec.pearls.length > 0 && (
        <div className="ebm-answer-card">
          <h3><i className="bi bi-lightbulb me-1" />High-yield pearls</h3>
          <ul className="mb-0 ps-3">
            {spec.pearls.map((p, i) => (
              <li key={i} className="small mb-1">{p}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
