# Fase 50 — voci differite, trovate durante l'esecuzione

Cose scoperte mentre si eseguiva un piano, **fuori dal perimetro del task che le
ha trovate**. Non sono state corrette li': sono scritte qui perche' qualcuno
decida dove vanno.

---

## D-50-01 lascia scoperto `scripts/rls-baseline.mjs`

**Trovata:** piano 50-01, task 2 (2026-09-21).
**Fuori perimetro perche':** il task dichiara `scripts/container/seed.mjs` e nient'altro.

`scripts/container/seed.mjs` non nomina piu' `profiles.status`, ma il modulo da
cui importa continua a farlo, e in tre punti che la migration dell'onda 1 rende
falsi:

| File:riga | Cosa contiene | Cosa succede dopo la migration |
|---|---|---|
| `scripts/rls-baseline.mjs:674` | `export const PERSONA_STATUSES = ['approved','pending','rejected']` | resta esportato e non lo importa piu' nessuno |
| `scripts/rls-baseline.mjs:680` | le etichette delle persone, `ruolo/stato` | etichette su un asse che non esiste |
| `scripts/rls-baseline.mjs:742-746` | `resolvePersonas`: `select role, status … where status in ('approved','pending','rejected') group by role, status` | **`42703`**: la colonna non esiste, e il banco di prova del container si ferma qui |

La terza riga e' quella che conta: e' una `select` su una colonna cancellata, e
fallisce. `50-02` aggiorna `scripts/rls-baseline-compare.mjs` (il testo del
predicato inciso nella linea di base) ma **non** `rls-baseline.mjs`.

**Chi la chiude:** da decidere — il piano che porta la migration (onda 1) e' il
posto naturale, perche' D-50-28 vuole il gate aggiornato **nello stesso commit**
della cosa che cambia.

**Perche' non e' stata chiusa qui:** `rls-baseline.mjs` e' la matrice delle
sonde, non un banco di semina; toccarla dentro un task che dichiara un altro
file avrebbe significato modificare un gate senza che nessun criterio di
accettazione lo guardasse.
