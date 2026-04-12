'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/components/AppProvider';
import { LANGUAGES, type Lang } from '@/lib/i18n';
import { getSettings, saveSettings, resetSettings, clearHistory } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/api';
import type { AnswerSettings } from '@/types';
import { ConfirmModal } from '@/components/ConfirmModal';

const SPECIALTIES = [
  'Internal Medicine', 'Emergency Medicine', 'Family Medicine', 'Pediatrics', 'OB/GYN',
  'Surgery', 'Cardiology', 'Neurology', 'Psychiatry', 'Dermatology', 'Infectious Disease',
  'Gastroenterology', 'Pulmonology', 'Nephrology', 'Endocrinology', 'Rheumatology',
  'Hematology', 'Oncology', 'Critical Care', 'Radiology', 'Orthopedics', 'ENT',
  'Ophthalmology', 'Urology', 'Pathology', 'Anesthesiology', 'Public Health',
];

export default function SettingsPage() {
  const { theme, setTheme, lang, setLang } = useApp();
  const [s, setS] = useState<AnswerSettings>(DEFAULT_SETTINGS);
  const [confirmClearHist, setConfirmClearHist] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setS(getSettings()), []);

  const update = <K extends keyof AnswerSettings>(k: K, v: AnswerSettings[K]) => {
    const next = { ...s, [k]: v };
    setS(next);
    saveSettings(next);
  };

  const lengthLabel = (n: number) => {
    if (n <= 500) return 'Short';
    if (n <= 1500) return 'Standard';
    if (n <= 4000) return 'Long';
    if (n <= 10000) return 'Very Long';
    return 'Max';
  };

  return (
    <div>
      <div className="ebm-answer-card">
        <h3><i className="bi bi-palette me-1" />Appearance</h3>
        <div className="ebm-setting-row">
          <div>
            <div className="ebm-setting-label">Theme</div>
            <div className="ebm-setting-hint">Light, dark, or follow system</div>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-translate me-1" />Language</h3>
        <div className="ebm-setting-row">
          <div>
            <div className="ebm-setting-label">Interface language</div>
            <div className="ebm-setting-hint">UI labels and prompts</div>
          </div>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>
        </div>
        <div className="ebm-setting-row">
          <div>
            <div className="ebm-setting-label">Answer language</div>
            <div className="ebm-setting-hint">Claude will respond in this language</div>
          </div>
          <select
            value={s.answer_language}
            onChange={(e) => update('answer_language', e.target.value)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-book me-1" />Answer style</h3>
        <div className="ebm-setting-row">
          <div className="ebm-setting-label">Style</div>
          <select
            value={s.answer_style}
            onChange={(e) => update('answer_style', e.target.value as any)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            <option value="concise">Concise</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep</option>
          </select>
        </div>
        <div className="ebm-setting-row">
          <div className="ebm-setting-label">Teaching mode</div>
          <div className="form-check form-switch m-0">
            <input
              className="form-check-input"
              type="checkbox"
              checked={s.teaching_mode}
              onChange={(e) => update('teaching_mode', e.target.checked)}
            />
          </div>
        </div>
        <div className="ebm-setting-row">
          <div className="ebm-setting-label">Citation density</div>
          <select
            value={s.citation_density}
            onChange={(e) => update('citation_density', e.target.value as any)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            <option value="standard">Standard</option>
            <option value="high">High</option>
            <option value="very_high">Very high</option>
          </select>
        </div>
        <div className="ebm-setting-row d-block">
          <div className="d-flex justify-content-between mb-1">
            <div className="ebm-setting-label">Answer length</div>
            <div className="text-muted-ebm small">{lengthLabel(s.answer_length)} (~{s.answer_length} words)</div>
          </div>
          <input
            type="range"
            className="form-range"
            min={300}
            max={16000}
            step={100}
            value={s.answer_length}
            onChange={(e) => update('answer_length', parseInt(e.target.value, 10))}
          />
        </div>
        <div className="ebm-setting-row d-block">
          <div className="d-flex justify-content-between mb-1">
            <div className="ebm-setting-label">Max references</div>
            <div className="text-muted-ebm small">{s.max_references}</div>
          </div>
          <input
            type="range"
            className="form-range"
            min={5}
            max={20}
            value={s.max_references}
            onChange={(e) => update('max_references', parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-funnel me-1" />Sources</h3>
        <div className="ebm-setting-row">
          <div className="ebm-setting-label">Source preference</div>
          <select
            value={s.source_preference}
            onChange={(e) => update('source_preference', e.target.value as any)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            <option value="guidelines_first">Guidelines first</option>
            <option value="balanced">Balanced</option>
            <option value="reviews_first">Reviews first</option>
            <option value="latest_first">Latest first</option>
          </select>
        </div>
        <div className="ebm-setting-row">
          <div className="ebm-setting-label">Freshness</div>
          <select
            value={s.freshness}
            onChange={(e) => update('freshness', e.target.value as any)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            <option value="1y">Last 1 year</option>
            <option value="3y">Last 3 years</option>
            <option value="5y">Last 5 years</option>
            <option value="include_landmark">Include landmark</option>
          </select>
        </div>
        <div className="ebm-setting-row">
          <div className="ebm-setting-label">Include basic sciences</div>
          <div className="form-check form-switch m-0">
            <input
              className="form-check-input"
              type="checkbox"
              checked={s.include_basic_sciences}
              onChange={(e) => update('include_basic_sciences', e.target.checked)}
            />
          </div>
        </div>
        <div className="ebm-setting-row">
          <div className="ebm-setting-label">Specialty</div>
          <select
            value={s.specialty || ''}
            onChange={(e) => update('specialty', e.target.value || null)}
            className="form-select form-select-sm w-auto"
            style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)', borderColor: 'var(--ebm-border)' }}
          >
            <option value="">All specialties</option>
            {SPECIALTIES.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
          </select>
        </div>
      </div>

      <div className="ebm-answer-card">
        <h3><i className="bi bi-shield-exclamation me-1" />Data controls</h3>
        <button
          className="btn w-100 mb-2"
          style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-danger)' }}
          onClick={() => setConfirmClearHist(true)}
        >
          <i className="bi bi-trash me-1" /> Clear history
        </button>
        <button
          className="btn w-100"
          style={{ background: 'var(--ebm-bg-elev)', color: 'var(--ebm-text)' }}
          onClick={() => setConfirmReset(true)}
        >
          <i className="bi bi-arrow-counterclockwise me-1" /> Reset settings
        </button>
      </div>

      <ConfirmModal
        open={confirmClearHist}
        title="Clear all history?"
        message="All saved queries and answers will be permanently removed from this device."
        confirmLabel="Yes, clear all"
        cancelLabel="No, keep them"
        onConfirm={() => { clearHistory(); setConfirmClearHist(false); }}
        onCancel={() => setConfirmClearHist(false)}
      />
      <ConfirmModal
        open={confirmReset}
        title="Reset all settings?"
        message="Theme, language, answer style and all other preferences will return to defaults."
        confirmLabel="Yes, reset"
        cancelLabel="No, keep them"
        danger={false}
        onConfirm={() => { resetSettings(); setS(DEFAULT_SETTINGS); setConfirmReset(false); }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
