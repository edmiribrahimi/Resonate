<!--
  SEZIONE SCRITTA E COMMITTATA PRIMA DELLA CATTURA `43-final`.

  Tutto cio' che sta sotto "L'attesa, scritta prima" e' stato messo su disco e
  committato prima che `baseline:container --phase-point=43-final` girasse. I
  numeri sono derivati dai quattordici riassunti di questa fase e dagli
  artefatti gia' su disco, mai dal risultato che devono giudicare.

  Il resto del documento viene aggiunto dopo.
-->

# Phase 43 Plan 15: Il conto della fase — Summary

*(documento in costruzione — questa prima versione porta soltanto l'attesa del
task 2, scritta prima di leggere qualunque risultato)*

## L'attesa, scritta prima di leggere qualunque risultato

Confronto `33-final` → `43-final` sul container, `--only=B1,B2,B3`.

### La regola che governa l'attesa

Questa fase ha dichiarato ogni movimento **piano per piano, prima di
misurarlo**. Il confronto di chiusura non e' quindi la prima occhiata: e' la
verifica che la somma dei movimenti dichiarati sia **tutto** il movimento
avvenuto. I punti intermedi `43-05`, `43-06`, `43-10` e `43-12` hanno riportato
`CAP-03: clean`; solo `43-07` e `43-08` hanno mosso qualcosa, e ognuno ha
scritto la propria attesa prima della propria cattura.

### I numeri, derivati e non digitati

| Origine | Classe | n | Che cosa |
|---|---|---|---|
| 43-07 | `policy_added` | 1 | `membership_acts_select_register_read` |
| 43-07 | `supporting_count_changed` | 2 | `policy_count` 67 → 68 · `rls_enabled_tables` 20 → 21 |
| 43-07 | `b2_cell_added` | 11 | `membership_acts` × le 11 personas preesistenti |
| 43-07 | `b3_cell_added` | 33 | `membership_acts` × 11 personas × 3 verbi |
| 43-08 | `b2_persona_added` | 3 | `staff/approved`, `staff/pending`, `staff/rejected` |
| 43-08 | `b2_cell_added` | 63 | 3 personas × 21 tabelle |
| 43-08 | `b3_cell_added` | 189 | 3 personas × 21 tabelle × 3 verbi |
| 43-08 | `b2_count_changed` | 6 | `master/{approved,pending,rejected}` e `organizer/{approved,pending,rejected}` × `profiles`, da 9 a 12 righe visibili |

**Totale atteso: 308 differenze.**

Controprova aritmetica, presa dagli artefatti gia' su disco invece che dalla
somma: B2 passa da 220 celle (11 personas × 20 tabelle) a 294 (14 × 21), cioe'
**+74**, che e' `11 + 63`. B3 passa da 660 (11 × 20 × 3) a 882 (14 × 21 × 3),
cioe' **+222**, che e' `33 + 189`. `1 + 2 + 3 + 74 + 6 + 222 = 308`.

### Le classi che devono valere **zero**

Sono queste, non il totale, a decidere se la fase ha mosso qualcosa che non
aveva dichiarato:

- `b3_cell_changed` — **0**. Nessuna cella di scrittura preesistente puo' aver
  cambiato verdetto. Un solo movimento qui e' un allargamento o una perdita di
  permesso su una tabella che questa fase non doveva toccare.
- `b2_fingerprint_changed` — **0** al di fuori delle sei celle `profiles` gia'
  contate come `b2_count_changed`.
- `b2_cell_missing`, `b2_persona_missing`, `policy_removed`, `policy_changed` —
  **0**.
- B1 `unexplained` — **0**.

### La previsione falsificabile sull'impronta

Le sei celle `b2_count_changed` devono portare
`pk_md5 = ff5c062e45c840688c0796ae43bf22dd` — le **dodici** personas seminate e
nient'altro. Il valore e' quello che il piano 43-08 aveva calcolato prima della
propria cattura e poi osservato; se una policy si fosse allargata dopo, il
conteggio salirebbe e **l'impronta no**.

### Le quattro conferme, dichiarate prima di cercarle

1. le **sedici celle** di `organizer/pending`, `organizer/rejected`,
   `master/pending` e `master/rejected` portano ancora **evidenza**, non
   `absent` — e' l'intero scopo di ROLE-03;
2. `insert`, `update` e `delete` su `membership_acts` **rifiutano per ogni
   persona**, `master/approved` compresa;
3. `staff/approved` e' cella per cella identica a `member/approved`, nella sola
   forma in cui quella misura puo' riuscire (le differenze di **proprieta' delle
   righe** enumerate dal piano 43-08), e **nessuna cella** mostra `staff`
   superare `member`;
4. **nessuna** cella `profiles × update` legge una violazione di constraint
   (`23514`) al posto di un verdetto RLS.

### Il target produzione

Atteso: **non misurabile**, e per due ragioni gia' dichiarate da questa fase —
`membership_acts` non e' applicata (l'harness rifiuta di girare) e la griglia
delle personas ha tre etichette che la produzione non puo' risolvere. Se ne
scrive il perche', non lo si aggira.

### La disciplina

Ogni differenza fuori da questa lista viene **riportata, non riparata**. Un
difetto trovato qui e' un risultato della verifica della fase, non qualcosa da
sistemare in silenzio nell'ultimo piano.
