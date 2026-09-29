import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, House } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { ROLE_LABEL, canAdminister, canSeeInternal, initials, useSessionInfo, useSignOut } from "@/lib/auth";
import { HOME_PAGE, isAppPage, leavePage, useBackTarget, visitPage } from "@/lib/nav-history";

type NavItem = { to: string; label: string; visible: boolean };

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data } = useSessionInfo();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const backTo = useBackTarget();

  useEffect(() => {
    if (isAppPage(pathname)) visitPage(pathname);
  }, [pathname]);

  const goBack = () => {
    navigate({ to: leavePage() ?? HOME_PAGE });
  };

  const role = data?.role ?? "colaborador";
  const nome = data?.nome ?? "";
  const email = data?.user?.email ?? "";

  const items: NavItem[] = [
    { to: "/feedbacks/clientes", label: "Clientes", visible: true },
    { to: "/feedbacks/interno", label: "Interno", visible: canSeeInternal(role) },
    { to: "/admin", label: "Admin", visible: canAdminister(role) },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-80 w-80 rounded-full bg-info/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-warn/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-white/55 backdrop-blur-2xl md:flex">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="grid size-8 place-items-center rounded-[min(1vw,10px)] bg-primary text-primary-foreground">
              <span className="num text-xs font-semibold">IC</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Insights da Casa</p>
              <p className="text-[11px] text-muted-foreground">NoCoders · BI interno</p>
            </div>
          </div>

          <nav className="mt-2 flex-1 space-y-1 px-3">
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Navegação
            </p>
            {items
              .filter((item) => item.visible)
              .map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      active
                        ? "flex items-center gap-2.5 rounded-lg bg-brand/10 px-3 py-2 text-sm font-medium text-brand"
                        : "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5"
                    }
                  >
                    <span
                      className={active ? "size-1.5 rounded-full bg-brand" : "size-1.5 rounded-full bg-foreground/20"}
                    />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          <div className="border-t border-border p-3">
            <div className="glass-chip flex items-center gap-2.5 rounded-[min(1vw,10px)] p-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/90 text-[11px] font-semibold text-primary-foreground">
                {initials(nome) || "--"}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs font-medium">{nome}</p>
                <p className="truncate text-[10px] text-muted-foreground">{email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-brand uppercase">
                {ROLE_LABEL[role]}
              </span>
            </div>
            <button
              onClick={signOut}
              className="mt-2 w-full rounded-lg px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-foreground/5"
            >
              Sair
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-border bg-white/60 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 lg:px-8">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={!backTo}
                  title="Voltar para a tela anterior"
                  aria-label="Voltar para a tela anterior"
                  className="glass-chip inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                >
                  <ArrowLeft className="size-3.5" />
                  Voltar
                </button>
                <Link
                  to={HOME_PAGE}
                  title="Menu inicial"
                  aria-label="Menu inicial"
                  className="glass-chip inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-brand"
                >
                  <House className="size-3.5" />
                  <span className="hidden sm:inline">Menu inicial</span>
                </Link>
              </div>
              <div className="mr-auto">
                <h1 className="text-base font-semibold sm:text-lg">{title}</h1>
                {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
              </div>
              {actions}
            </div>
            <nav className="flex gap-1.5 overflow-x-auto px-5 pb-3 md:hidden">
              {items
                .filter((item) => item.visible)
                .map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      pathname.startsWith(item.to)
                        ? "glass-chip rounded-lg px-3 py-1.5 text-xs font-medium text-brand"
                        : "glass-chip rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              <button
                onClick={signOut}
                className="ml-auto rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
              >
                Sair
              </button>
            </nav>
          </header>

          <div className="space-y-4 px-5 py-5 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
