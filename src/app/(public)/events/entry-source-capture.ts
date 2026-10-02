"use client";

/**
 * entry-source-capture.ts — la sorgente d'ingresso, letta nel browser (DBT-15, D-52.1-20).
 *
 * ── PERCHE' NEL CLIENT E NON SUL SERVER ─────────────────────────────────────
 *
 * `/events` e `/events/[slug]` non leggono `searchParams` per questo: la cache
 * anonima di `/events` e' un obiettivo dichiarato, e una pagina che legge il
 * parametro sul server non e' piu' cacheable. Il link si legge qui, al
 * montaggio, e si conserva in `sessionStorage` fino all'ordine.
 *
 * ── PRIMA SORGENTE DELLA SESSIONE ───────────────────────────────────────────
 *
 * Si scrive **solo se assente**: chi arriva da Instagram e poi naviga fra le
 * serate resta «instagram» anche quando l'indirizzo perde il parametro (il
 * cambio di tab di `/events` lo riscrive con `router.replace`). Un ingresso
 * senza `utm_source` scrive la stringa vuota, cosi' anche «diretto» e' la prima
 * sorgente e non viene sovrascritto da un link successivo nella stessa scheda.
 *
 * ── IL GREZZO RESTA QUI ─────────────────────────────────────────────────────
 *
 * Il valore e' conservato troncato a 64 caratteri, **solo nel browser**. Il
 * server lo riduce a cinque parole (`reduceEntrySource`) prima dell'insert, e
 * nulla del grezzo arriva al database o ai log (gate PII di `comms-analytics.md`).
 *
 * ── LA SOTTOSTIMA, DICHIARATA ──────────────────────────────────────────────
 *
 * Ogni accesso a `sessionStorage` e' in `try/catch`: Safari in navigazione
 * privata, o un browser che lo blocca, puo' lanciare. In quel caso nulla si
 * blocca e nulla si logga, ma la sorgente arriva **assente** all'ordine e si
 * riduce a `direct` — quindi un ordine arrivato da Instagram puo' contare come
 * diretto. La nota del pannello dell'imbuto (piano 52.1-24) dichiara questa
 * sottostima accanto a quella del segnale «modulo aperto».
 */

const STORAGE_KEY = "resonate_entry_source";
const MAX_RAW_LENGTH = 64;

export function captureEntrySource(): void {
  try {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(STORAGE_KEY) !== null) return;
    const raw = new URLSearchParams(window.location.search).get("utm_source") ?? "";
    window.sessionStorage.setItem(STORAGE_KEY, raw.slice(0, MAX_RAW_LENGTH));
  } catch {
    // sessionStorage illeggibile: la sorgente arrivera' assente → `direct`.
  }
}

export function readEntrySource(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
