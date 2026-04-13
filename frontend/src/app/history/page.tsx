'use client';
import { useEffect, useState } from 'react';
import { AnswerView } from '@/components/AnswerView';
import { SimulationPlayer } from '@/components/SimulationPlayer';
import {
  getHistory, deleteHistoryItem, clearHistory, renameHistoryItem, togglePin,
  addBookmark, removeBookmark, isBookmarked,
} from '@/lib/storage';
import { exportToPDF } from '@/lib/pdfExport';
import type { HistoryItem, HistoryKind } from '@/types';

const KIND_META: Record<HistoryKind, { label: string; cls: string }> = {
  ask:        { label: 'Ask',        cls: 'bg-primary-subtle text-primary-emphasis' },
  compare:    { label: 'Compare',    cls: 'bg-info-subtle text-info-emphasis' },
  teaching:   { label: 'Learning',   cls: 'bg-success-subtle text-success-emphasis' },
  simulation: { label: 'Simulation', cls: 'bg-warning-subtle text-warning-emphasis' },
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState<HistoryItem | null>(null);
  const [q, setQ] = useState('');

  function refresh() { setItems(getHistory()); }
  useEffect(() => { refresh(); }, []);

  const filtered = items.filter((i) => {
    if (!q.trim()) return true;
    const hay = (i.custom_title || i.query || '').toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pinned = filtered.filter((i) => i.pinned);
  const rest = filtered.filter((i) => !i.pinned);

  function onDelete(id: string) {
    if (!confirm('Delete this item?')) return;
    deleteHistoryItem(id);
    if (open?.id === id) setOpen(null);
    refresh();
  }
  function onRename(item: HistoryItem) {
    const t = prompt('Rename:', item.custom_title || item.query);
    if (t && t.trim()) { renameHistoryItem(item.id, t.trim()); refresh(); }
  }
  function onPin(id: string) { togglePin(id); refresh(); }
  function onBookmark(item: HistoryItem) {
    if (isBookmarked(item.id)) removeBookmark(item.id); else addBookmark(item);
    refresh();
  }
  function onClear() {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    clearHistory(); setOpen(null); refresh();
  }

  if (open) {
    const kind = (open.kind || 'ask') as HistoryKind;
    return (
      <div>
        <div className="px-2 py-3">
          <button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => setOpen(null)}>
            ← Back to history
          </button>
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className={`badge rounded-pill ${KIND_META[kind].cls}`}>{KIND_META[kind].label}</span>
            <h1 className="h5 fw-bold mb-0">{open.custom_title || open.query}</h1>
          </div>
          <div className="d-flex gap-2 mb-3">
            <button className="btn btn-sm btn-outline-primary" onClick={() => exportToPDF(open)}>
              Export PDF
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => onBookmark(open)}>
              {isBookmarked(open.id) ? '★ Bookmarked' : '☆ Bookmark'}
            </button>
          </div>
          {kind === 'simulation' && open.simulation
            ? <SimulationPlayer spec={open.simulation} />
            : open.answer
              ? <AnswerView answer={open.answer} />
              : <div className="alert alert-warning small">This item has no content.</div>}
        </div>
    </div>
    );
  }

  const renderRow = (i: HistoryItem) => {
    const kind = (i.kind || 'ask') as HistoryKind;
    const title = i.custom_title || i.query;
    return (
      <div key={i.id} className="card mb-2 shadow-sm">
        <div className="card-body py-2 px-3">
          <div className="d-flex align-items-start gap-2" style={{ minWidth: 0, overflow: "hidden" }}>
            <span className={`badge rounded-pill ${KIND_META[kind].cls} flex-shrink-0 mt-1`}>
              {KIND_META[kind].label}
            </span>
            <div className="flex-grow-1" style={{ minWidth: 0, overflow: "hidden" }} role="button" onClick={() => setOpen(i)}>
              <div className="fw-semibold text-truncate" style={{ maxWidth: "100%" }}>{title}</div>
              <div className="small text-muted">
                {new Date(i.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="d-flex gap-1 mt-2 flex-wrap">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(i)}>Open</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => onPin(i.id)}>
              {i.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => onBookmark(i)}>
              {isBookmarked(i.id) ? '★' : '☆'}
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => onRename(i)}>Rename</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => exportToPDF(i)}>PDF</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(i.id)}>Delete</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="px-2 py-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h1 className="h4 fw-bold mb-0">History</h1>
          {items.length > 0 && (
            <button className="btn btn-sm btn-outline-danger" onClick={onClear}>Clear all</button>
          )}
        </div>
        <input
          className="form-control form-control-sm mb-3"
          placeholder="Search history…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {filtered.length === 0 && (
          <div className="text-center text-muted small py-5">
            {items.length === 0 ? 'No history yet. Ask something or run a simulation.' : 'No matches.'}
          </div>
        )}
        {pinned.length > 0 && (
          <div>
            <div className="small text-muted fw-semibold mb-1">Pinned</div>
            {pinned.map(renderRow)}
            <div className="small text-muted fw-semibold mt-3 mb-1">All</div>
          </>
        )}
        {rest.map(renderRow)}
      </main>
    </>
  );
}
