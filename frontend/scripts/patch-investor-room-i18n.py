#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src/lib/i18n.ts"
text = path.read_text()
if 'import { INVESTOR_ROOM_OVERLAYS }' not in text:
    text = text.replace(
        'import { SITE_CHROME_OVERLAYS } from "./overlays/site-chrome";',
        'import { SITE_CHROME_OVERLAYS } from "./overlays/site-chrome";\nimport { INVESTOR_ROOM_OVERLAYS } from "./overlays/investor-room";',
    )
if "| `investorRoom." not in text:
    text = text.replace(
        "  | `investorFundraising.${keyof typeof en.investorFundraising}`\n  | `placementDemo.${keyof typeof en.placementDemo}`",
        "  | `investorFundraising.${keyof typeof en.investorFundraising}`\n  | `investorRoom.${keyof typeof en.investorRoom}`\n  | `placementDemo.${keyof typeof en.placementDemo}`",
    )
en = (Path(__file__).parent / "investor-room-en-block.txt").read_text()
pl = (Path(__file__).parent / "investor-room-pl-block.txt").read_text()
if "investorRoom:" not in text:
    text = text.replace('    ycBack: "← Full investor page",\n  },\n  placementDemo:', '    ycBack: "← Full investor page",\n  },\n' + en + "\n  placementDemo:", 1)
    text = text.replace('    ycBack: "← Pełna strona inwestora",\n  },\n  placementDemo:', '    ycBack: "← Pełna strona inwestora",\n  },\n' + pl + "\n  placementDemo:", 1)
if "titleForInvestors" not in text:
    text = text.replace('    titleForCompanies: "Companies · TWIN",\n    titleDemo:', '    titleForCompanies: "Companies · TWIN",\n    titleForInvestors: "Investor room · TWIN",\n    titleInvestorRoom: "Investor room · TWIN",\n    titleDemo:', 1)
    text = text.replace('    titleForCompanies: "Firmy · TWIN",\n    titleDemo:', '    titleForCompanies: "Firmy · TWIN",\n    titleForInvestors: "Sala inwestora · TWIN",\n    titleInvestorRoom: "Sala inwestora · TWIN",\n    titleDemo:', 1)
old = "  const faqOverlay = FAQ_LOCALE_OVERLAYS[locale] ?? {};\n  return messagesFromEnOverlay(\n    mergeDeep(\n      mergeDeep(mergeDeep(mergeDeep(withPremium, marketingHome), siteChrome), { faq: faqOverlay }),\n    ),\n  );"
new = "  const faqOverlay = FAQ_LOCALE_OVERLAYS[locale] ?? {};\n  const investorRoomOverlay = INVESTOR_ROOM_OVERLAYS[locale] ?? {};\n  return messagesFromEnOverlay(\n    mergeDeep(\n      mergeDeep(mergeDeep(mergeDeep(withPremium, marketingHome), siteChrome), { faq: faqOverlay }),\n      investorRoomOverlay,\n    ),\n  );"
if "investorRoomOverlay" not in text:
    text = text.replace(old, new, 1)
path.write_text(text)
