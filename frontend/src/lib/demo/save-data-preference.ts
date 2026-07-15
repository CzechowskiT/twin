type NetworkInformationLike = {
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function navigatorConnection(): NetworkInformationLike | undefined {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

/** Detect save-data / reduced-data preference (CSS media + Network Information API). */
export function readSaveDataPreference(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-data: reduce)").matches) return true;
  return navigatorConnection()?.saveData === true;
}

/** Subscribe to save-data preference changes (media query + connection API). */
export function subscribeSaveDataPreference(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-data: reduce)");
  mq.addEventListener("change", onChange);
  const conn = navigatorConnection();
  conn?.addEventListener?.("change", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    conn?.removeEventListener?.("change", onChange);
  };
}
