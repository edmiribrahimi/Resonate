# Community & Membership — Operational Gates

> **Nessun `paths:`**: qui non sta il meccanismo — quello e' codice e vive in
> `access-gating.md` — ma la **politica** che il meccanismo esegue. Chi entra,
> con quale criterio, in quanto tempo, e cosa si dice a chi resta fuori.
>
> Quella politica **oggi non e' scritta da nessuna parte**: non nel repo, non
> nel tracker. Questo modulo non la inventa — **chiede che venga decisa**, e
> nel frattempo impedisce che si formi da sola, una approvazione alla volta.

## Before Touching

criteri di approvazione, referral, rifiuti, liste d'attesa, tesseramento,
comunicazioni ai membri sullo stato del loro accesso
-> verificare se esiste una regola scritta. Se non esiste, **la decisione che
stai per prendere la sta scrivendo**.

## Perche' questo e' il dominio piu' importante e il meno formalizzato

`PROJECT.md` lo dice senza giri: *«the gating mechanism (referral + approval)
is what makes the community valuable»*. Il valore del prodotto **non e'** la
biglietteria: e' chi c'e' dentro.

Il codice esegue: referral → ingresso immediato, non-referred → approvazione
manuale, con mail di approvazione e di rifiuto gia' scritte. **Il criterio con
cui si decide, no.** Un dominio dove il meccanismo e' preciso e la politica e'
implicita produce decisioni che sembrano arbitrarie a chi le riceve — ed e' su
quelle che una community si giudica.

## Quality Gates

- **Gate un criterio scritto, o nessun criterio**: Approvare e rifiutare senza una regola scritta significa **decidere caso per caso e chiamarla curatela**. Serve un criterio esplicito, anche breve, anche imperfetto: e' l'unica cosa che rende una seconda persona capace di decidere come la prima.
- **Gate stessa regola per tutti**: Il referral cambia la **strada** d'ingresso, non lo **standard**. Se chi e' referenziato entra con un criterio piu' basso, il referral non e' un canale di fiducia: e' una scorciatoia — e le scorciatoie si passano parola prima di ogni altra cosa.
- **Gate il tempo di attesa e' una promessa**: Una richiesta in `pending` e' una persona che aspetta senza sapere quanto. Va dichiarato un tempo massimo di risposta e va rispettato: **il silenzio e' una risposta, ed e' la peggiore**, perche' e' indistinguibile da un rifiuto vergognoso di darlo.
- **Gate un rifiuto e' una comunicazione, non uno stato**: `rejected` e' una riga in una tabella; per chi la riceve e' un giudizio. Il testo del rifiuto va scritto una volta, con cura, e usato sempre lo stesso — e non deve spiegare piu' di quanto si e' disposti a difendere.
- **Gate chi decide e' tracciato**: Approvazioni e rifiuti sono operazioni privilegiate: vanno registrate con **chi** le ha fatte e **quando**. E' la stessa logica dell'annullamento alla porta (`checkin-offline.md`): il percorso piu' semplice per far entrare qualcuno e' anche quello che va reso visibile.
- **Gate nessuna corsia grigia**: Ogni via d'ingresso che aggira l'approvazione — guest list, invito diretto, aggiunta manuale — **e' un'eccezione al gating**, non una funzione di comodo. Va contata, attribuita e tenuta d'occhio: e' li' che il meccanismo si svuota senza che nessuna riga di codice cambi. Vedi `ticketing-payments.md`, gate guest list.
- **Gate la capienza e' finita**: Le sedi in target stanno fra 150 e 300 persone. Una community che cresce piu' in fretta delle serate che puo' ospitare produce membri che non entrano mai — e un membro che non entra mai e' un ex membro. Crescita e capienza vanno guardate **insieme**, non in due dashboard diverse.
- **Gate socio e utente non sono la stessa cosa**: Se l'ingresso alle sedi private passa dal modello del circolo, esistera' un **libro soci** con obblighi propri, e `member` `approved` sull'app non e' automaticamente un socio. Prima di far coincidere le due cose serve una decisione dichiarata. Vedi `legal-compliance.md`.
- **Gate quello che si promette all'ingresso si mantiene**: Un accesso "su invito" comunica esclusivita'. Ogni ampliamento — piu' membri, piu' canali, piu' eccezioni — va misurato contro quella promessa, perche' la community vale finche' la promessa e' vera. Allargare e' una decisione di prodotto, mai un aggiustamento operativo.

## Imperative Behaviors

- When approving or rejecting: apply a written criterion, or write it first
- When someone arrives through a referral: hold the same standard, only a faster path
- When a request is pending: answer within the declared time, always
- When rejecting: use the agreed wording, and don't explain more than you will defend
- When acting on a member's status: record who did it and when
- When someone enters outside the approval path: count it and attribute it
- When growth is discussed: put it next to how many seats a night actually has
- When treating an app member as an association member: declare the decision first
- When widening access: check it against the promise made at the door
