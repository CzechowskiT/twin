import type { ReactNode } from "react";

function slugHeadingId(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii.length > 0 ? ascii : "";
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/** Minimal markdown for our static legal files: #/##/###, - lists, ---, paragraphs. */
export function renderTermsMarkdown(md: string): ReactNode {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const elements: ReactNode[] = [];
  let listBuf: string[] = [];
  let k = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    elements.push(
      <ul key={`ul-${k++}`} className="my-4 list-disc space-y-2 pl-6">
        {listBuf.map((item) => (
          <li key={item} className="leading-relaxed">
            {formatInline(item.replace(/^-\s+/, ""))}
          </li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw;
    const t = line.trim();
    if (t === "---") {
      flushList();
      elements.push(<hr key={`hr-${k++}`} className="my-8 border-[var(--twin-border)]" />);
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={`h1-${k++}`} className="mb-4 mt-10 text-2xl font-bold first:mt-0">
          {formatInline(line.slice(2).trim())}
        </h1>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      const raw = line.slice(3).trim();
      const idMatch = /^(.+?)\s*\{#([^}]+)\}\s*$/.exec(raw);
      const title = (idMatch ? idMatch[1] : raw).trim();
      const anchorId = idMatch ? idMatch[2].trim() : slugHeadingId(title);
      elements.push(
        <h2
          key={`h2-${k++}`}
          id={anchorId || undefined}
          className="mb-3 mt-10 scroll-mt-20 text-xl font-semibold text-[var(--foreground)]"
        >
          {formatInline(title)}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${k++}`} className="mb-2 mt-8 text-lg font-semibold text-[var(--foreground)]">
          {formatInline(line.slice(4).trim())}
        </h3>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      listBuf.push(line);
      continue;
    }
    if (t === "") {
      flushList();
      continue;
    }
    flushList();
    elements.push(
      <p key={`p-${k++}`} className="my-3 leading-relaxed text-[var(--foreground)]/95">
        {formatInline(line)}
      </p>,
    );
  }
  flushList();
  return <>{elements}</>;
}
