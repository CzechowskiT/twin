"use client";

import { useTranslation } from "@/components/language-provider";

type DemoControlsProps = {
  playing: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  takeover: boolean;
  onTakeoverToggle: () => void;
};

export function DemoControls({ playing, onPlayPause, onRestart, takeover, onTakeoverToggle }: DemoControlsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2" data-demo-controls>
      <button type="button" className="twin-btn-primary twin-touch-target text-sm" onClick={onPlayPause}>
        {playing ? t("interactiveDemoPlayer.pause") : t("interactiveDemoPlayer.play")}
      </button>
      <button type="button" className="twin-btn-secondary twin-touch-target text-sm" onClick={onRestart}>
        {t("interactiveDemoPlayer.restart")}
      </button>
      <button
        type="button"
        className="twin-btn-secondary twin-touch-target text-sm"
        aria-pressed={takeover}
        onClick={onTakeoverToggle}
      >
        {takeover ? t("interactiveDemoPlayer.autoplayOn") : t("interactiveDemoPlayer.takeover")}
      </button>
    </div>
  );
}
