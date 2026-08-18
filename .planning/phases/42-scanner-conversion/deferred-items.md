# Fase 42 — voci fuori scope, trovate durante l'esecuzione

Registrate qui e **non riparate**: nessuna appartiene ai piani di questa fase, e
ripararle dentro un piano che non le possiede significa nascondere chi le ha
prodotte.

---

## DEF-42-01 — sei pagine di produzione esistono, rendono una superficie, e non
## stanno su nessuna lista di convertite

**Trovata durante:** 42-01, Task 1 (`npm run verify:conversion`, subito dopo la
riparazione di DEF-45-01).
**Stato:** pre-esistente al piano. **Nessun file toccato da 42-01 le produce**, e
nessuna e' stata aperta: il piano non ha modificato una sola riga sotto `src/`.

### Cosa e' successo, in una riga

Rimuovendo le quattro voci morte di `CONVERTED` (DEF-45-01) il gate ha smesso di
**rifiutare** e ha cominciato a **misurare** — e la prima cosa che ha misurato e'
che sei `page.tsx` esistono e non sono contate da nessuna parte.

### Il comando che le ha trovate

```
npm run verify:conversion
```

Esito di quel run, dopo la sola rimozione delle quattro voci: **exit 1**, checks
A B C D E verdi, `✗ F  6 page.tsx file(s) exist and are accounted for NOWHERE`.
Non e' una previsione: la ricerca di fase aveva gia' riprodotto lo stesso esito
su una copia dell'albero (`42-RESEARCH.md` §2.7, DISCORDANZA 3), e l'esecuzione
lo ha confermato sull'albero vero.

### Le sei pagine, con la fase che le ha costruite

| Page file | Fase che l'ha costruita |
|---|---|
| `src/app/(admin)/admin/(work)/calendar/page.tsx` | 44 |
| `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx` | 44 |
| `src/app/(admin)/admin/(work)/location/page.tsx` | 45 |
| `src/app/(admin)/admin/(work)/location/[id]/page.tsx` | 45 |
| `src/app/(admin)/admin/(work)/manifesto/page.tsx` | 45 |
| `src/app/(admin)/admin/(work)/visual/page.tsx` | 45 |

### La disposizione presa qui, e cosa NON significa

Il gate offre tre disposizioni, e le dichiara come *«decisions somebody reads»*:
dichiararle convertite, recintarle, o rifiutarle come non-superfici. Le prime e
le terze sarebbero **false**: nessun piano ne ha camminato la chiusura, e la
terza direbbe che non hanno markup, che invece ce l'hanno. Quindi: **recintate
per nome**, in `PENDING_SURFACES`, con la fase che le possiede scritta dentro la
ragione.

Due cose che un lettore dedurrebbe al contrario se non fossero scritte:

1. **Un recinto non e' un'approvazione.** Su quelle sei pagine **non e' stata
   affermata una sola cosa**. Nessun check ne apre i file, nessuno ne ha letto il
   markup, e questo documento non dice che siano giuste: dice che **nessuno le ha
   misurate**. E' la stessa distinzione che `conversion-manifest.mjs` gia' traccia
   fra un *recinto* e un *rifiuto di categoria* — il primo dice «nessuno ha
   guardato», il secondo «qualcuno ha guardato e non c'era niente da giudicare».

2. **La riparazione appartiene alle fasi che le hanno costruite**, ed e' **una
   voce che passa da `PENDING_SURFACES` a `CONVERTED` per superficie, nel commit
   che la converte**. Non sei voci in un commit solo, e non un allargamento di
   perimetro della 42.

### La domanda aperta, che non e' risolta qui

L'attribuzione alle fasi 44 e 45 e' una **lettura**, non un fatto firmato:
`42-RESEARCH.md` la registra come assunzione A3 ed e' esplicito sul suo costo —
*«se il proprietario decidesse il contrario, la wave 0 cresce di sei
superfici»*.

**Se il proprietario decide che la fase 42 le assorbe, sono sei superfici in piu'
nel perimetro di questa fase, ed e' una decisione sua — non un aggiustamento di
pianificazione.** Resta aperta e viene nominata qui invece di essere chiusa
d'ufficio, perche' la strada comoda (assorbirle in silenzio per far diventare
verde un gate) e' esattamente il modo in cui un recinto diventa un timbro.

### Cosa 42-01 ha fatto perche' il recinto non marcisca

`PHASE_42_PATHS` puo' smettere di matchare qualcosa senza che nessuno se ne
accorga. `PENDING_SURFACES` no: `checkManifest()` ha ora una condizione in piu' —
**un glob che non matcha nessuna `page.tsx` su disco e' un rifiuto, exit 2**, col
nome della voce stantia stampato. Provato per mutazione, applicando un settimo
glob che non matcha nulla, verificando che la mutazione fosse andata a segno
prima di leggerne l'esito, e rimuovendolo subito.

L'asimmetria e' voluta: il recinto della fase 42 si scioglie per mano del piano
scritto per scioglierlo, questo per mano di sei commit che nessuno coordina.

---

*Aperto: 2026-08-18 — fase 42, piano 01.*
