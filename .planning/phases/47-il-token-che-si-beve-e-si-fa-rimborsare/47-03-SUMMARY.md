---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
plan: 03
subsystem: ticketing-payments / drink-tokens
tags: [refund-request, guest-path, rls, six-causes]
requires:
  - "47-01 — activation_count, che 47-04 leggera' su queste richieste"
provides:
  - "public.drink_refund_request — una richiesta aperta per token, RLS dietro staff.manage"
  - "event_parties.refund_request_window_hours — 72 di default, per serata"
  - "requestDrinkRefundGuest — sei cause distinte, come valore restituito"
  - "il comando sulla card di un token non riscattato"
affects:
  - "47-02 — la pulizia legge la finestra che questo piano crea"
  - "47-04 — esamina queste richieste"
decisions:
  - "ESEGUITO PRIMA DI 47-02 dentro la stessa onda: la pulizia deve leggere una finestra che esista"
  - "ticket_refunds NON riusata: pretende un account, e i drink si comprano da ospite"
  - "DEVIAZIONE: il comando non e' disabilitato dal client fuori finestra — decide il server"
  - "Nessuna policy di INSERT ne' di DELETE: l'assenza rifiuta"
metrics:
  duration: "~45 minuti, 2026-08-20"
  completed: 2026-08-20
  tasks: 3 su 4 — il quarto e' dovuto
---

# Fase 47 Piano 03 — Summary

Chi ha comprato un drink e non l'ha bevuto ha una strada, **senza avere un
account**. E nessuna delle sei cause di rifiuto si legge come «qualcosa e' andato
storto».

## Il riordino dentro l'onda, dichiarato

**Eseguito prima di 47-02**, che il piano metteva primo. La pulizia del cron deve
aspettare la finestra di richiesta, e quella colonna la crea questo piano:
invertirli avrebbe significato spedire una costante che il piano successivo
sostituisce, cioe' due modifiche allo stesso file per una decisione sola.

## `ticket_refunds` non e' stata riusata, e non e' pigrizia

Pretende `requested_by uuid NOT NULL REFERENCES auth.users` — **un account** — e
tutte le sue policy sono scritte su `auth.uid()`, che per un ospite e' `NULL`. I
drink si comprano gia' da ospite, e dopo il perno della v1.6 **nessun cliente
avra' un account affatto**.

Due cose diverse in una tabella sola diventano due percorsi che si scoprono
incompatibili al primo rimborso — cioe' davanti a qualcuno che aspetta i suoi
soldi.

## Il confine, e la firma della funzione che l'avrebbe rotto

La policy chiama `private.has_capability('staff.manage')`. **Il catalogo dice che
quella funzione prende DUE argomenti**, e la chiamata a uno solo sarebbe sembrata
sbagliata: letto `pronargdefaults`, il secondo ha `DEFAULT NULL::uuid`, quindi la
forma a un argomento risolve — ed e' la stessa che usa ogni policy gia' in
produzione.

Verificato **prima** di applicare, non dopo: una `CREATE POLICY` che non risolve
fallisce, e una migration applicata a meta' su un confine di sicurezza lascia una
tabella con la RLS accesa e nessuna policy, cioe' chiusa a tutti, in silenzio.

**Nessuna policy di INSERT e nessuna di DELETE**, e l'assenza e' la regola: una
richiesta la crea il client di servizio dopo aver verificato la firma, e non si
cancella. Confermato dal catalogo dopo l'applicazione: **0**.

## Le sei cause, e perche' sono sei

| causa | cosa fa chi legge |
|---|---|
| firma non valida | riapre il link |
| non trovato | niente, e' definitivo |
| gia' servito | **niente, ed e' quella che qualcuno contestera'** |
| gia' rimborsato | niente |
| finestra chiusa | niente — **ma sa fino a quando poteva** |
| gia' richiesto | aspetta |
| trasporto | riprova |

Sette, contando il guasto separatamente da tutto il resto — ed e' il punto: il
progetto ha un precedente registrato in cui un form collassava rete, chiave
mancante e indirizzo gia' iscritto in *«Qualcosa e' andato storto»*, e divenne
indebuggabile per entrambi i lati. Le cause viaggiano come **valore restituito**,
non come eccezione: Next oscura il messaggio di un errore lanciato fuori da una
server action in produzione.

E la superficie distingue le cause **definitive** da quelle su cui riprovare ha
senso: offrire «Riprova» su un drink gia' servito manderebbe una persona a
premere un pulsante che non puo' funzionare.

## La deviazione: chi decide se la finestra e' chiusa

Il piano chiedeva di **disabilitare il comando fuori finestra**. Farlo nel
browser vorrebbe dire ricalcolare la scadenza li', cioe' **far decidere una
scadenza di denaro all'orologio del cliente** — che puo' essere sbagliato e che
chiunque puo' spostare.

Quindi: il comando **si vede sempre**, il server dice se la finestra e' chiusa e
**fino a quando**, e solo allora la superficie lo spiega e smette di offrirlo.
Un comando assente non si distingue da un prodotto che quel servizio non lo
offre; un comando che mente sulla scadenza e' peggio di entrambi.

## Una frase che questa fase ha reso falsa altrove

Il ramo `refunded` della card diceva **«Automatically refunded»**. Dal 2026-08-20
non e' piu' vero: un token arriva in quello stato perche' **qualcuno ha deciso**.
Lasciata com'era, la prima persona a leggerla avrebbe creduto che il sistema si
muova da solo, e non avrebbe capito perche' sul suo secondo drink non e'
successo.

## Cosa resta dovuto

**Task 4 — la prova manuale in sei passi — non e' stata eseguita**: richiede un
acquisto vero. Il passo che vale e' il sesto, la verifica che **nessuno stato di
pagamento sia cambiato**: e' l'unica prova che questo piano abbia costruito una
richiesta e non un rimborso.
