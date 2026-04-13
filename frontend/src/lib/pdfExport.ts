/**
 * PDF export for openEBM history items. Uses the browser's native print-to-PDF.
 * v3: handles simulation items (text-only: title + archetype + mechanism + bedside + pearls).
 */
import type { HistoryItem, BookmarkItem } from '@/types';

const ARCHETYPE_LABEL: Record<string, string> = {
  cyclic_process: 'Cyclic process',
  flow_pathway: 'Flow pathway',
  membrane_dynamics: 'Membrane dynamics',
  anatomical_cross_section: 'Anatomical cross-section',
  feedback_loop: 'Feedback loop',
  comparison_curve: 'Comparison curve',
  phase_timeline: 'Phase timeline',
  reaction_mechanism: 'Reaction mechanism',
};

export function exportToPDF(item: HistoryItem | BookmarkItem) {
  const html = item.kind === 'simulation' && item.simulation
    ? buildSimulationHtml(item)
    : buildAnswerHtml(item);

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to export PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function baseStyles(): string {
  return `
  @page { size: A4; margin: 18mm 15mm 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    color: #0f172a; line-height: 1.55; font-size: 11pt; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .header {
    border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 18px;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .logo {
    font-weight: 800; font-size: 16pt;
    background: linear-gradient(135deg, #2563eb, #0891b2);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .header-meta { font-size: 8.5pt; color: #64748b; text-align: right; }
  h1 { font-size: 16pt; color: #0f172a; margin: 0 0 4px 0; font-weight: 700; line-height: 1.3; }
  .query-date { font-size: 8.5pt; color: #64748b; margin-bottom: 16px; }
  .section { margin-bottom: 16px; page-break-inside: avoid; }
  h2 {
    font-size: 11.5pt; font-weight: 700; color: #1d4ed8; margin: 0 0 6px 0;
    padding-left: 8px; border-left: 3px solid #2563eb;
  }
  .content { white-space: pre-wrap; }
  .content strong { color: #0f172a; }
  .citation {
    display: inline-block; background: #eff6ff; color: #1d4ed8;
    padding: 0 5px; border-radius: 6px; font-size: 8pt; font-weight: 600; margin: 0 1px;
  }
  .warnings {
    background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;
    padding: 10px 12px; margin: 14px 0; font-size: 9.5pt; color: #92400e;
  }
  .warnings ul { margin: 4px 0 0 18px; padding: 0; }
  .references-header {
    font-size: 13pt; font-weight: 700; color: #0f172a; margin: 20px 0 10px;
    padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;
  }
  .ref { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; }
  .ref:last-child { border-bottom: 0; }
  .ref-num {
    flex: 0 0 22px; width: 22px; height: 22px; border-radius: 50%;
    background: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 9pt;
    text-align: center; line-height: 22px;
  }
  .ref-body { flex: 1; min-width: 0; }
  .ref-title { font-size: 10pt; font-weight: 600; color: #0f172a; }
  .ref-meta { font-size: 8.5pt; color: #64748b; margin-top: 2px; }
  .ref-why { font-size: 8.5pt; color: #475569; margin-top: 3px; }
  .ref-url { font-size: 8pt; color: #2563eb; word-break: break-all; margin-top: 3px;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
  .sim-badge {
    display: inline-block; background: #dbeafe; color: #1e40af;
    padding: 3px 10px; border-radius: 12px; font-size: 8.5pt; font-weight: 600; margin-bottom: 10px;
  }
  .pearls { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
  .pearls ul { margin: 4px 0 0 18px; padding: 0; }
  .pearls li { margin-bottom: 6px; font-size: 10pt; }
  .footer {
    margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0;
    font-size: 8pt; color: #64748b; text-align: center;
  }
  .disclaimer { font-style: italic; margin-top: 4px; }
  @media print { .no-print { display: none; } }
  `;
}

function docWrap(title: string, body: string, lang: string = 'en'): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><title>${escapeHtml(title)} — openEBM</title>
<style>${baseStyles()}</style></head>
<body>
<div class="header">
  <div class="logo">openEBM</div>
  <div class="header-meta">Evidence-based medicine<br>powered by Claude</div>
</div>
${body}
<div class="footer">
  openEBM — https://openebm.vercel.app<br>
  <span class="disclaimer">Decision support only. Not a substitute for clinician judgment.</span>
</div>
<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),400)});</script>
</body></html>`;
}

function buildAnswerHtml(item: HistoryItem | BookmarkItem): string {
  const answer = item.answer!;
  const title = item.custom_title || item.query;
  const date = new Date(item.created_at).toLocaleString();

  const sections = answer.sections.map((s) => `
    <section class="section">
      <h2>${escapeHtml(s.heading)}</h2>
      <div class="content">${renderContent(s.content)}</div>
    </section>`).join('');

  const refs = answer.references.map((r) => `
    <div class="ref">
      <div class="ref-num">${r.n}</div>
      <div class="ref-body">
        <div class="ref-title">${escapeHtml(r.title)}</div>
        <div class="ref-meta">
          ${r.journal ? `<span>${escapeHtml(r.journal)}</span>` : (r.domain ? `<span>${escapeHtml(r.domain)}</span>` : '')}
          ${r.publication_year ? ` · <span>${r.publication_year}</span>` : ''}
          ${r.badges?.length ? ` · <span>${r.badges.map(escapeHtml).join(' · ')}</span>` : ''}
        </div>
        ${r.why_cited ? `<div class="ref-why"><em>Why cited:</em> ${escapeHtml(r.why_cited)}</div>` : ''}
        <div class="ref-url">${escapeHtml(r.url)}</div>
      </div>
    </div>`).join('');

  const warnings = answer.warnings?.length
    ? `<div class="warnings"><strong>⚠ Important notes:</strong><ul>${answer.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>`
    : '';

  const body = `
    <h1>${escapeHtml(title)}</h1>
    <div class="query-date">Generated ${escapeHtml(date)} · Language: ${escapeHtml(answer.language || 'en')}</div>
    ${warnings}
    ${sections}
    <div class="references-header">References (${answer.references.length})</div>
    ${refs}`;

  return docWrap(title, body, answer.language || 'en');
}

function buildSimulationHtml(item: HistoryItem | BookmarkItem): string {
  const sim = item.simulation!;
  const title = item.custom_title || sim.title || item.query;
  const date = new Date(item.created_at).toLocaleString();
  const archLabel = sim.archetype ? (ARCHETYPE_LABEL[sim.archetype] || sim.archetype) : '';

  const pearls = sim.pearls?.length
    ? `<section class="section"><h2>High-yield pearls</h2>
        <div class="pearls"><ul>${sim.pearls.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
       </section>`
    : '';

  const body = `
    <h1>${escapeHtml(title)}</h1>
    <div class="query-date">Generated ${escapeHtml(date)} · Simulation</div>
    ${archLabel ? `<div class="sim-badge">${escapeHtml(archLabel)}</div>` : ''}
    <section class="section">
      <h2>Mechanism (First Principles)</h2>
      <div class="content">${escapeHtml(sim.mechanism_first_principles || '')}</div>
    </section>
    <section class="section">
      <h2>Clinical Application / Bedside</h2>
      <div class="content">${escapeHtml(sim.clinical_application || '')}</div>
    </section>
    ${pearls}
    <div class="footer" style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:8.5pt;color:#64748b;text-align:left">
      Note: The interactive visual cannot be embedded in a PDF. Open this simulation in openEBM to view the animated artifact.
    </div>`;

  return docWrap(title, body);
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderContent(content: string): string {
  if (!content) return '';
  let html = escapeHtml(content).replace(/\[(\d+)\]/g, '<span class="citation">[$1]</span>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}
