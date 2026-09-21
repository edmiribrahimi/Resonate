---
created: 2026-09-21
source: richiesta del proprietario, sessione del 2026-09-21
severity: product
area: ticketing-payments, nextjs-architecture, legal-compliance, comms-analytics
resolves_phase:
---

# Cosa hanno i concorrenti e noi no — sessione di domande dopo la fase 50

**Richiesta del proprietario, 2026-09-21:** *«finita la fase 50 vorrei che mi
facessi delle domande per capire cosa e come implementare cio' che hanno i
nostri competitors e noi no»*. Non si implementa nulla prima di quella
sessione: si parte dalle domande, con la disciplina di brainstorming.

## L'inventario misurato il 2026-09-21

Letti pagine e codice JavaScript di shineonyouevents.com e tutte le pagine di
peak-festival.it. Cio' che hanno e noi non abbiamo:

| # | Funzione | Dove l'hanno | Cosa sappiamo del nostro stato |
|---|---|---|---|
| 1 | **Barra fissa in basso** sulla pagina serata: «from N EUR» (prezzo minimo fra i tier), data e ora, pulsante che **scorre** fino ai tier (non compra) — visibile solo se c'e' almeno un tier in vendita | SOY | assente; non porta la sede, quindi compatibile con `venue-secrecy.md` |
| 2 | **Selettore quantita' meno/piu'** con minimo e massimo per tier; i tier promo di gruppo hanno minimo = gruppo (x3, x7) | SOY | tendina `Select` in `TierSelection.tsx:593`; nessun minimo per tier |
| 3 | **Fine vendita e posti disponibili** sotto ogni tier («On sale until … · 33 available») | SOY | i campi esistono (`expires_at`, `show_remaining`, `available`); da verificare cosa mostra la pagina |
| 4 | **Campo codice promo** sulla pagina serata | SOY | i codici sconto esistono dalla v1.3; verificare dove si inseriscono |
| 5 | **Extra nel checkout** (bevande insieme al biglietto) | SOY | noi vendiamo i drink a parte, con i token |
| 6 | **Get directions** (link Google Maps) | SOY, Peak | assente; per noi solo dopo la rivelazione, sulla pagina del biglietto |
| 7 | **Pagine legali**: Terms, Refund policy, Privacy, Cookie policy | SOY, Peak | nessuna pagina legale. Vale `legal-compliance.md`: bozze con i nostri fatti, poi un professionista, risposta registrata con la data |
| 8 | **FAQ logistica** (come arrivare, orari, eta', guardaroba, maltempo, dress code, cashless) | Peak | assente |
| 9 | **Newsletter con doppio consenso** («Inner Circle») | SOY, Peak | la nostra iscrive subito su Resend (`api/newsletter/route.ts`) |
| 10 | **Banner cookie** (a categorie su SOY, accetta/rifiuta su Peak) | SOY, Peak | assente; PostHog gira solo lato server, bisogno basso oggi |
| 11 | **Lingue** IT/EN (Peak anche FR) | SOY, Peak | deciso: inglese fino a fine milestone v1.6 |
| 12 | **Commissione di servizio** mostrata a parte (15%) | SOY | noi nessuna commissione: e' una scelta di prezzo, non una funzione |
| 13 | **Biglietto nominale** alla mail, rivendita vietata | SOY | noi al portatore (`D-49-03`): differenza da dichiarare nei termini |
| 14 | Pagine **Partner**, **Moments** (gallery), **About/Experience**, line-up con slot | Peak | gallery esiste ma chiusa (NAV-02); il resto assente |

## Le risposte — sessione del 2026-09-21 sera, decisioni del proprietario

| # | Decisione |
|---|---|
| prima del 28 | **barra fissa**, **termini + regola rimborsi**, **selettore quantita'** — tutti e tre sulla pagina della 003 prima del listing |
| barra | prezzo **minimo fra i tier in vendita ora**; «from» solo con piu' di un tier; esauriti e futuri non contano; «Free» a zero; sparisce senza tier in vendita |
| quantita' | meno/piu' **da 1 a sei o ai posti rimasti**; **nessun minimo per tier** finche' non esiste un tier di gruppo |
| legali | bozze scritte dall'assistente con i fatti del prodotto, **pubblicate subito**, con data; **nessuna finzione di validazione**; la validazione di un professionista resta **debito aperto**. Contatto: solo `info@resonatemotion.com`, **nessuna ragione sociale** — e' la prima cosa che un professionista chiedera' di aggiungere |
| rimborsi | **nessun rimborso**, salvo annullamento o spostamento della data da parte nostra: allora rimborso intero |
| newsletter | **resta a consenso singolo**, iscrizione immediata |
| FAQ | **non si fa** |
| Get directions | **si'**, solo sulla pagina del biglietto e solo dopo la rivelazione; mai sulla pagina serata |
| drink nel checkout | **no**, restano due momenti: biglietto prima, token la sera |
| cookie banner, lingue, commissione, partner/moments | non discussi: restano fuori |

## Le domande che sono state fatte, in quell'ordine

1. Quali di questi contano **prima del listing della 003** e quali dopo?
2. Barra fissa: prezzo minimo «from», o il prezzo del tier in vendita adesso?
3. Tier di gruppo: vogliamo il minimo per tier, o basta il tetto?
4. Legali: chi e' il soggetto che vende (ragione sociale, sede, P.IVA, mail di contatto), e chi e' il professionista che valida?
5. Rimborsi: la regola scritta per i biglietti — oggi il rimborso e' manuale su SumUp — quale finestra e quali condizioni dichiariamo?
6. Newsletter: doppio consenso si' o no, e con quale testo?
7. FAQ: quali domande, e chi scrive le risposte?
8. Get directions: solo dopo la rivelazione, sulla pagina del biglietto — confermato?
9. Extra nel checkout: vogliamo unire drink e biglietto, o restano due percorsi?

## Vincoli gia' decisi che la sessione non riapre

- Velocita': funzioni Vercel a Dublino subito dopo la 50 (memoria
  `site-speed-parity-with-competitors`).
- Inglese per tutta la v1.6.
- Il segreto del venue: nessuna barra, mappa o testo puo' anticipare una sede.
- Nessuna consulenza legale generata: bozze si', validazione da un
  professionista, data registrata.
