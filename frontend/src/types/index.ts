export interface Reference {
  n: number;
  title: string;
  url: string;
  canonical_url?: string;
  domain?: string;
  source_type?: string;
  publication_year?: number | null;
  update_year?: number | null;
  badges: string[];
  why_cited?: string;
  excerpt?: string;
  verified_status: string;
  authors?: string;
  journal?: string;
}

export interface AnswerSection {
  heading: string;
  content: string;
  citations: number[];
}

export interface AnswerResponse {
  query: string;
  language: string;
  mode: string;
  sections: AnswerSection[];
  references: Reference[];
  related_questions: string[];
  warnings: string[];
  insufficient_evidence: boolean;
  candidate_count: number;
  verified_count: number;
}

export interface AnswerSettings {
  answer_style: 'concise' | 'standard' | 'deep';
  teaching_mode: boolean;
  citation_density: 'standard' | 'high' | 'very_high';
  answer_length: number;
  max_references: number;
  source_preference: 'guidelines_first' | 'balanced' | 'reviews_first' | 'latest_first';
  freshness: '1y' | '3y' | '5y' | 'include_landmark';
  include_basic_sciences: boolean;
  specialty: string | null;
  answer_language: string;
}

// v3: simulation payload
export interface SimulationSpec {
  title: string;
  archetype?: string;
  artifact_html: string;
  mechanism_first_principles: string;
  clinical_application: string;
  pearls?: string[];
  self_check?: Record<string, boolean>;
}

// v3: history kinds
export type HistoryKind = 'ask' | 'compare' | 'teaching' | 'simulation';

export interface HistoryItem {
  id: string;
  query: string;
  answer: AnswerResponse | null;  // null for simulation items
  created_at: number;
  pinned?: boolean;
  custom_title?: string;
  kind?: HistoryKind;              // v3: defaults to 'ask' on read
  simulation?: SimulationSpec;     // v3: present when kind === 'simulation'
}

export interface BookmarkItem extends HistoryItem {
  saved_at: number;
}

// Legacy — kept for backward compatibility but unused by v3 player
export interface SimulationStep {
  id: string;
  title: string;
  description: string;
  duration_ms: number;
  visual: any;
  labels: any[];
}
