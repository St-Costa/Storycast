import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCronometroStore } from "../../../state/cronometroStore";
import { formatElapsed } from "../../../state/timerStore";
import styles from "./Cronometro.module.css";

/**
 * Cronometro del tempo trascorso, mostrato solo in regia in alto a destra.
 * Parte alla prima partenza del timer e conta sempre in avanti.
 */
export default function Cronometro() {
  const startedAt = useCronometroStore((s) => s.startedAt);
  const [, forceRender] = useState(0);
  // Numero di "ore piene" per cui abbiamo già mostrato l'avviso.
  const oreAvvisate = useRef(0);
  const [avvisoOre, setAvvisoOre] = useState<number | null>(null);

  // Tick 1/sec finché il cronometro è attivo: il tempo trascorso è ricalcolato
  // da Date.now() a ogni render, così resta corretto anche dopo sospensioni.
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => forceRender((n) => (n + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Prima dell'avvio del primo timer mostra comunque "00:00".
  const ms = startedAt === null ? 0 : Date.now() - startedAt;

  // Avviso a ogni ora piena trascorsa (1h, 2h, 3h…).
  const orePiene = Math.floor(ms / 3_600_000);
  if (orePiene > oreAvvisate.current) {
    oreAvvisate.current = orePiene;
    if (avvisoOre === null) setAvvisoOre(orePiene);
  }

  return (
    <>
      <div className={styles.cronometro} title="Tempo trascorso dall'avvio della sessione">
        <span className={styles.etichetta}>Tempo trascorso</span>
        <span className={styles.cifre}>
          {formatElapsed(ms)}
          {startedAt !== null && <span className={styles.pallino} aria-hidden="true" />}
        </span>
      </div>
      {avvisoOre !== null &&
        createPortal(
          <div className={styles.avvisoBackdrop}>
            <div className={styles.avvisoModale} role="alertdialog">
              <div className={styles.avvisoTitolo}>
                ⏱ {avvisoOre === 1 ? "È passata 1 ora" : `Sono passate ${avvisoOre} ore`}
              </div>
              <button
                type="button"
                className={styles.avvisoBtn}
                onClick={() => setAvvisoOre(null)}
                autoFocus
              >
                OK
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
