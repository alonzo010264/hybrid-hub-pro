// Lightweight wrapper around html2pdf.js for downloading DOM nodes as PDF.
// Loaded dynamically to avoid SSR issues.
export async function downloadPdf(el: HTMLElement, filename: string) {
  const mod: any = await import("html2pdf.js");
  const html2pdf = mod.default || mod;
  await html2pdf()
    .set({
      margin: 0,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(el)
    .save();
}
