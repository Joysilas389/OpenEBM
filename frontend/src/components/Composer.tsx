'use client';
import { useRef, useEffect, KeyboardEvent } from 'react';
import { useApp } from './AppProvider';
import { t } from '@/lib/i18n';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ value, onChange, onSend, disabled, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { lang } = useApp();

  // auto-grow
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [value]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends on desktop only; mobile keyboards typically use newline.
    if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  };

  return (
    <div className="ebm-composer-wrap">
      <div className="ebm-composer">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder || t('ask_placeholder', lang)}
          disabled={disabled}
          aria-label={t('ask_placeholder', lang)}
        />
        <button
          className="ebm-send-btn"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label={t('send', lang)}
        >
          {disabled ? (
            <span className="spinner-border spinner-border-sm" role="status" />
          ) : (
            <i className="bi bi-arrow-up" />
          )}
        </button>
      </div>
    </div>
  );
}
