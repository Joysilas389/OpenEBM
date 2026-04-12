'use client';
import { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="ebm-drawer-backdrop" onClick={onCancel} style={{ alignItems: 'center' }}>
      <div
        className="ebm-answer-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 380,
          width: '88%',
          margin: '0 auto',
          padding: '1.25rem',
          borderRadius: 16,
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: '1.05rem', fontWeight: 700 }}>
          <i className={`bi ${danger ? 'bi-exclamation-triangle-fill' : 'bi-question-circle'} me-2`}
             style={{ color: danger ? 'var(--ebm-warning)' : 'var(--ebm-primary)' }} />
          {title}
        </h3>
        <div style={{ fontSize: '.9rem', color: 'var(--ebm-text)', marginBottom: '1.25rem' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button
            className="btn flex-grow-1"
            onClick={onCancel}
            style={{
              background: 'var(--ebm-bg-elev)',
              color: 'var(--ebm-text)',
              border: '1px solid var(--ebm-border)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            className="btn flex-grow-1"
            onClick={onConfirm}
            style={{
              background: danger ? 'var(--ebm-danger)' : 'var(--ebm-primary)',
              color: '#fff',
              border: 0,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
