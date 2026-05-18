# Auto-apply (Faza 2) — co działa, a co nie

## Krótko

| Portal | Auto-apply | CAPTCHA „jesteś człowiekiem” |
|--------|------------|------------------------------|
| **Pracuj.pl** | Tak (wypełnia formularz i domyślnie wysyła) | Rzadko |
| **Indeed** | Częściowo | **Cloudflare — nie da się legalnie „kliknąć za Ciebie”** |

Cloudflare Turnstile jest zaprojektowany tak, żeby **boty nie mogły** same zaznaczyć checkboxa. TWIN robi coś sensownego:

1. Otwiera **widoczną** przeglądarkę (na Twoim Macu).
2. Czeka, aż **Ty** zaznaczysz „Potwierdź, że jesteś człowiekiem”.
3. Potem sam klika **Aplikuj**, wypełnia e-mail / CV i — domyślnie — wysyła formularz (`AUTO_APPLY_SUBMIT=true`; ustaw `false` tylko do podglądu bez wysyłki).

Na serwerze w chmurze (Railway, headless) Indeed **zawsze** zatrzyma się na CAPTCHA.

## Zawartość pakietu (PDF) przy auto-apply

Domyślnie (`AUTO_APPLY_TAILORED_PDF=true`) TWIN przed uruchomieniem Playwrighta buduje **jeden plik PDF**:

1. **Dopasowanie do oferty** — świeży tekst z CV + treści ogłoszenia (Claude, jeśli skonfigurowany `ANTHROPIC_API_KEY`, w przeciwnym razie deterministyczny fallback). Reguły: bez wymyślania pracodawców, dat, certyfikatów spoza CV.
2. **Oświadczenia i zgody** — domyślne akapity po polsku (RODO / prawda CV / świadome użycie auto-apply). Własne akapity można dopisać w `AUTO_APPLY_CONSENT_EXTRA_PL` (bloki oddzielone pustą linią).
3. **Treść CV (źródłowa)** — tekst wyekstrahowany z przekazanego pliku (do limitu znaków), jako załącznik referencyjny.

Czcionka Unicode: `backend/assets/fonts/NotoSans-Regular.ttf` (SIL OFL) albo ścieżka w `AUTO_APPLY_FONT_PATH`.

## Użycie z panelu

1. Przy ofercie z Pracuj.pl kliknij **Auto-apply**.
2. Zostaw włączone API (`make api`) — otworzy się okno Chromium.
3. Jeśli Indeed: zaznacz checkbox w oknie przeglądarki, potem dokończ w razie potrzeby.

## Zmienne `.env`

```env
AUTO_APPLY_HEADLESS=false
AUTO_APPLY_SUBMIT=true
AUTO_APPLY_DEFAULT_PHONE=+48123456789
AUTO_APPLY_TAILORED_PDF=true
# AUTO_APPLY_FONT_PATH=/abs/path/NotoSans-Regular.ttf
# AUTO_APPLY_CONSENT_EXTRA_PL=Własny akapit zgody.\n\nDrugi akapit.
```

- `HEADLESS=false` — wymagane przy CAPTCHA.
- `SUBMIT=true` (domyślnie w kodzie i zalecane w `.env`) — po wypełnieniu klika wysyłkę. Ustaw `false`, jeśli chcesz tylko przygotować formularz bez wysłania (dry-run).

## CLI (terminal)

```bash
cd backend
source .venv/bin/activate
python -m app.automation.cli --email twoj@email.com --job-id 42
```

Z wysyłką: domyślnie tak (jak `AUTO_APPLY_SUBMIT` w `.env` / ustawieniach). Wymuś tylko wypełnienie bez wysłania: `python -m app.automation.cli ... --no-submit`.

## Prawo i ToS

Scraping i auto-apply mogą naruszać regulaminy portali. Na MVP: mała skala, zgoda użytkownika, później oficjalne API / partnerstwa.
