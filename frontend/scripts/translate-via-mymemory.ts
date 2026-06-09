/** Fallback batch translator when Google free tier rate-limits. */
export async function translateViaMyMemory(text: string, to: string): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 450));
  url.searchParams.set("langpair", `en|${to}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  const out = data.responseData?.translatedText;
  if (!out) throw new Error("MyMemory empty response");
  return out;
}
