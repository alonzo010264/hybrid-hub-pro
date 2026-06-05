// Lightweight wrapper around html2pdf.js for downloading DOM nodes as PDF.
// Loaded dynamically to avoid SSR issues.
//
// NOTE: html2pdf.js bundles an old html2canvas that CANNOT parse modern CSS
// color functions (oklch / oklab / lab / lch / color-mix) — all of which the
// Tailwind v4 design system emits. We convert every such color to its sRGB
// equivalent (via a throwaway canvas the browser converts natively) on the
// cloned document right before it is rasterized.

const BAD_COLOR_RE = /okl(?:ab|ch)|color-mix|\blab\(|\blch\(|\bcolor\(/i;

function makeConverter() {
  const ctx = document.createElement("canvas").getContext("2d");
  return (color: string): string => {
    if (!ctx) return color;
    try {
      ctx.fillStyle = "#000000";
      ctx.fillStyle = color;
      return ctx.fillStyle as string;
    } catch {
      return color;
    }
  };
}

// Replace every modern color-function token inside a value string (handles
// nested parens, e.g. color-mix(in oklab, oklch(...) 50%, transparent)).
function replaceColorFns(input: string, convert: (c: string) => string): string {
  const re = /(oklch|oklab|lch|lab|color-mix|color)\(/i;
  let s = input;
  let guard = 0;
  while (guard++ < 100) {
    const m = re.exec(s);
    if (!m) break;
    const start = m.index;
    let depth = 0;
    let end = -1;
    for (let i = start + m[0].length - 1; i < s.length; i++) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    const token = s.slice(start, end + 1);
    const rgb = convert(token);
    const replacement = rgb && !BAD_COLOR_RE.test(rgb) ? rgb : "rgb(0,0,0)";
    s = s.slice(0, start) + replacement + s.slice(end + 1);
  }
  return s;
}

// Convert oklch/oklab/etc. found in CSS custom properties (e.g. --primary,
// gradients) defined in same-origin stylesheets, applied inline on the clone
// root so all `var(--x)` references resolve to a parseable color.
function sanitizeRootVariables(root: HTMLElement, convert: (c: string) => string) {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet
    }
    for (const rule of Array.from(rules)) {
      const style = (rule as CSSStyleRule).style;
      if (!style) continue;
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        if (!prop.startsWith("--")) continue;
        const val = style.getPropertyValue(prop);
        if (val && BAD_COLOR_RE.test(val)) {
          root.style.setProperty(prop, replaceColorFns(val, convert));
        }
      }
    }
  }
}

// Walk every element and convert any computed style value that uses a modern
// color function into sRGB, applied inline so html2canvas can parse it.
function sanitizeColors(root: HTMLElement, view: Window, convert: (c: string) => string) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    const cs = view.getComputedStyle(node);
    for (let i = 0; i < cs.length; i++) {
      const prop = cs[i];
      const value = cs.getPropertyValue(prop);
      if (value && BAD_COLOR_RE.test(value)) {
        try {
          node.style.setProperty(prop, replaceColorFns(value, convert));
        } catch {
          /* ignore unsupported property */
        }
      }
    }
  }
}

export async function downloadPdf(el: HTMLElement, filename: string) {
  const mod: any = await import("html2pdf.js");
  const html2pdf = mod.default || mod;
  const convert = makeConverter();

  // html2canvas reads the ROOT (html/body) background color from the *live*
  // document, which is oklch in this theme. Force white during generation.
  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  const prevHtmlBg = htmlEl.style.backgroundColor;
  const prevBodyBg = bodyEl.style.backgroundColor;
  htmlEl.style.backgroundColor = "#ffffff";
  bodyEl.style.backgroundColor = "#ffffff";

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          onclone: (doc: Document) => {
            const view = doc.defaultView ?? window;
            sanitizeRootVariables(doc.documentElement, convert);
            sanitizeColors(doc.documentElement, view, convert);
          },
        },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(el)
      .save();
  } finally {
    htmlEl.style.backgroundColor = prevHtmlBg;
    bodyEl.style.backgroundColor = prevBodyBg;
  }
}
