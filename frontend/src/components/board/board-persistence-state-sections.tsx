"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import {
  BOARD_PERSISTENCE_BLOCKED_KEYS,
  BOARD_PERSISTENCE_BLOCKED_MARKER,
  BOARD_PERSISTENCE_SHIPPED_KEYS,
  BOARD_PERSISTENCE_SHIPPED_MARKER,
} from "@/lib/board-persistence-state";
import type { TranslationKey } from "@/lib/i18n";

function PersistenceListCard({
  marker,
  title,
  keys,
}: {
  marker: string;
  title: string;
  keys: readonly TranslationKey[];
}): ReactNode {
  const { t } = useTranslation();
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
      <div data-testid={marker}>
        <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">{title}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs">
          {keys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

type Props = {
  shippedTitle: string;
  blockedTitle: string;
  shippedMarker?: string;
  blockedMarker?: string;
};

export function BoardPersistenceStateSections({
  shippedTitle,
  blockedTitle,
  shippedMarker = BOARD_PERSISTENCE_SHIPPED_MARKER,
  blockedMarker = BOARD_PERSISTENCE_BLOCKED_MARKER,
}: Props) {
  return (
    <>
      <PersistenceListCard marker={shippedMarker} title={shippedTitle} keys={BOARD_PERSISTENCE_SHIPPED_KEYS} />
      <PersistenceListCard marker={blockedMarker} title={blockedTitle} keys={BOARD_PERSISTENCE_BLOCKED_KEYS} />
    </>
  );
}
