'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHistory, deleteHistoryItem, clearHistory, togglePin, addBookmark } from '@/lib/storage';
import { AnswerView } from '@/components/AnswerView';
import type { HistoryItem } from '@/types';

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState<HistoryItem | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const refresh = () => setItems(getHistory());
  const filtered = items.filter((i) => i.query.toLowerCase().includes(search.toLowerCase()));

  if (open) {
    return (
      <div>
        <button className="btn btn-sm mb-2" onClick={() => setOpen(null)} style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)' }}>
          <i className="bi bi-arrow-left me-1" /> Back
        </button>
        <div className="ebm-answer-card">
          <h3>{open.custom_title || open.query}</h3>
          <div className="text-muted-ebm small">{new Date(open.created_at).toLocaleString()}</div>
        </div>
        <AnswerView answer={open.answer} onAsk={(q) => { if (typeof window !== 'undefined') { sessionStorage.setItem('openebm_prefill', q); window.location.href = '/'; } }} />
      </div>
    );
  }

  return (
    <div>
      <input
        className="form-control mb-3"
        placeholder="Search history…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
      />
      {items.length > 0 && (
        <button
          className="btn btn-sm mb-3"
          onClick={() => {
            if (confirm('Clear all history?')) {
              clearHistory();
              refresh();
            }
          }}
          style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-danger)' }}
        >
          <i className="bi bi-trash me-1" /> Clear all
        </button>
      )}
      {filtered.length === 0 && (
        <div className="text-center text-muted-ebm py-5">
          <i className="bi bi-clock-history" style={{ fontSize: 36 }} />
          <p className="mt-2">No history yet. Ask a question to get started.</p>
        </div>
      )}
      {filtered.map((item) => (
        <div key={item.id} className="ebm-answer-card" onClick={() => setOpen(item)} style={{ cursor: 'pointer' }}>
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1 min-w-0">
              <div className="fw-semibold mb-1" style={{ fontSize: '.95rem' }}>
                {item.pinned && <i className="bi bi-pin-fill me-1 text-warning" />}
                {item.custom_title || item.query}
              </div>
              <div className="text-muted-ebm small">
                {new Date(item.created_at).toLocaleString()} · {item.answer.references.length} refs
              </div>
            </div>
            <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                className="btn btn-sm p-1 text-muted-ebm"
                onClick={() => {
                  togglePin(item.id);
                  refresh();
                }}
                aria-label="Pin"
              >
                <i className={`bi ${item.pinned ? 'bi-pin-fill' : 'bi-pin'}`} />
              </button>
              <button
                className="btn btn-sm p-1 text-muted-ebm"
                onClick={() => {
                  addBookmark(item);
                  alert('Saved');
                }}
                aria-label="Save"
              >
                <i className="bi bi-bookmark" />
              </button>
              <button
                className="btn btn-sm p-1 text-muted-ebm"
                onClick={() => {
                  if (confirm('Delete this item?')) {
                    deleteHistoryItem(item.id);
                    refresh();
                  }
                }}
                aria-label="Delete"
              >
                <i className="bi bi-trash" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
