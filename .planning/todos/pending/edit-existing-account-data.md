---
created: 2026-09-23
source: richiesta del proprietario, corsa della fase 52 sul laboratorio (piano 52-14)
severity: product
area: access-gating, community-membership, comms-analytics
resolves_phase:
---

# Modificare i dati di un account gia' esistente

**Richiesta del proprietario, 2026-09-23**, guardando la pagina membri su
iPhone durante la corsa della fase 52: *«vorrei che si possano modificare i
dati di account gia esistenti»*.

## Cosa c'e' oggi

La scheda di un account in `/admin/members` offre solo il cambio di ruolo
(`Make staff`, `Make organizer`, `Remove staff`) e `Delete account`. Nome ed
email si scrivono una volta, alla creazione (`CreateAccountForm.tsx`), e poi
non si toccano piu' dal prodotto.

## Cosa va deciso prima di costruire

- **Quali campi.** Nome e' un dato di prodotto; l'email e' la chiave di accesso
  (`auth.users`) e cambiarla e' un atto di autenticazione, non una modifica di
  profilo: passa da `auth.admin.updateUserById`, e va deciso se la persona
  deve confermare il nuovo indirizzo. `profiles-email-not-unique.md` e' un
  vincolo gia' aperto sulla stessa colonna.
- **Chi decide e' tracciato.** `membership_acts` registra creazione, cambio di
  ruolo e cancellazione: una modifica di nome o email e' un atto della stessa
  famiglia e va registrata con chi e quando (`community-membership.md`, gate
  *chi decide e' tracciato*).
- **Dati personali.** Un campo in piu' nella scheda e' un dato in piu' che si
  raccoglie: ogni campo ha una ragione dichiarata o non si aggiunge
  (`legal-compliance.md`, *i dati dei soci non sono i dati del prodotto*).
- **Chi puo'.** `staff.manage` e' la capability che apre la pagina; va detto se
  un `organizer` puo' cambiare l'email di un `master`.

## Dove entra

Non nella fase 52: la barra e i ritocchi sono chiusi per perimetro. E' una
voce per la sessione dei concorrenti o per la fase 57 (politica di accesso),
dove la scheda dell'account viene comunque ridisegnata.
