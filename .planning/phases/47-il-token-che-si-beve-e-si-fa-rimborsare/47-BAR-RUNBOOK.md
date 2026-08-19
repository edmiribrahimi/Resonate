---
phase: 47
slug: il-token-che-si-beve-e-si-fa-rimborsare
document: bar-runbook
created: 2026-08-20
audiences: [chi sta al banco durante una serata, chi monta la sezione TASK alla fase 53]
---

# Runbook del banco — i token drink

> **Questo file nomina RUOLI, mai persone.** `.planning/` sta in un repository
> pubblico, quindi scrivere questo file significa pubblicarlo.
>
> Chi sta al banco legge le sezioni 1–4. Sono quattro, sono corte, e la seconda
> e' quella che tiene in piedi le altre tre.

---

## 1. Il gesto

1. Il cliente **attiva** il suo token e ti mostra il telefono.
2. **Tocchi tu** il suo schermo.
3. Leggi **SERVED**.
4. **Poi** versi.

Mai prima. La conferma resta in vista cinque secondi: e' il tempo di leggerla,
non di versare — la lettura avviene al tocco.

---

## 2. Perche' l'ordine conta

Un drink versato **prima** della pressione e' un drink che il sistema **non ha
mai visto**. Il cliente puo' annullare l'attivazione, e il token torna comprato:
esattamente com'era prima che tu glielo versassi.

Ripetuto, significa una persona che beve tutta la sera con lo stesso token — e a
fine serata quel token risulta intatto, quindi rimborsabile.

**Non e' una regola contabile, ed e' importante che non la si legga come un
sospetto verso chi sta al banco.** Fino al 2026-08-19 non esisteva alcun modo di
distinguere una serata in cui questo era successo da una serata in cui la gente
aveva semplicemente comprato piu' drink di quanti ne voleva: i due casi lasciavano
**dati identici**. Ora il sistema conta le attivazioni.

Il che vuol dire due cose insieme, e la seconda vale quanto la prima:

- un abuso si puo' **vedere**;
- e chi sta al banco puo' **dimostrare di aver lavorato bene**, invece di
  doverlo sostenere a parole.

---

## 3. Quando SERVED non compare

**Non versare.**

La rete puo' mancare — dentro un locale succede. In quel caso lo schermo **torna
indietro** e mostra un errore: e' il sistema che si comporta bene, non un guasto.

- Riprova.
- Se compare SERVED, versa.
- Se non compare mai, **quel drink non si da' da quel token**: si registra a
  parte e si sistema dopo, con un'annotazione.

Non c'e' nessun caso in cui si versa senza aver visto SERVED. Se il cliente ha
fretta, la strada e' registrare a parte — non saltare il passo.

---

## 4. Cosa non fare

**Non accettare uno schermo che ti viene mostrato gia' fermo su SERVED.** Quella
schermata la devi far comparire **tu**, toccando.

Uno screenshot di un SERVED precedente e' identico a quello vero. L'unica cosa
che li distingue e' che uno risponde al tocco e l'altro no — e per accorgertene
devi essere stato tu a toccare.

**Non premere SERVE per gentilezza mentre il cliente e' ancora in coda.** Il
token si serve quando il drink si consegna, non prima: un token servito non si
puo' piu' annullare, e se poi quella persona non lo ritira ha pagato per niente
e servira' una richiesta di rimborso da esaminare a mano.

---

## Dove finisce questo documento

Alla **fase 53** questo runbook entra nella sezione TASK dell'app, dove chi ha un
turno al banco lo trova senza doverlo cercare. Fino ad allora vive qui.

Le specifiche della singola serata — quale postazione, quale account, chi
supervisiona — **non stanno in questo file**: sta in un repository pubblico. Vale
la stessa regola della sezione 7 di `31-DOOR-RUNBOOK.md`.
