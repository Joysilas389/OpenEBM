'use client';
import { useState, useEffect } from 'react';
import { getBookmarks, removeBookmark } from '@/lib/storage';
import { AnswerView } from '@/components/AnswerView';
import { ConfirmModal } from '@/components/ConfirmModal';
import { exportToPDF } from '@/lib/pdfExport';
import type { BookmarkItem } from '@/types';

export default function SavedPage() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [open, setOpen] = useState<BookmarkItem | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<BookmarkItem | null>(null);

  useEffect(() => setItems(getBookmarks()), []);
  const refresh = () => setItems(getBookmarks());
  const filtered = items.filter((i) => i.query.toLowerCase().includes(search.toLowerCase()));

  if (open) {
    return (
      <div>
        <div className="d-flex gap-2 mb-2">
          <button
            className="btn btn-sm"
            onClick={() => setOpen(null)}
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)' }}
          >
            <i className="bi bi-arrow-left me-1" /> Back
          </button>
          <button
            className="btn btn-sm"
            onClick={() => exportToPDF(open)}
            style={{ background: 'var(--ebm-primary)', color: '#fff' }}
          >
            <i className="bi bi-file-earmark-pdf me-1" /> Export PDF
          </button>
        </div>
        <div className="ebm-answer-card">
          <h3>{open.custom_title || open.query}</h3>
          <div className="text-muted-ebm small">Saved {new Date(open.saved_at).toLocaleString()}</div>
        </div>
        <AnswerView
          answer={open.answer}
          onAsk={(q) => {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('openebm_prefill', q);
              window.location.href = '/';
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <input
        className="form-control mb-3"
        placeholder="Search saved…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
      />
      {filtered.length === 0 && (
        <div className="text-center text-muted-ebm py-5">
          <i className="bi bi-bookmark" style={{ fontSize: 36 }} />
          <p className="mt-2">No saved answers yet.</p>
        </div>
      )}
      {filtered.map((item) => (
        <div key={item.id} className="ebm-answer-card" onClick={() => setOpen(item)} style={{ cursor: 'pointer' }}>
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1 min-w-0">
              <div className="fw-semibold mb-1" style={{ fontSize: '.95rem' }}>
                {item.custom_title || item.query}
              </div>
              <div className="text-muted-ebm small">
                {item.answer.references.length} refs · {item.answer.language}
              </div>
            </div>
            <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                className="btn btn-sm p-1 text-muted-ebm"
                onClick={() => exportToPDF(item)}
                aria-label="Export PDF"
              >
                <i className="bi bi-file-earmark-pdf" />
              </button>
              <button
                className="btn btn-sm p-1 text-muted-ebm"
                onClick={() => setConfirmDelete(item)}
                aria-label="Delete"
              >
                <i className="bi bi-trash" />
              </button>
            </div>
          </div>
        </div>
      ))}

      <ConfirmModal
        open={!!confirmDelete}
        title="Remove from saved?"
        message={`"${confirmDelete?.custom_title || confirmDelete?.query?.slice(0, 80) || ''}" will be removed from your saved items.`}
        confirmLabel="Yes, remove"
        cancelLabel="No, keep it"
        onConfirm={() => {
          if (confirmDelete) {
            removeBookmark(confirmDelete.id);
            refresh();
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
