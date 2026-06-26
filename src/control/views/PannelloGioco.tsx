import { useEffect, useState } from "react";
import { useAmbientazioneStore } from "../../state/ambientazioneStore";
import { risolviAsset } from "../../lib/storage";
import { oggettoDi } from "../../lib/ambientazione";
import Cerchietto from "../../components/Cerchietto";
import Quadratino from "../../components/Quadratino";
import styles from "./PannelloGioco.module.css";

export default function PannelloGioco() {
  const current = useAmbientazioneStore((s) => s.current);
  const folderPath = useAmbientazioneStore((s) => s.folderPath);
  const assegnaOggetto = useAmbientazioneStore((s) => s.assegnaOggettoAPersonaggio);
  const assicuraMiniature = useAmbientazioneStore((s) => s.assicuraMiniatureOggetti);

  const [popoverPer, setPopoverPer] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);

  // Genera le miniature mancanti (oggetti vecchi/importati) e precarica quelle
  // esistenti, così la finestrella di assegnazione appare subito.
  useEffect(() => {
    if (!current || !folderPath) return;
    void assicuraMiniature();
    for (const o of current.oggetti) {
      if (!o.thumbPath) continue;
      const img = new Image();
      img.src = risolviAsset(folderPath, o.thumbPath);
    }
  }, [current, folderPath, assicuraMiniature]);

  if (!current || !folderPath) return null;

  function apriPopover(p: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (popoverPer === p) {
      setPopoverPer(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    // Stima l'altezza del popover (righe da 83px, 3 per riga + eventuale riga
    // "Rimuovi") per non farlo uscire dal bordo inferiore: se sotto non c'è
    // spazio, lo apre verso l'alto e comunque lo tiene dentro la viewport.
    const righe = Math.ceil(oggetti.length / 3);
    const haRimuovi = current!.personaggi.find((x) => x.id === p)?.oggettoId != null;
    const stimaH = righe * 83 + (haRimuovi ? 44 : 0) + 8;
    const margine = 8;
    let top = r.bottom + 6;
    if (top + stimaH > window.innerHeight - margine) {
      top = Math.max(margine, r.top - 6 - stimaH);
    }
    setPopoverPos({ left: r.left, top });
    setPopoverPer(p);
  }

  const oggetti = current.oggetti;

  function handleAssegna(personaggioId: string, oggettoId: string | null) {
    setPopoverPer(null);
    assegnaOggetto(personaggioId, oggettoId);
  }

  return (
    <aside className={styles.root}>
      {current.personaggi.map((p) => {
        const oggetto = oggettoDi(p, oggetti);
        const popoverAperto = popoverPer === p.id;
        return (
          <div key={p.id} className={styles.riga}>
            <div className={styles.cerchiettoBox}>
              <Cerchietto
                src={risolviAsset(folderPath, p.imgPath)}
                colore={p.colore}
                crop={p.crop}
                dimensione={92}
                alt={p.nome}
              />
              <span className={styles.nome}>{p.nome}</span>
            </div>
            <div className={styles.slotOggettoWrap}>
              <button
                type="button"
                className={`${styles.slotOggetto} ${oggetto ? "" : styles.slotVuoto}`}
                onClick={(e) => apriPopover(p.id, e)}
                title={oggetto ? `${oggetto.nome} — clic per cambiare` : "Assegna oggetto"}
              >
                {oggetto ? (
                  <Quadratino
                    src={risolviAsset(folderPath, oggetto.imgPath)}
                    crop={oggetto.crop}
                    dimensione={62}
                    coloreBordo={p.colore}
                    alt={oggetto.nome}
                  />
                ) : (
                  <span className={styles.slotPiu}>+</span>
                )}
              </button>
              {popoverAperto && (
                <div
                  className={styles.popover}
                  style={popoverPos ? { left: popoverPos.left, top: popoverPos.top } : undefined}
                  onClick={(e) => e.stopPropagation()}
                >
                  {oggetti.length === 0 ? (
                    <p className={styles.popoverVuoto}>Nessun oggetto disponibile.</p>
                  ) : (
                    <>
                      {oggetto && (
                        <button
                          type="button"
                          className={styles.popoverItem}
                          onClick={() => handleAssegna(p.id, null)}
                          title="Rimuovi oggetto dal personaggio"
                        >
                          <span className={styles.iconaRimuovi} aria-hidden="true">
                            ⊘
                          </span>
                          <span className={styles.popoverNome}>Rimuovi oggetto</span>
                        </button>
                      )}
                      <div className={styles.popoverGriglia}>
                      {oggetti.map((o) => {
                        const assegnatoA = current!.personaggi.find(
                          (x) => x.id !== p.id && x.oggettoId === o.id,
                        );
                        const scelto = o.id === p.oggettoId;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={`${styles.popoverItem} ${styles.popoverItemGriglia} ${scelto ? styles.popoverItemScelto : ""}`}
                            onClick={() => handleAssegna(p.id, o.id)}
                            title={assegnatoA ? `Attualmente di ${assegnatoA.nome}` : o.nome}
                          >
                            <Quadratino
                              src={risolviAsset(folderPath, o.thumbPath ?? o.imgPath)}
                              crop={o.crop}
                              dimensione={83}
                              alt={o.nome}
                            />
                          </button>
                        );
                      })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
