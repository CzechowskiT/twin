# Auto-apply (Faza 2) — co działa, a co nie

## Krótko

| Portal | Auto-apply | CAPTCHA „jesteś człowiekiem” |
|--------|------------|------------------------------|
| **Pracuj.pl** | Tak (wypełnia formularz, opcjonalnie wysyła) | Rzadko |
| **Indeed** | Częściowo | **Cloudflare — nie da się legalnie „kliknąć za Ciebie”** |

Cloudflare Turnstile jest zaprojektowany tak, żeby **boty nie mogły** same zaznaczyć checkboxa. TWIN robi coś sensownego:

1. Otwiera **widoczną** przeglądarkę (na Twoim Macu).
2. Czeka, aż **Ty** zaznaczysz „Potwierdź, że jesteś człowiekiem”.
3. Potem sam klika **Aplikuj**, wypełnia e-mail / CV i — jeśli włączysz — wysyła.

Na serwerze w chmurze (Railway, headless) Indeed **zawsze** zatrzyma się na CAPTCHA.

## Użycie z panelu

1. Przy ofercie z Pracuj.pl kliknij **Auto-apply**.
2. Zostaw włączone API (`make api`) — otworzy się okno Chromium.
3. Jeśli Indeed: zaznacz checkbox w oknie przeglądarki, potem dokończ w razie potrzeby.

## Zmienne `.env`

```env
AUTO_APPLY_HEADLESS=false
AUTO_APPLY_SUBMIT=false
AUTO_APPLY_DEFAULT_PHONE=+48123456789
```

- `HEADLESS=false` — wymagane przy CAPTCHA.
- `SUBMIT=false` — tylko wypełnia formularz, nie wysyła (bezpieczniejsze na start).

## CLI (terminal)

```bash
cd backend
source .venv/bin/activate
python -m app.automation.cli --email twoj@email.com --job-id 42
```

Z wysyłką: dodaj `--submit`.

## Prawo i ToS

Scraping i auto-apply mogą naruszać regulaminy portali. Na MVP: mała skala, zgoda użytkownika, później oficjalne API / partnerstwa.
