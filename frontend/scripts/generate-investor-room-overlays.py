#!/usr/bin/env python3
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/lib/overlays/investor-room.ts"
HEADERS = {
    "es": ("Sala del inversor", "TWIN — vista ejecutiva honesta"),
    "it": ("Investor room", "TWIN — vista executive onesta"),
    "fr": ("Salle investisseur", "TWIN — vue exécutive honnête"),
    "de": ("Investor Room", "TWIN — ehrliche Executive-Ansicht"),
    "zh": ("投资者室", "TWIN — 诚实的执行层视图"),
    "ar": ("غرفة المستثمر", "TWIN — رؤية تنفيذية صادقة"),
    "ja": ("インベスタールーム", "TWIN — 正直なエグゼクティブビュー"),
}
text = (Path(__file__).parent / "investor-room-en-block.txt").read_text()
en = dict(re.findall(r"(\w+):\s*\"([^\"]*)\"", text))
lines = ['import type { Locale } from "../i18n";', "", "type InvestorRoomOverlay = { investorRoom: Record<string, string> };", ""]
for loc, (eyebrow, title) in HEADERS.items():
    merged = {**en, "eyebrow": eyebrow, "title": title}
    lines += [f"const {loc}: InvestorRoomOverlay = {{", "  investorRoom: {"]
    for k, v in merged.items():
        lines.append(f"    {k}: {json.dumps(v, ensure_ascii=False)},")
    lines += ["  },", "};", ""]
lines += ["export const INVESTOR_ROOM_OVERLAYS: Partial<Record<Locale, InvestorRoomOverlay>> = {", *[f"  {k}," for k in HEADERS], "};", ""]
OUT.write_text("\n".join(lines), encoding="utf-8")
