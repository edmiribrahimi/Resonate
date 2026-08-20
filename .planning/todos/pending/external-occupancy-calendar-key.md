---
created: 2026-08-20
source: fase 58, seduta di esecuzione — decisione del proprietario, forma (B)
severity: moderate
area: production-calendar, supabase-data
resolves_phase:
---

# Una quarta chiave di calendario per l'occupazione esterna

## La decisione, presa il 2026-08-20

Il proprietario collabora con un **collettivo esterno** che pubblica un proprio
calendario. Quelle date **devono essere visibili sul calendario di produzione**
— non per produrle, ma per **scegliere le nostre in base anche alle loro**.

Parole sue: quella collaborazione e' **fuori dalla produzione re:sonate**.

**Forma scelta: (B)** — una **quarta chiave di calendario**, il cui feed viene
specchiato **solo come impegni**. Scartata la forma (A), cioe' ricopiare a mano
quelle date come voci del calendario `rsnt`: una ricopiatura diverge appena il
terzo sposta una data, e nessuno se ne accorge.

## Perche' il vocabolario la regge gia'

`production_commitment` e' definito nel codice come **«i giorni presi da
qualcun altro»** (`src/lib/production/ics/vocabulary.ts:131`), e un impegno
**non ha un canale suo sulla superficie**: nessun listing, nessun LiveCut,
nessun progressivo di serie. E' esattamente il ruolo richiesto.

Misura di partenza, letta il 2026-08-20 dal feed del collettivo: **14 voci**.
Il feed `rsnt` di quel giorno portava gia' 24 impegni su 45 voci — cioe' oggi
un giorno preso da altri arriva in piattaforma **solo** se lo si scrive dentro
il calendario `rsnt`. Il calendario del collettivo, cosi' com'e', non raggiunge
la piattaforma affatto.

## Il vincolo sul NOME della chiave

⚠ **La chiave non porta il nome del collettivo.** Due ragioni, e la prima non e'
prudenza ma correttezza:

1. **Semanticamente la chiave non e' «il calendario di quel collettivo»: e'
   «occupazione esterna».** Domani puo' esserci un secondo terzo, e un nome
   neutro regge entrambi i casi senza una seconda migration.
2. Una chiave finisce **in una migration e in TypeScript**, e questo repo e'
   **pubblico**. Un nome proprio la' dentro **pubblicherebbe la
   collaborazione**, irreversibilmente. Non risulta che sia stata annunciata, e
   il verso dell'errore che non costa nulla e' tenerla fuori.

Il nome del collettivo **non compare in questo file, ne' deve comparire in
nessun documento tracciato**: sta nel production tracker, come le sedi in
trattativa. Vale `venue-secrecy.md` applicato a un terzo invece che a un
indirizzo.

## Cosa serve per chiuderla

- Una **migration dichiarata** che allarghi il `CHECK` delle quattro colonne di
  scopo — il vocabolario e' **chiuso** a `rsnt`/`rmdb`/`mtnlb` (`D-58-06`) e
  specchiato in `CALENDAR_KEYS` (`src/lib/production/ics/vocabulary.ts:332`).
  **I due letterali si modificano insieme, nello stesso commit.**
- Una regola che dica, **per costruzione**, che questa chiave classifica **ogni**
  voce come impegno: mai un piano, mai un pezzo, mai un progressivo. Un piano
  creato da un calendario che non e' nostro sarebbe un pezzo di pipeline che
  nessuno produrra'.
- La registrazione dell'indirizzo, che e' un **segreto** e vive solo in
  `~/.resonate-calendar-feeds` e nelle variabili della piattaforma di deploy —
  mai in questo albero (`D-58-05` punto 1).
- La decisione se il cron del piano 58-12 la include nel proprio giro.

## Perche' non e' stata fatta nella fase 58

La fase 58 e' lo specchio **dei nostri format**. Aggiungere una chiave che
specchia il calendario di un terzo e' un requisito nuovo, con la sua migration
e la sua regola di classificazione: allargarla sotto esecuzione avrebbe
trasformato una fase misurata in una fase che cresce mentre gira.
