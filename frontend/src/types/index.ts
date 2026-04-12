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

export interface HistoryItem {
  id: string;
  query: string;
  answer: AnswerResponse;
  created_at: number;
  pinned?: boolean;
  custom_title?: string;
}

export interface BookmarkItem extends HistoryItem {
  saved_at: number;
}

export interface SimulationStep {
  id: string;
  title: string;
  description: string;
  duration_ms: number;
  visual: {
    type: string;
    elements: Array<{
      kind: 'circle' | 'rect' | 'arrow' | 'label' | 'line';
      x: number;
      y: number;
      w?: number;
      h?: number;
      r?: number;
      x2?: number;
      y2?: number;
      color?: string;
      text?: string;
    }>;
  };
  labels: Array<{ text: string; x: number; y: number }>;
}

export interface SimulationSpec {
  title: string;
  short_explanation: string;
  category: string;
  steps: SimulationStep[];
  clinical_application: string;
  educational_notes: string[];
  reduced_motion_safe: boolean;
}
