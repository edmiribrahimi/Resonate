import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Il segnaposto della pagina dell'account — convertito dal piano 41.2-13,
 * spostato qui con la pagina dal piano 51-06.
 *
 * ── DUE FORME CHE STAVANO DAVANTI A COSE CHE NON CI SONO PIU' ───────────────
 *
 * Rimisurato contro `page.tsx` il 2026-09-22, ed e' la ragione per cui questo
 * file non e' stato spostato e basta.
 *
 *   - **Le due caselle d'azione sono uscite.** Stavano davanti al blocco dei
 *     due riquadri, cancellato dal piano 51-04 (MEM-01, MEM-02). Un segnaposto
 *     che disegna due caselle davanti a zero caselle **causa** lo scarto che un
 *     segnaposto esiste per evitare — cioe' fa l'opposto del proprio mestiere,
 *     in silenzio, e nessun gate se ne accorge.
 *   - **I token del bar sono usciti** da `page.tsx` in questo stesso piano
 *     (D-51-09), quindi questo file non sta piu' davanti a loro.
 *
 * Al loro posto c'e' **una riga sola**, che sta davanti alla barra della
 * sezione chiusa delle serate passate: e' un controllo alto 44 px che compare
 * appena i dati arrivano, e senza il suo segnaposto sarebbe lui a far scattare
 * la lista verso il basso.
 *
 * ── Eleven hand-rolled pulses, the most of the five in this phase ────────────
 *
 * This file wrote its own pulsing block eleven times, against a primitive that
 * had been correct and unimported for the whole of its existence (D-41-04, and
 * `Skeleton.tsx`'s own docblock carries the record). None is written here.
 *
 * ── Every count below is a literal and stands for NOTHING ───────────────────
 *
 * No query runs before a `loading.tsx` renders: nothing is fetched, no length is
 * available to this file and none is passed in. That constraint binds harder on
 * this placeholder than on any other in the phase, because what it stands in
 * front of is **a member's own tickets**. A count
 * chosen to look like a plausible number of tickets would be a claim about that
 * member's purchases, made before anything was read — and a person who sees two
 * boxes and then one ticket has been told something false by a file that knows
 * nothing.
 *
 * So the counts are shapes, not numbers: **two** ticket rows and **three**
 * settings controls, both unchanged from the hand-rolled version this replaces
 * and both meaning only *a list is coming*. La riga della sezione chiusa e'
 * **una**, e quella non e' una forma: la barra e' una sola, sempre.
 *
 * ── The width is the page's own ─────────────────────────────────────────────
 *
 * `default`, matching `page.tsx`'s shell exactly. A placeholder at a different
 * maximum makes the content jump sideways the moment the data lands, which is
 * the defect a skeleton exists to prevent, achieved by a skeleton.
 *
 * ── No radius is appended to a line ─────────────────────────────────────────
 *
 * `SkeletonLine` fixes its own radius and offers no opt-out: a caller appending
 * one loses, because both utilities are the same property at the same
 * specificity and the container radius is emitted last. Writing the class
 * anyway would be a line of code that does nothing. DEF-41-05, still open.
 *
 * ── What it does NOT do ─────────────────────────────────────────────────────
 *
 * It draws no navigation and declares no column clearance. A placeholder is not
 * a mount site: check E pairs the two sets over files that import the
 * responsive form directly, and this file imports nothing but the shell and the
 * placeholder.
 */
export default function AccountLoading() {
  return (
    <PageShell width="default">
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            {/* The greeting, then the member's name at the title's box. */}
            <SkeletonLine className="mb-1 h-4 w-12" />
            <SkeletonLine className="h-9 w-40" />
          </div>
          {/* The role mark, at the badge's own height. */}
          <SkeletonLine className="mt-2 h-6 w-16" />
        </div>
        <SkeletonLine className="mt-1 h-4 w-48" />
        <SkeletonLine className="mt-1 h-3 w-32" />
      </header>

      <div className="flex flex-col gap-4">
        {/* The tickets. Two is a literal. */}
        <div>
          <SkeletonLine className="mb-3 h-3 w-24" />
          {/* La frase sopra la lista, che la pagina disegna sempre. */}
          <SkeletonLine className="mb-3 h-4 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* La barra della sezione chiusa delle serate passate.

              E' una linea e non una card per la stessa misura di scatola di
              sempre: il controllo caricato dichiara il pavimento dei 44 px e
              non ha padding di card da riempire. Una sola, perche' le barre
              sono una sola — questo e' l'unico numero di questo file che non
              e' una forma. */}
          <SkeletonLine className="mt-2 h-11 w-full" />
        </div>

        {/* The settings controls. Three is a literal. */}
        <div>
          <SkeletonLine className="mb-3 h-3 w-20" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLine key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
