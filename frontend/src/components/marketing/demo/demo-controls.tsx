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
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0" data-demo-controls>
      <button type="button" className="twin-btn-primary twin-touch-target shrink-0 text-xs sm:text-sm" onClick={onPlayPause}>
        {playing ? t("interactiveDemoPlayer.pause") : t("interactiveDemoPlayer.play")}
      </button>
      <button type="button" className="twin-btn-secondary twin-touch-target shrink-0 text-xs sm:text-sm" onClick={onRestart}>
        {t("interactiveDemoPlayer.restart")}
      </button>
      <button
        type="button"
        className="twin-btn-secondary twin-touch-target shrink-0 text-xs sm:text-sm"
        aria-pressed={takeover}
        onClick={onTakeoverToggle}
      >
        {takeover ? t("interactiveDemoPlayer.autoplayOn") : t("interactiveDemoPlayer.takeover")}
      </button>
    </div>
  );
}
