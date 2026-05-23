import { safeStorage } from "@/lib/safe-storage";
import type { JobSearchFilters } from "@/lib/career/job-types";

export type SavedSearch = {
  id: string;
  name: string;
  filters: JobSearchFilters;
  createdAt: string;
};

const STORAGE_KEY = "twin_career_saved_searches_v1";

function readAll(): SavedSearch[] {
  const raw = safeStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listSavedSearches(): SavedSearch[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveSearch(name: string, filters: JobSearchFilters): SavedSearch {
  const entry: SavedSearch = {
    id: crypto.randomUUID(),
    name: name.trim() || "Search",
    filters,
    createdAt: new Date().toISOString(),
  };
  safeStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...readAll()]));
  return entry;
}

export function deleteSavedSearch(id: string): void {
  safeStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(readAll().filter((s) => s.id !== id)),
  );
}
