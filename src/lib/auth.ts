import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "gestor" | "colaborador";

const ROLE_RANK: Record<Role, number> = { admin: 3, gestor: 2, colaborador: 1 };

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  gestor: "Gestor",
  colaborador: "Colaborador",
};

export type SessionInfo = {
  user: User | null;
  role: Role;
  nome: string;
};

/** Garante linha em profiles e papel mínimo (colaborador) no primeiro acesso. */
async function ensureProfile(user: User) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, nome")
    .eq("id", user.id)
    .maybeSingle();

  const nome =
    (user.user_metadata?.["nome"] as string | undefined) ??
    (user.user_metadata?.["full_name"] as string | undefined) ??
    user.email?.split("@")[0] ??
    "Colaborador";

  if (!existing) {
    await supabase.from("profiles").insert({ id: user.id, email: user.email ?? "", nome });
  }

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

  if (!roles || roles.length === 0) {
    await supabase.from("user_roles").insert({ user_id: user.id, role: "colaborador" });
    return { nome: existing?.nome ?? nome, role: "colaborador" as Role };
  }

  const best = (roles as { role: Role }[]).reduce(
    (acc, r) => (ROLE_RANK[r.role] > ROLE_RANK[acc] ? r.role : acc),
    "colaborador" as Role,
  );

  return { nome: existing?.nome ?? nome, role: best };
}

export async function fetchSessionInfo(): Promise<SessionInfo> {
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;
  if (!user) return { user: null, role: "colaborador", nome: "" };
  const { nome, role } = await ensureProfile(user);
  return { user, role, nome };
}

export function useSessionInfo() {
  return useQuery({
    queryKey: ["session-info"],
    queryFn: fetchSessionInfo,
    staleTime: 60_000,
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.assign("/auth");
  };
}

export function canSeeInternal(role: Role) {
  return role === "admin" || role === "gestor";
}

export function canAdminister(role: Role) {
  return role === "admin";
}

export function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
