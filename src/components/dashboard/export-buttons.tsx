import { useState, type RefObject } from "react";
import { Download, FileDown, ImageDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { downloadPdf, downloadPng } from "@/lib/export";

export function ExportButtons({
  targetRef,
  filename,
  onExportCsv,
}: {
  targetRef: RefObject<HTMLDivElement | null>;
  filename: string;
  onExportCsv: () => void;
}) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  async function run(kind: "png" | "pdf") {
    const element = targetRef.current;
    if (!element) {
      toast.error("Não encontrei o dashboard para exportar.");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "png") await downloadPng(element, filename);
      else await downloadPdf(element, filename);
      toast.success(`Dashboard exportado em ${kind.toUpperCase()}.`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o arquivo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onExportCsv}
        className="glass-chip flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground"
      >
        <Download className="size-3.5" /> CSV
      </button>
      <button
        onClick={() => run("png")}
        disabled={busy !== null}
        className="glass-chip flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground disabled:opacity-50"
      >
        {busy === "png" ? <Loader2 className="size-3.5 animate-spin" /> : <ImageDown className="size-3.5" />} PNG
      </button>
      <button
        onClick={() => run("pdf")}
        disabled={busy !== null}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {busy === "pdf" ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />} PDF
      </button>
    </div>
  );
}
