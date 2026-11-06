import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { Sheet } from "../Sheet";

/**
 * A mini app Pip wrote with build_app, running in a locked-down iframe:
 *  - sandbox without allow-same-origin → no access to this site's storage/cookies/DOM
 *  - an injected CSP → no network at all (no fetch, no external scripts/styles)
 */
const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: https:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'";

function wrap(html: string) {
  const head = `<meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Geist",system-ui,sans-serif;-webkit-font-smoothing:antialiased}</style>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + head);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${head}</head>`);
  return `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
}

export function AppCard({ title, html }: { title: string; html: string }) {
  const doc = useMemo(() => wrap(html), [html]);
  const [full, setFull] = useState(false);
  const [key, setKey] = useState(0);
  const [copied, setCopied] = useState(false);

  return (
    <div className="w w--app">
      <div className="app-bar">
        <span className="app-bar__icon">
          <Icon name="app" size={15} stroke={2.2} />
        </span>
        <b>{title}</b>
        <button aria-label="Muat ulang" onClick={() => setKey((k) => k + 1)}>
          <Icon name="retry" size={17} />
        </button>
        <button aria-label="Layar penuh" onClick={() => setFull(true)}>
          <Icon name="expand" size={17} />
        </button>
      </div>
      <iframe key={key} className="app-frame" title={title} sandbox="allow-scripts allow-forms allow-modals" srcDoc={doc} />
      <div className="app-foot">
        <span>Mini app buatan Pip · berjalan terisolasi</span>
        <button
          onClick={() =>
            void navigator.clipboard?.writeText(html).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            })
          }
        >
          {copied ? "Tersalin" : "Salin HTML"}
        </button>
      </div>
      <Sheet open={full} onClose={() => setFull(false)} title={title} tall>
        {full && <iframe className="app-frame app-frame--full" title={title} sandbox="allow-scripts allow-forms allow-modals" srcDoc={doc} />}
      </Sheet>
    </div>
  );
}
