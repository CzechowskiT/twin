"""Branded HTML email layouts (table-based, inline CSS for client compatibility)."""

from __future__ import annotations

from html import escape

# Studio palette — matches marketing dark surface
_BG = "#030712"
_CARD = "#0f172a"
_BORDER = "#334155"
_TEXT = "#f8fafc"
_MUTED = "#94a3b8"
_ACCENT = "#34d399"
_ACCENT_DIM = "#134e3a"


def _cta_button(href: str, label: str, *, primary: bool = True) -> str:
    safe_href = escape(href, quote=True)
    safe_label = escape(label)
    if primary:
        bg, color = "#f8fafc", "#0f172a"
    else:
        bg, color = _CARD, _TEXT
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'style="margin:16px 0 0">'
        "<tr><td align=\"center\" bgcolor=\"" + bg + "\" "
        'style="border-radius:999px;mso-padding-alt:14px 28px">'
        f'<a href="{safe_href}" target="_blank" '
        f'style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;'
        f"color:{color};text-decoration:none;border-radius:999px\">{safe_label}</a>"
        "</td></tr></table>"
    )


def _step_row(*, emoji: str, title: str, body: str, href: str, link_label: str) -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:0 0 12px;background:{_CARD};border:1px solid {_BORDER};'
        'border-radius:14px">'
        "<tr><td style=\"padding:16px 18px\">"
        f'<p style="margin:0 0 6px;font-size:22px;line-height:1">{escape(emoji)}</p>'
        f'<p style="margin:0 0 6px;font-size:15px;font-weight:700;color:{_TEXT}">'
        f"{escape(title)}</p>"
        f'<p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:{_MUTED}">'
        f"{escape(body)}</p>"
        f'<a href="{escape(href, quote=True)}" target="_blank" '
        f'style="font-size:14px;font-weight:600;color:{_ACCENT};text-decoration:none">'
        f"{escape(link_label)} &rarr;</a>"
        "</td></tr></table>"
    )


def render_twin_html_email(*, preheader: str, inner_html: str, footer: str | None = None) -> str:
    """Wrap content in a 600px dark studio shell with hidden preheader."""
    pre = escape(preheader)
    foot = escape(
        footer
        or "You received this because you joined the TWIN waitlist. Reply if this wasn't you.",
    )
    accent_bar = (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td height="4" bgcolor="{_ACCENT}" style="line-height:4px;font-size:4px;">&nbsp;</td></tr>'
        "</table>"
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
<title>TWIN</title>
</head>
<body style="margin:0;padding:0;background-color:{_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">{pre}&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{_BG}">
<tr><td align="center" style="padding:28px 16px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td style="padding:0 0 20px">
<span style="font-size:13px;font-weight:800;letter-spacing:0.12em;color:{_ACCENT}">TWIN</span>
</td></tr>
<tr><td bgcolor="{_CARD}" style="border:1px solid {_BORDER};border-radius:20px;padding:0 0 8px">
{accent_bar}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:24px 24px 8px">{inner_html}</td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.5;color:{_MUTED}">{foot}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def _waitlist_copy(locale: str, pos_label: str) -> dict[str, str]:
    if locale == "pl":
        return {
            "subject": f"Jesteś na liście — miejsce {pos_label} · jeden link przyspiesza kolejkę",
            "preheader": f"Miejsce {pos_label} zarezerwowane. Otwórz panel i udostępnij link polecający.",
            "footer": "Dostałeś tę wiadomość, bo zapisałeś się na waitlist TWIN. Odpowiedz, jeśli to pomyłka.",
            "eyebrow": "Wishlist potwierdzony",
            "headline": "Jesteś na liście — niech czas oczekiwania pracuje",
            "lead": (
                "TWIN ogarnia karierę w tle: dopasowane role, śledzone aplikacje "
                "i sloty rozmów, na które warto przyjść — bez spamu."
            ),
            "queue_label": "Twoje miejsce w kolejce",
            "cta": "Otwórz panel waitlisty",
            "steps_title": "Trzy ruchy, które się sumują",
            "step1_title": "Zobacz kolejkę",
            "step1_body": "Pozycja, link polecający i opcjonalny podgląd CV z live boardów.",
            "step1_link": "Otwórz panel",
            "step2_title": "Udostępnij raz, wskocz wyżej",
            "step2_body": "Każda osoba z Twojego linku podbija priorytet — LinkedIn w featured działa świetnie.",
            "step2_link": "Skopiuj link polecający",
            "step3_title": "Gotowy na start bety",
            "step3_body": "Rezerwacja konta — zgoda i GDPR od pierwszego dnia.",
            "step3_link": "Załóż konto TWIN",
            "reply": "Pytania? Odpowiedz na ten mail — czyta go zespół TWIN.",
            "text_intro": "Jesteś na waitliście TWIN.\n\n",
            "text_spot": f"Twoje miejsce: ok. {pos_label}\n\n",
            "text_body": (
                "W międzyczasie TWIN buduje pipeline pod akceptację — nie kolejny chaos w skrzynce.\n\n"
                "Kolejne kroki (~2 min):\n"
            ),
            "text_tip": "\nTip: link polecający w LinkedIn featured — każda osoba podbija priorytet.\n\n",
            "text_sign": "— TWIN Career Agent",
        }
    return {
        "subject": f"You're in — waitlist {pos_label} · one link moves you up",
        "preheader": f"Spot {pos_label} secured. Open your dashboard and share one referral link.",
        "footer": "You received this because you joined the TWIN waitlist. Reply if this wasn't you.",
        "eyebrow": "Wishlist confirmed",
        "headline": "You're on the list — let's make the wait work",
        "lead": (
            "TWIN runs career admin in the background: matched roles, tracked applications, "
            "and interview slots worth showing up for — not spam."
        ),
        "queue_label": "Your place in line",
        "cta": "Open your waitlist dashboard",
        "steps_title": "Three moves that compound",
        "step1_title": "See your queue",
        "step1_body": "Track position, copy your referral link, and optional CV preview from live boards.",
        "step1_link": "Open dashboard",
        "step2_title": "Share once, climb faster",
        "step2_body": "Each friend who joins via your link bumps your priority — LinkedIn featured works great.",
        "step2_link": "Get referral link",
        "step3_title": "Ready when beta opens",
        "step3_body": "Save your spot for account creation — consent-first, GDPR from day one.",
        "step3_link": "Register for TWIN",
        "reply": "Questions? Reply to this email — a human on the TWIN team reads it.",
        "text_intro": "You're on the TWIN waitlist.\n\n",
        "text_spot": f"Your spot: about {pos_label}\n\n",
        "text_body": (
            "While you wait, TWIN is ranking roles and building your acceptance-ready pipeline — "
            "not another inbox of random interviews.\n\n"
            "Do this next (takes ~2 minutes):\n"
        ),
        "text_tip": "\nTip: drop your referral link in LinkedIn featured — each friend who joins bumps your priority.\n\n",
        "text_sign": "— TWIN Career Agent",
    }


def build_beta_waitlist_welcome_email(
    *,
    position: int,
    dashboard_url: str,
    share_url: str,
    register_url: str,
    locale: str = "en",
) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for day-0 waitlist welcome."""
    lang = "pl" if locale.lower().startswith("pl") else "en"
    pos_label = f"#{position}"
    c = _waitlist_copy(lang, pos_label)
    text_body = (
        c["text_intro"]
        + c["text_spot"]
        + c["text_body"]
        + f"• {c['step1_link']}: {dashboard_url}\n"
        + f"• {c['step2_link']}: {share_url}\n"
        + f"• {c['step3_link']}: {register_url}\n"
        + c["text_tip"]
        + c["text_sign"]
    )
    inner = (
        f'<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.06em;'
        f'text-transform:uppercase;color:{_MUTED}">{escape(c["eyebrow"])}</p>'
        f'<p style="margin:0 0 14px;font-size:28px;line-height:1.15;font-weight:800;color:{_TEXT}">'
        f"{escape(c['headline'])}</p>"
        f'<p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:{_MUTED}">'
        f"{escape(c['lead'])}</p>"
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:0 0 22px">'
        f"<tr><td bgcolor=\"{_ACCENT_DIM}\" style=\"padding:10px 16px;"
        f'border:1px solid {_ACCENT};border-radius:12px">'
        f'<span style="font-size:13px;color:{_MUTED}">{escape(c["queue_label"])}</span><br/>'
        f'<span style="font-size:32px;font-weight:800;color:{_ACCENT}">{escape(pos_label)}</span>'
        "</td></tr></table>"
        + _cta_button(dashboard_url, c["cta"], primary=True)
        + '<p style="margin:22px 0 10px;font-size:13px;font-weight:700;letter-spacing:0.04em;'
        f'text-transform:uppercase;color:{_MUTED}">{escape(c["steps_title"])}</p>'
        + _step_row(
            emoji="📊",
            title=c["step1_title"],
            body=c["step1_body"],
            href=dashboard_url,
            link_label=c["step1_link"],
        )
        + _step_row(
            emoji="🔗",
            title=c["step2_title"],
            body=c["step2_body"],
            href=share_url,
            link_label=c["step2_link"],
        )
        + _step_row(
            emoji="🚀",
            title=c["step3_title"],
            body=c["step3_body"],
            href=register_url,
            link_label=c["step3_link"],
        )
        + f'<p style="margin:18px 0 8px;font-size:13px;line-height:1.5;color:{_MUTED}">'
        f"{escape(c['reply'])}</p>"
    )
    html_body = render_twin_html_email(preheader=c["preheader"], inner_html=inner, footer=c["footer"])
    return c["subject"], text_body, html_body
