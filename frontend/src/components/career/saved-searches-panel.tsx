"use client";

import { useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Card, Input, Label } from "@/components/ui";
import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
  type SavedSearch,
} from "@/lib/career/saved-searches";
import type { JobSearchFilters } from "@/lib/career/job-types";

export function SavedSearchesPanel({
  filters,
  onApply,
}: {
  filters: JobSearchFilters;
  onApply: (filters: JobSearchFilters) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<SavedSearch[]>(() => listSavedSearches());
  const [name, setName] = useState("");

  function refresh() {
    setItems(listSavedSearches());
  }

  function onSave() {
    saveSearch(name, filters);
    setName("");
    refresh();
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">{t("careerDiscovery.savedSearchesTitle")}</h3>
      <div className="mt-2 space-y-2">
        <Label>{t("careerDiscovery.savedSearchName")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <ButtonChip type="button" onClick={onSave}>
          {t("careerDiscovery.savedSearchSave")}
        </ButtonChip>
      </div>
      {!items.length ? (
        <p className="twin-muted mt-3 text-xs">{t("careerDiscovery.savedSearchEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.name}</span>
              <ButtonChip type="button" onClick={() => onApply(item.filters)}>
                {t("careerDiscovery.savedSearchApply")}
              </ButtonChip>
              <ButtonChip
                type="button"
                onClick={() => {
                  deleteSavedSearch(item.id);
                  refresh();
                }}
              >
                {t("careerDiscovery.savedSearchDelete")}
              </ButtonChip>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
