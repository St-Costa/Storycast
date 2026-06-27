import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cropIniziale, type Crop } from "../../lib/ambientazione";
import { cropDiPartenzaDaImmagine } from "../../lib/immagine";
import MaschereCircolare from "../components/MaschereCircolare";
import styles from "./WizardPersonaggio.module.css";

interface Props {
  onAnnulla: () => void;
  onConferma: (input: { sourceImgPath: string; crop: Crop }) => Promise<void>;
}

type Step = "immagine" | "ritaglio";

// Cerchietto del votante: sempre grigio neutro (non ha colore personaggio).
const COLORE_GRIGIO = "#9AA0A6";

export default function WizardVotante({ onAnnulla, onConferma }: Props) {
  const [step, setStep] = useState<Step>("immagine");
  const [sourceImgPath, setSourceImgPath] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>(cropIniziale());
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  async function scegliImmagine() {
    try {
      const scelto = await open({
        multiple: false,
        filters: [{ name: "Immagini", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] }],
      });
      if (typeof scelto === "string") {
        setSourceImgPath(scelto);
        setCrop(await cropDiPartenzaDaImmagine(scelto));
        setStep("ritaglio");
      }
    } catch (e) {
      setErrore(stringifyErr(e));
    }
  }

  async function invia() {
    if (!sourceImgPath) {
      setErrore("Nessuna immagine selezionata.");
      return;
    }
    setInviando(true);
    setErrore(null);
    try {
      await onConferma({ sourceImgPath, crop });
    } catch (e) {
      setErrore(stringifyErr(e));
      setInviando(false);
    }
  }

  function handleAnnulla() {
    if (sourceImgPath && !inviando) {
      const ok = confirm("Annullare l'aggiunta del votante?");
      if (!ok) return;
    }
    onAnnulla();
  }

  const previewUrl = sourceImgPath ? convertFileSrc(sourceImgPath) : null;

  return (
    <div className={styles.backdrop} onClick={handleAnnulla}>
      <div className={styles.modale} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>Personaggio votante</h2>
          <ol className={styles.passi}>
            <li className={step === "immagine" ? styles.passoAttivo : ""}>1. Immagine</li>
            <li className={step === "ritaglio" ? styles.passoAttivo : ""}>2. Centra la faccia</li>
          </ol>
        </header>

        {step === "immagine" && (
          <div className={styles.contenuto}>
            <p>
              Scegli un'immagine per il votante (PNG, JPG, WebP, GIF o BMP). Il votante può solo
              votare: non compare sulla mappa e non può essere votato.
            </p>
            <button className={styles.btnPrimario} onClick={() => void scegliImmagine()}>
              Scegli immagine…
            </button>
          </div>
        )}

        {step === "ritaglio" && previewUrl && (
          <div className={styles.contenuto}>
            <MaschereCircolare
              src={previewUrl}
              colore={COLORE_GRIGIO}
              crop={crop}
              onChange={setCrop}
            />
          </div>
        )}

        {errore && <div className={styles.errore}>{errore}</div>}

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btnSecondario}
            onClick={handleAnnulla}
            disabled={inviando}
          >
            Annulla
          </button>
          <div className={styles.spacer} />
          {step === "ritaglio" && (
            <>
              <button
                type="button"
                className={styles.btnSecondario}
                onClick={() => setStep("immagine")}
                disabled={inviando}
              >
                Indietro
              </button>
              <button
                type="button"
                className={styles.btnPrimario}
                onClick={() => void invia()}
                disabled={inviando}
              >
                {inviando ? "Salvataggio…" : "Salva votante"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function stringifyErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
