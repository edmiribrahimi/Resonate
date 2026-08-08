# Phase 43 Plan 08: `staff` diventa una persona sondata — Summary

<!--
  SEZIONE SCRITTA PRIMA DELLA CATTURA.
  Tutto ciò che sta sotto "L'attesa, scritta prima" è stato committato nel file
  prima che `baseline:container --phase-point=43-08` girasse. Le previsioni
  numeriche qui sotto sono derivate dalla cattura 43-07 e dal codice del seed,
  mai dal risultato che devono giudicare.
-->

## L'attesa, scritta prima di leggere qualunque risultato

*(Sezione redatta e salvata su disco prima di lanciare la cattura `43-08`.)*

### 1. Le tre etichette nuove

`staff/approved`, `staff/pending`, `staff/rejected`.

### 2. I conteggi impliciti

La cattura `43-07` porta **21 tabelle** con RLS e **11 personas**. Quindi:

| classe | previsione | derivazione |
|---|---|---|
| `b2_persona_added` | **3** | le tre etichette sopra |
| `b2_cell_added` | **63** | 3 personas × 21 tabelle |
| `b3_cell_added` | **189** | 3 personas × 21 tabelle × 3 verbi |

### 3. Le celle preesistenti che **si muoveranno**, e perché

Il piano scrive *«nessuna cella preesistente può muoversi — la fase non ha
cambiato nessuna policy dal punto precedente»*. La premessa sulle policy è vera,
e la conclusione **non lo è**: la griglia delle personas *è* il contenuto di
`public.profiles`, e `public.profiles` è una delle 21 tabelle sondate. Tre
personas in più sono tre righe in più nella tabella che B2 impronta.

Previsione, letta dall'artefatto `43-07` e non dal risultato:

- **sei celle** cambiano — `master/{approved,pending,rejected}` e
  `organizer/{approved,pending,rejected}` × `profiles` — da `count: 9` a
  `count: 12`, classe `b2_count_changed`. Sono le sei che nella cattura `43-07`
  portano `pk_md5: 4cb329035935f5a8f9208f45756cbfd8`, cioè vedono **tutta** la
  tabella.
- **previsione falsificabile sull'impronta**: il nuovo `pk_md5` di quelle sei
  celle sarà **`ff5c062e45c840688c0796ae43bf22dd`**.

  Calcolato prima della cattura come `md5` dei dodici id sintetici
  `32000004-0000-4000-8000-0000000000NN` ordinati come testo e uniti da `,`. Il
  metodo è stato validato all'indietro: lo stesso calcolo sui **nove** id
  restituisce `4cb329035935f5a8f9208f45756cbfd8`, che è esattamente il valore
  nell'artefatto `43-07`. Se il valore osservato differirà da quello previsto,
  le righe visibili non sono le dodici personas e la differenza **non** è
  aritmetica.
- **non devono muoversi**: i tre `member/*` × `profiles` (`count: 1`, la propria
  riga), `anon` e `authenticated/no-profile` × `profiles` (`count: 0`), e
  **nessuna** cella di nessun'altra tabella, in B2 o in B3.
- `table_row_counts.profiles` passa 9 → 12. Non è una classe di difetto.
- B1: **zero** differenze. Nessuna migration è stata aggiunta fra `43-07` e
  questo punto.
- B3: **nessuna** cella preesistente si muove. La sonda `update` e la sonda
  `delete` puntano `min(pk)`, e `min(pk)` su `profiles` resta l'id `…0001`,
  cioè `master/approved` — `'staff'` è stato **accodato** dopo `'member'`
  proprio per questo.

Totale differenze attese: **3 + 63 + 189 + 6 = 261**.

### 4. L'uguaglianza `staff` ≡ `member`, e come va misurata davvero

Il piano chiede che `staff/approved` sia identica a `member/approved` cella per
cella. **Presa alla lettera quella misura non può riuscire, e il motivo non è una
capability**: è la proprietà delle righe.

`scripts/container/seed.mjs` assegna la proprietà di ogni riga a due sole
personas — `rowOwners = [member/approved, master/approved]`. Quindi
`member/approved` possiede la riga 1 di **ogni** tabella con una colonna di
proprietà, e `staff/approved` non possiede **nulla**. Ogni policy della forma
`auth.uid() = user_id` risponde diversamente alle due, e risponde diversamente
per una ragione che non ha niente a che vedere con `private.has_capability`.
Su `profiles` vale lo stesso in forma più netta: ciascuna vede **la propria**
riga, quindi stesso `count` e `pk_md5` diverso per costruzione.

Previsione, in tre parti:

1. **`staff/pending` ≡ `member/pending` e `staff/rejected` ≡ `member/rejected`,
   esattamente**, su ogni tabella e ogni verbo, con l'unica eccezione del
   `pk_md5` di `profiles` (la propria riga). Nessuna delle quattro possiede
   righe, quindi la proprietà non le separa e resta solo la capability — che è
   la stessa. **Queste due coppie sono la vera misura di D-02.**
2. **`staff/approved` vs `member/approved`**: uguali ovunque **tranne** dove il
   seed ha dato la proprietà a `member/approved`. Ogni differenza deve essere
   della forma «member vede/scrive di più perché possiede», mai il contrario.
3. **L'asserzione direzionale, che è quella che conta per la sicurezza e che
   vale su tutte e tre le coppie**: `staff` non deve **mai** leggere più di
   `member` né scrivere dove `member` è rifiutata. Una capability trapelata nel
   nuovo ruolo si manifesterebbe esattamente così — e questa direzione non ha
   eccezioni ammesse.

Qualunque differenza fuori da queste tre forme è un difetto che questo piano
**riporta e non ripara**.

---
