import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, canAdminister, initials, useSessionInfo, type Role } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração · Insights da Casa" },
      {
        name: "description",
        content: "Gestão de perfis de acesso e importação de feedbacks de clientes por CSV.",
      },
      { property: "og:title", content: "Administração · Insights da Casa" },
      {
        property: "og:description",
        content: "Gestão de perfis de acesso e importação de feedbacks de clientes por CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type UserRow = {
  id: string;
  email: string | null;
  nome: string | null;
  setor: string | null;
  role: Role;
};

type PreviewRow = {
  cliente_email: string;
  categoria: string | null;
  nota: number;
  feedback_texto: string | null;
  tags: string[];
  data_envio: string;
};

const ROLES: Role[] = ["admin", "gestor", "colaborador"];

function AdminPage() {
  const { data: session } = useSessionInfo();
  const allowed = session ? canAdminister(session.role) : false;
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    enabled: allowed,
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profiles, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("id, email, nome, setor"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profileError) throw profileError;
      if (rolesError) throw rolesError;

      const roleById = new Map((roles ?? []).map((row) => [row.user_id, row.role as Role]));
      return (profiles ?? []).map((profile) => ({
        ...profile,
        role: roleById.get(profile.id) ?? "colaborador",
      }));
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["ingestao-logs"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingestao_logs")
        .select("id, arquivo, total_linhas, inseridos, erros, mensagem, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["session-info"] });
    },
    onError: () => toast.error("Não foi possível atualizar o perfil."),
  });

  const importar = useMutation({
    mutationFn: async (rows: PreviewRow[]) => {
      const { error } = await supabase.from("feedback_clientes").insert(rows);
      if (error) throw error;
      await supabase.from("ingestao_logs").insert({
        arquivo,
        total_linhas: rows.length + erros.length,
        inseridos: rows.length,
        erros: erros.length,
        mensagem: erros.slice(0, 3).join(" | ") || "Importação concluída",
        executado_por: session?.user?.id ?? null,
      });
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} feedbacks importados.`);
      setPreview(null);
      setErros([]);
      setArquivo("");
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["feedback_clientes"] });
      queryClient.invalidateQueries({ queryKey: ["ingestao-logs"] });
    },
    onError: () => toast.error("Falha ao importar o arquivo."),
  });

  function handleFile(file: File) {
    setArquivo(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const problemas: string[] = [];
        const validos: PreviewRow[] = [];

        result.data.forEach((raw, index) => {
          const linha = index + 2;
          const email = (raw["cliente_email"] ?? raw["email"] ?? "").trim();
          const nota = Number((raw["nota"] ?? "").toString().replace(",", "."));

          if (!email) {
            problemas.push(`Linha ${linha}: e-mail ausente`);
            return;
          }
          if (!Number.isFinite(nota) || nota < 1 || nota > 10) {
            problemas.push(`Linha ${linha}: nota inválida (${raw["nota"] ?? "vazia"})`);
            return;
          }

          const dataBruta = (raw["data_envio"] ?? "").trim();
          const data = dataBruta && !Number.isNaN(Date.parse(dataBruta)) ? new Date(dataBruta) : new Date();

          validos.push({
            cliente_email: email,
            categoria: (raw["categoria"] ?? "").trim().toLowerCase() || null,
            nota: Math.round(nota),
            feedback_texto: (raw["feedback_texto"] ?? raw["feedback"] ?? "").trim() || null,
            tags: (raw["tags"] ?? "")
              .split(/[;,]/)
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean),
            data_envio: data.toISOString(),
          });
        });

        setPreview(validos);
        setErros(problemas);
      },
      error: () => toast.error("Não foi possível ler o arquivo CSV."),
    });
  }

  if (!allowed) {
    return (
      <AppShell title="Administração" subtitle="Acesso restrito">
        <div className="glass-panel p-6">
          <h2 className="text-sm font-semibold">Área exclusiva de administradores</h2>
          <p className="mt-2 max-w-md text-xs text-muted-foreground">
            Apenas perfis Admin podem gerenciar acessos e importar dados.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Administração" subtitle="Governança de acessos e ingestão de dados">
      <section className="glass-panel rise p-4">
        <h2 className="text-sm font-semibold">Perfis de acesso</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Colaborador vê somente dashboards de clientes. Gestor também acessa o clima interno. Admin controla tudo.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="pb-2 font-medium">Pessoa</th>
                <th className="pb-2 font-medium">E-mail</th>
                <th className="pb-2 font-medium">Setor</th>
                <th className="pb-2 font-medium">Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    Nenhum usuário cadastrado ainda.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="num grid size-7 place-items-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                          {initials(user.nome ?? user.email ?? "?")}
                        </span>
                        <span className="font-medium">{user.nome ?? "Sem nome"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{user.email ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{user.setor ?? "—"}</td>
                    <td className="py-2.5">
                      <select
                        value={user.role}
                        disabled={updateRole.isPending}
                        onChange={(event) =>
                          updateRole.mutate({ userId: user.id, role: event.target.value as Role })
                        }
                        className="glass-chip rounded-lg px-2 py-1 text-xs font-medium outline-none"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel rise p-4" style={{ animationDelay: "0.08s" }}>
        <h2 className="text-sm font-semibold">Importar feedbacks de clientes (CSV)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Colunas aceitas: <span className="num">cliente_email, categoria, nota, feedback_texto, tags, data_envio</span>.
          Tags separadas por ponto e vírgula.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="mt-3 block w-full max-w-sm cursor-pointer rounded-lg border border-dashed border-border bg-transparent px-3 py-2 text-xs text-muted-foreground"
        />

        {preview ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="glass-chip rounded-lg px-2.5 py-1">
                <span className="num font-semibold">{preview.length}</span> linhas válidas
              </span>
              <span className="glass-chip rounded-lg px-2.5 py-1">
                <span className="num font-semibold">{erros.length}</span> com erro
              </span>
              <button
                onClick={() => importar.mutate(preview)}
                disabled={preview.length === 0 || importar.isPending}
                className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {importar.isPending ? "Importando…" : "Confirmar importação"}
              </button>
              <button
                onClick={() => {
                  setPreview(null);
                  setErros([]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-foreground/5"
              >
                Cancelar
              </button>
            </div>

            {erros.length > 0 ? (
              <ul className="space-y-1 rounded-lg bg-warn/10 p-3 text-[11px] text-foreground/70">
                {erros.slice(0, 5).map((erro) => (
                  <li key={erro}>{erro}</li>
                ))}
                {erros.length > 5 ? <li>+{erros.length - 5} outros problemas</li> : null}
              </ul>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                    <th className="pb-2 font-medium">E-mail</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 text-right font-medium">Nota</th>
                    <th className="pb-2 font-medium">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.slice(0, 5).map((row, index) => (
                    <tr key={`${row.cliente_email}-${index}`}>
                      <td className="py-2 pr-3">{row.cliente_email}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.categoria ?? "—"}</td>
                      <td className="num py-2 pr-3 text-right font-semibold">{row.nota}</td>
                      <td className="py-2 text-muted-foreground">{row.feedback_texto ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="glass-panel rise p-4" style={{ animationDelay: "0.16s" }}>
        <h2 className="text-sm font-semibold">Histórico de importações</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhuma importação registrada.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-xs">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-medium">{log.arquivo}</span>
                <span className="num text-muted-foreground">
                  {log.inseridos}/{log.total_linhas} inseridos · {log.erros} erros
                </span>
                <span className="num ml-auto text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
