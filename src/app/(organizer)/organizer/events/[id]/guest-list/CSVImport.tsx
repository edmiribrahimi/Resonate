"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  bulkAddGuests,
  cloneGuestList,
  fetchOrganizerEvents,
} from "./csv-actions";

interface CSVGuest {
  first_name: string;
  last_name: string;
  email?: string;
}

interface ValidationResult {
  valid: CSVGuest[];
  errors: { row: number; message: string }[];
  duplicates: { row: number; email: string }[];
  allRows: {
    row: number;
    first_name: string;
    last_name: string;
    email: string;
    status: "valid" | "error" | "duplicate";
    message?: string;
  }[];
}

interface Party {
  id: string;
  title: string;
}

interface CSVImportProps {
  eventId: string;
  parties: Party[];
}

function parseAndValidateCSV(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) =>
        h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        const valid: CSVGuest[] = [];
        const errors: { row: number; message: string }[] = [];
        const duplicates: { row: number; email: string }[] = [];
        const allRows: ValidationResult["allRows"] = [];
        const seenEmails = new Set<string>();

        (results.data as Record<string, string>[]).forEach((row, idx) => {
          const rowNum = idx + 2; // +2 for header + 1-indexed
          const firstName = (row.first_name || row.name || "").trim();
          const lastName = (row.last_name || row.surname || "").trim();
          const email = (row.email || "").trim().toLowerCase();

          if (!firstName || !lastName) {
            errors.push({
              row: rowNum,
              message: "Missing first_name or last_name",
            });
            allRows.push({
              row: rowNum,
              first_name: firstName,
              last_name: lastName,
              email,
              status: "error",
              message: "Missing first_name or last_name",
            });
            return;
          }

          if (email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              errors.push({
                row: rowNum,
                message: `Invalid email: ${email}`,
              });
              allRows.push({
                row: rowNum,
                first_name: firstName,
                last_name: lastName,
                email,
                status: "error",
                message: `Invalid email: ${email}`,
              });
              return;
            }
            if (seenEmails.has(email)) {
              duplicates.push({ row: rowNum, email });
              allRows.push({
                row: rowNum,
                first_name: firstName,
                last_name: lastName,
                email,
                status: "duplicate",
                message: `Duplicate email: ${email}`,
              });
              return;
            }
            seenEmails.add(email);
          }

          valid.push({
            first_name: firstName,
            last_name: lastName,
            email: email || undefined,
          });
          allRows.push({
            row: rowNum,
            first_name: firstName,
            last_name: lastName,
            email,
            status: "valid",
          });
        });

        resolve({ valid, errors, duplicates, allRows });
      },
    });
  });
}

export default function CSVImport({ eventId, parties }: CSVImportProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Clone state
  const [showClone, setShowClone] = useState(false);
  const [cloneEvents, setCloneEvents] = useState<
    { id: string; title: string; date: string; guestCount: number }[]
  >([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [selectedSourceEvent, setSelectedSourceEvent] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      return;
    }
    setImportResult(null);
    const result = await parseAndValidateCSV(file);
    setValidation(result);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!validation || validation.valid.length === 0) return;
    setImporting(true);
    setImportResult(null);

    try {
      const guests = validation.valid.map((g) => ({
        ...g,
        party_id: selectedPartyId || undefined,
      }));
      const result = await bulkAddGuests(eventId, guests);
      setImportResult(result);
      setValidation(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setImportResult({
        imported: 0,
        skipped: 0,
        failed: validation.valid.length,
        errors: ["Import failed. Please try again."],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClearPreview = () => {
    setValidation(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenClone = async () => {
    setShowClone(true);
    setLoadingEvents(true);
    try {
      const events = await fetchOrganizerEvents(eventId);
      setCloneEvents(events);
    } catch {
      setCloneEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleClone = async () => {
    if (!selectedSourceEvent) return;
    setCloning(true);
    try {
      const result = await cloneGuestList(
        selectedSourceEvent,
        eventId,
        selectedPartyId || undefined
      );
      setImportResult({
        imported: result.cloned,
        skipped: result.skipped,
        failed: 0,
        errors: result.error ? [result.error] : [],
      });
      setShowClone(false);
      setSelectedSourceEvent("");
      router.refresh();
    } catch {
      setImportResult({
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: ["Clone failed. Please try again."],
      });
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* CSV Upload Zone */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          CSV Import
        </h3>

        {!validation && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragOver
                ? "border-accent bg-accent/10"
                : "border-white/20 hover:border-white/40"
            }`}
          >
            <p className="text-sm text-muted">
              Drop CSV here or click to upload
            </p>
            <p className="text-xs text-muted/60 mt-1">
              Required columns: first_name (or name), last_name (or surname).
              Optional: email
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Preview Table */}
        {validation && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-400">
                {validation.valid.length} valid
              </span>
              {validation.errors.length > 0 && (
                <span className="text-red-400">
                  {validation.errors.length} errors
                </span>
              )}
              {validation.duplicates.length > 0 && (
                <span className="text-yellow-400">
                  {validation.duplicates.length} duplicates
                </span>
              )}
            </div>

            {/* Party Selector */}
            <div>
              <label className="text-xs text-muted block mb-1">
                Assign to Party
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground"
              >
                <option value="">All Parties</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-black/80">
                  <tr className="text-left text-xs text-muted">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">First Name</th>
                    <th className="px-3 py-2">Last Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.allRows.map((row) => (
                    <tr
                      key={row.row}
                      className={
                        row.status === "error"
                          ? "bg-red-500/10"
                          : row.status === "duplicate"
                            ? "bg-yellow-500/10"
                            : ""
                      }
                    >
                      <td className="px-3 py-1.5 text-muted">{row.row}</td>
                      <td className="px-3 py-1.5">{row.first_name}</td>
                      <td className="px-3 py-1.5">{row.last_name}</td>
                      <td className="px-3 py-1.5 text-muted">
                        {row.email || "-"}
                      </td>
                      <td className="px-3 py-1.5">
                        {row.status === "valid" && (
                          <span className="text-green-400 text-xs">Valid</span>
                        )}
                        {row.status === "error" && (
                          <span
                            className="text-red-400 text-xs"
                            title={row.message}
                          >
                            Error
                          </span>
                        )}
                        {row.status === "duplicate" && (
                          <span
                            className="text-yellow-400 text-xs"
                            title={row.message}
                          >
                            Duplicate
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={validation.valid.length === 0 || importing}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing
                  ? "Importing..."
                  : `Import ${validation.valid.length} Guest${validation.valid.length !== 1 ? "s" : ""}`}
              </button>
              <button
                onClick={handleClearPreview}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="flex flex-wrap gap-3">
              {importResult.imported > 0 && (
                <span className="text-green-400">
                  {importResult.imported} imported
                </span>
              )}
              {importResult.skipped > 0 && (
                <span className="text-yellow-400">
                  {importResult.skipped} skipped
                </span>
              )}
              {importResult.failed > 0 && (
                <span className="text-red-400">
                  {importResult.failed} failed
                </span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-400 space-y-0.5">
                {importResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {importResult.errors.length > 5 && (
                  <li>...and {importResult.errors.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Clone Section */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Clone from Previous Event
        </h3>

        {!showClone ? (
          <button
            onClick={handleOpenClone}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            Select Source Event
          </button>
        ) : (
          <div className="space-y-3">
            {loadingEvents ? (
              <p className="text-sm text-muted">Loading events...</p>
            ) : cloneEvents.length === 0 ? (
              <p className="text-sm text-muted">
                No previous events with guest lists found.
              </p>
            ) : (
              <>
                <select
                  value={selectedSourceEvent}
                  onChange={(e) => setSelectedSourceEvent(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select an event...</option>
                  {cloneEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.date}) - {ev.guestCount} guests
                    </option>
                  ))}
                </select>

                {/* Party Selector for clone target */}
                <div>
                  <label className="text-xs text-muted block mb-1">
                    Assign to Party
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">All Parties</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleClone}
                disabled={!selectedSourceEvent || cloning}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cloning ? "Cloning..." : "Clone Guest List"}
              </button>
              <button
                onClick={() => {
                  setShowClone(false);
                  setSelectedSourceEvent("");
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
