import { create } from "zustand";

/**
 * Cronometro del tempo trascorso dalla sessione.
 * Parte una sola volta, alla PRIMA volta che il timer viene avviato,
 * e da lì conta sempre in avanti senza fermarsi (indipendente da
 * pause/reset del timer). Vive solo in regia, non viene proiettato.
 */
interface CronometroState {
  /** Timestamp (ms epoch) del primo avvio del timer, oppure null se mai partito. */
  startedAt: number | null;
  /** Avvia il cronometro se non è già partito (idempotente). */
  avviaSeNonPartito: () => void;
}

export const useCronometroStore = create<CronometroState>((set, get) => ({
  startedAt: null,
  avviaSeNonPartito() {
    if (get().startedAt !== null) return;
    set({ startedAt: Date.now() });
  },
}));
