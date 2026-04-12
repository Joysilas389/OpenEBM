'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBookmarks, removeBookmark } from '@/lib/storage';
import { AnswerView } from '@/components/AnswerView';
import type { BookmarkItem } from '@/types';

export default function SavedPage() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [open, setOpen] = useState<BookmarkItem | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => setItems(getBookmarks()), []);
  const refresh = () => setItems(getBookmarks());
  const filtered = items.filter((i) => i.query.toLowerCase().includes(search.toLowerCase()));

  if (open) {
    return (
      <div>
        <button className="btn btn-sm mb-2" onClick={() => setOpen(null)} style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)' }}>
          <i className="bi bi-arrow-left me-1" /> Back
        </button>
        <div className="ebm-answer-card">
          <h3>{open.custom_title || open.query}</h3>
          <div className="text-muted-ebm small">Saved {new Date(open.saved_at).toLocaleString()}</div>
        </div>
        <AnswerView answer={open.answer} onAsk={(q) => { if (typeof window !== 'undefined') { sessionStorage.setItem('openebm_prefill', q); window.location.href = '/'; } }} />
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
            <button
              className="btn btn-sm p-1 text-muted-ebm"
              onClick={(e) => {
                e.stopPropagation();
                removeBookmark(item.id);
                refresh();
              }}
            >
              <i className="bi bi-trash" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
