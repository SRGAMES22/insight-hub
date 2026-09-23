import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/** Gera e baixa um CSV a partir de linhas já filtradas. */
export function downloadCsv(
  filename: string,
  columns: { key: string; label: string }[],
  rows: Record<string, unknown>[],
) {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = Array.isArray(value) ? value.join(", ") : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.map((c) => escape(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escape(row[c.key])).join(",")),
  ].join("\n");

  triggerDownload(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

async function snapshot(element: HTMLElement) {
  return toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#f4f6f8",
    cacheBust: true,
  });
}

export async function downloadPng(element: HTMLElement, filename: string) {
  const dataUrl = await snapshot(element);
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

export async function downloadPdf(element: HTMLElement, filename: string) {
  const dataUrl = await snapshot(element);
  const image = new Image();
  image.src = dataUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const orientation = image.width >= image.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [image.width, image.height] });
  pdf.addImage(dataUrl, "PNG", 0, 0, image.width, image.height);
  pdf.save(`${filename}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
