---
phase: 48-il-catalogo-dei-format-dice-la-verita
plan: 02
subsystem: nextjs-architecture / design-system
tags: [tokens, colour-catalogue, semantic-separation, gate]
provides:
  - "--blue nel token layer, e la voce blue nel catalogo dei colori"
  - "il gate della separazione semantica aggiornato e verde"
  - "i pesi di SunSet fuori da score.ts"
decisions:
  - "--blue e' un token NUOVO: --orange non e' stato ridefinito"
  - "--grad-sunset NON e' stato rimosso — debito dichiarato, vedi sotto"
metrics:
  duration: "~30 minuti, 2026-08-20"
  completed: 2026-08-20
---

# Fase 48 Piano 02 — Summary

## Il ritrovamento: SunSet vincolava il sistema di design

La maggior parte delle occorrenze di «SunSet» nel codice **non era logica**: erano
commenti che spiegavano un vincolo —

> `--sem-warn` **e'** `--amber` **e'** il colore identificativo di SunSet. Un segno
> ambra non puo' dire *attenzione* invece di *questa e' una serata SunSet*.

Con il format cancellato **quel vincolo si e' sciolto**. La dichiarazione al
punto in cui il vincolo e' enunciato ora dice *«fino al 2026-08-20»*, cosi'
nessuno lo eredita credendolo vivo.

**Non si e' inseguita la conseguenza**, ed e' scritto nel contesto di fase perche'
non sembri una dimenticanza: i commenti nei componenti spiegano scelte che
**restano valide** — un segno che porta testo accanto al colore e' buona pratica
comunque — e riaprire quindici superfici per rilassare un vincolo non produce
nulla che un utente veda.

## Il blu non ha ridefinito l'arancio

`--orange: #FF7A2F` e' un colore **di palette**, non «il colore di RamaDub»: e'
anche il secondo stop del gradiente. `--blue: #6E8BFF` e' un token **nuovo**.

Ridefinire `--orange` in blu avrebbe dato un nome che mente — che e' esattamente
cio' che il controllo **E** del gate esiste per impedire su un altro asse.

## Il catalogo dei colori e' un insieme chiuso

`ColorSwatchPicker` non ha un campo hex libero: sei scelte, nessun modo di
esprimere un gradiente. **`#6E8BFF` non era fra quelle**, quindi RamaDub non era
selezionabile: la voce `blue` e' stata aggiunta con il suo rapporto di contrasto
accanto, come le altre.

E il controllo **D** del gate pretende che ogni voce di catalogo **coincida col
token che duplica**: cambiarlo in un posto solo lo avrebbe fatto fallire. Ora
confronta **sei** valori invece di cinque.

## I gate

| | |
|---|---|
| `verify-semantic-separation` | **5/5** — D su 6 valori |
| `verify:tokens` | **7/7** |
| `verify:persona` | **7/7** |
| `npm run build` | verde |

## Cosa NON e' stato fatto

**`--grad-sunset` resta dichiarato.** E' la firma esclusiva di un format che non
esiste piu', quindi andrebbe via — ma ha **un gate suo**,
`npm run verify:sunset-gradient`, che asserisce che nessuno lo indossa, ed e'
citato in due moduli. Rimuoverlo e' quattro file piu' una voce di
`package.json`, e non e' il genere di cosa da infilare in coda a un piano
sull'altro.

**Non e' inerte:** e' un colore che nessun format puo' piu' legittimamente
indossare, e il modulo di brand ora lo dice — *non e' passato a nessuno*. Il
debito e' di pulizia, non di correttezza.
