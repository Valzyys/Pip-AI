import { useState, type ReactNode } from "react";

/**
 * Small, safe Markdown → React renderer for chat replies (no innerHTML).
 * Blocks: fenced code, headings, bullet / numbered lists, quotes, paragraphs.
 * Inline: **bold**, *italic*, `code`, [links](https://…).
 * Unclosed fences are rendered as code too, so streaming replies look right mid-stream.
 */

type Block =
  | { t: "code"; lang: string; text: string; open: boolean }
  | { t: "h"; level: number; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "p"; text: string };

function parse(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: "p", text: para.join("\n") });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```\s*([\w+-]*)/);
    if (fence) {
      flush();
      const body: string[] = [];
      let open = true;
      for (i++; i < lines.length; i++) {
        if (/^\s*```/.test(lines[i])) {
          open = false;
          break;
        }
        body.push(lines[i]);
      }
      blocks.push({ t: "code", lang: fence[1] || "", text: body.join("\n"), open });
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flush();
      blocks.push({ t: "h", level: h[1].length, text: h[2] });
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/).test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/, ""));
        i++;
      }
      i--;
      blocks.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flush();
      blocks.push({ t: "quote", text: line.replace(/^\s*>\s?/, "") });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

function inline(s: string, key = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("["))
      out.push(
        <a key={k} href={m[2]} target="_blank" rel="noreferrer noopener">
          {tok.slice(1, tok.indexOf("]"))}
        </a>,
      );
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  // keep single newlines inside paragraphs
  return out.flatMap((node, i): ReactNode[] =>
    typeof node === "string"
      ? node.split("\n").flatMap((part, j, arr) => (j < arr.length - 1 ? [part, <br key={`${key}br${i}-${j}`} />] : [part]))
      : [node],
  );
}

/* ---------------- syntax highlighting (tiny, language-agnostic) ---------------- */

const KEYWORDS = new Set(
  (
    "const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of " +
    "def lambda elif pass with as yield None True False and or not is print self " +
    "fn pub struct impl use mut match enum trait public private static void int string bool true false null undefined this"
  ).split(" "),
);

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re =
    /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [tok, comment, str, num, call, word] = m;
    const k = n++;
    if (comment) out.push(<span key={k} className="tk-c">{tok}</span>);
    else if (str) out.push(<span key={k} className="tk-s">{tok}</span>);
    else if (num) out.push(<span key={k} className="tk-n">{tok}</span>);
    else if (call) out.push(<span key={k} className={KEYWORDS.has(call) ? "tk-k" : "tk-f"}>{tok}</span>);
    else if (word && KEYWORDS.has(word)) out.push(<span key={k} className="tk-k">{tok}</span>);
    else out.push(tok);
    last = m.index + tok.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function CodeBlock({ lang, text, open }: { lang: string; text: string; open: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`md-code${open ? " is-open" : ""}`}>
      <div className="md-code__bar">
        <span>{lang || "code"}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <pre>
        <code>{highlight(text)}</code>
      </pre>
    </div>
  );
}

export function Markdown({ text }: { text: string }) {
  const blocks = parse(text);
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "code":
            return <CodeBlock key={i} lang={b.lang} text={b.text} open={b.open} />;
          case "h":
            return (
              <p key={i} className={`md-h md-h${b.level}`}>
                {inline(b.text, `h${i}`)}
              </p>
            );
          case "ul":
          case "ol": {
            const Tag = b.t;
            return (
              <Tag key={i} className="md-list">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `l${i}-${j}`)}</li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className="md-quote">
                {inline(b.text, `q${i}`)}
              </blockquote>
            );
          default:
            return <p key={i}>{inline(b.text, `p${i}`)}</p>;
        }
      })}
    </>
  );
}

