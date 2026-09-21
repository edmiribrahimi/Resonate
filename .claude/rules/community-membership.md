# Community & Membership — Operational Gates

> **Nessun `paths:`**: qui non sta il meccanismo — quello e' codice e vive in
> `access-gating.md` — ma la **politica** che il meccanismo esegue. Chi entra,
> con quale criterio, in quanto tempo, e cosa si dice a chi resta fuori.
>
> Quella politica **oggi non e' scritta da nessuna parte**: non nel repo, non
> nel tracker. Questo modulo non la inventa — **chiede che venga decisa**, e
> nel frattempo impedisce che si formi da sola, una decisione alla volta.
>
> **Il meccanismo e' stato rimosso il 2026-09-21, fase 50.** Nessuno si iscrive
> piu': non esiste `/register`, il signup pubblico e' spento anche in Supabase
> Auth, e con loro sono spariti lo stato `pending`, l'approvazione, il rifiuto,
> la riattivazione e il referral. **La politica, invece, resta da scrivere** — e
> la riprende la fase 57. Un dominio che perde il suo meccanismo non perde la
> sua domanda: la perderebbe solo se qualcuno rispondesse al posto del
> proprietario.

## Before Touching

criteri di ammissione, chi riceve un account, chi lo perde, tesseramento,
comunicazioni ai membri sul loro accesso
-> verificare se esiste una regola scritta. Se non esiste, **la decisione che
stai per prendere la sta scrivendo**.

## Perche' questo e' il dominio piu' importante e il meno formalizzato

`PROJECT.md` diceva senza giri: *«the gating mechanism (referral + approval)
is what makes the community valuable»*. Il valore del prodotto **non e'** la
biglietteria: e' chi c'e' dentro. *(Quella frase descrive un meccanismo che dal
2026-09-21 non esiste piu'; la riscrive la fase 57 — vale il gate
`ai-engineering.md` *documentazione datata*.)*

**Cosa esegue il codice oggi.** Gli account di lavoro — `master`, `organizer`,
`staff` — li crea un admin o un organizer **dentro l'app**, e chi compra un
biglietto o riceve un invito da guest list ottiene un **account leggero** con
ruolo `member`, coniato dalla chiave di servizio. Non c'e' una coda, non c'e'
una richiesta da valutare, non c'e' un testo di rifiuto da scrivere.

**E il criterio con cui si decide chi entra continua a non essere scritto.** E'
solo cambiato il posto dove si decide: prima era una coda di approvazioni,
adesso e' **chi riceve un invito, chi entra in una guest list, e a chi si
vende**. Un dominio in cui il meccanismo e' preciso e la politica e' implicita
produce decisioni che sembrano arbitrarie a chi le riceve — ed e' su quelle che
una community si giudica. **La porta si e' spostata; la domanda no.**

## Quality Gates

- **Gate un criterio scritto, o nessun criterio**: Decidere chi riceve un invito, chi entra in una guest list e a chi si vende **senza una regola scritta** significa decidere caso per caso e chiamarla curatela. Serve un criterio esplicito, anche breve, anche imperfetto: e' l'unica cosa che rende una seconda persona capace di decidere come la prima.
- **Gate stessa regola per tutti**: Un invito cambia la **strada** d'ingresso, non lo **standard**. *(Il referral come meccanismo e' stato rimosso il 2026-09-21: `profiles.referred_by` non esiste piu'. La regola sopravvive perche' l'invito diretto fa oggi lo stesso mestiere.)* Se chi e' invitato entra con un criterio piu' basso, l'invito non e' un canale di fiducia: e' una scorciatoia — e le scorciatoie si passano parola prima di ogni altra cosa.
- **Gate una richiesta senza risposta non esiste piu', e non va reintrodotta di nascosto**: Dal 2026-09-21 non c'e' una coda: **non esiste uno stato in cui una persona aspetta**. Il gate che stava qui chiedeva un tempo massimo di risposta, e resta valido come **vincolo su cio' che si costruisce**: se una fase futura reintroduce una richiesta d'ingresso — un modulo, una lista d'attesa, un «chiedi un invito» — nasce **con il suo tempo di risposta dichiarato**, perche' il silenzio e' una risposta ed e' la peggiore. Una coda senza scadenza non si aggiunge, nemmeno provvisoriamente.
- **Gate un no si comunica, e oggi si comunica tacendo**: Il rifiuto non e' piu' una riga in una tabella con la sua mail: **non rispondere a chi chiede di entrare e' diventato il percorso di default**, e resta un giudizio per chi lo riceve. Se qualcuno scrive chiedendo di partecipare, **la risposta si scrive una volta, con cura, e si usa sempre la stessa** — e non deve spiegare piu' di quanto si e' disposti a difendere. Un dominio senza `rejected` non e' un dominio senza rifiuti: e' un dominio dove i rifiuti non lasciano traccia.
- **Gate chi decide e' tracciato**: Creare o **cancellare** un account sono operazioni privilegiate: vanno registrate con **chi** le ha fatte e **quando**. Il registro esiste ed e' `membership_acts`: dal 2026-09-21 porta l'atto `deleted` e **la riga sopravvive alla persona** — il soggetto cancellato lascia `subject_id` nullo, quindi il registro ricorda una cancellazione che non ha piu' un profilo da indicare (`20260921120000_drop_status_and_referral.sql`, D-50-16). E' la stessa logica dell'annullamento alla porta (`checkin-offline.md`): il percorso piu' semplice per far entrare — o per far sparire — qualcuno e' anche quello che va reso visibile.
- **Gate nessuna corsia grigia**: Ogni via d'ingresso che non passa dal biglietto — guest list, invito diretto, account creato a mano — **e' un'eccezione al gating**, non una funzione di comodo. *(Prima aggirava l'approvazione; dal 2026-09-21 aggira la cassa, ed e' la stessa cosa vista dall'altro lato.)* Va contata, attribuita e tenuta d'occhio: e' li' che il meccanismo si svuota senza che nessuna riga di codice cambi. Vedi `ticketing-payments.md`, gate guest list.
- **Gate la capienza e' finita**: Le sedi in target stanno fra 150 e 300 persone. Una community che cresce piu' in fretta delle serate che puo' ospitare produce membri che non entrano mai — e un membro che non entra mai e' un ex membro. Crescita e capienza vanno guardate **insieme**, non in due dashboard diverse.
- **Gate socio e utente non sono la stessa cosa**: Se l'ingresso alle sedi private passa dal modello del circolo, esistera' un **libro soci** con obblighi propri, e un ruolo `member` sull'app non e' automaticamente un socio — **tanto meno oggi**, che `member` e' il ruolo dell'account leggero di chi ha comprato un biglietto (`access-gating.md`). Prima di far coincidere le due cose serve una decisione dichiarata. Vedi `legal-compliance.md`.
- **Gate quello che si promette all'ingresso si mantiene**: Un accesso "su invito" comunica esclusivita'. Ogni ampliamento — piu' membri, piu' canali, piu' eccezioni — va misurato contro quella promessa, perche' la community vale finche' la promessa e' vera. Allargare e' una decisione di prodotto, mai un aggiustamento operativo.

## Imperative Behaviors

- When deciding who gets an account: apply a written criterion, or write it first
- When an invitation opens a shorter path in: hold the same standard, only a faster path
- When reintroducing any queue to get in: give it a declared answering time on day one
- When someone asks to join: answer with the agreed wording, and don't explain more than you will defend
- When creating or deleting an account: record who did it and when — the act outlives the person
- When someone enters outside the paths the product knows about: count it and attribute it
- When growth is discussed: put it next to how many seats a night actually has
- When treating an app member as an association member: declare the decision first
- When widening access: check it against the promise made at the door
