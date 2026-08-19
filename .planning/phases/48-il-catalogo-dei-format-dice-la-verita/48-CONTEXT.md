---
phase: 48-il-catalogo-dei-format-dice-la-verita
milestone: v1.6
created: 2026-08-20
requirements: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05]
---

# Fase 48 — contesto

## Cosa e' stato misurato prima di pianificare

**Cancellare SunSet non e' cancellare una riga.** Otto tabelle referenziano
`formats`, enumerate **leggendo i vincoli** e contate una per una:

| dipendenza | regola | righe SunSet | conseguenza |
|---|---|---|---|
| `event_parties.format_id` | RESTRICT | **0** | nessuna serata da perdere |
| `production_section.format_id` | NO ACTION | **0** | il manifesto sonoro **non e' nel database** |
| `production_plan.format_id` | NO ACTION | 0 | — |
| `production_open_question.format_id` | NO ACTION | 0 | — |
| `production_visual_asset.format_id` | NO ACTION | 0 | — |
| `party_series.format_id` | RESTRICT | **1** | **blocca**, e la serie ha 0 serate |
| `production_pipeline_rule.format_id` | **CASCADE** | **2** | **spariscono in silenzio** |
| `production_space.home_format_id` | NO ACTION | **58** | **blocca** |

**I 58 spazi sono la scoperta che ha cambiato il piano.** Sono un terzo
dell'archivio di scouting, e sono li' perche' qualcuno li ha cercati *per
SunSet*: esterni, rivolti a ovest, rooftop.

**Decisione del proprietario, 2026-08-20: restano, e perdono l'etichetta.**
`home_format_id` va a `NULL` sui 58; nessun attributo, nessun punteggio sugli
altri format, nessuna riga di archivio si perde. Cio' che si perde e' il segno
che dice **perche'** furono cercati, ed e' una perdita accettata
consapevolmente — `venue-acquisition.md` avverte che cancellare fa perdere la
memoria della scelta, e qui la memoria si assottiglia invece di sparire.

**Le due regole di pipeline che spariscono in cascata sono registrate prima**, in
`48-01-SUMMARY.md`: il LiveCut del lunedi' in due puntate e il listing del
martedi' dichiarato **non derivabile**. Una cascata e' un percorso di scrittura
che nessuno ha dichiarato: qui e' dichiarato.

## Il ritrovamento che il piano non prevedeva: SunSet vincola il sistema di design

La maggior parte delle occorrenze di «SunSet» nel codice **non e' logica**: sono
commenti che spiegano **un vincolo**, e il vincolo e' questo —

> `--sem-warn` **e'** `--amber` **e'** il colore identificativo di SunSet. Un
> segno ambra non puo' dire a chi legge *attenzione* invece di *questa e' una
> serata SunSet*: per questo **tutto cio' che e' ambra porta del testo**.

C'e' un gate che lo verifica, `scripts/verify-semantic-separation.mjs`, cinque
controlli, **verde oggi**. E ha una struttura che il piano deve conoscere:

- `CATALOGUE_TO_TOKEN` — il catalogo dei colori **duplica** i token di
  `globals.css`, e il controllo **D** pretende che i cinque valori coincidano.
  **Cambiare RamaDub in un posto solo fa fallire il gate.**
- `FORMAT_NAMES` e `FORMAT_IDENTIFIERS` — nominano SunSet esplicitamente.
- `--grad-sunset` e' esentato **per nome** dal controllo E.

**Conseguenza che nessuno aveva previsto: cancellando SunSet, quel vincolo si
scioglie.** Ambra smette di essere il colore di un format, quindi la semantica
d'avviso torna libera.

**Non si insegue quella conseguenza in questa fase**, e la ragione e' scritta qui
perche' non sembri una dimenticanza: i commenti nei componenti spiegano scelte che
**restano valide** — un segno che porta testo accanto al colore e' buona pratica
comunque, e riaprire quindici superfici per rilassare un vincolo non produce
nulla che un utente veda. Cio' che si fa e' **dichiarare la collisione chiusa**
dove il vincolo e' enunciato, cosi' nessuno lo eredita credendolo vivo.

## Il blu non redefinisce l'arancio

`--orange: #FF7A2F` e' un colore **di palette**, non «il colore di RamaDub»: e'
anche il secondo stop del gradiente tramonto. RamaDub lo **usa**.

Quindi `#2B4BE8` arriva come **token nuovo**, e la voce di catalogo di RamaDub
punta a quello. Ridefinire `--orange` in blu darebbe un nome che mente, ed e'
esattamente cio' che il controllo E del gate esiste per impedire su un altro asse.

## Lo stato di partenza del calendario

`npm run import:calendar` esiste, **la prova a vuoto e' il comportamento
predefinito** e `--apply` va passato esplicitamente. Il riconciliatore e' chiuso
sugli UID del file.

Esiste gia' un format `Unclassified` — **ritirato e non elencato** — che e' dove
atterra cio' che l'import non riconosce. `CAT-05` ha quindi un posto dove mettere
le voci che non appartengono a nessun format, e non deve inventarlo.

## Ordine dei piani

| piano | onda | cosa | requisiti |
|---|---|---|---|
| 48-01 | 1 | il catalogo in produzione: i 58 sciolti, la serie, il format, il blu | CAT-01, CAT-02 |
| 48-02 | 2 | i token, il catalogo dei colori e il gate | CAT-01, CAT-02 |
| 48-03 | 2 | i moduli di dominio che diventano falsi | CAT-03 |
| 48-04 | 3 | l'import del calendario | CAT-04, CAT-05 |

48-01 apre perche' il codice legge il catalogo. 48-04 chiude perche' importa
serate che si agganciano a format che devono gia' essere quelli giusti.
