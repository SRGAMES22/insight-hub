import { useSyncExternalStore } from "react";

/** Páginas que compõem o menu do app. */
export type AppPage = "/feedbacks/clientes" | "/feedbacks/interno" | "/admin";

/** Tela de abertura do menu (primeira coisa que a pessoa vê ao entrar). */
export const HOME_PAGE: AppPage = "/feedbacks/clientes";

const KNOWN_PAGES: AppPage[] = ["/feedbacks/clientes", "/feedbacks/interno", "/admin"];

export function isAppPage(path: string): path is AppPage {
  return (KNOWN_PAGES as string[]).includes(path);
}

// Histórico compartilhado entre as telas: cada página registra a visita e o
// botão Voltar volta uma etapa, igual ao navegador, sem sair do app.
const stack: AppPage[] = [];
const listeners = new Set<() => void>();
let backTarget: AppPage | null = null;

function sync() {
  backTarget = stack.length > 1 ? stack[stack.length - 2] : null;
  for (const listener of listeners) listener();
}

export function visitPage(path: AppPage) {
  if (stack[stack.length - 1] === path) return;
  stack.push(path);
  if (stack.length > 15) stack.shift();
  sync();
}

/** Descarta a tela atual do histórico e devolve a anterior, se existir. */
export function leavePage(): AppPage | null {
  if (stack.length < 2) return null;
  stack.pop();
  sync();
  return stack[stack.length - 1];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tela que o botão Voltar deve abrir (null quando não há para onde voltar). */
export function useBackTarget(): AppPage | null {
  return useSyncExternalStore(
    subscribe,
    () => backTarget,
    () => null,
  );
}
