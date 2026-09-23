import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WordCloud, countWords } from "@/components/dashboard/word-cloud";
import { supabase } from "@/integrations/supabase/client";
import { canSeeInternal, useSessionInfo } from "@/lib/auth";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/feedbacks/interno")({
  head: () => ({
    meta: [
      { title: "Clima Interno · Insights da Casa" },
      {
        name: "description",
        content: "Score de clima por liderança, ambiente, processos e comunicação, com visão por setor.",
      },
      { property: "og:title", content: "Clima Interno · Insights da Casa" },
      {
        property: "og:description",
        content: "Score de clima por liderança, ambiente, processos e comunicação, com visão por setor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InternoPage,
});

type Interno = {
  id: number;
  colaborador_id: string | null;
  setor: string | null;
  anonimo: boolean;
  nota_lideranca: number;
  nota_ambiente: number;
  nota_processos: number;
  nota_comunicacao: number;
  feedback_texto: string | null;
  data_envio: string;
};

const DIMENSOES = [
  { key: "nota_lideranca", label: "Liderança" },
  { key: "nota_ambiente", label: "Ambiente" },
  { key: "nota_processos", label: "Processos" },
  { key: "nota_comunicacao", label: "Comunicação" },
] as const;

function InternoPage() {
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSessionInfo();
  const allowed = session ? canSeeInternal(session.role) : false;
  const [setor, setSetor] = useState("todos");
  const [periodo, setPeriodo] = useState("todos");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["feedback_interno"],
    enabled: allowed,
    queryFn: async (): Promise<Interno[]> => {
      const { data, error } = await supabase
        .from("feedback_interno")
        .select(
          "id, colaborador_id, setor, anonimo, nota_lideranca, nota_ambiente, nota_processos, nota_comunicacao, feedback_texto, data_envio",
        )
        .order("data_envio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Interno[];
    },
  });

  const setores = useMemo(
    () => [...new Set(rows.map((r) => r.setor ?? "Não informado"))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const limite = periodo === "todos" ? null : Date.now() - Number(periodo) * 86_400_000;
    return rows.filter((row) => {
      if (limite !== null && new Date(row.data_envio).getTime() < limite) return false;
      if (setor !== "todos" && (row.setor ?? "Não informado") !== setor) return false;
      return true;
    });
  }, [rows, setor, periodo]);

  const total = filtered.length;
  const mediaDimensao = (key: (typeof DIMENSOES)[number]["key"]) =>
    total === 0 ? 0 : filtered.reduce((sum, row) => sum + row[key], 0) / total;

  const scoreGeral =
    total === 0 ? 0 : DIMENSOES.reduce((sum, dim) => sum + mediaDimensao(dim.key), 0) / DIMENSOES.length;

  const porDimensao = DIMENSOES.map((dim) => ({
    dimensao: dim.label,
    media: Number(mediaDimensao(dim.key).toFixed(2)),
  }));

  const porSetor = useMemo(() => {
    const groups = new Map<string, Interno[]>();
    for (const row of filtered) {
      const key = row.setor ?? "Não informado";
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()].map(([nome, items]) => {
      const avg = (key: (typeof DIMENSOES)[number]["key"]) =>
        Number((items.reduce((sum, row) => sum + row[key], 0) / items.length).toFixed(2));
      return {
        setor: nome,
        respostas: items.length,
        Liderança: avg("nota_lideranca"),
        Ambiente: avg("nota_ambiente"),
        Processos: avg("nota_processos"),
        Comunicação: avg("nota_comunicacao"),
      };
    });
  }, [filtered]);

  const tendencia = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const row of [...filtered].reverse()) {
      const key = new Date(row.data_envio).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const score =
        (row.nota_lideranca + row.nota_ambiente + row.nota_processos + row.nota_comunicacao) / 4;
      groups.set(key, [...(groups.get(key) ?? []), score]);
    }
    return [...groups.entries()].map(([mes, scores]) => ({
      mes,
      score: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
    }));
  }, [filtered]);

  const palavras = useMemo(() => countWords(filtered.map((r) => r.feedback_texto)), [filtered]);

  function exportCsv() {
    downloadCsv(
      "clima-interno",
      [
        { key: "id", label: "ID" },
        { key: "setor", label: "Setor" },
        { key: "anonimo", label: "Anônimo" },
        { key: "nota_lideranca", label: "Liderança" },
        { key: "nota_ambiente", label: "Ambiente" },
        { key: "nota_processos", label: "Processos" },
        { key: "nota_comunicacao", label: "Comunicação" },
        { key: "feedback_texto", label: "Feedback" },
        { key: "data_envio", label: "Data de envio" },
      ],
      filtered as unknown as Record<string, unknown>[],
    );
  }

  if (!allowed) {
    return (
      <AppShell title="Clima Interno" subtitle="Acesso restrito">
        <div className="glass-panel p-6">
          <h2 className="text-sm font-semibold">Você não tem acesso a este painel</h2>
          <p className="mt-2 max-w-md text-xs text-muted-foreground">
            Os painéis internos são visíveis apenas para perfis Gestor e Admin. Fale com um administrador se
            precisar acompanhar os indicadores de clima.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Clima Interno"
      subtitle={`${total} respostas · ${filtered.filter((r) => r.anonimo).length} anônimas`}
      actions={<ExportButtons targetRef={dashboardRef} filename="dashboard-clima-interno" onExportCsv={exportCsv} />}
    >
      <section className="glass-panel flex flex-wrap items-center gap-2 p-3">
        <label className="glass-chip flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">Período</span>
          <select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value)}
            className="bg-transparent font-medium outline-none"
          >
            <option value="todos">Todo o histórico</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="180">Últimos 180 dias</option>
          </select>
        </label>
        <label className="glass-chip flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">Setor</span>
          <select
            value={setor}
            onChange={(event) => setSetor(event.target.value)}
            className="bg-transparent font-medium outline-none"
          >
            <option value="todos">Todos</option>
            {setores.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div ref={dashboardRef} className="space-y-4 bg-background">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard label="Score geral" value={scoreGeral.toFixed(1)} tone="brand" hint="média das 4 dimensões" delay={0.02} />
          {DIMENSOES.map((dim, index) => (
            <KpiCard
              key={dim.key}
              label={dim.label}
              value={mediaDimensao(dim.key).toFixed(1)}
              hint="de 10"
              delay={0.06 + index * 0.05}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="glass-panel rise p-4" style={{ animationDelay: "0.28s" }}>
            <h2 className="text-sm font-semibold">Média por dimensão</h2>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porDimensao} layout="vertical">
                  <XAxis type="number" domain={[0, 10]} tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis type="category" dataKey="dimensao" tickLine={false} axisLine={false} fontSize={11} width={92} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                  <Bar dataKey="media" fill="var(--brand)" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel rise p-4" style={{ animationDelay: "0.34s" }}>
            <h2 className="text-sm font-semibold">Evolução do score</h2>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklab, var(--foreground) 8%, transparent)" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 10]} tickLine={false} axisLine={false} fontSize={11} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="glass-panel rise p-4" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Visão agregada por setor</h2>
            <span className="text-[11px] text-muted-foreground">
              Somente Gestor e Admin · respostas individuais permanecem anônimas
            </span>
          </div>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porSetor}>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklab, var(--foreground) 8%, transparent)" />
                <XAxis dataKey="setor" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} fontSize={11} width={28} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Liderança" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ambiente" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Processos" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Comunicação" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-panel rise p-4" style={{ animationDelay: "0.46s" }}>
            <h2 className="text-sm font-semibold">Palavras mais citadas</h2>
            <WordCloud words={palavras} />
          </div>

          <div className="glass-panel rise p-4 lg:col-span-2" style={{ animationDelay: "0.52s" }}>
            <h2 className="text-sm font-semibold">Respostas</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                    <th className="pb-2 font-medium">Origem</th>
                    <th className="pb-2 font-medium">Setor</th>
                    <th className="pb-2 pr-3 text-right font-medium">Score</th>
                    <th className="pb-2 font-medium">Comentário</th>
                    <th className="pb-2 text-right font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Carregando respostas…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhuma resposta no filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice(0, 40).map((row) => (
                      <tr key={row.id} className="hover:bg-foreground/[0.025]">
                        <td className="py-2.5 pr-3 font-medium">{row.anonimo ? "Anônimo" : "Identificado"}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{row.setor ?? "—"}</td>
                        <td className="num py-2.5 pr-3 text-right font-semibold">
                          {(
                            (row.nota_lideranca + row.nota_ambiente + row.nota_processos + row.nota_comunicacao) /
                            4
                          ).toFixed(1)}
                        </td>
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
