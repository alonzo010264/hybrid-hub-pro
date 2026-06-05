// Lightweight wrapper around html2pdf.js for downloading DOM nodes as PDF.
// Loaded dynamically to avoid SSR issues.
//
// NOTE: html2pdf.js bundles html2canvas, which CANNOT parse modern `oklch()`
// colors (used throughout the Tailwind v4 design system). We work around this
// by converting every `oklch(...)` value to its sRGB equivalent — using a
// throwaway canvas context that the browser converts natively — both for the
// document's CSS custom properties and for any inline computed colors.

const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "fill",
  "stroke",
] as const;

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

// Replace any oklch(...) token inside a larger string (e.g. gradients, shadows).
function replaceOklch(value: string, convert: (c: string) => string): string {
  return value.replace(/oklch\([^)]*\)/gi, (match) => {
    const rgb = convert(match);
    return rgb && !rgb.includes("oklch") ? rgb : "#000000";
  });
}

// Convert every CSS custom property (e.g. --primary, --background, gradients)
// that contains an oklch color into an sRGB equivalent, applied inline on the
// clone root so all `var(--x)` references resolve to a parseable color.
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
        if (val && val.includes("oklch")) {
          root.style.setProperty(prop, replaceOklch(val, convert));
        }
      }
    }
  }
}

function sanitizeColors(root: HTMLElement, view: Window, convert: (c: string) => string) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    const cs = view.getComputedStyle(node);
    for (const prop of COLOR_PROPS) {
      const value = (cs as unknown as Record<string, string>)[prop];
      if (value && value.includes("oklch")) {
        try {
          (node.style as unknown as Record<string, string>)[prop] = convert(value);
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
            // 1) Convert oklch CSS variables so var() refs resolve to sRGB.
            sanitizeRootVariables(doc.documentElement, convert);
            // 2) Convert any remaining computed oklch colors inline.
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
