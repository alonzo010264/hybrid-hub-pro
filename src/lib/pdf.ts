// Lightweight wrapper around html2pdf.js for downloading DOM nodes as PDF.
// Loaded dynamically to avoid SSR issues.
//
// NOTE: html2pdf.js bundles html2canvas, which cannot parse modern `oklch()`
// colors (used by the Tailwind v4 design system). Before rendering we walk the
// cloned DOM and convert every `oklch(...)` color to its sRGB equivalent using
// a throwaway canvas context, which the browser converts natively.

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
      // Setting fillStyle to an oklch string lets the browser normalize it to
      // an sRGB value that html2canvas understands when we read it back.
      ctx.fillStyle = "#000000";
      ctx.fillStyle = color;
      return ctx.fillStyle as string;
    } catch {
      return color;
    }
  };
}

function sanitizeColors(root: HTMLElement, view: Window) {
  const convert = makeConverter();
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
          // Sanitize the whole cloned document (incl. <html>/<body>) because
          // html2canvas also reads the root background color.
          sanitizeColors(doc.documentElement, view);
        },
      },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(el)
    .save();
}
