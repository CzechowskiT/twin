/** Active UI locale for API calls (set by LanguageProvider). */
let clientApiLocale: string | null = null;

export function setClientApiLocale(locale: string | null): void {
  clientApiLocale = locale;
}

export function getClientApiLocale(): string | null {
  return clientApiLocale;
}
