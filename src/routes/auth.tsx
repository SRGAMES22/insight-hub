import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Insights da Casa" },
      {
        name: "description",
        content: "Acesso restrito a colaboradores autorizados do portal Insights da Casa.",
      },
      { property: "og:title", content: "Entrar · Insights da Casa" },
      {
        property: "og:description",
        content: "Acesso restrito a colaboradores autorizados do portal Insights da Casa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feedbacks/clientes" });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/feedbacks/clientes" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome },
            emailRedirectTo: `${window.location.origin}/feedbacks/clientes`,
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/feedbacks/clientes" });
        } else {
          toast.success("Conta criada. Confirme o e-mail para entrar.");
          setMode("entrar");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível autenticar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/feedbacks/clientes" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-info/10 blur-3xl" />
      </div>

      <div className="glass-panel relative z-10 w-full max-w-sm p-6">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-[min(1vw,10px)] bg-primary text-primary-foreground">
            <span className="num text-xs font-semibold">IC</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Insights da Casa</p>
            <p className="text-[11px] text-muted-foreground">Acesso restrito · NoCoders</p>
          </div>
        </div>

        <h1 className="mt-6 text-lg font-semibold">
          {mode === "entrar" ? "Entrar na plataforma" : "Criar seu acesso"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Novos acessos entram como Colaborador. Um admin pode elevar o perfil depois.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {mode === "criar" ? (
            <Field label="Nome">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Seu nome"
              />
            </Field>
          ) : null}
          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent text-sm outline-none"
              placeholder="voce@empresa.com"
            />
          </Field>
          <Field label="Senha">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="••••••••"
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar acesso"}
          </button>
        </form>

        <button
          onClick={handleGoogle}
          className="glass-chip mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
        >
          Continuar com Google
        </button>

        <button
          onClick={() => setMode(mode === "entrar" ? "criar" : "entrar")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "entrar" ? "Não tem acesso? Criar conta" : "Já tenho acesso · entrar"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="glass-chip block rounded-lg px-3 py-2">
      <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
