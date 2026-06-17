import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useImobi } from "@/lib/imobi-context";

/**
 * Tour de primeiro acesso ao dashboard (driver.js). Dispara uma única vez
 * por usuário/navegador; flag em localStorage. Desktop only — em mobile o
 * sidebar fica em drawer e os alvos não estão visíveis.
 */
export function useFirstAccessTour() {
  const { user } = useImobi();

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth < 1024) return;
    if (localStorage.getItem("imobibase:disable-tour") === "1") return;
    const storageKey = `imobibase:tour-done:${user.id}`;
    if (localStorage.getItem(storageKey) === "1") return;

    // Aguarda o layout montar antes de procurar os alvos
    const timer = window.setTimeout(() => {
      const steps = [
        {
          element: 'a[href="/properties"]',
          popover: {
            title: "Seus imóveis",
            description: "Cadastre e gerencie o portfólio. Cada imóvel publicado entra automaticamente no seu site.",
          },
        },
        {
          element: 'a[href="/leads"]',
          popover: {
            title: "Funil de leads",
            description: "Acompanhe interessados em um kanban com arrastar e soltar, do primeiro contato ao fechamento.",
          },
        },
        {
          element: 'a[href="/financeiro"]',
          popover: {
            title: "Financeiro",
            description: "Receitas, despesas, repasses e comissões da operação em um só lugar.",
          },
        },
        {
          element: 'a[href="/ajuda"]',
          popover: {
            title: "Precisa de ajuda?",
            description: "A Central de Ajuda tem guias passo a passo de todos os recursos.",
          },
        },
      ].filter((s) => document.querySelector(s.element));

      if (steps.length === 0) {
        return;
      }

      const tour = driver({
        showProgress: true,
        nextBtnText: "Próximo",
        prevBtnText: "Anterior",
        doneBtnText: "Concluir",
        progressText: "{{current}} de {{total}}",
        steps: [
          {
            popover: {
              title: "Boas-vindas ao ImobiBase! 👋",
              description: "Um tour rápido de 30 segundos pelos pontos principais. Você pode sair a qualquer momento.",
            },
          },
          ...steps,
        ],
        onDestroyed: () => {
          localStorage.setItem(storageKey, "1");
        },
      });
      tour.drive();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [user]);
}
