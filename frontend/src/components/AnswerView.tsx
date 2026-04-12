'use client';
import { useState, ReactNode } from 'react';
import type { AnswerResponse, Reference } from '@/types';
import { useApp } from './AppProvider';
import { t } from '@/lib/i18n';

function badgeClass(badge: string): string {
  const b = badge.toLowerCase();
  if (b.includes('guideline')) return 'guideline';
  if (b.includes('new')) return 'new';
  if (b.includes('journal')) return 'journal';
  if (b.includes('review')) return 'review';
  if (b.includes('society')) return 'society';
  if (b.includes('public health')) return 'public-health';
  if (b.includes('landmark')) return 'landmark';
  if (b.includes('updated')) return 'new';
  return '';
}

/** Render content text with [n] tokens replaced by clickable citation pills. */
function renderWithCitations(content: string, refs: Reference[], onRef: (r: Reference) => void): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(content)) !== null) {
    if (match.index > last) out.push(content.slice(last, match.index));
    const n = parseInt(match[1], 10);
    const ref = refs.find((r) => r.n === n);
    if (ref) {
      out.push(
        <button key={`c${key++}`} className="ebm-cite" onClick={() => onRef(ref)}>
          {ref.domain?.replace('www.', '').split('.')[0]?.toUpperCase() || n} ·{n}
        </button>
      );
    } else {
      out.push(`[${n}]`);
    }
    last = re.lastIndex;
  }
  if (last < content.length) out.push(content.slice(last));
  return out;
}

export function AnswerView({ answer, onAsk }: { answer: AnswerResponse; onAsk?: (q: string) => void }) {
  const { lang } = useApp();
  const [openRef, setOpenRef] = useState<Reference | null>(null);
  const [showAllRefs, setShowAllRefs] = useState(false);

  return (
    <div>
      {answer.warnings.length > 0 && (
        <div className="ebm-warning">
          <i className="bi bi-exclamation-triangle-fill" />
          <div>
            {answer.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {answer.sections.map((s, i) => (
        <div key={i} className="ebm-answer-card">
          <h3>{s.heading}</h3>
          <div className="ebm-content" style={{ whiteSpace: 'pre-wrap' }}>
            {renderWithCitations(s.content, answer.references, setOpenRef)}
          </div>
        </div>
      ))}

      {answer.references.length > 0 && (
        <div className="ebm-answer-card">
          <h3>
            <i className="bi bi-journal-bookmark me-1" />
            {t('references', lang)} ({answer.references.length})
          </h3>
          <div className="text-muted-ebm small mb-2">
            {answer.candidate_count} {t('candidates_considered', lang)} · {answer.verified_count}{' '}
            {t('references_displayed', lang)}
          </div>
          {(showAllRefs ? answer.references : answer.references.slice(0, 5)).map((r) => (
            <div key={r.n} className="ebm-ref-item" onClick={() => setOpenRef(r)} style={{ cursor: 'pointer' }}>
              <div className="ebm-ref-num">{r.n}</div>
              <div className="ebm-ref-body">
                <div className="ebm-ref-title">{r.title}</div>
                <div className="ebm-ref-meta">
                  {r.journal && <span>{r.journal}</span>}
                  {r.domain && !r.journal && <span>{r.domain}</span>}
                  {r.publication_year && <span>· {r.publication_year}</span>}
                  {r.badges.map((b) => (
                    <span key={b} className={`ebm-badge ${badgeClass(b)}`}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <i className="bi bi-chevron-right text-muted-ebm align-self-center" />
            </div>
          ))}
          {answer.references.length > 5 && (
            <button
              className="btn btn-sm w-100 mt-2"
              style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-primary)' }}
              onClick={() => setShowAllRefs(!showAllRefs)}
            >
              {showAllRefs ? 'Show fewer' : `Show all ${answer.references.length} references`}
            </button>
          )}
        </div>
      )}

      {answer.related_questions.length > 0 && (
        <div className="ebm-answer-card">
          <h3>
            <i className="bi bi-question-circle me-1" />
            {t('related_questions', lang)}
          </h3>
          <div className="d-flex flex-column gap-2">
            {answer.related_questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onAsk?.(q)}
                className="btn btn-sm text-start"
                style={{
                  background: 'var(--ebm-bg-elev)',
                  border: '1px solid var(--ebm-border)',
                  color: 'var(--ebm-text)',
                  padding: '.6rem .8rem',
                  borderRadius: '10px',
                }}
              >
                <i className="bi bi-arrow-right-short me-1" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {openRef && <RefDrawer ref_={openRef} onClose={() => setOpenRef(null)} />}
    </div>
  );
}

function RefDrawer({ ref_, onClose }: { ref_: Reference; onClose: () => void }) {
  const { lang } = useApp();
  return (
    <div className="ebm-drawer-backdrop" onClick={onClose}>
      <div className="ebm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ebm-drawer-handle" />
        <div className="d-flex align-items-start gap-2 mb-2">
          <div className="ebm-ref-num">{ref_.n}</div>
          <h5 className="mb-0 flex-grow-1" style={{ fontSize: '1rem' }}>
            {ref_.title}
          </h5>
        </div>

        <div className="ebm-ref-meta mb-3">
          {ref_.journal && <span>{ref_.journal}</span>}
          {ref_.publication_year && <span>· {ref_.publication_year}</span>}
          {ref_.badges.map((b) => (
            <span key={b} className={`ebm-badge ${badgeClass(b)}`}>
              {b}
            </span>
          ))}
        </div>

        {ref_.authors && (
          <div className="mb-2">
            <div className="ebm-setting-label">Authors</div>
            <div className="text-muted-ebm small">{ref_.authors}</div>
          </div>
        )}

        {ref_.why_cited && (
          <div className="mb-3">
            <div className="ebm-setting-label">{t('why_cited', lang)}</div>
            <div className="text-muted-ebm small">{ref_.why_cited}</div>
          </div>
        )}

        {ref_.excerpt && (
          <div className="mb-3">
            <div className="ebm-setting-label">Excerpt</div>
            <div className="text-muted-ebm small fst-italic">"{ref_.excerpt}"</div>
          </div>
        )}

        <a
          href={ref_.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn w-100"
          style={{ background: 'var(--ebm-primary)', color: '#fff' }}
        >
          <i className="bi bi-box-arrow-up-right me-1" />
          {t('open_source', lang)}
        </a>
        <button className="btn w-100 mt-2 text-muted-ebm" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
