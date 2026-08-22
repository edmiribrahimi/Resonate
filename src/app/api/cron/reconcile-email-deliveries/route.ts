import { NextResponse } from "next/server";

import { reconcileDeliveries } from "@/lib/email-delivery/ledger";

/**
 * La spazzata notturna del registro degli invii.
 *
 * ── Cosa fa, in una riga ─────────────────────────────────────────────────────
 *
 * Prende le righe di `email_deliveries` che non hanno ancora un esito, chiede al
 * fornitore com'e' andata, e scrive la risposta. Non spedisce niente, non
 * rispedisce niente, e non tocca ne' denaro ne' biglietti.
 *
 * ── Perche' esiste, e perche' NON basta da solo ──────────────────────────────
 *
 * `ticketing-payments.md` impone gia' al denaro la regola *verifica sempre con
 * una GET, mai fidarsi del corpo del webhook*, e il cron `reconcile-refunds`
 * accanto e' quella regola applicata ai rimborsi. Questo e' la stessa cosa sulla
 * posta: **la risposta d'invio non e' un esito**, e la lista di soppressione del
 * fornitore accetta la chiamata senza consegnare.
 *
 * Ma un cron che gira una volta al giorno arriva tardi per un biglietto comprato
 * alle 19:00 di una serata che apre alle 22:00. Per questo la stessa funzione e'
 * chiamata **anche dalla superficie admin dei venduti**, appena prima di
 * disegnare: li' il verdetto arriva quando qualcuno lo sta guardando. Il cron e'
 * la rete sotto, non l'unico appiglio.
 *
 * ── Il referto, e perche' ha un contatore per causa ──────────────────────────
 *
 * Come il cron dei rimborsi accanto, e per la ragione che quel file scrive: gira
 * di notte con nessuno che guarda, e **questo progetto non ha error tracking**,
 * quindi il corpo della risposta e' l'unico posto dove una causa si puo' leggere.
 * Un solo numero `errors` direbbe che qualcosa e' fallito e niente su cosa.
 *
 * `queueUnreadable` e' il campo che distingue **zero righe da verificare** —
 * tutto a posto — da **non ho potuto nemmeno leggere l'elenco**, che si somigliano
 * solo nel conteggio.
 *
 * ── L'ORARIO, CHE E' UNA DECISIONE E NON UN NUMERO LIBERO ───────────────────
 *
 * `vercel.json` porta `0 9 * * *`, e gli orari li' dentro sono **UTC**:
 * `time-and-scheduling.md` pretende che ogni modifica dichiari l'ora locale
 * corrispondente e verifichi che non cada dentro una serata ancora in corso.
 *
 * `0 9` UTC sono **le 11:00 di Torino d'estate e le 10:00 d'inverno**. Una notte
 * `RSNT` va 22:00 -> 06:00: alle 10 o alle 11 la porta ha chiuso da ore, quindi
 * la passata non gira mentre qualcuno sta lavorando la serata. E' anche
 * **un'ora e mezza dopo `reconcile-refunds`**, di proposito: due cron che
 * chiamano fornitori diversi nello stesso minuto sono due modi di scoprire
 * insieme che la funzione ha un tetto di tempo.
 *
 * La finestra non e' un problema qui, a differenza di `venue-reveal`: questa
 * route non ha una finestra: prende tutte le righe senza esito, di qualunque
 * eta'. Uno scarto di fuso non le fa perdere niente — al massimo le fa
 * verificare un'ora dopo.
 *
 * ── Il limite del limite ─────────────────────────────────────────────────────
 *
 * Un cron che fallisce del tutto non lo sa nessuno, esattamente come gli altri
 * quattro. Questa route non ripara quel problema — lo eredita. Cio' che questo
 * lavoro sposta e' il caso in cui il cron gira e trova qualcosa: prima quel
 * qualcosa non esisteva come dato, e ora esiste ed e' su una superficie.
 */

/**
 * Quante righe al massimo per passata.
 *
 * Ogni riga costa una chiamata HTTP al fornitore, in sequenza. 300 e' la
 * capienza alta di una sede in target, quindi una serata intera sta dentro una
 * passata; il tetto esiste perche' un accumulo non consumi il tempo massimo
 * della funzione e non lasci il registro fermo per sempre. Le righe restano in
 * coda, ordinate dalla piu' vecchia, e la passata dopo riprende da li'.
 */
const MAX_PER_RUN = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await reconcileDeliveries({ kind: "all", limit: MAX_PER_RUN });

  return NextResponse.json({
    ok: true,
    ...report,
    // Detto nel referto invece che lasciato dedurre dal fatto che `examined`
    // eguagli il tetto: una passata piena significa che ne restano, e chi legge
    // deve poterlo vedere senza conoscere la costante.
    capped: report.examined >= MAX_PER_RUN,
  });
}
