import { useEffect, useState } from "react";
import { TimeEntry } from "../lib/types";
import { formatClock, hoursBetween } from "../lib/time";

interface Props {
  openEntry: TimeEntry | null;
  busy: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}

export default function ClockCard({ openEntry, busy, onClockIn, onClockOut }: Props) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!openEntry) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [openEntry]);

  const elapsed = openEntry ? hoursBetween(openEntry.clock_in, null) : 0;
  const h = Math.floor(elapsed);
  const m = Math.floor((elapsed - h) * 60);
  const s = Math.floor((((elapsed - h) * 60) - m) * 60);

  return (
    <div className="ticket px-6 pt-8 pb-6 mx-1">
      <div className="text-center">
        <p className="text-muted text-xs tracking-[0.2em] uppercase font-body">
          {openEntry ? `Clocked in at ${formatClock(openEntry.clock_in)}` : "Not clocked in"}
        </p>

        {openEntry && (
          <p className="stamp text-4xl text-brassBright mt-3">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </p>
        )}

        <button
          onClick={openEntry ? onClockOut : onClockIn}
          disabled={busy}
          className={`mt-6 w-full py-5 text-lg rounded-card disabled:opacity-50 ${
            openEntry ? "btn-ghost border border-alert text-alert" : "btn-primary"
          }`}
        >
          {busy ? "Working…" : openEntry ? "Clock Out" : "Clock In"}
        </button>
      </div>

      <div className="ticket-divider my-6" />

      <p className="text-center text-muted text-xs font-body normal-case tracking-normal">
        {openEntry
          ? "Tap to stamp your card and end this shift."
          : "Tap to stamp your card and start your shift."}
      </p>
    </div>
  );
}
