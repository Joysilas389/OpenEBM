import type { AnswerResponse, AnswerSettings, SimulationSpec } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const DEFAULT_SETTINGS: AnswerSettings = {
  answer_style: 'standard',
  teaching_mode: false,
  citation_density: 'standard',
  answer_length: 1500,
  max_references: 12,
  source_preference: 'balanced',
  freshness: '5y',
  include_basic_sciences: false,
  specialty: null,
  answer_language: 'en',
};

function getClientId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('openebm_client_id');
  if (!id) {
    id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('openebm_client_id', id);
  }
  return id;
}

export async function ask(
  query: string,
  mode: 'standard' | 'teaching' | 'compare' = 'standard',
  settings: AnswerSettings = DEFAULT_SETTINGS,
  compareItems?: string[]
): Promise<AnswerResponse> {
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      mode,
      settings,
      compare_items: compareItems,
      client_id: getClientId(),
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

export async function generateSimulation(topic: string, language = 'en'): Promise<SimulationSpec> {
  const res = await fetch(`${API_BASE}/api/simulations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, language }),
  });
  if (!res.ok) throw new Error(`Simulation API error ${res.status}`);
  return res.json();
}

export async function listPrebuiltSimulations() {
  const res = await fetch(`${API_BASE}/api/simulations/prebuilt`);
  if (!res.ok) return [];
  return res.json();
}
