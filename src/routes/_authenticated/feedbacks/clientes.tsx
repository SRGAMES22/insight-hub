import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WordCloud, countWords } from "@/components/dashboard/word-cloud";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/feedbacks/clientes")({
  head: () => ({
    meta: [
      { title: "Feedbacks de Clientes · Insights da Casa" },
      {
        name: "description",
        content: "NPS, distribuição de notas, categorias e palavras mais citadas pelos clientes.",
      },
      { property: "og:title", content: "Feedbacks de Clientes · Insights da Casa" },
      {
        property: "og:description",
        content: "NPS, distribuição de notas, categorias e palavras mais citadas pelos clientes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientesPage,
});

type Feedback = {
  id: number;
  cliente_email: string | null;
  categoria: string | null;
  nota: number;
  feedback_texto: string | null;
  tags: string[] | null;
  data_envio: string;
};

const SEM_CATEGORIA = "nao_informada";

const CATEGORY_COLORS = ["var(--brand)", "var(--info)", "var(--warn)", "var(--chart-5)", "var(--chart-4)"];

/** Normaliza a categoria para comparação e agrupamento (evita falha de filtro por caixa/espaço). */
function normalizeCategoria(value: string | null | undefined) {
  const clean = (value ?? "").trim().toLowerCase();
  return clean.length > 0 ? clean : SEM_CATEGORIA;
}

function labelCategoria(value: string) {
  if (value === SEM_CATEGORIA) return "Não informada";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ClientesPage() {
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [periodo, setPeriodo] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [notaFaixa, setNotaFaixa] = useState("todas");
  const [busca, setBusca] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["feedback_clientes"],
    queryFn: async (): Promise<Feedback[]> => {
      const { data, error } = await supabase
        .from("feedback_clientes")
        .select("id, cliente_email, categoria, nota, feedback_texto, tags, data_envio")
        .order("data_envio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Feedback[];
    },
  });

  const categorias = useMemo(() => {
    const set = new Set(rows.map((row) => normalizeCategoria(row.categoria)));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const limite = periodo === "todos" ? null : Date.now() - Number(periodo) * 86_400_000;
    const termo = busca.trim().toLowerCase();

    return rows.filter((row) => {
      if (limite !== null && new Date(row.data_envio).getTime() < limite) return false;
      if (categoria !== "todas" && normalizeCategoria(row.categoria) !== categoria) return false;
      if (notaFaixa === "promotores" && row.nota < 9) return false;
      if (notaFaixa === "neutros" && (row.nota < 7 || row.nota > 8)) return false;
      if (notaFaixa === "detratores" && row.nota > 6) return false;
      if (termo) {
        const haystack = [row.cliente_email, row.feedback_texto, (row.tags ?? []).join(" ")]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(termo)) return false;
      }
      return true;
    });
  }, [rows, periodo, categoria, notaFaixa, busca]);

  const total = filtered.length;
  const promotores = filtered.filter((r) => r.nota >= 9).length;
  const detratores = filtered.filter((r) => r.nota <= 6).length;
  const nps = total === 0 ? 0 : Math.round(((promotores - detratores) / total) * 100);
  const media = total === 0 ? 0 : filtered.reduce((sum, r) => sum + r.nota, 0) / total;

  const distribuicao = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const nota = index + 1;
        return { nota: String(nota), quantidade: filtered.filter((r) => r.nota === nota).length };
      }),
    [filtered],
  );

  const porCategoria = useMemo(() => {
    const tally = new Map<string, number>();
    for (const row of filtered) {
      const key = normalizeCategoria(row.categoria);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    return [...tally.entries()]
      .map(([key, quantidade]) => ({ key, nome: labelCategoria(key), quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filtered]);

  const palavras = useMemo(() => countWords(filtered.map((r) => r.feedback_texto)), [filtered]);

  function exportCsv() {
    downloadCsv(
      "feedbacks-clientes",
      [
        { key: "id", label: "ID" },
        { key: "cliente_email", label: "E-mail" },
        { key: "categoria", label: "Categoria" },
        { key: "nota", label: "Nota" },
        { key: "feedback_texto", label: "Feedback" },
        { key: "tags", label: "Tags" },
        { key: "data_envio", label: "Data de envio" },
      ],
      filtered as unknown as Record<string, unknown>[],
    );
  }

  return (
    <AppShell
      title="Feedbacks de Clientes"
      subtitle={`${total} de ${rows.length} registros no filtro atual`}
      actions={
        <ExportButtons targetRef={dashboardRef} filename="dashboard-feedbacks-clientes" onExportCsv={exportCsv} />
      }
    >
      <section className="glass-panel flex flex-wrap items-center gap-2 p-3">
        <Select label="Período" value={periodo} onChange={setPeriodo}>
          <option value="todos">Todo o histórico</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </Select>
        <Select label="Categoria" value={categoria} onChange={setCategoria}>
          <option value="todas">Todas</option>
          {categorias.map((item) => (
            <option key={item} value={item}>
              {labelCategoria(item)}
            </option>
          ))}
        </Select>
        <Select label="Nota" value={notaFaixa} onChange={setNotaFaixa}>
          <option value="todas">1–10</option>
          <option value="promotores">Promotores (9–10)</option>
          <option value="neutros">Neutros (7–8)</option>
          <option value="detratores">Detratores (1–6)</option>
        </Select>
        <label className="glass-chip ml-auto flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">Buscar</span>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="texto, e-mail ou tag"
            className="w-44 bg-transparent outline-none"
          />
        </label>
        <button
          onClick={() => {
            setPeriodo("todos");
            setCategoria("todas");
            setNotaFaixa("todas");
            setBusca("");
          }}
          className="rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-foreground/5"
        >
          Limpar
        </button>
      </section>

      <div ref={dashboardRef} className="space-y-4 bg-background">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="NPS" value={nps > 0 ? `+${nps}` : nps} tone="brand" hint={`${promotores} promotores · ${detratores} detratores`} delay={0.02} />
          <KpiCard label="Feedbacks" value={total} delay={0.08}>
            <div className="mt-2 space-y-1">
              {porCategoria.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Nenhum registro no filtro</p>
              ) : (
                porCategoria.map((item) => (
                  <p key={item.key} className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{item.nome}</span>
                    <span className="num text-foreground">{item.quantidade}</span>
                  </p>
                ))
              )}
            </div>
          </KpiCard>
          <KpiCard label="Nota média" value={media.toFixed(1)} hint={`de 10 · ${total} respostas`} delay={0.14} />
          <KpiCard
            label="Satisfação"
            value={`${total === 0 ? 0 : Math.round((filtered.filter((r) => r.nota >= 7).length / total) * 100)}%`}
            hint="notas 7 ou mais"
            delay={0.2}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-panel rise p-4 lg:col-span-2" style={{ animationDelay: "0.26s" }}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Distribuição de notas</h2>
              <span className="num text-[11px] text-muted-foreground">n = {total}</span>
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribuicao}>
                  <XAxis dataKey="nota" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                  <Tooltip
                    formatter={(value) => [`${value} feedbacks`, "Quantidade"]}
                    contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }}
                  />
                  <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                    {distribuicao.map((item) => (
                      <Cell
                        key={item.nota}
                        fill={Number(item.nota) >= 8 ? "var(--brand)" : "color-mix(in oklab, var(--foreground) 25%, transparent)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel rise p-4" style={{ animationDelay: "0.32s" }}>
            <h2 className="text-sm font-semibold">Por categoria</h2>
            {porCategoria.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">Sem dados no filtro atual.</p>
            ) : (
              <>
                <div className="mt-2 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={porCategoria}
                        dataKey="quantidade"
                        nameKey="nome"
                        innerRadius={40}
                        outerRadius={64}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {porCategoria.map((item, index) => (
                          <Cell key={item.key} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-2 text-xs">
                  {porCategoria.map((item, index) => (
                    <li key={item.key} className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-sm"
                        style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{item.nome}</span>
                      <span className="num ml-auto">{Math.round((item.quantidade / total) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-panel rise p-4" style={{ animationDelay: "0.38s" }}>
            <h2 className="text-sm font-semibold">Palavras mais citadas</h2>
            <WordCloud words={palavras} />
          </div>

          <div className="glass-panel rise p-4 lg:col-span-2" style={{ animationDelay: "0.44s" }}>
            <h2 className="text-sm font-semibold">Feedbacks recentes</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 pr-3 text-right font-medium">Nota</th>
                    <th className="pb-2 font-medium">Mensagem</th>
                    <th className="pb-2 text-right font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Carregando feedbacks…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhum feedback encontrado com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice(0, 40).map((row) => (
                      <tr key={row.id} className="hover:bg-foreground/[0.025]">
                        <td className="py-2.5 pr-3 font-medium">{row.cliente_email ?? "—"}</td>
                        <td className="py-2.5 pr-3">
                          <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">
                            {labelCategoria(normalizeCategoria(row.categoria))}
                          </span>
                        </td>
                        <td className="num py-2.5 pr-3 text-right font-semibold">{row.nota}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{row.feedback_texto ?? "—"}</td>
                        <td className="num py-2.5 text-right text-muted-foreground">
                          {new Date(row.data_envio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="glass-chip flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent font-medium outline-none"
      >
        {children}
      </select>
    </label>
  );
}
