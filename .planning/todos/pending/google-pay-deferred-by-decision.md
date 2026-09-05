---
created: 2026-09-05
source: decisione del proprietario, 2026-09-05 — durante la sostituzione delle credenziali SumUp
severity: low
area: ticketing-payments
resolves_phase:
---

# Google Pay resta spento, per decisione

## Il fatto

`src/components/SumUpCardWidget.tsx:101` passa la configurazione Google Pay al
widget **solo se** `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` e' definita. La variabile
**non e' registrata** — ne' su Vercel (letto dal catalogo del progetto il
2026-09-05) ne' in locale. Quindi il blocco `googlePay` non viene mai passato e
**il bottone non compare a nessuno**.

SumUp lo dichiara disponibile sul conto: `available_payment_methods` risponde
`apple_pay, google_pay, card` per il merchant `MCVM9P4A`.

## Perche' e' aperto e non chiuso

**Decisione del proprietario, 2026-09-05:** *«Google Pay non possiamo ne'
vogliamo configurarlo per ora.»* Il *per ora* e' suo, e per questo la voce resta
in `pending` invece di essere archiviata: e' un differimento, non una rinuncia.

## Perche' e' scritto qui invece che lasciato com'era

Una variabile assente e una variabile assente **per scelta** si comportano in
modo identico e si leggono in modo opposto. Senza questa riga, chi trovera' il
`if` fra sei mesi ha due strade e nessuna informazione per scegliere: crederlo un
difetto e "ripararlo" registrando un merchant ID che nessuno ha deciso, oppure
crederlo voluto e non chiederlo mai piu'.

E' la stessa specie del guasto misurato lo stesso giorno: le tre variabili
`PRODUCTION_CALENDAR_FEED_*` mancavano su Vercel, il cron dello specchio ha
rifiutato correttamente per **nove notti** e nessuno lo ha saputo, perche'
un'assenza non dichiarata non e' distinguibile da una dimenticanza. Vedi
`meta-gates.md`, §Controllo zero fallimenti silenziosi.

## Il costo, dichiarato una volta

Il listing di `RSNT-003` esce **martedi' 29 settembre**. Da quel giorno chi compra
da Android — la maggioranza dei telefoni in Italia — paga **digitando il numero
della carta**, mentre da iPhone in Safari il bottone Apple Pay compare (se la
verifica del dominio regge sul nuovo merchant: da provare, vedi sotto). E' un
attrito di conversione sul primo pubblico che il prodotto avra' mai.

Il costo e' accettato consapevolmente. Non e' un blocco.

## Come si chiude, quando si vorra'

1. Ottenere il merchant ID dalla console Google Pay & Wallet, dichiarando il
   sito.
2. Registrare `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` su Vercel, target Production.
3. **Redeploy** — e' una variabile `NEXT_PUBLIC_`, quindi entra nel bundle al
   build: senza un nuovo deploy non cambia niente.
4. Provare su un Android vero. La presenza del bottone e' l'unica evidenza; il
   valore della variabile non lo e'.

## Voce sorella, ancora aperta

**Apple Pay sul nuovo merchant non e' verificato.**
`public/.well-known/apple-developer-merchantid-domain-association` (9118 byte, 6
marzo 2026) e' **servito** dalla produzione con quei byte esatti, ma e' stato
generato per il merchant **precedente**. L'API SumUp non espone nessun endpoint
Apple Pay — tre percorsi provati, `404` tutti e tre — quindi la validita' non e'
leggibile da qui.

**Si prova, non si cerca:** aprire il checkout su un **iPhone in Safari** appena
`RSNT-003` ha dei tier in vendita, e guardare se il bottone compare. E' un passo
da fare **prima del 29 settembre**, non dopo.
