---
severity: moderate
found: 2026-08-11
found_during: fase 37, verifica con browser del dialogo dell'indizio
resolves_phase:
---

# Il `<title>` del prodotto porta la e rovesciata

`src/app/layout.tsx` scrive **`re:sonatɘ`** in quattro punti: `title`,
`openGraph.title`, `twitter.title` e il titolo PWA.

## Perche' conta

`brand-visual-system.md`, gate *grafia del brand*, lo vieta e ne nomina il danno:

> La e rovesciata `ɘ` esiste **solo dentro il logo** ed e' un segno disegnato,
> non un carattere da digitare: incollarla in un testo produce una parola che
> **i motori di ricerca, i lettori di schermo e la casella di posta di qualcuno
> non riconoscono**.

Non e' un dettaglio tipografico, per tre ragioni misurabili:

1. **L'OpenGraph e' distribuzione.** E' il titolo che compare quando qualcuno
   condivide un link su WhatsApp, Instagram o Telegram — cioe' il canale con cui
   questa community cresce.
2. **Un lettore di schermo** pronuncia `ɘ` (U+0258) come un fonema, non come una
   «e»: il nome del progetto diventa incomprensibile all'ascolto.
3. **La ricerca.** Chi cerca «resonate» non trova «resonatɘ».

`.planning/research/STACK.md:249-255` aveva gia' registrato una trappola vicina
— il glifo sta in `latin-ext`, non in `latin`, quindi in un heading renderizzato
con Anton o Space Mono ripiega su un'altra famiglia. Qui il problema e' a monte:
**non dovrebbe essere in un testo, punto.**

## Il rimedio

Quattro stringhe: `re:sonatɘ` → `re:sonate`. Nessun cambio di logo — il logo e'
un'immagine e resta com'e'.

## Perche' non e' stato corretto subito

E' il brand, non un bug: la grafia pubblica del nome e' una decisione del
proprietario, e la modifica cambia cio' che appare in ogni link condiviso.
Trovato durante la fase 37, fuori dal suo perimetro. **In attesa della sua
parola.**
