/**
 * Template variable parsers & substituters.
 *
 * NHN conventions (canonical):
 *   - AlimTalk  → `#{varName}`
 *   - Email     → `${varName}`
 *
 * Use `parseAlimVars` / `applyAlimVars` for alimtalk content, and
 * `parseEmailVars` / `applyEmailVars` for email content (both template
 * and free-compose modes).
 */

const ALIM_RE = /#\{([^}]+)\}/g;
const EMAIL_RE = /\$\{([^}]+)\}/g;

export function parseAlimVars(content: string): string[] {
  return uniq([...content.matchAll(ALIM_RE)].map((m) => m[1].trim()));
}

export function parseEmailVars(content: string): string[] {
  return uniq([...content.matchAll(EMAIL_RE)].map((m) => m[1].trim()));
}

export function applyAlimVars(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(ALIM_RE, (_, k) => {
    const key = k.trim();
    return values[key] ?? `#{${key}}`;
  });
}

export function applyEmailVars(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(EMAIL_RE, (_, k) => {
    const key = k.trim();
    return values[key] ?? `\${${key}}`;
  });
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

/**
 * Convert a plain-text email body into HTML.
 *
 *   - Blank lines (one or more consecutive `\n\n`) split paragraphs → `<p>…</p>`
 *   - Single `\n` within a paragraph → `<br>`
 *   - HTML-escapes the text so user input can't inject markup
 */
export function textToHtml(text: string): string {
  if (!text) return "";
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const paras = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return paras
    .map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}
