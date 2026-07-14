import { FormEvent, useState } from "react";
import { TimeEntry } from "../lib/types";

interface Props {
  employeeId: string;
  entry: TimeEntry | null; // null = creating a new entry
  onClose: () => void;
  onSave: (values: {
    id?: string;
    clock_in: string;
    clock_out: string | null;
    notes: string | null;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ManualEntryModal({ entry, onClose, onSave, onDelete }: Props) {
  const [clockIn, setClockIn] = useState(toLocalInput(entry?.clock_in ?? new Date().toISOString()));
  const [clockOut, setClockOut] = useState(toLocalInput(entry?.clock_out ?? null));
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
      setError("Clock out must be after clock in.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        id: entry?.id,
        clock_in: new Date(clockIn).toISOString(),
        clock_out: clockOut ? new Date(clockOut).toISOString() : null,
        notes: notes || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/80 flex items-end sm:items-center justify-center z-50 px-4">
      <div className="bg-panel rounded-card w-full max-w-sm p-5 mb-0 sm:mb-auto">
        <h2 className="text-lg text-paper mb-4">{entry ? "Edit shift" : "Add shift"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-muted uppercase tracking-wide font-body">Clock in</label>
            <input
              type="datetime-local"
              className="input mt-1"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wide font-body">
              Clock out (leave blank if still on shift)
            </label>
            <input
              type="datetime-local"
              className="input mt-1"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wide font-body">Notes</label>
            <input
              className="input mt-1"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-alert text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 py-3 text-sm disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>

          {entry && onDelete && (
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                await onDelete(entry.id);
                setBusy(false);
                onClose();
              }}
              className="w-full text-alert text-xs font-body normal-case tracking-normal underline pt-2"
            >
              Delete this shift
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
