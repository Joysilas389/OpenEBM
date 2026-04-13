import type {
  AnswerResponse, HistoryItem, BookmarkItem, AnswerSettings,
  SimulationSpec, HistoryKind,
} from '@/types';
import { DEFAULT_SETTINGS } from './api';

const HISTORY_KEY = 'openebm_history_v1';
const BOOKMARKS_KEY = 'openebm_bookmarks_v1';
const SETTINGS_KEY = 'openebm_settings_v1';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Default kind to 'ask' for legacy entries that predate v3
function normalizeItem(item: HistoryItem): HistoryItem {
  if (!item.kind) item.kind = 'ask';
  return item;
}

// ---------- History ----------
export function getHistory(): HistoryItem[] {
  return read<HistoryItem[]>(HISTORY_KEY, [])
    .map(normalizeItem)
    .sort((a, b) => b.created_at - a.created_at);
}

export function addToHistory(
  query: string,
  answer: AnswerResponse,
  kind: HistoryKind = 'ask',
): HistoryItem {
  const item: HistoryItem = {
    id: 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    query,
    answer,
    created_at: Date.now(),
    kind,
  };
  const list = read<HistoryItem[]>(HISTORY_KEY, []);
  list.unshift(item);
  write(HISTORY_KEY, list.slice(0, 200));
  return item;
}

// v3: add a simulation entry (no AnswerResponse; carries the spec instead)
export function addSimulationToHistory(query: string, spec: SimulationSpec): HistoryItem {
  const item: HistoryItem = {
    id: 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    query,
    answer: null,
    simulation: spec,
    created_at: Date.now(),
    kind: 'simulation',
  };
  const list = read<HistoryItem[]>(HISTORY_KEY, []);
  list.unshift(item);
  write(HISTORY_KEY, list.slice(0, 200));
  return item;
}

export function deleteHistoryItem(id: string) {
  const list = read<HistoryItem[]>(HISTORY_KEY, []).filter((i) => i.id !== id);
  write(HISTORY_KEY, list);
}

export function clearHistory() {
  write(HISTORY_KEY, []);
}

export function renameHistoryItem(id: string, title: string) {
  const list = read<HistoryItem[]>(HISTORY_KEY, []);
  const found = list.find((i) => i.id === id);
  if (found) {
    found.custom_title = title;
    write(HISTORY_KEY, list);
  }
}

export function togglePin(id: string) {
  const list = read<HistoryItem[]>(HISTORY_KEY, []);
  const found = list.find((i) => i.id === id);
  if (found) {
    found.pinned = !found.pinned;
    write(HISTORY_KEY, list);
  }
}

// ---------- Bookmarks ----------
export function getBookmarks(): BookmarkItem[] {
  return read<BookmarkItem[]>(BOOKMARKS_KEY, [])
    .map((b) => normalizeItem(b) as BookmarkItem)
    .sort((a, b) => b.saved_at - a.saved_at);
}

export function addBookmark(item: HistoryItem): BookmarkItem {
  const bm: BookmarkItem = { ...normalizeItem(item), saved_at: Date.now() };
  const list = read<BookmarkItem[]>(BOOKMARKS_KEY, []);
  if (!list.find((b) => b.id === item.id)) {
    list.unshift(bm);
    write(BOOKMARKS_KEY, list);
  }
  return bm;
}

export function removeBookmark(id: string) {
  const list = read<BookmarkItem[]>(BOOKMARKS_KEY, []).filter((b) => b.id !== id);
  write(BOOKMARKS_KEY, list);
}

export function isBookmarked(id: string): boolean {
  return read<BookmarkItem[]>(BOOKMARKS_KEY, []).some((b) => b.id === id);
}

// ---------- Settings ----------
export function getSettings(): AnswerSettings {
  return read<AnswerSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(s: AnswerSettings) {
  write(SETTINGS_KEY, s);
}

export function resetSettings() {
  write(SETTINGS_KEY, DEFAULT_SETTINGS);
}
